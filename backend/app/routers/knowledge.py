"""app/routers/knowledge.py"""
import uuid, os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.security import get_current_active_user, get_plan_limits
from app.models.tenant import Tenant, KBDocument, KBDocStatus
from app.schemas import KBDocOut, AddURLRequest
from app.services.ingestion import ingest_document, remove_document

router = APIRouter(prefix="/knowledge", tags=["Knowledge Base"])
ALLOWED_EXT = {".pdf", ".docx", ".txt"}


@router.get("/", response_model=list[KBDocOut])
async def list_docs(current_user=Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    r = await db.execute(
        select(KBDocument).where(KBDocument.tenant_id == current_user.tenant_id).order_by(KBDocument.created_at.desc())
    )
    return r.scalars().all()


@router.post("/upload", response_model=KBDocOut, status_code=202)
async def upload_doc(
    file: UploadFile = File(...),
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(400, f"Unsupported file type. Allowed: {', '.join(ALLOWED_EXT)}")

    tenant_r = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
    tenant   = tenant_r.scalar_one()
    limits   = get_plan_limits(tenant.plan.value)
    count_r  = await db.execute(
        select(func.count()).where(KBDocument.tenant_id == current_user.tenant_id, KBDocument.status == KBDocStatus.active)
    )
    if count_r.scalar() >= limits["kb_files"]:
        raise HTTPException(402, f"KB file limit ({limits['kb_files']}) reached. Please upgrade.")

    file_bytes = await file.read()
    doc_id     = str(uuid.uuid4())
    source_type = ext.lstrip(".")
    doc = KBDocument(
        id=doc_id, tenant_id=current_user.tenant_id, name=file.filename,
        source_type=source_type, file_size_bytes=len(file_bytes),
        status=KBDocStatus.processing,
    )
    db.add(doc)
    await db.flush()
    try:
        count = await ingest_document(
            tenant_id=current_user.tenant_id, document_id=doc_id,
            source_type=source_type, file_bytes=file_bytes,
        )
        doc.chunk_count = count
        doc.status = KBDocStatus.active
    except Exception as e:
        doc.status = KBDocStatus.failed
        doc.error_message = str(e)
    return doc


@router.post("/url", response_model=KBDocOut, status_code=202)
async def add_url(req: AddURLRequest, current_user=Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    doc_id = str(uuid.uuid4())
    name   = req.name or req.url.split("//")[-1][:100]
    doc    = KBDocument(
        id=doc_id, tenant_id=current_user.tenant_id, name=name,
        source_type="url", source_url=req.url, status=KBDocStatus.processing,
    )
    db.add(doc)
    await db.flush()
    try:
        count = await ingest_document(
            tenant_id=current_user.tenant_id, document_id=doc_id,
            source_type="url", url=req.url,
        )
        doc.chunk_count = count
        doc.status = KBDocStatus.active
    except Exception as e:
        doc.status = KBDocStatus.failed
        doc.error_message = str(e)
    return doc


@router.delete("/{doc_id}", status_code=204)
async def delete_doc(doc_id: str, current_user=Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    r = await db.execute(
        select(KBDocument).where(KBDocument.id == doc_id, KBDocument.tenant_id == current_user.tenant_id)
    )
    doc = r.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "Document not found")
    await remove_document(doc_id, doc.s3_key)
    await db.delete(doc)

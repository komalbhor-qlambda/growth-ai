"""app/routers/leads.py"""
import uuid, csv, io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.tenant import Lead
from app.schemas import LeadCreate, LeadUpdate, LeadOut, LeadListResponse, BulkImportResponse

router = APIRouter(prefix="/leads", tags=["Leads"])


@router.get("/", response_model=LeadListResponse)
async def list_leads(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: str | None = None,
    search: str | None = None,
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Lead).where(Lead.tenant_id == current_user.tenant_id)
    if status_filter:
        q = q.where(Lead.status == status_filter)
    if search:
        q = q.where(Lead.name.ilike(f"%{search}%") | Lead.intent.ilike(f"%{search}%"))
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    items = (await db.execute(q.order_by(Lead.created_at.desc()).offset((page-1)*page_size).limit(page_size))).scalars().all()
    return LeadListResponse(items=items, total=total, page=page, page_size=page_size)


@router.post("/", response_model=LeadOut, status_code=201)
async def create_lead(req: LeadCreate, current_user=Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    lead = Lead(id=str(uuid.uuid4()), tenant_id=current_user.tenant_id, **req.model_dump())
    db.add(lead)
    await db.flush()
    return lead


@router.patch("/{lead_id}", response_model=LeadOut)
async def update_lead(lead_id: str, req: LeadUpdate, current_user=Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Lead).where(Lead.id == lead_id, Lead.tenant_id == current_user.tenant_id))
    lead = r.scalar_one_or_none()
    if not lead:
        raise HTTPException(404, "Lead not found")
    for k, v in req.model_dump(exclude_none=True).items():
        setattr(lead, k, v)
    return lead


@router.delete("/{lead_id}", status_code=204)
async def delete_lead(lead_id: str, current_user=Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Lead).where(Lead.id == lead_id, Lead.tenant_id == current_user.tenant_id))
    lead = r.scalar_one_or_none()
    if not lead:
        raise HTTPException(404, "Lead not found")
    await db.delete(lead)


@router.post("/import", response_model=BulkImportResponse)
async def import_leads(
    file: UploadFile = File(...),
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename.endswith((".csv", ".txt")):
        raise HTTPException(400, "Only CSV files supported")
    content = await file.read()
    reader  = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))
    imported, skipped, errors = 0, 0, []
    for i, row in enumerate(reader):
        try:
            phone = row.get("phone", row.get("Phone", "")).strip()
            if not phone:
                errors.append(f"Row {i+2}: missing phone"); skipped += 1; continue
            exists = await db.execute(select(Lead).where(Lead.tenant_id == current_user.tenant_id, Lead.phone == phone))
            if exists.scalar_one_or_none():
                skipped += 1; continue
            db.add(Lead(
                id=str(uuid.uuid4()), tenant_id=current_user.tenant_id, phone=phone,
                name=row.get("name", row.get("Name","")).strip() or None,
                intent=row.get("intent", row.get("Intent","")).strip() or None,
                tag=row.get("tag", row.get("Tag","")).strip() or None,
            ))
            imported += 1
            if imported % 100 == 0:
                await db.flush()
        except Exception as e:
            errors.append(f"Row {i+2}: {e}"); skipped += 1
    return BulkImportResponse(imported=imported, skipped=skipped, errors=errors[:20])

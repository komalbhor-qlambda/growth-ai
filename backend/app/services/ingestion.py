"""app/services/ingestion.py — PDF/URL/DOCX → chunks → Qdrant."""
import io, re
from typing import Optional
import structlog
import httpx
from app.core.config import settings
from app.services.rag import upsert_chunks, delete_document_chunks

log = structlog.get_logger()


def chunk_text(text: str) -> list[str]:
    cs, ov = settings.CHUNK_SIZE * 4, settings.CHUNK_OVERLAP * 4
    text = re.sub(r"\s+", " ", text).strip()
    sentences = re.split(r"(?<=[.!?।])\s+", text)
    chunks, current = [], ""
    for s in sentences:
        if len(current) + len(s) <= cs:
            current = (current + " " + s).strip()
        else:
            if current:
                chunks.append(current)
            overlap = chunks[-1][-ov:] if chunks and len(chunks[-1]) > ov else (chunks[-1] if chunks else "")
            current = (overlap + " " + s).strip()
    if current:
        chunks.append(current)
    return [c for c in chunks if len(c.split()) >= 5]


def extract_pdf(data: bytes) -> str:
    try:
        import PyPDF2
        reader = PyPDF2.PdfReader(io.BytesIO(data))
        return "\n\n".join(p.extract_text() or "" for p in reader.pages).strip()
    except Exception as e:
        raise RuntimeError(f"PDF extraction failed: {e}")


def extract_docx(data: bytes) -> str:
    try:
        from docx import Document
        doc = Document(io.BytesIO(data))
        return "\n\n".join(p.text.strip() for p in doc.paragraphs if p.text.strip())
    except Exception as e:
        raise RuntimeError(f"DOCX extraction failed: {e}")


async def extract_url(url: str) -> str:
    from bs4 import BeautifulSoup
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        r = await client.get(url, headers={"User-Agent": "SMEGrowthAI/1.0"})
        r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    for tag in soup(["script","style","nav","footer","header","aside"]):
        tag.decompose()
    text = soup.get_text(separator="\n", strip=True)
    return re.sub(r"\n{3,}", "\n\n", text)[:50000]


async def ingest_document(
    tenant_id: str, document_id: str, source_type: str,
    file_bytes: Optional[bytes] = None,
    url: Optional[str] = None,
    s3_key: Optional[str] = None,
) -> int:
    if source_type == "pdf":
        text = extract_pdf(file_bytes)
    elif source_type == "docx":
        text = extract_docx(file_bytes)
    elif source_type == "url":
        text = await extract_url(url)
    elif source_type == "txt":
        text = file_bytes.decode("utf-8", errors="replace")
    else:
        raise ValueError(f"Unsupported source_type: {source_type}")

    if not text or len(text.strip()) < 50:
        raise ValueError("Extracted text too short or empty")

    chunks = chunk_text(text)
    if not chunks:
        raise ValueError("No chunks produced")

    return await upsert_chunks(tenant_id, document_id, chunks)


async def remove_document(document_id: str, s3_key: Optional[str] = None):
    await delete_document_chunks(document_id)
    if s3_key:
        try:
            import boto3
            s3 = boto3.client("s3",
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION,
            )
            s3.delete_object(Bucket=settings.S3_BUCKET_NAME, Key=s3_key)
        except Exception as e:
            log.warning("s3_delete_failed", s3_key=s3_key, error=str(e))

"""app/workers/tasks.py"""
from datetime import date
import structlog
from app.workers.celery_app import celery_app, run_async

log = structlog.get_logger()


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60, name="app.workers.tasks.ingest_document_task")
def ingest_document_task(self, tenant_id, document_id, source_type, s3_key=None, url=None):
    async def _run():
        from app.core.database import AsyncSessionLocal
        from app.models.tenant import KBDocument, KBDocStatus
        from app.services.ingestion import ingest_document
        from sqlalchemy import select
        async with AsyncSessionLocal() as db:
            try:
                count = await ingest_document(tenant_id=tenant_id, document_id=document_id, source_type=source_type, s3_key=s3_key, url=url)
                r = await db.execute(select(KBDocument).where(KBDocument.id == document_id))
                doc = r.scalar_one_or_none()
                if doc:
                    doc.chunk_count = count
                    doc.status = KBDocStatus.active
                await db.commit()
            except Exception as e:
                r = await db.execute(select(KBDocument).where(KBDocument.id == document_id))
                doc = r.scalar_one_or_none()
                if doc:
                    doc.status = KBDocStatus.failed
                    doc.error_message = str(e)[:500]
                await db.commit()
                raise
    try:
        run_async(_run())
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(name="app.workers.tasks.reset_monthly_usage")
def reset_monthly_usage():
    if date.today().day != 1:
        return {"skipped": True}
    async def _run():
        from app.core.database import AsyncSessionLocal
        from app.models.tenant import Tenant
        from sqlalchemy import update
        async with AsyncSessionLocal() as db:
            await db.execute(update(Tenant).values(messages_used_this_month=0))
            await db.commit()
    run_async(_run())
    return {"reset": True}

"""app/workers/celery_app.py"""
import asyncio
from celery import Celery
from app.core.config import settings

celery_app = Celery("sme_growth_ai", broker=settings.CELERY_BROKER_URL, backend=settings.CELERY_RESULT_BACKEND, include=["app.workers.tasks"])
celery_app.conf.update(task_serializer="json", accept_content=["json"], result_serializer="json", timezone="Asia/Kolkata", enable_utc=True, task_acks_late=True, worker_prefetch_multiplier=1)

def run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()

"""app/routers/whatsapp.py"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import verify_whatsapp_webhook
from app.models.tenant import Tenant, Conversation, Lead, LeadStatus
from app.services.rag import generate_reply
from app.services.whatsapp import parse_incoming_webhook, send_text_message

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])


@router.get("/webhook")
async def verify(hub_mode: str | None = None, hub_challenge: str | None = None, hub_verify_token: str | None = None):
    if hub_mode == "subscribe" and verify_whatsapp_webhook(hub_verify_token or ""):
        return int(hub_challenge)
    raise HTTPException(403, "Verification failed")


@router.post("/webhook")
async def incoming(request: Request, db: AsyncSession = Depends(get_db)):
    payload  = await request.json()
    messages = parse_incoming_webhook(payload)
    for msg in messages:
        if not msg.get("from") or not msg.get("text"):
            continue
        customer_phone = msg["from"]
        text           = msg["text"]
        tenant_r = await db.execute(
            select(Tenant).where(Tenant.whatsapp_number.isnot(None), Tenant.is_active == True).limit(1)  # noqa: E712
        )
        tenant = tenant_r.scalar_one_or_none()
        if not tenant:
            continue
        try:
            result = await generate_reply(text, tenant, [])
        except Exception:
            await send_text_message(customer_phone, "Abhi thoda technical issue hai. Thodi der mein dobara try karein. 🙏")
            continue
        await send_text_message(customer_phone, result["reply"])
        convo = Conversation(
            id=str(uuid.uuid4()), tenant_id=tenant.id,
            customer_phone=customer_phone, message_in=text, message_out=result["reply"],
            ai_confidence=result["confidence"], escalated=result["escalated"],
            language_detected=result["language"], intent_detected=result["intent"],
            latency_ms=result["latency_ms"],
        )
        db.add(convo)
        tenant.messages_used_this_month += 1
    await db.commit()
    return {"status": "ok"}

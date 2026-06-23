"""app/routers/chat.py"""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import get_current_active_user, get_plan_limits
from app.models.tenant import Tenant, Conversation, Lead, LeadStatus
from app.schemas import ChatRequest, ChatResponse
from app.services.rag import generate_reply

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/", response_model=ChatResponse)
async def chat(req: ChatRequest, current_user=Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
    tenant = r.scalar_one_or_none()
    limits = get_plan_limits(tenant.plan.value)
    if tenant.messages_used_this_month >= limits["messages"]:
        raise HTTPException(429, "Monthly message limit reached. Please upgrade your plan.")

    result = await generate_reply(req.message, tenant, req.conversation_history or [])

    convo = Conversation(
        id=str(uuid.uuid4()), tenant_id=tenant.id,
        customer_phone=req.customer_phone,
        message_in=req.message, message_out=result["reply"],
        ai_confidence=result["confidence"], escalated=result["escalated"],
        language_detected=result["language"], intent_detected=result["intent"],
        latency_ms=result["latency_ms"],
    )
    db.add(convo)

    lead_r = await db.execute(select(Lead).where(Lead.tenant_id == tenant.id, Lead.phone == req.customer_phone))
    lead = lead_r.scalar_one_or_none()
    if not lead:
        lead = Lead(
            id=str(uuid.uuid4()), tenant_id=tenant.id, phone=req.customer_phone,
            intent=result["intent"],
            tag={"pricing":"Pricing","booking":"Booking","location":"Info","complaint":"Complaint","escalation":"Escalation"}.get(result["intent"],"Info"),
            status=LeadStatus.needs_human if result["escalated"] else LeadStatus.ai_handled,
            ai_confidence=result["confidence"],
        )
        db.add(lead)
    else:
        lead.status = LeadStatus.needs_human if result["escalated"] else LeadStatus.ai_handled

    convo.lead_id = lead.id
    tenant.messages_used_this_month += 1
    return ChatResponse(**result)

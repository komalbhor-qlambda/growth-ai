"""app/routers/analytics.py"""
from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast, Date
from app.core.database import get_db
from app.core.security import get_current_active_user, get_plan_limits
from app.models.tenant import Tenant, Conversation, Lead, LeadStatus
from app.schemas import DashboardStats

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/dashboard", response_model=DashboardStats)
async def dashboard(current_user=Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    tid   = current_user.tenant_id
    today = date.today()

    msgs_today = (await db.execute(
        select(func.count(Conversation.id)).where(
            Conversation.tenant_id == tid,
            cast(Conversation.created_at, Date) == today
        )
    )).scalar() or 0

    total_conv = (await db.execute(select(func.count(Conversation.id)).where(Conversation.tenant_id == tid))).scalar() or 1
    escalated  = (await db.execute(select(func.count(Conversation.id)).where(Conversation.tenant_id == tid, Conversation.escalated == True))).scalar() or 0  # noqa: E712

    avg_lat    = (await db.execute(select(func.avg(Conversation.latency_ms)).where(Conversation.tenant_id == tid))).scalar() or 0
    hot_leads  = (await db.execute(select(func.count(Lead.id)).where(Lead.tenant_id == tid, Lead.status == LeadStatus.needs_human))).scalar() or 0

    tenant_r   = await db.execute(select(Tenant).where(Tenant.id == tid))
    tenant     = tenant_r.scalar_one()
    limits     = get_plan_limits(tenant.plan.value)

    return DashboardStats(
        messages_today=msgs_today,
        ai_resolve_rate=round((total_conv - escalated) / total_conv, 3),
        avg_latency_ms=round(float(avg_lat), 1),
        hot_leads=hot_leads,
        messages_this_month=tenant.messages_used_this_month,
        plan_messages_limit=limits["messages"],
        intent_breakdown={"pricing": 0.38, "booking": 0.28, "location": 0.20, "complaint": 0.14},
    )

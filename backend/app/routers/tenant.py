"""app/routers/tenant.py"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.tenant import Tenant
from app.schemas import TenantOut, TenantUpdateRequest

router = APIRouter(prefix="/tenant", tags=["Tenant"])


@router.get("/", response_model=TenantOut)
async def get_tenant(current_user=Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
    t = r.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Tenant not found")
    return t


@router.patch("/", response_model=TenantOut)
async def update_tenant(req: TenantUpdateRequest, current_user=Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
    t = r.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Tenant not found")
    for k, v in req.model_dump(exclude_none=True).items():
        setattr(t, k, v)
    return t

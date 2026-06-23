"""app/routers/auth.py"""
import uuid, hashlib
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    decode_token, get_current_active_user,
)
from app.core.config import settings
from app.models.tenant import Tenant, User
from app.schemas import RegisterRequest, LoginRequest, TokenResponse, RefreshRequest, UserOut

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", status_code=201)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == req.email))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Email already registered")

    slug = req.business_name.lower().replace(" ", "-")[:50] + "-" + str(uuid.uuid4())[:8]
    tenant = Tenant(id=str(uuid.uuid4()), business_name=req.business_name,
                    slug=slug, whatsapp_number=req.whatsapp_number, plan=settings.DEFAULT_PLAN)
    db.add(tenant)

    user = User(id=str(uuid.uuid4()), tenant_id=tenant.id, email=req.email,
                hashed_password=hash_password(req.password),
                full_name=req.full_name, phone=req.phone, is_owner=True)
    db.add(user)
    await db.flush()

    access  = create_access_token({"sub": user.id, "tenant_id": tenant.id})
    refresh = create_refresh_token({"sub": user.id, "tenant_id": tenant.id})
    user.refresh_token_hash = hashlib.sha256(refresh.encode()).hexdigest()
    return {"access_token": access, "refresh_token": refresh, "token_type": "bearer",
            "user": {"id": user.id, "email": user.email, "business": tenant.business_name}}


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    access  = create_access_token({"sub": user.id, "tenant_id": user.tenant_id})
    refresh = create_refresh_token({"sub": user.id, "tenant_id": user.tenant_id})
    user.refresh_token_hash = hashlib.sha256(refresh.encode()).hexdigest()
    return TokenResponse(access_token=access, refresh_token=refresh,
                         expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(req: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(req.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(401, "Not a refresh token")
    result = await db.execute(select(User).where(User.id == payload["sub"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(401, "User not found")
    if user.refresh_token_hash != hashlib.sha256(req.refresh_token.encode()).hexdigest():
        raise HTTPException(401, "Refresh token revoked")
    access  = create_access_token({"sub": user.id, "tenant_id": user.tenant_id})
    refresh = create_refresh_token({"sub": user.id, "tenant_id": user.tenant_id})
    user.refresh_token_hash = hashlib.sha256(refresh.encode()).hexdigest()
    return TokenResponse(access_token=access, refresh_token=refresh,
                         expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)


@router.get("/me", response_model=UserOut)
async def get_me(current_user=Depends(get_current_active_user)):
    return current_user


@router.post("/logout")
async def logout(current_user=Depends(get_current_active_user)):
    current_user.refresh_token_hash = None
    return {"message": "Logged out"}

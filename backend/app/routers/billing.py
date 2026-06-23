"""app/routers/billing.py"""
import uuid, json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.tenant import Tenant, Invoice, BillingCycle, PlanTier, SubscriptionStatus
from app.schemas import CreateOrderRequest, CreateOrderResponse, PaymentVerifyRequest, InvoiceOut
from app.services.payment import create_order, verify_payment_signature, verify_webhook_signature

router = APIRouter(prefix="/billing", tags=["Billing"])

PLAN_INFO = {
    "starter": {"price_monthly":999,  "price_annual":799,  "messages":500,   "leads":200,  "kb_files":3,  "agents":1},
    "growth":  {"price_monthly":2499, "price_annual":1999, "messages":2000,  "leads":1000, "kb_files":10, "agents":3},
    "pro":     {"price_monthly":5999, "price_annual":4799, "messages":10000, "leads":5000, "kb_files":50, "agents":10},
}


@router.get("/plans")
async def get_plans():
    return PLAN_INFO


@router.post("/orders", response_model=CreateOrderResponse)
async def create_payment_order(
    req: CreateOrderRequest,
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    order = create_order(req.plan, req.billing_cycle, current_user.tenant_id)
    inv   = Invoice(
        id=str(uuid.uuid4()), tenant_id=current_user.tenant_id,
        razorpay_order_id=order["order_id"], amount_paise=order["amount"],
        gst_paise=order["gst_paise"], plan=PlanTier(req.plan),
        billing_cycle=BillingCycle(req.billing_cycle), status="pending",
    )
    db.add(inv)
    return CreateOrderResponse(**order)


@router.post("/verify")
async def verify_payment(
    req: PaymentVerifyRequest,
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_payment_signature(req.razorpay_order_id, req.razorpay_payment_id, req.razorpay_signature):
        raise HTTPException(400, "Invalid payment signature")
    inv_r = await db.execute(select(Invoice).where(Invoice.razorpay_order_id == req.razorpay_order_id))
    inv   = inv_r.scalar_one_or_none()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    inv.razorpay_payment_id = req.razorpay_payment_id
    inv.status  = "paid"
    inv.paid_at = datetime.now(timezone.utc).isoformat()
    tenant_r = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
    tenant   = tenant_r.scalar_one()
    tenant.plan = inv.plan
    tenant.subscription_status = SubscriptionStatus.active
    tenant.messages_used_this_month = 0
    return {"status": "success", "plan": inv.plan.value, "message": "Plan upgraded!"}


@router.post("/webhook/razorpay")
async def razorpay_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    body      = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    if not verify_webhook_signature(body, signature):
        raise HTTPException(400, "Invalid webhook signature")
    event = json.loads(body)
    if event.get("event") == "payment.captured":
        order_id = event["payload"]["payment"]["entity"].get("order_id")
        pay_id   = event["payload"]["payment"]["entity"]["id"]
        inv_r    = await db.execute(select(Invoice).where(Invoice.razorpay_order_id == order_id))
        inv      = inv_r.scalar_one_or_none()
        if inv and inv.status != "paid":
            inv.status = "paid"
            inv.razorpay_payment_id = pay_id
    return {"status": "ok"}


@router.get("/invoices", response_model=list[InvoiceOut])
async def list_invoices(current_user=Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    r = await db.execute(
        select(Invoice).where(Invoice.tenant_id == current_user.tenant_id).order_by(Invoice.created_at.desc()).limit(50)
    )
    return r.scalars().all()

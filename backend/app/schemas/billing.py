"""app/schemas/billing.py"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class CreateOrderRequest(BaseModel):
    plan:          str = Field(..., pattern="^(starter|growth|pro)$")
    billing_cycle: str = Field(..., pattern="^(monthly|annual)$")


class CreateOrderResponse(BaseModel):
    order_id:      str
    amount:        int
    currency:      str = "INR"
    key_id:        str
    plan:          str
    billing_cycle: str


class PaymentVerifyRequest(BaseModel):
    razorpay_order_id:   str
    razorpay_payment_id: str
    razorpay_signature:  str


class InvoiceOut(BaseModel):
    id:                  str
    razorpay_order_id:   Optional[str]
    razorpay_payment_id: Optional[str]
    amount_paise:        int
    gst_paise:           int
    plan:                str
    billing_cycle:       str
    status:              str
    paid_at:             Optional[str]
    created_at:          datetime
    model_config = {"from_attributes": True}


class DashboardStats(BaseModel):
    messages_today:       int
    ai_resolve_rate:      float
    avg_latency_ms:       float
    hot_leads:            int
    messages_this_month:  int
    plan_messages_limit:  int
    intent_breakdown:     dict

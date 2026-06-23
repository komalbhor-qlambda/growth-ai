"""app/services/payment.py — Razorpay integration."""
import hashlib, hmac, time
import razorpay
from app.core.config import settings

_rzp = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

PLAN_PRICING = {
    "starter": {"monthly": 99900,  "annual": 79900  * 12},
    "growth":  {"monthly": 249900, "annual": 199900 * 12},
    "pro":     {"monthly": 599900, "annual": 479900 * 12},
}
GST_RATE = 0.18


def get_amount_with_gst(plan: str, cycle: str) -> dict:
    base = PLAN_PRICING[plan][cycle]
    gst  = int(base * GST_RATE)
    return {"base_paise": base, "gst_paise": gst, "total_paise": base + gst}


def create_order(plan: str, billing_cycle: str, tenant_id: str) -> dict:
    amounts = get_amount_with_gst(plan, billing_cycle)
    order = _rzp.order.create({
        "amount":   amounts["total_paise"],
        "currency": "INR",
        "receipt":  f"rcpt_{tenant_id[:8]}_{int(time.time())}",
        "notes":    {"tenant_id": tenant_id, "plan": plan, "billing_cycle": billing_cycle},
    })
    return {
        "order_id":     order["id"],
        "amount":       amounts["total_paise"],
        "base_paise":   amounts["base_paise"],
        "gst_paise":    amounts["gst_paise"],
        "currency":     "INR",
        "key_id":       settings.RAZORPAY_KEY_ID,
        "plan":         plan,
        "billing_cycle": billing_cycle,
    }


def verify_payment_signature(order_id: str, payment_id: str, signature: str) -> bool:
    msg = f"{order_id}|{payment_id}"
    exp = hmac.new(settings.RAZORPAY_KEY_SECRET.encode(), msg.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(exp, signature)


def verify_webhook_signature(body: bytes, signature: str) -> bool:
    exp = hmac.new(settings.RAZORPAY_WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(exp, signature)

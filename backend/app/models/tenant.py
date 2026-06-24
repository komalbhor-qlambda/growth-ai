"""app/models/tenant.py — All ORM models."""
import enum
from sqlalchemy import (
    String, Boolean, Integer, Float, Text, ForeignKey, Enum as SAEnum
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base, TimestampMixin, UUIDMixin


class SubscriptionStatus(str, enum.Enum):
    trialing  = "trialing"
    active    = "active"
    past_due  = "past_due"
    cancelled = "cancelled"
    expired   = "expired"


class PlanTier(str, enum.Enum):
    starter = "starter"
    growth  = "growth"
    pro     = "pro"


class Tenant(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "tenants"

    business_name:         Mapped[str]       = mapped_column(String(200), nullable=False)
    slug:                  Mapped[str]       = mapped_column(String(100), unique=True, nullable=False)
    whatsapp_number:       Mapped[str|None]  = mapped_column(String(20))
    location:              Mapped[str|None]  = mapped_column(String(300))
    website:               Mapped[str|None]  = mapped_column(String(300))
    ai_persona:            Mapped[str]       = mapped_column(Text, default="Friendly assistant. Reply in Hinglish.")
    confidence_threshold:  Mapped[float]     = mapped_column(Float, default=0.70)
    escalation_keywords:   Mapped[str]       = mapped_column(Text, default="Complain,Owner,Manager,Refund")
    hinglish_mode:         Mapped[bool]      = mapped_column(Boolean, default=True)
    voice_enabled:         Mapped[bool]      = mapped_column(Boolean, default=True)
    is_active:             Mapped[bool]      = mapped_column(Boolean, default=True)
    plan:                  Mapped[PlanTier]  = mapped_column(SAEnum(PlanTier, native_enum=False), default=PlanTier.starter)
    subscription_status:   Mapped[SubscriptionStatus] = mapped_column(SAEnum(SubscriptionStatus, native_enum=False), default=SubscriptionStatus.trialing)
    razorpay_subscription_id: Mapped[str|None] = mapped_column(String(100))
    razorpay_customer_id:     Mapped[str|None] = mapped_column(String(100))
    messages_used_this_month: Mapped[int]    = mapped_column(Integer, default=0)

    users:         Mapped[list["User"]]         = relationship("User",         back_populates="tenant", cascade="all, delete-orphan")
    leads:         Mapped[list["Lead"]]         = relationship("Lead",         back_populates="tenant", cascade="all, delete-orphan")
    kb_documents:  Mapped[list["KBDocument"]]   = relationship("KBDocument",   back_populates="tenant", cascade="all, delete-orphan")
    conversations: Mapped[list["Conversation"]] = relationship("Conversation", back_populates="tenant", cascade="all, delete-orphan")
    invoices:      Mapped[list["Invoice"]]      = relationship("Invoice",      back_populates="tenant", cascade="all, delete-orphan")


class User(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "users"

    tenant_id:          Mapped[str]      = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    email:              Mapped[str]      = mapped_column(String(254), unique=True, nullable=False, index=True)
    hashed_password:    Mapped[str]      = mapped_column(String(200), nullable=False)
    full_name:          Mapped[str]      = mapped_column(String(200), nullable=False)
    phone:              Mapped[str|None] = mapped_column(String(20))
    is_active:          Mapped[bool]     = mapped_column(Boolean, default=True)
    is_owner:           Mapped[bool]     = mapped_column(Boolean, default=False)
    refresh_token_hash: Mapped[str|None] = mapped_column(String(200))

    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="users")


class LeadStatus(str, enum.Enum):
    ai_handled  = "ai_handled"
    needs_human = "needs_human"
    converted   = "converted"
    closed      = "closed"


class Lead(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "leads"

    tenant_id:    Mapped[str]           = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    name:         Mapped[str|None]      = mapped_column(String(200))
    phone:        Mapped[str]           = mapped_column(String(20), nullable=False)
    intent:       Mapped[str|None]      = mapped_column(String(500))
    tag:          Mapped[str|None]      = mapped_column(String(50))
    status:       Mapped[LeadStatus]    = mapped_column(SAEnum(LeadStatus, native_enum=False), default=LeadStatus.ai_handled)
    ai_confidence: Mapped[float|None]   = mapped_column(Float)
    channel:      Mapped[str]           = mapped_column(String(30), default="whatsapp")
    notes:        Mapped[str|None]      = mapped_column(Text)

    tenant:        Mapped["Tenant"]          = relationship("Tenant", back_populates="leads")
    conversations: Mapped[list["Conversation"]] = relationship("Conversation", back_populates="lead")


class KBDocStatus(str, enum.Enum):
    processing = "processing"
    active     = "active"
    outdated   = "outdated"
    failed     = "failed"


class KBDocument(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "kb_documents"

    tenant_id:       Mapped[str]         = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    name:            Mapped[str]         = mapped_column(String(300), nullable=False)
    source_type:     Mapped[str]         = mapped_column(String(10), nullable=False)
    s3_key:          Mapped[str|None]    = mapped_column(String(500))
    source_url:      Mapped[str|None]    = mapped_column(String(500))
    file_size_bytes: Mapped[int|None]    = mapped_column(Integer)
    chunk_count:     Mapped[int]         = mapped_column(Integer, default=0)
    status:          Mapped[KBDocStatus] = mapped_column(SAEnum(KBDocStatus, native_enum=False), default=KBDocStatus.processing)
    error_message:   Mapped[str|None]    = mapped_column(Text)

    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="kb_documents")


class Conversation(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "conversations"

    tenant_id:        Mapped[str]      = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    lead_id:          Mapped[str|None] = mapped_column(ForeignKey("leads.id", ondelete="SET NULL"))
    customer_phone:   Mapped[str]      = mapped_column(String(20), nullable=False)
    message_in:       Mapped[str]      = mapped_column(Text, nullable=False)
    message_out:      Mapped[str|None] = mapped_column(Text)
    ai_confidence:    Mapped[float|None] = mapped_column(Float)
    escalated:        Mapped[bool]     = mapped_column(Boolean, default=False)
    language_detected: Mapped[str|None] = mapped_column(String(30))
    intent_detected:  Mapped[str|None] = mapped_column(String(200))
    latency_ms:       Mapped[int|None] = mapped_column(Integer)

    tenant: Mapped["Tenant"]    = relationship("Tenant", back_populates="conversations")
    lead:   Mapped["Lead|None"] = relationship("Lead",   back_populates="conversations")


class BillingCycle(str, enum.Enum):
    monthly = "monthly"
    annual  = "annual"


class Invoice(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "invoices"

    tenant_id:           Mapped[str]          = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    razorpay_order_id:   Mapped[str|None]     = mapped_column(String(100), unique=True)
    razorpay_payment_id: Mapped[str|None]     = mapped_column(String(100))
    amount_paise:        Mapped[int]          = mapped_column(Integer, nullable=False)
    gst_paise:           Mapped[int]          = mapped_column(Integer, default=0)
    plan:                Mapped[PlanTier]     = mapped_column(SAEnum(PlanTier, native_enum=False), nullable=False)
    billing_cycle:       Mapped[BillingCycle] = mapped_column(SAEnum(BillingCycle, native_enum=False), default=BillingCycle.monthly)
    status:              Mapped[str]          = mapped_column(String(20), default="pending")
    paid_at:             Mapped[str|None]     = mapped_column(String(50))

    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="invoices")

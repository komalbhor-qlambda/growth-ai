"""Initial migration — create all tables.

Revision ID: 001_initial
Revises:
Create Date: 2025-04-21
"""
from alembic import op
import sqlalchemy as sa

revision = "001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("tenants",
        sa.Column("id",                       sa.String(36), primary_key=True),
        sa.Column("business_name",            sa.String(200), nullable=False),
        sa.Column("slug",                     sa.String(100), unique=True, nullable=False),
        sa.Column("whatsapp_number",          sa.String(20)),
        sa.Column("location",                 sa.String(300)),
        sa.Column("website",                  sa.String(300)),
        sa.Column("ai_persona",               sa.Text, server_default="Friendly assistant."),
        sa.Column("confidence_threshold",     sa.Float, server_default="0.70"),
        sa.Column("escalation_keywords",      sa.Text, server_default="Complain,Owner,Manager,Refund"),
        sa.Column("hinglish_mode",            sa.Boolean, server_default="true"),
        sa.Column("voice_enabled",            sa.Boolean, server_default="true"),
        sa.Column("is_active",                sa.Boolean, server_default="true"),
        sa.Column("plan",                     sa.String(20), server_default="starter"),
        sa.Column("subscription_status",      sa.String(20), server_default="trialing"),
        sa.Column("razorpay_subscription_id", sa.String(100)),
        sa.Column("razorpay_customer_id",     sa.String(100)),
        sa.Column("messages_used_this_month", sa.Integer, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table("users",
        sa.Column("id",                 sa.String(36), primary_key=True),
        sa.Column("tenant_id",          sa.String(36), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("email",              sa.String(254), unique=True, nullable=False),
        sa.Column("hashed_password",    sa.String(200), nullable=False),
        sa.Column("full_name",          sa.String(200), nullable=False),
        sa.Column("phone",              sa.String(20)),
        sa.Column("is_active",          sa.Boolean, server_default="true"),
        sa.Column("is_owner",           sa.Boolean, server_default="false"),
        sa.Column("refresh_token_hash", sa.String(200)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_users_email",     "users", ["email"])
    op.create_index("ix_users_tenant_id", "users", ["tenant_id"])

    op.create_table("leads",
        sa.Column("id",           sa.String(36), primary_key=True),
        sa.Column("tenant_id",    sa.String(36), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name",         sa.String(200)),
        sa.Column("phone",        sa.String(20), nullable=False),
        sa.Column("intent",       sa.String(500)),
        sa.Column("tag",          sa.String(50)),
        sa.Column("status",       sa.String(20), server_default="ai_handled"),
        sa.Column("ai_confidence", sa.Float),
        sa.Column("channel",      sa.String(30), server_default="whatsapp"),
        sa.Column("notes",        sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_leads_tenant_id", "leads", ["tenant_id"])

    op.create_table("kb_documents",
        sa.Column("id",              sa.String(36), primary_key=True),
        sa.Column("tenant_id",       sa.String(36), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name",            sa.String(300), nullable=False),
        sa.Column("source_type",     sa.String(10),  nullable=False),
        sa.Column("s3_key",          sa.String(500)),
        sa.Column("source_url",      sa.String(500)),
        sa.Column("file_size_bytes", sa.Integer),
        sa.Column("chunk_count",     sa.Integer, server_default="0"),
        sa.Column("status",          sa.String(20), server_default="processing"),
        sa.Column("error_message",   sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_kb_tenant_id", "kb_documents", ["tenant_id"])

    op.create_table("conversations",
        sa.Column("id",               sa.String(36), primary_key=True),
        sa.Column("tenant_id",        sa.String(36), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("lead_id",          sa.String(36), sa.ForeignKey("leads.id", ondelete="SET NULL")),
        sa.Column("customer_phone",   sa.String(20), nullable=False),
        sa.Column("message_in",       sa.Text,       nullable=False),
        sa.Column("message_out",      sa.Text),
        sa.Column("ai_confidence",    sa.Float),
        sa.Column("escalated",        sa.Boolean, server_default="false"),
        sa.Column("language_detected", sa.String(30)),
        sa.Column("intent_detected",  sa.String(200)),
        sa.Column("latency_ms",       sa.Integer),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_conv_tenant_id", "conversations", ["tenant_id"])

    op.create_table("invoices",
        sa.Column("id",                  sa.String(36), primary_key=True),
        sa.Column("tenant_id",           sa.String(36), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("razorpay_order_id",   sa.String(100), unique=True),
        sa.Column("razorpay_payment_id", sa.String(100)),
        sa.Column("amount_paise",        sa.Integer, nullable=False),
        sa.Column("gst_paise",           sa.Integer, server_default="0"),
        sa.Column("plan",                sa.String(20), nullable=False),
        sa.Column("billing_cycle",       sa.String(20), server_default="monthly"),
        sa.Column("status",              sa.String(20), server_default="pending"),
        sa.Column("paid_at",             sa.String(50)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_invoices_tenant_id", "invoices", ["tenant_id"])


def downgrade() -> None:
    op.drop_table("invoices")
    op.drop_table("conversations")
    op.drop_table("kb_documents")
    op.drop_table("leads")
    op.drop_table("users")
    op.drop_table("tenants")

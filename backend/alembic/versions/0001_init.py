"""Subscriptions, usage logs, and cached AI output.

Revision ID: 0001_init
Revises:
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql as pg

revision = "0001_init"
down_revision = None
branch_labels = None
depends_on = None

TABLES = ("subscriptions", "usage_logs", "insights", "summaries")
ENUMS = {
    "billing_cycle": ("weekly", "monthly", "yearly"),
    "category": ("streaming", "software", "fitness", "other"),
    "subscription_status": ("active", "cancelled"),
    "decision": ("keeping", "cancelled"),
    "usage_rating": ("rarely", "sometimes", "often"),
    "recommendation": ("keep", "downgrade", "cancel"),
}


def _enum(name: str) -> pg.ENUM:
    return pg.ENUM(*ENUMS[name], name=name, create_type=False)


def upgrade() -> None:
    for name, values in ENUMS.items():
        pg.ENUM(*values, name=name).create(op.get_bind(), checkfirst=True)

    op.create_table(
        "subscriptions",
        sa.Column("id", pg.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", pg.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("cost", sa.Numeric(10, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="USD"),
        sa.Column("billing_cycle", _enum("billing_cycle"), nullable=False),
        sa.Column("category", _enum("category"), nullable=False),
        sa.Column("renewal_anchor", sa.Date, nullable=False),
        sa.Column("status", _enum("subscription_status"), nullable=False, server_default="active"),
        sa.Column("decision", _enum("decision"), nullable=True),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_on", sa.Date, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("cost > 0", name="ck_subscriptions_cost_positive"),
    )
    op.create_index("ix_subscriptions_user_status", "subscriptions", ["user_id", "status"])

    op.create_table(
        "usage_logs",
        sa.Column("id", pg.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "subscription_id",
            pg.UUID(as_uuid=True),
            sa.ForeignKey("subscriptions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("user_id", pg.UUID(as_uuid=True), nullable=False),
        sa.Column("rating", _enum("usage_rating"), nullable=False),
        sa.Column("logged_on", sa.Date, nullable=False),
        sa.UniqueConstraint("subscription_id", "logged_on", name="uq_usage_one_per_day"),
    )
    op.create_index("ix_usage_logs_subscription_id", "usage_logs", ["subscription_id"])
    op.create_index("ix_usage_logs_user_id", "usage_logs", ["user_id"])

    op.create_table(
        "insights",
        sa.Column(
            "subscription_id",
            pg.UUID(as_uuid=True),
            sa.ForeignKey("subscriptions.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("recommendation", _enum("recommendation"), nullable=False),
        sa.Column("body", sa.Text, nullable=False),
        sa.Column("input_hash", sa.String(64), nullable=False),
        sa.Column("model", sa.String(64), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "summaries",
        sa.Column("user_id", pg.UUID(as_uuid=True), primary_key=True),
        sa.Column("body", sa.Text, nullable=False),
        sa.Column(
            "focus_subscription_id",
            pg.UUID(as_uuid=True),
            sa.ForeignKey("subscriptions.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("input_hash", sa.String(64), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # Supabase exposes the public schema through its REST API to anyone holding
    # the anon key. RLS with no policies closes that door; the backend connects
    # as the table owner, which bypasses RLS.
    for table in (*TABLES, "alembic_version"):
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    for table in reversed(TABLES):
        op.drop_table(table)
    for name in ENUMS:
        pg.ENUM(name=name).drop(op.get_bind(), checkfirst=True)

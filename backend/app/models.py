import enum
import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class BillingCycle(str, enum.Enum):
    weekly = "weekly"
    monthly = "monthly"
    yearly = "yearly"


class Category(str, enum.Enum):
    streaming = "streaming"
    software = "software"
    fitness = "fitness"
    other = "other"


class Status(str, enum.Enum):
    active = "active"
    cancelled = "cancelled"


class Decision(str, enum.Enum):
    keeping = "keeping"
    cancelled = "cancelled"


class Rating(str, enum.Enum):
    rarely = "rarely"
    sometimes = "sometimes"
    often = "often"


class Recommendation(str, enum.Enum):
    keep = "keep"
    downgrade = "downgrade"
    cancel = "cancel"


def _enum(e: type[enum.Enum], name: str) -> Enum:
    return Enum(e, name=name, values_callable=lambda x: [m.value for m in x])


class Subscription(Base):
    __tablename__ = "subscriptions"
    __table_args__ = (Index("ix_subscriptions_user_status", "user_id", "status"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    name: Mapped[str] = mapped_column(String(120))
    cost: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    currency: Mapped[str] = mapped_column(String(3), default="USD", server_default="USD")
    billing_cycle: Mapped[BillingCycle] = mapped_column(_enum(BillingCycle, "billing_cycle"))
    category: Mapped[Category] = mapped_column(_enum(Category, "category"))
    # The date the user entered as their next renewal. Later renewals are derived
    # from it, so month-end dates (Jan 31) don't drift after a short month.
    renewal_anchor: Mapped[date] = mapped_column(Date)
    status: Mapped[Status] = mapped_column(
        _enum(Status, "subscription_status"), default=Status.active, server_default="active"
    )
    decision: Mapped[Decision | None] = mapped_column(_enum(Decision, "decision"), nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class UsageLog(Base):
    __tablename__ = "usage_logs"
    __table_args__ = (UniqueConstraint("subscription_id", "logged_on", name="uq_usage_one_per_day"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subscription_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subscriptions.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    rating: Mapped[Rating] = mapped_column(_enum(Rating, "usage_rating"))
    logged_on: Mapped[date] = mapped_column(Date)


class Insight(Base):
    __tablename__ = "insights"

    subscription_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subscriptions.id", ondelete="CASCADE"), primary_key=True
    )
    recommendation: Mapped[Recommendation] = mapped_column(_enum(Recommendation, "recommendation"))
    body: Mapped[str] = mapped_column(Text)
    input_hash: Mapped[str] = mapped_column(String(64))
    model: Mapped[str] = mapped_column(String(64))
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Summary(Base):
    __tablename__ = "summaries"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    body: Mapped[str] = mapped_column(Text)
    focus_subscription_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subscriptions.id", ondelete="SET NULL"), nullable=True
    )
    input_hash: Mapped[str] = mapped_column(String(64))
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

import uuid
from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models import BillingCycle, Category, Decision, Rating, Recommendation, Status


class SubscriptionIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    cost: Decimal = Field(gt=0, le=100_000, decimal_places=2)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    billing_cycle: BillingCycle
    category: Category
    renewal_date: date


class SubscriptionPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    cost: Decimal | None = Field(default=None, gt=0, le=100_000, decimal_places=2)
    billing_cycle: BillingCycle | None = None
    category: Category | None = None
    renewal_date: date | None = None


class LastRating(BaseModel):
    rating: Rating
    on: date


class SubscriptionOut(BaseModel):
    id: uuid.UUID
    name: str
    cost: float
    currency: str
    billing_cycle: BillingCycle
    category: Category
    monthly_cost: float
    next_renewal: date
    days_until_renewal: int
    status: Status
    decision: Decision | None
    cancelled_on: date | None
    saved: float
    ratings: list[LastRating]
    rated_today: bool


class UsageIn(BaseModel):
    rating: Rating


class DecisionIn(BaseModel):
    decision: Decision


class InsightOut(BaseModel):
    recommendation: Recommendation | None
    body: str | None
    stale: bool = False


class SummaryOut(BaseModel):
    monthly_total: float
    annual_total: float
    money_saved: float
    active_count: int


class NoteOut(BaseModel):
    body: str | None
    focus_subscription_id: uuid.UUID | None
    focus_name: str | None
    stale: bool = False


class CategoryStat(BaseModel):
    category: Category
    monthly_total: float
    count: int

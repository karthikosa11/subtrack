import uuid
from datetime import date
from decimal import Decimal

from app.models import BillingCycle, Category, Status, Subscription
from app.services.money import annual_total, category_totals, monthly_equivalent, monthly_total
from app.services.savings import saved_by, total_saved

M, W, Y = BillingCycle.monthly, BillingCycle.weekly, BillingCycle.yearly


def sub(cost: str, cycle: BillingCycle, category=Category.streaming, **kw) -> Subscription:
    return Subscription(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        name="x",
        cost=Decimal(cost),
        billing_cycle=cycle,
        category=category,
        renewal_anchor=kw.pop("anchor", date(2026, 1, 10)),
        status=kw.pop("status", Status.active),
        **kw,
    )


def test_monthly_equivalents():
    assert monthly_equivalent(Decimal("12"), M) == Decimal("12")
    assert monthly_equivalent(Decimal("120"), Y) == Decimal("10")
    assert monthly_equivalent(Decimal("3"), W) == Decimal("13")


def test_totals_round_to_cents():
    subs = [sub("15.99", M), sub("99.99", Y), sub("2.50", W)]
    # 15.99 + 8.3325 + 10.8333... = 35.1558...
    assert monthly_total(subs) == Decimal("35.16")
    assert annual_total(subs) == Decimal("421.87")


def test_category_totals():
    subs = [sub("10", M), sub("5", M), sub("120", Y, Category.software)]
    assert category_totals(subs) == {Category.streaming: Decimal("15.00"), Category.software: Decimal("10.00")}


def test_cancelling_counts_first_skipped_renewal_immediately():
    saved = saved_by(Decimal("15.99"), date(2026, 1, 10), M, cancelled_on=date(2026, 9, 29), today=date(2026, 9, 29))
    assert saved == Decimal("15.99")


def test_savings_accrue_per_skipped_renewal():
    # Cancelled Sep 29; skipped Oct 10, Nov 10, Dec 10.
    saved = saved_by(Decimal("10"), date(2026, 1, 10), M, cancelled_on=date(2026, 9, 29), today=date(2026, 12, 10))
    assert saved == Decimal("30")


def test_cancelling_on_renewal_day_skips_that_renewal():
    saved = saved_by(Decimal("10"), date(2026, 1, 10), M, cancelled_on=date(2026, 9, 10), today=date(2026, 9, 10))
    assert saved == Decimal("10")


def test_total_saved_ignores_active():
    subs = [
        sub("10", M),
        sub("10", M, status=Status.cancelled, cancelled_on=date(2026, 9, 29)),
        sub("120", Y, status=Status.cancelled, cancelled_on=date(2026, 9, 29)),
    ]
    assert total_saved(subs, date(2026, 9, 29)) == Decimal("130.00")

from collections import defaultdict
from collections.abc import Iterable
from decimal import ROUND_HALF_UP, Decimal

from app.models import BillingCycle, Category, Subscription

CENT = Decimal("0.01")


def cents(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


def monthly_equivalent(cost: Decimal, cycle: BillingCycle) -> Decimal:
    if cycle == BillingCycle.weekly:
        return cost * 52 / 12
    if cycle == BillingCycle.yearly:
        return cost / 12
    return cost


def monthly_total(subs: Iterable[Subscription]) -> Decimal:
    return cents(sum((monthly_equivalent(s.cost, s.billing_cycle) for s in subs), Decimal(0)))


def annual_total(subs: Iterable[Subscription]) -> Decimal:
    return cents(sum((monthly_equivalent(s.cost, s.billing_cycle) * 12 for s in subs), Decimal(0)))


def category_totals(subs: Iterable[Subscription]) -> dict[Category, Decimal]:
    totals: dict[Category, Decimal] = defaultdict(lambda: Decimal(0))
    for s in subs:
        totals[s.category] += monthly_equivalent(s.cost, s.billing_cycle)
    return {c: cents(v) for c, v in totals.items()}

"""Renewal date math.

Each subscription stores the renewal date the user entered (its anchor). Every
later renewal is anchor + k cycles, computed from the anchor each time, so a
Jan 31 monthly plan renews Feb 28 and then Mar 31, not Mar 28.
"""

import calendar
from collections.abc import Iterator
from datetime import date, timedelta

from app.models import BillingCycle


def _add_months(d: date, months: int) -> date:
    total = d.month - 1 + months
    year, month = d.year + total // 12, total % 12 + 1
    day = min(d.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def nth_renewal(anchor: date, cycle: BillingCycle, k: int) -> date:
    if cycle == BillingCycle.weekly:
        return anchor + timedelta(weeks=k)
    if cycle == BillingCycle.monthly:
        return _add_months(anchor, k)
    return _add_months(anchor, 12 * k)


def _index_on_or_after(anchor: date, cycle: BillingCycle, day: date) -> int:
    """Smallest k >= 0 whose renewal falls on or after `day`."""
    if anchor >= day:
        return 0
    if cycle == BillingCycle.weekly:
        k = (day - anchor).days // 7
    elif cycle == BillingCycle.monthly:
        k = (day.year - anchor.year) * 12 + (day.month - anchor.month) - 1
    else:
        k = day.year - anchor.year - 1
    k = max(k, 0)
    while nth_renewal(anchor, cycle, k) < day:
        k += 1
    return k


def next_renewal(anchor: date, cycle: BillingCycle, today: date) -> date:
    return nth_renewal(anchor, cycle, _index_on_or_after(anchor, cycle, today))


def renewals_between(anchor: date, cycle: BillingCycle, start: date, end: date) -> Iterator[date]:
    """Every renewal date in [start, end]."""
    k = _index_on_or_after(anchor, cycle, start)
    while (d := nth_renewal(anchor, cycle, k)) <= end:
        yield d
        k += 1


def days_until(d: date, today: date) -> int:
    return (d - today).days

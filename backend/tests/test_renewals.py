from datetime import date

from app.models import BillingCycle
from app.services.renewals import days_until, next_renewal, renewals_between

M, W, Y = BillingCycle.monthly, BillingCycle.weekly, BillingCycle.yearly


def test_future_anchor_is_the_next_renewal():
    assert next_renewal(date(2026, 10, 5), M, date(2026, 9, 29)) == date(2026, 10, 5)


def test_renewal_today_counts_as_next():
    assert next_renewal(date(2026, 9, 29), M, date(2026, 9, 29)) == date(2026, 9, 29)


def test_monthly_rolls_forward():
    assert next_renewal(date(2026, 1, 15), M, date(2026, 9, 29)) == date(2026, 10, 15)


def test_month_end_clamps_without_drifting():
    anchor = date(2026, 1, 31)
    assert next_renewal(anchor, M, date(2026, 2, 1)) == date(2026, 2, 28)
    assert next_renewal(anchor, M, date(2026, 3, 1)) == date(2026, 3, 31)
    assert next_renewal(anchor, M, date(2026, 4, 1)) == date(2026, 4, 30)


def test_leap_day_monthly_and_yearly():
    assert next_renewal(date(2028, 1, 29), M, date(2028, 2, 1)) == date(2028, 2, 29)
    assert next_renewal(date(2028, 2, 29), Y, date(2028, 3, 1)) == date(2029, 2, 28)
    assert next_renewal(date(2028, 2, 29), Y, date(2031, 6, 1)) == date(2032, 2, 29)


def test_weekly():
    assert next_renewal(date(2026, 9, 1), W, date(2026, 9, 29)) == date(2026, 9, 29)
    assert next_renewal(date(2026, 9, 1), W, date(2026, 9, 30)) == date(2026, 10, 6)


def test_yearly():
    assert next_renewal(date(2024, 3, 10), Y, date(2026, 9, 29)) == date(2027, 3, 10)


def test_renewals_between_is_inclusive():
    dates = list(renewals_between(date(2026, 1, 10), M, date(2026, 3, 10), date(2026, 5, 10)))
    assert dates == [date(2026, 3, 10), date(2026, 4, 10), date(2026, 5, 10)]


def test_days_until():
    assert days_until(date(2026, 10, 2), date(2026, 9, 29)) == 3

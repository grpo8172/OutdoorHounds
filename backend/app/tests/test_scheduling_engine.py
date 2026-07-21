import datetime

from app.ai.scheduling_engine import resolve_booking, resolve_relative_day

# 2026-07-21 is a Tuesday.
TUESDAY = datetime.date(2026, 7, 21)


def test_this_weekday_is_soonest_occurrence():
    assert resolve_relative_day("this_wednesday", TUESDAY) == datetime.date(2026, 7, 22)


def test_next_weekday_is_always_the_following_week():
    # Deterministic, fixed interpretation: "next_wednesday" always skips to
    # next week's Wednesday, even though this week's hasn't happened yet.
    assert resolve_relative_day("next_wednesday", TUESDAY) == datetime.date(2026, 7, 29)


def test_next_weekday_is_consistent_across_calls():
    # This is the exact bug we saw with the raw LLM: two near-identical
    # requests for "next Wednesday" returned different dates. The engine
    # must be a pure function of (reference, today).
    first = resolve_relative_day("next_wednesday", TUESDAY)
    second = resolve_relative_day("next_wednesday", TUESDAY)
    assert first == second == datetime.date(2026, 7, 29)


def test_today_and_tomorrow():
    assert resolve_relative_day("today", TUESDAY) == TUESDAY
    assert resolve_relative_day("tomorrow", TUESDAY) == datetime.date(2026, 7, 22)


def test_unknown_reference_returns_none():
    assert resolve_relative_day("next_fortnight", TUESDAY) is None
    assert resolve_relative_day(None, TUESDAY) is None


def test_explicit_date_wins_over_relative_day():
    result = resolve_booking(
        explicit_date="2026-08-15", relative_day="next_wednesday",
        time_of_day=None, explicit_time="12:00",
        today=TUESDAY, booked_dates=set(),
    )
    assert result["proposed_date"] == "2026-08-15"
    assert result["proposed_time"] == "12:00"
    assert result["confidence"] == 100
    assert result["shifted_due_to_conflict"] is False


def test_time_of_day_maps_to_default_time():
    result = resolve_booking(
        explicit_date=None, relative_day="this_saturday",
        time_of_day="morning", explicit_time=None,
        today=TUESDAY, booked_dates=set(),
    )
    assert result["proposed_date"] == "2026-07-25"
    assert result["proposed_time"] == "09:00"


def test_conflict_shifts_to_next_available_day():
    result = resolve_booking(
        explicit_date="2026-07-26", relative_day=None,
        time_of_day=None, explicit_time="14:00",
        today=TUESDAY, booked_dates={"2026-07-26", "2026-07-27"},
    )
    assert result["proposed_date"] == "2026-07-28"
    assert result["shifted_due_to_conflict"] is True
    assert result["confidence"] < 100


def test_past_date_is_rejected():
    result = resolve_booking(
        explicit_date="2020-01-01", relative_day=None,
        time_of_day=None, explicit_time=None,
        today=TUESDAY, booked_dates=set(),
    )
    assert result["proposed_date"] is None


def test_no_resolvable_date_returns_none():
    result = resolve_booking(
        explicit_date=None, relative_day=None,
        time_of_day="morning", explicit_time=None,
        today=TUESDAY, booked_dates=set(),
    )
    assert result["proposed_date"] is None

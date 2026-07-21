from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import domain as models
from app.ai.booking_agent import propose_booking


def _session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


def test_propose_booking_falls_back_when_llm_unavailable(monkeypatch):
    # MockLLMProvider (the default when LLM_ENABLED=false) doesn't return a
    # proposed_date at all, so the agent must degrade to manual review
    # rather than raise or silently confirm a bogus booking.
    monkeypatch.setenv("LLM_ENABLED", "false")
    db = _session()
    item = models.CatalogueItem(item_type="service", name="Dog Walking", description="30 min walk", tenant_id=1)
    db.add(item)
    db.commit()
    db.refresh(item)

    enquiry = models.Enquiry(item_id=item.id, message="Any time next week works", status="pending", tenant_id=1)
    db.add(enquiry)
    db.commit()
    db.refresh(enquiry)

    result = propose_booking(db, enquiry, item)

    assert result["proposed_date"] is None
    assert result["ai_confidence"] == 0
    assert "manual review" in result["ai_reasoning"].lower()


def test_propose_booking_shifts_past_already_booked_dates(monkeypatch):
    # The LLM only extracts intent now (explicit_date/relative_day/etc.) —
    # the deterministic scheduling engine (app.ai.scheduling_engine) is what
    # actually resolves conflicts, by shifting forward to the next free day
    # rather than giving up outright.
    class FakeProvider:
        def generate_json(self, prompt):
            return {
                "explicit_date": "2026-08-01", "relative_day": None,
                "time_of_day": None, "explicit_time": "10:00",
                "reasoning": "Customer asked for this exact date.",
            }

    monkeypatch.setattr("app.ai.booking_agent.get_llm_provider", lambda: FakeProvider())

    db = _session()
    item = models.CatalogueItem(item_type="service", name="Dog Walking", description="30 min walk", tenant_id=1)
    db.add(item)
    db.commit()
    db.refresh(item)

    already_booked = models.Enquiry(item_id=item.id, message="prior booking", status="approved", tenant_id=1, booking_date="2026-08-01")
    db.add(already_booked)
    db.commit()

    enquiry = models.Enquiry(item_id=item.id, message="I'd like Aug 1st too", status="pending", tenant_id=1)
    db.add(enquiry)
    db.commit()
    db.refresh(enquiry)

    result = propose_booking(db, enquiry, item)

    assert result["proposed_date"] == "2026-08-02"
    assert "already booked" in result["ai_reasoning"].lower()

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List
import os

from app.database import engine, Base, get_db
from app.models import domain as models
from app.schemas import domain as schemas
from app.llm.factory import get_llm_provider, LLMProvider
from app.policy.guardrails import require_approval, validate_assistant_response

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Outdoor Hounds API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _log(db: Session, event_type: str, details: str) -> None:
    """Append an immutable audit event. Centralised so every state change is traceable."""
    db.add(models.AuditEvent(event_type=event_type, details=details))


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.get("/api/items", response_model=List[schemas.CatalogueItemResponse])
def get_items(db: Session = Depends(get_db)):
    """Public storefront: only approved listings are visible to customers."""
    return db.query(models.CatalogueItem).filter(models.CatalogueItem.status == "approved").all()


@app.get("/api/items/pending", response_model=List[schemas.CatalogueItemResponse])
def get_pending_items(db: Session = Depends(get_db)):
    """Admin review queue: items proposed by the assistant awaiting owner approval."""
    return db.query(models.CatalogueItem).filter(models.CatalogueItem.status == "pending_review").all()


@app.post("/api/items", response_model=schemas.CatalogueItemResponse)
def create_item(item: schemas.CatalogueItemCreate, db: Session = Depends(get_db)):
    """Proposing a listing never publishes it; it enters pending_review for owner approval."""
    db_item = models.CatalogueItem(**item.model_dump(), status="pending_review")
    db.add(db_item)
    _log(db, "item_proposed", f"Item '{item.name}' proposed (pending_review).")
    db.commit()
    db.refresh(db_item)
    return db_item


@app.post("/api/items/{item_id}/approve")
def approve_item(item_id: int, db: Session = Depends(get_db)):
    """Owner approval gate: the only path that makes a listing publicly visible."""
    item = db.query(models.CatalogueItem).filter(models.CatalogueItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    item.status = "approved"
    _log(db, "item_approved", f"Item {item.id} ('{item.name}') approved by owner.")
    db.commit()
    return {"status": "success", "item_id": item_id}


@app.get("/api/enquiries", response_model=List[schemas.EnquiryResponse])
def list_enquiries(db: Session = Depends(get_db)):
    """Owner enquiry inbox."""
    return db.query(models.Enquiry).order_by(models.Enquiry.created_at.desc()).all()


@app.post("/api/enquiries", response_model=schemas.EnquiryResponse)
def create_enquiry(enquiry: schemas.EnquiryCreate, db: Session = Depends(get_db)):
    """Customers can submit enquiries; nothing is confirmed until the owner approves."""
    item = db.query(models.CatalogueItem).filter(models.CatalogueItem.id == enquiry.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Listing not found")
    db_enquiry = models.Enquiry(item_id=enquiry.item_id, message=enquiry.message, status="pending", user_id=1)
    db.add(db_enquiry)
    _log(db, "enquiry_created", f"Enquiry created for item {enquiry.item_id} (pending owner review).")
    db.commit()
    db.refresh(db_enquiry)
    return db_enquiry


@app.post("/api/enquiries/{enquiry_id}/decide")
def decide_enquiry(enquiry_id: int, approve: bool, db: Session = Depends(get_db)):
    """Owner decision on an adoption/booking/sitting enquiry."""
    enquiry = db.query(models.Enquiry).filter(models.Enquiry.id == enquiry_id).first()
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    enquiry.status = "approved" if approve else "rejected"
    _log(db, "enquiry_decided", f"Enquiry {enquiry_id} {enquiry.status} by owner.")
    db.commit()
    return {"status": enquiry.status, "enquiry_id": enquiry_id}


@app.get("/api/audit", response_model=List[schemas.AuditEventResponse])
def get_audit(db: Session = Depends(get_db)):
    """Audit trail: which signals/actions drove each decision."""
    return db.query(models.AuditEvent).order_by(models.AuditEvent.created_at.desc()).limit(100).all()


@app.post("/api/assistant/setup")
def assistant_setup(prompt: str, llm: LLMProvider = Depends(get_llm_provider)):
    """Setup assistant proposes structure only; it cannot publish anything itself."""
    result = llm.generate_json(f"setup: {prompt}")
    return {"proposed_setup": result, "status": "draft"}


# Mount built frontend for single-container/GKE serving (no-op during local dev).
frontend_dist = os.path.join(os.path.dirname(__file__), "../../frontend/dist")
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="static")

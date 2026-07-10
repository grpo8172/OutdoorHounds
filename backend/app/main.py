from fastapi import FastAPI, Depends, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os, uuid, shutil

from app.database import engine, Base, get_db
from app.models import domain as models
from app.schemas import domain as schemas
from app.llm.factory import get_llm_provider, LLMProvider
from app.policy.guardrails import require_approval, validate_assistant_response

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Outdoor Hounds API")

WEB_UPLOADS_DIR = "/app/web-uploads"
os.makedirs(WEB_UPLOADS_DIR, exist_ok=True)

DEFAULT_MODE_CONFIG = [
    {"key": "pet",                 "active": True, "emoji": "🐾", "label": "Adopt / Foster"},
    {"key": "service",             "active": True, "emoji": "🦮", "label": "Pet Services"},
    {"key": "event",               "active": True, "emoji": "🎉", "label": "Pet Events"},
    {"key": "stall",               "active": True, "emoji": "🛍️", "label": "Stalls & Shops"},
    {"key": "lost_found",          "active": True, "emoji": "🔍", "label": "Lost & Found"},
    {"key": "hike",                "active": True, "emoji": "🥾", "label": "Group Hikes"},
    {"key": "petting_zoo_booking", "active": True, "emoji": "🐑", "label": "Mini Petting Zoo"},
]

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
def get_items(
    db: Session = Depends(get_db),
    item_type: Optional[str] = Query(None, description="Filter by listing type"),
):
    """Public storefront: only approved listings are visible to customers."""
    q = db.query(models.CatalogueItem).filter(models.CatalogueItem.status == "approved")
    if item_type:
        q = q.filter(models.CatalogueItem.item_type == item_type)
    return q.all()


@app.get("/api/items/pending", response_model=List[schemas.CatalogueItemResponse])
def get_pending_items(db: Session = Depends(get_db)):
    """Admin review queue: items proposed by the assistant awaiting owner approval."""
    return db.query(models.CatalogueItem).filter(models.CatalogueItem.status == "pending_review").all()


@app.get("/api/items/{item_id}", response_model=schemas.CatalogueItemResponse)
def get_item(item_id: int, db: Session = Depends(get_db)):
    """Single approved listing by ID — used by the mobile app's 'View on website' link."""
    item = db.query(models.CatalogueItem).filter(
        models.CatalogueItem.id == item_id,
        models.CatalogueItem.status == "approved",
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Listing not found")
    return item


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


@app.get("/api/me/profile", response_model=schemas.ProfileResponse)
def get_my_profile(
    user_id: int = Query(..., description="Mobile user ID"),
    db: Session = Depends(get_db),
):
    profile = db.query(models.Profile).filter(models.Profile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@app.put("/api/me/profile", response_model=schemas.ProfileResponse)
def update_my_profile(
    update: schemas.ProfileUpdate,
    user_id: int = Query(..., description="Mobile user ID"),
    db: Session = Depends(get_db),
):
    profile = db.query(models.Profile).filter(models.Profile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    _log(db, "profile_updated", f"Profile for user {user_id} updated.")
    db.commit()
    db.refresh(profile)
    return profile


@app.get("/api/config", response_model=schemas.OwnerConfigResponse)
def get_config(db: Session = Depends(get_db)):
    config = db.query(models.OwnerConfig).first()
    if not config:
        config = models.OwnerConfig(
            business_name="Outdoor Hounds",
            tagline="Adopt a friend, join a hike, book a service.",
            mode_config=DEFAULT_MODE_CONFIG,
            hero_photos=[],
        )
        db.add(config)
        db.commit()
        db.refresh(config)
    return config


@app.put("/api/config", response_model=schemas.OwnerConfigResponse)
def update_config(update: schemas.OwnerConfigUpdate, db: Session = Depends(get_db)):
    config = db.query(models.OwnerConfig).first()
    if not config:
        config = models.OwnerConfig(mode_config=DEFAULT_MODE_CONFIG, hero_photos=[])
        db.add(config)
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(config, field, value)
    _log(db, "config_updated", f"Owner config updated.")
    db.commit()
    db.refresh(config)
    return config


@app.post("/api/config/photos")
async def upload_config_photo(files: List[UploadFile] = File(...)):
    urls = []
    for file in files:
        ext = os.path.splitext(file.filename or "")[1] or ".jpg"
        filename = uuid.uuid4().hex[:16] + ext
        dest = os.path.join(WEB_UPLOADS_DIR, filename)
        with open(dest, "wb") as f:
            shutil.copyfileobj(file.file, f)
        urls.append(f"/api/photos/{filename}")
    return {"urls": urls}


@app.get("/api/photos/{filename}")
async def serve_photo(filename: str):
    path = os.path.join(WEB_UPLOADS_DIR, filename)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404)
    return FileResponse(path)


@app.post("/api/assistant/setup")
def assistant_setup(prompt: str, llm: LLMProvider = Depends(get_llm_provider)):
    """Setup assistant proposes structure only; it cannot publish anything itself."""
    result = llm.generate_json(f"setup: {prompt}")
    return {"proposed_setup": result, "status": "draft"}


# Serve built frontend — catch-all so React Router handles /items/:id etc.
frontend_dist = os.path.join(os.path.dirname(__file__), "../../frontend/dist")

@app.get("/{full_path:path}", include_in_schema=False)
async def serve_spa(full_path: str):
    if os.path.exists(frontend_dist):
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
    raise HTTPException(status_code=404)

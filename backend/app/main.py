from fastapi import FastAPI, Depends, HTTPException, Query, UploadFile, File, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from typing import List, Optional
import os, uuid, shutil, secrets

from app.database import engine, Base, get_db
from app.models import domain as models
from app.schemas import domain as schemas
from app.llm.factory import get_llm_provider, LLMProvider
from app.policy.guardrails import require_approval, validate_assistant_response
from app.ai.booking_agent import propose_booking

Base.metadata.create_all(bind=engine)

# create_all() only creates missing tables — it never alters an existing
# one, so new columns added to a model (like the booking-agent fields on
# Enquiry) need to be added by hand to whatever DB is already deployed.
def _add_missing_columns() -> None:
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    tables_and_columns = {
        "web_enquiries": {
            "proposed_date": "VARCHAR(10)",
            "proposed_time": "VARCHAR(5)",
            "ai_confidence": "INTEGER",
            "ai_reasoning": "TEXT",
        },
        "owner_config": {
            "allow_public_listings": "BOOLEAN DEFAULT TRUE",
        },
    }
    with engine.begin() as conn:
        for table, new_columns in tables_and_columns.items():
            existing = {c["name"] for c in inspector.get_columns(table)}
            for name, coltype in new_columns.items():
                if name not in existing:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {coltype}"))

_add_missing_columns()

# Fail loudly at startup if critical secrets are missing.
_admin_pw = os.environ.get("ADMIN_PASSWORD", "")
if not _admin_pw:
    raise RuntimeError("ADMIN_PASSWORD environment variable is not set. Refusing to start.")

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Outdoor Hounds API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

WEB_UPLOADS_DIR = "/app/web-uploads"
os.makedirs(WEB_UPLOADS_DIR, exist_ok=True)

# Uploaded photos (hero photos, listing photos) go to GCS rather than local
# disk — Cloud Run's local filesystem is wiped on every redeploy and isn't
# shared across instances, so anything saved there would 404 intermittently
# and vanish on the next deploy.
GCS_BUCKET_NAME = os.environ.get("GCS_BUCKET_NAME", "")
_gcs_bucket = None
if GCS_BUCKET_NAME:
    from google.cloud import storage as gcs_storage
    _gcs_bucket = gcs_storage.Client().bucket(GCS_BUCKET_NAME)

DEFAULT_MODE_CONFIG = [
    {"key": "pet",                 "active": True, "emoji": "🐾", "label": "Adopt / Foster",   "subtitle": "Give a pet a loving home", "image": "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&h=300&fit=crop"},
    {"key": "service",             "active": True, "emoji": "🦮", "label": "Pet Services",     "subtitle": "Trusted care near you",    "image": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=300&fit=crop"},
    {"key": "event",               "active": True, "emoji": "🎉", "label": "Pet Events",       "subtitle": "Join the community",       "image": "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&h=300&fit=crop"},
    {"key": "stall",               "active": True, "emoji": "🛍️", "label": "Stalls & Shops",   "subtitle": "Discover pet products",    "image": "https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?w=600&h=300&fit=crop"},
    {"key": "lost_found",          "active": True, "emoji": "🔍", "label": "Lost & Found",     "subtitle": "Help reunite pets",        "image": "https://images.unsplash.com/photo-1601758125946-6ec2ef64daf8?w=600&h=300&fit=crop"},
    {"key": "hike",                "active": True, "emoji": "🥾", "label": "Group Hikes",      "subtitle": "Join the community",       "image": "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&h=300&fit=crop"},
    {"key": "petting_zoo_booking", "active": True, "emoji": "🐑", "label": "Mini Petting Zoo", "subtitle": "Join the community",       "image": "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&h=300&fit=crop"},
]

# Seed for a brand-new tenant (see get_admin's auto-provision block below) —
# deliberately NOT DEFAULT_MODE_CONFIG. That one is Outdoor Hounds' own
# pet-flavoured content (labels, stock photos of dogs) and only exists as a
# fallback for tenant 1 itself. A new tenant's business might be anything
# (see OwnerSetup's own "not just pets" tagline) — starting them off with
# "Adopt / Foster" and stock dog photos is leftover branding from the
# original app, not a neutral template. Every category starts inactive and
# unlabelled so nothing pet-themed ever reaches a new tenant's storefront
# before its owner explicitly sets it up.
NEW_TENANT_MODE_CONFIG = [
    {"key": "pet",                 "active": False, "emoji": "", "label": "", "subtitle": "", "image": None},
    {"key": "service",             "active": False, "emoji": "", "label": "", "subtitle": "", "image": None},
    {"key": "event",               "active": False, "emoji": "", "label": "", "subtitle": "", "image": None},
    {"key": "stall",               "active": False, "emoji": "", "label": "", "subtitle": "", "image": None},
    {"key": "lost_found",          "active": False, "emoji": "", "label": "", "subtitle": "", "image": None},
    {"key": "hike",                "active": False, "emoji": "", "label": "", "subtitle": "", "image": None},
    {"key": "petting_zoo_booking", "active": False, "emoji": "", "label": "", "subtitle": "", "image": None},
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


_bearer = HTTPBearer(auto_error=False)

DEFAULT_TENANT_ID = 1


def _create_default_tenant(db: Session) -> models.OwnerConfig:
    tenant = models.OwnerConfig(
        business_name="Outdoor Hounds",
        tagline="Adopt a friend, join a hike, book a service.",
        mode_config=DEFAULT_MODE_CONFIG,
        hero_photos=[],
    )
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return tenant


def _resolve_tenant(db: Session, slug: Optional[str]) -> models.OwnerConfig:
    """Resolve a tenant (one row = one admin's isolated site) by its public
    slug. No slug means the original/default site (id=1). A slug that
    doesn't match any tenant always 404s — on both reads and writes — rather
    than silently falling back to the default tenant, since that would risk
    showing or attributing data to the wrong business."""
    if not slug:
        tenant = db.query(models.OwnerConfig).filter(models.OwnerConfig.id == DEFAULT_TENANT_ID).first()
        return tenant or _create_default_tenant(db)
    tenant = db.query(models.OwnerConfig).filter(models.OwnerConfig.slug == slug).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Site not found.")
    return tenant


def get_admin(credentials: HTTPAuthorizationCredentials = Depends(_bearer), db: Session = Depends(get_db)) -> models.OwnerConfig:
    """Accept either the master ADMIN_PASSWORD (resolves to the default
    tenant) or a paid admin subscription token (resolves to — and
    auto-provisions on first use — that admin's own isolated tenant/site)."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Invalid or missing admin token.")

    token = credentials.credentials
    admin_password = os.environ.get("ADMIN_PASSWORD", "")

    if token == admin_password:
        tenant = db.query(models.OwnerConfig).filter(models.OwnerConfig.id == DEFAULT_TENANT_ID).first()
        return tenant or _create_default_tenant(db)

    row = db.execute(
        __import__("sqlalchemy").text(
            "SELECT id FROM subscriptions WHERE admin_token = :t AND tier = 'admin' AND status = 'active' LIMIT 1"
        ),
        {"t": token},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Invalid or missing admin token.")

    tenant = db.query(models.OwnerConfig).filter(models.OwnerConfig.admin_token == token).first()
    if tenant:
        return tenant

    # First time this paid admin has authenticated — provision their own
    # isolated site. Slug collisions are resolved via the DB's UNIQUE
    # constraint (retry on IntegrityError), not a pre-check, so concurrent
    # first-logins (e.g. two browser tabs) can't create duplicate tenants.
    for _ in range(5):
        slug = secrets.token_urlsafe(6).lower().replace("-", "").replace("_", "")[:10]
        tenant = models.OwnerConfig(
            business_name="My Business",
            tagline="",
            mode_config=NEW_TENANT_MODE_CONFIG,
            hero_photos=[],
            slug=slug,
            admin_token=token,
        )
        db.add(tenant)
        try:
            db.commit()
            db.refresh(tenant)
            return tenant
        except IntegrityError:
            db.rollback()
            existing = db.query(models.OwnerConfig).filter(models.OwnerConfig.admin_token == token).first()
            if existing:
                return existing
    raise HTTPException(status_code=500, detail="Could not provision your site. Please try again.")


def _log(db: Session, event_type: str, details: str, tenant_id: Optional[int] = None) -> None:
    """Append an immutable audit event. Centralised so every state change is traceable."""
    db.add(models.AuditEvent(event_type=event_type, details=details, tenant_id=tenant_id))


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.post("/api/admin/login")
@limiter.limit("10/minute")
def admin_login(request: Request, body: dict, db: Session = Depends(get_db)):
    admin_password = os.environ.get("ADMIN_PASSWORD", "")
    provided = body.get("password", "")
    if provided == admin_password:
        return {"token": admin_password}
    row = db.execute(
        __import__("sqlalchemy").text(
            "SELECT id FROM subscriptions WHERE admin_token = :t AND tier = 'admin' AND status = 'active' LIMIT 1"
        ),
        {"t": provided},
    ).fetchone()
    if row:
        return {"token": provided}
    raise HTTPException(status_code=401, detail="Incorrect password or access token.")


@app.get("/api/items", response_model=List[schemas.CatalogueItemResponse])
def get_items(
    db: Session = Depends(get_db),
    item_type: Optional[str] = Query(None, description="Filter by listing type"),
    tenant_slug: Optional[str] = Query(None, description="Which tenant's storefront; omit for the default site"),
):
    """Public storefront: only approved listings, scoped to one tenant's site, are visible to customers."""
    tenant = _resolve_tenant(db, tenant_slug)
    q = db.query(models.CatalogueItem).filter(
        models.CatalogueItem.status == "approved",
        models.CatalogueItem.tenant_id == tenant.id,
    )
    if item_type:
        q = q.filter(models.CatalogueItem.item_type == item_type)
    return q.all()


@app.get("/api/items/pending", response_model=List[schemas.CatalogueItemResponse])
def get_pending_items(db: Session = Depends(get_db), tenant: models.OwnerConfig = Depends(get_admin)):
    """Admin review queue: items proposed by customers, awaiting this tenant's owner approval."""
    return db.query(models.CatalogueItem).filter(
        models.CatalogueItem.status == "pending_review",
        models.CatalogueItem.tenant_id == tenant.id,
    ).all()


@app.get("/api/items/{item_id}", response_model=schemas.CatalogueItemResponse)
def get_item(item_id: int, db: Session = Depends(get_db), tenant_slug: Optional[str] = Query(None)):
    """Single approved listing by ID, scoped to one tenant — used by the mobile app's 'View on website' link."""
    tenant = _resolve_tenant(db, tenant_slug)
    item = db.query(models.CatalogueItem).filter(
        models.CatalogueItem.id == item_id,
        models.CatalogueItem.status == "approved",
        models.CatalogueItem.tenant_id == tenant.id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Listing not found")
    return item


@app.post("/api/items", response_model=schemas.CatalogueItemResponse)
def create_item(item: schemas.CatalogueItemCreate, tenant_slug: Optional[str] = Query(None), db: Session = Depends(get_db)):
    """Proposing a listing never publishes it; it enters pending_review for that tenant's owner approval."""
    tenant = _resolve_tenant(db, tenant_slug)
    if not tenant.allow_public_listings:
        raise HTTPException(status_code=403, detail="This business isn't accepting public listing submissions.")
    db_item = models.CatalogueItem(**item.model_dump(), status="pending_review", tenant_id=tenant.id)
    db.add(db_item)
    _log(db, "item_proposed", f"Item '{item.name}' proposed (pending_review).", tenant_id=tenant.id)
    db.commit()
    db.refresh(db_item)
    return db_item


@app.post("/api/admin/items", response_model=schemas.CatalogueItemResponse)
def admin_create_item(item: schemas.CatalogueItemCreate, db: Session = Depends(get_db), tenant: models.OwnerConfig = Depends(get_admin)):
    """Admin adds a listing directly to their own site — auto-approved, no
    self-review step, unlike the public create_item proposal flow above."""
    db_item = models.CatalogueItem(**item.model_dump(), status="approved", tenant_id=tenant.id)
    db.add(db_item)
    _log(db, "item_added_by_admin", f"Item '{item.name}' added directly by admin.", tenant_id=tenant.id)
    db.commit()
    db.refresh(db_item)
    return db_item


@app.get("/api/admin/items", response_model=List[schemas.CatalogueItemResponse])
def admin_get_published_items(db: Session = Depends(get_db), tenant: models.OwnerConfig = Depends(get_admin)):
    """Authenticated equivalent of the public get_items, for the dashboard's
    'Published Listings' list — resolves the tenant from the admin's own
    token instead of a (slug-less, on /admin) URL param."""
    return db.query(models.CatalogueItem).filter(
        models.CatalogueItem.status == "approved",
        models.CatalogueItem.tenant_id == tenant.id,
    ).all()


@app.get("/api/admin/config", response_model=schemas.OwnerConfigResponse)
def admin_get_config(tenant: models.OwnerConfig = Depends(get_admin)):
    """Authenticated equivalent of the public get_config, so /setup and
    /admin can load THIS admin's own site config without needing a slug in
    the URL (which would otherwise just resolve to the default tenant)."""
    return tenant


@app.post("/api/items/{item_id}/approve")
def approve_item(item_id: int, db: Session = Depends(get_db), tenant: models.OwnerConfig = Depends(get_admin)):
    """Owner approval gate: the only path that makes a listing publicly visible. Scoped to the admin's own tenant so one admin can't approve/reject another's items."""
    item = db.query(models.CatalogueItem).filter(
        models.CatalogueItem.id == item_id,
        models.CatalogueItem.tenant_id == tenant.id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    item.status = "approved"
    _log(db, "item_approved", f"Item {item.id} ('{item.name}') approved by owner.", tenant_id=tenant.id)
    db.commit()
    return {"status": "success", "item_id": item_id}


@app.get("/api/enquiries", response_model=List[schemas.EnquiryResponse])
def list_enquiries(db: Session = Depends(get_db), tenant: models.OwnerConfig = Depends(get_admin)):
    """Owner enquiry inbox, scoped to this tenant."""
    return db.query(models.Enquiry).filter(models.Enquiry.tenant_id == tenant.id).order_by(models.Enquiry.created_at.desc()).all()


@app.post("/api/enquiries", response_model=schemas.EnquiryResponse)
def create_enquiry(enquiry: schemas.EnquiryCreate, db: Session = Depends(get_db)):
    """Customers can submit enquiries; nothing is confirmed until the owner approves.
    Tenant is derived from the item being enquired about, not a client-supplied
    param, so it can never be misattributed to the wrong site."""
    item = db.query(models.CatalogueItem).filter(models.CatalogueItem.id == enquiry.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Listing not found")
    db_enquiry = models.Enquiry(item_id=enquiry.item_id, message=enquiry.message, status="pending", tenant_id=item.tenant_id)
    db.add(db_enquiry)
    db.commit()
    db.refresh(db_enquiry)

    # The booking agent runs immediately, before the owner ever sees this
    # enquiry — it's what makes this an AI-operated queue rather than an AI
    # suggestion the owner has to ask for. It only ever proposes; the owner
    # still has to approve before anything is confirmed (decide_enquiry()).
    proposal = propose_booking(db, db_enquiry, item)
    db_enquiry.proposed_date = proposal["proposed_date"]
    db_enquiry.proposed_time = proposal["proposed_time"]
    db_enquiry.ai_confidence = proposal["ai_confidence"]
    db_enquiry.ai_reasoning = proposal["ai_reasoning"]
    if proposal["proposed_date"]:
        db_enquiry.status = "ai_proposed"
        _log(db, "ai_booking_proposed",
             f"AI proposed {proposal['proposed_date']} for enquiry {db_enquiry.id} (confidence {proposal['ai_confidence']}%): {proposal['ai_reasoning']}",
             tenant_id=item.tenant_id)
    else:
        _log(db, "enquiry_created", f"Enquiry created for item {enquiry.item_id} (pending owner review).", tenant_id=item.tenant_id)
    db.commit()
    db.refresh(db_enquiry)
    return db_enquiry


@app.post("/api/enquiries/{enquiry_id}/propose", response_model=schemas.EnquiryResponse)
def repropose_enquiry(enquiry_id: int, db: Session = Depends(get_db), tenant: models.OwnerConfig = Depends(get_admin)):
    """Owner asks the agent to re-run its scheduling proposal (e.g. after a
    conflicting booking was approved elsewhere). Scoped to the admin's own tenant."""
    enquiry = db.query(models.Enquiry).filter(
        models.Enquiry.id == enquiry_id,
        models.Enquiry.tenant_id == tenant.id,
    ).first()
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    item = db.query(models.CatalogueItem).filter(models.CatalogueItem.id == enquiry.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Listing not found")

    proposal = propose_booking(db, enquiry, item)
    enquiry.proposed_date = proposal["proposed_date"]
    enquiry.proposed_time = proposal["proposed_time"]
    enquiry.ai_confidence = proposal["ai_confidence"]
    enquiry.ai_reasoning = proposal["ai_reasoning"]
    if proposal["proposed_date"] and enquiry.status == "pending":
        enquiry.status = "ai_proposed"
    _log(db, "ai_booking_proposed",
         f"AI re-proposed {proposal['proposed_date']} for enquiry {enquiry_id} (confidence {proposal['ai_confidence']}%): {proposal['ai_reasoning']}",
         tenant_id=tenant.id)
    db.commit()
    db.refresh(enquiry)
    return enquiry


@app.post("/api/enquiries/{enquiry_id}/decide")
def decide_enquiry(enquiry_id: int, approve: bool, booking_date: Optional[str] = None, db: Session = Depends(get_db), tenant: models.OwnerConfig = Depends(get_admin)):
    """Owner's final approval on an adoption/booking/sitting enquiry — this is
    the one required human-in-the-loop step; the agent only ever proposes.
    Scoped to the admin's own tenant. `booking_date`, if omitted, falls back
    to the agent's proposed_date so the owner can approve-as-is with one click."""
    enquiry = db.query(models.Enquiry).filter(
        models.Enquiry.id == enquiry_id,
        models.Enquiry.tenant_id == tenant.id,
    ).first()
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    enquiry.status = "approved" if approve else "rejected"
    if approve:
        enquiry.booking_date = booking_date or enquiry.proposed_date
    _log(db, "enquiry_decided", f"Enquiry {enquiry_id} {enquiry.status} by owner.", tenant_id=tenant.id)
    db.commit()
    return {"status": enquiry.status, "enquiry_id": enquiry_id}


@app.get("/api/audit", response_model=List[schemas.AuditEventResponse])
def get_audit(db: Session = Depends(get_db), tenant: models.OwnerConfig = Depends(get_admin)):
    """Audit trail: which signals/actions drove each decision, scoped to this tenant."""
    return db.query(models.AuditEvent).filter(models.AuditEvent.tenant_id == tenant.id).order_by(models.AuditEvent.created_at.desc()).limit(200).all()


@app.post("/api/track")
def track_event(event: schemas.TrackEventRequest, tenant_slug: Optional[str] = Query(None), db: Session = Depends(get_db)):
    """Client-side click/interaction tracking — logged into the same audit trail, scoped to the site being viewed."""
    tenant = _resolve_tenant(db, tenant_slug)
    _log(db, event.event_type, event.details or "", tenant_id=tenant.id)
    db.commit()
    return {"ok": True}


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
def get_config(tenant_slug: Optional[str] = Query(None), db: Session = Depends(get_db)):
    return _resolve_tenant(db, tenant_slug)


@app.get("/api/marketplace", response_model=List[schemas.MarketplaceEntry])
def list_marketplace(db: Session = Depends(get_db)):
    """Public directory for the new landing page: the default tenant is
    always shown (it's the platform's own showcase site), plus any tenant
    that opted in via the 'List in marketplace' toggle in Owner Setup.
    Tenants without a slug never appear even if opted in — nothing sane to
    link to yet (still just the un-slugged default row mid-setup)."""
    tenants = db.query(models.OwnerConfig).filter(
        (models.OwnerConfig.id == DEFAULT_TENANT_ID) |
        ((models.OwnerConfig.list_in_marketplace == True) & (models.OwnerConfig.slug.isnot(None)))
    ).order_by(models.OwnerConfig.id).all()
    return [
        schemas.MarketplaceEntry(
            business_name=t.business_name,
            site_emoji=t.site_emoji,
            tagline=t.tagline,
            slug=t.slug,
            brand_color=t.brand_color,
            hero_photo=(t.hero_photos or [None])[0],
        )
        for t in tenants
    ]


@app.put("/api/config", response_model=schemas.OwnerConfigResponse)
def update_config(update: schemas.OwnerConfigUpdate, db: Session = Depends(get_db), tenant: models.OwnerConfig = Depends(get_admin)):
    """Always operates on the tenant resolved from the admin's own auth
    token (never a fresh/independent lookup) — otherwise a paying admin
    could edit another tenant's config by coincidence of query order."""
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(tenant, field, value)
    _log(db, "config_updated", "Owner config updated.", tenant_id=tenant.id)
    db.commit()
    db.refresh(tenant)
    return tenant


@app.post("/api/config/photos")
async def upload_config_photo(files: List[UploadFile] = File(...), _=Depends(get_admin)):
    urls = []
    for file in files:
        ext = os.path.splitext(file.filename or "")[1] or ".jpg"
        filename = uuid.uuid4().hex[:16] + ext
        if _gcs_bucket is not None:
            blob = _gcs_bucket.blob(filename)
            blob.upload_from_file(file.file, content_type=file.content_type)
            urls.append(blob.public_url)
        else:
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

# index.html references content-hashed asset filenames (e.g. assets/index-XXXX.js),
# so the assets themselves are safe to cache forever — but index.html itself must
# never be cached, or browsers/proxies can keep serving a stale build (pointing at
# an old, already-deleted hash) indefinitely, surviving even a hard refresh.
_NO_CACHE_HEADERS = {"Cache-Control": "no-cache, no-store, must-revalidate"}
_IMMUTABLE_CACHE_HEADERS = {"Cache-Control": "public, max-age=31536000, immutable"}

@app.get("/{full_path:path}", include_in_schema=False)
async def serve_spa(full_path: str):
    if os.path.exists(frontend_dist):
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path) and full_path.startswith("assets/"):
            return FileResponse(file_path, headers=_IMMUTABLE_CACHE_HEADERS)
        if os.path.isfile(file_path):
            return FileResponse(file_path, headers=_NO_CACHE_HEADERS)
        return FileResponse(os.path.join(frontend_dist, "index.html"), headers=_NO_CACHE_HEADERS)
    raise HTTPException(status_code=404)

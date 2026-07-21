import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "web_users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True)
    name = Column(String(255))
    is_owner = Column(Boolean, default=False)

class BusinessProfile(Base):
    __tablename__ = "web_business_profiles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255))
    description = Column(Text)
    status = Column(String(32), default="draft")

class CatalogueItem(Base):
    # Shared table with the mobile app — both apps read/write here.
    __tablename__ = "catalogue_items"
    id = Column(Integer, primary_key=True, index=True)
    item_type = Column(String(32))
    name = Column(String(255))
    description = Column(Text)
    price = Column(String(64), nullable=True)
    image_url = Column(String(512), nullable=True)
    status = Column(String(32), default="draft")
    listing_meta = Column(JSON, nullable=True)
    # Null for legacy/admin-seeded sample listings (mirrors the mobile app's
    # own convention — see mobile/drizzle/schema.ts's catalogueItems.userId
    # comment). Used to flag sample cards on the storefront.
    user_id = Column(Integer, nullable=True)
    # Which tenant's storefront this listing belongs to (OwnerConfig.id).
    # Nullable + backfilled to 1 for pre-multi-tenancy rows; mobile-app
    # submissions always land on tenant 1 today (mobile has no tenant concept).
    tenant_id = Column(Integer, nullable=True, index=True)

class Enquiry(Base):
    __tablename__ = "web_enquiries"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    item_id = Column(Integer)
    message = Column(Text)
    # pending -> ai_proposed (agent found a slot) -> approved/rejected (owner
    # decided). Stays "pending" if the agent couldn't propose anything, so
    # the pre-agent manual-scheduling path still works unchanged.
    status = Column(String(32), default="pending")
    booking_date = Column(String(10), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    tenant_id = Column(Integer, nullable=True, index=True)
    # The booking agent's proposal, written once at enquiry creation (and
    # again if the owner asks it to re-propose). Never used to auto-confirm —
    # decide_enquiry() only copies proposed_date into booking_date once the
    # owner explicitly approves.
    proposed_date = Column(String(10), nullable=True)
    proposed_time = Column(String(5), nullable=True)
    ai_confidence = Column(Integer, nullable=True)
    ai_reasoning = Column(Text, nullable=True)

class AssistantRule(Base):
    __tablename__ = "web_assistant_rules"
    id = Column(Integer, primary_key=True, index=True)
    rule_text = Column(Text)
    status = Column(String(32), default="pending_review")

class AuditEvent(Base):
    __tablename__ = "web_audit_events"
    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(64))
    details = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    tenant_id = Column(Integer, nullable=True, index=True)

class OwnerConfig(Base):
    # Doubles as the tenant table: one row = one admin's isolated site.
    # id=1 is the original/default tenant (slug/admin_token stay NULL),
    # resolved whenever no slug/token is supplied — see get_admin() and the
    # tenant_slug query param on public endpoints in main.py.
    __tablename__ = "owner_config"
    id = Column(Integer, primary_key=True)
    business_name = Column(String(255), default="Outdoor Hounds")
    site_emoji = Column(String(16), default="🐾")
    tagline = Column(String(512), default="Adopt a friend, join a hike, book a service.")
    chat_greeting = Column(Text, nullable=True)
    chat_placeholder = Column(String(255), nullable=True)
    chat_disclaimer = Column(Text, nullable=True)
    # URL-safe, unique per tenant — public storefront lives at /t/<slug>.
    slug = Column(String(64), nullable=True, unique=True)
    # Matches a subscriptions.admin_token value (mobile/Drizzle-managed table
    # in the same physical DB) — not a real FK, cross-migration-system.
    admin_token = Column(String(64), nullable=True, unique=True)
    # Full mode config — each entry: {key, active, emoji, label, subtitle, image}
    mode_config = Column(JSON, default=lambda: [
        {"key": "pet",                 "active": True, "emoji": "🐾", "label": "Adopt / Foster",   "subtitle": "Give a pet a loving home", "image": "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&h=300&fit=crop"},
        {"key": "service",             "active": True, "emoji": "🦮", "label": "Pet Services",     "subtitle": "Trusted care near you",    "image": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=300&fit=crop"},
        {"key": "event",               "active": True, "emoji": "🎉", "label": "Pet Events",       "subtitle": "Join the community",       "image": "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&h=300&fit=crop"},
        {"key": "stall",               "active": True, "emoji": "🛍️", "label": "Stalls & Shops",   "subtitle": "Discover pet products",    "image": "https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?w=600&h=300&fit=crop"},
        {"key": "lost_found",          "active": True, "emoji": "🔍", "label": "Lost & Found",     "subtitle": "Help reunite pets",        "image": "https://images.unsplash.com/photo-1601758125946-6ec2ef64daf8?w=600&h=300&fit=crop"},
        {"key": "hike",                "active": True, "emoji": "🥾", "label": "Group Hikes",      "subtitle": "Join the community",       "image": "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&h=300&fit=crop"},
        {"key": "petting_zoo_booking", "active": True, "emoji": "🐑", "label": "Mini Petting Zoo", "subtitle": "Join the community",       "image": "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&h=300&fit=crop"},
    ])
    hero_photos = Column(JSON, default=lambda: [])
    brand_color = Column(String(16), default="#e8843c")
    # Top hero/header section background — falls back to the CSS default
    # gradient when unset (frontend/src/index.css's .hero rule).
    banner_color = Column(String(16), nullable=True)
    # Overall page background, behind the hero/cards — falls back to the
    # CSS default (frontend/src/index.css's body rule) when unset.
    background_color = Column(String(16), nullable=True)
    # Opt-in only — a tenant showing up in /api/marketplace is a deliberate
    # choice, not a side-effect of finishing setup. Default tenant (id=1) is
    # shown regardless of this flag, see list_marketplace() in main.py.
    list_in_marketplace = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class Profile(Base):
    # Shared table — created and owned by the mobile auth flow.
    # user_id references the mobile `users` table (Drizzle-managed).
    __tablename__ = "profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, unique=True, index=True)
    display_name = Column(String(255), nullable=True)
    profile_type = Column(String(64), default="individual")
    location = Column(String(255), nullable=True)
    contact_email = Column(String(320), nullable=True)
    contact_phone = Column(String(64), nullable=True)
    bio = Column(Text, nullable=True)
    preferred_modes_json = Column(JSON, nullable=True)
    profile_meta_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

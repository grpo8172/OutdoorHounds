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

class Enquiry(Base):
    __tablename__ = "web_enquiries"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    item_id = Column(Integer)
    message = Column(Text)
    status = Column(String(32), default="pending")
    booking_date = Column(String(10), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

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

class OwnerConfig(Base):
    __tablename__ = "owner_config"
    id = Column(Integer, primary_key=True)
    business_name = Column(String(255), default="Outdoor Hounds")
    site_emoji = Column(String(16), default="🐾")
    tagline = Column(String(512), default="Adopt a friend, join a hike, book a service.")
    chat_greeting = Column(Text, nullable=True)
    chat_placeholder = Column(String(255), nullable=True)
    chat_disclaimer = Column(Text, nullable=True)
    # Full mode config — each entry: {key, active, emoji, label}
    mode_config = Column(JSON, default=lambda: [
        {"key": "pet",                 "active": True, "emoji": "🐾", "label": "Adopt / Foster"},
        {"key": "service",             "active": True, "emoji": "🦮", "label": "Pet Services"},
        {"key": "event",               "active": True, "emoji": "🎉", "label": "Pet Events"},
        {"key": "stall",               "active": True, "emoji": "🛍️", "label": "Stalls & Shops"},
        {"key": "lost_found",          "active": True, "emoji": "🔍", "label": "Lost & Found"},
        {"key": "hike",                "active": True, "emoji": "🥾", "label": "Group Hikes"},
        {"key": "petting_zoo_booking", "active": True, "emoji": "🐑", "label": "Mini Petting Zoo"},
    ])
    hero_photos = Column(JSON, default=lambda: [])
    brand_color = Column(String(16), default="#e8843c")
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

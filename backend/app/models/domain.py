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

class Enquiry(Base):
    __tablename__ = "web_enquiries"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("web_users.id"))
    item_id = Column(Integer, ForeignKey("catalogue_items.id"))
    message = Column(Text)
    status = Column(String(32), default="pending")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User")
    item = relationship("CatalogueItem")

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

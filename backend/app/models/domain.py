import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    is_owner = Column(Boolean, default=False)

class BusinessProfile(Base):
    __tablename__ = "business_profiles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    description = Column(Text)
    status = Column(String, default="draft")  # draft, pending_review, approved

class CatalogueItem(Base):
    __tablename__ = "catalogue_items"
    id = Column(Integer, primary_key=True, index=True)
    item_type = Column(String)  # pet, hike, service
    name = Column(String)
    description = Column(Text)
    price = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    status = Column(String, default="draft") # draft, pending_review, approved

class Enquiry(Base):
    __tablename__ = "enquiries"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    item_id = Column(Integer, ForeignKey("catalogue_items.id"))
    message = Column(Text)
    status = Column(String, default="pending") # pending, approved, rejected
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User")
    item = relationship("CatalogueItem")

class AssistantRule(Base):
    __tablename__ = "assistant_rules"
    id = Column(Integer, primary_key=True, index=True)
    rule_text = Column(Text)
    status = Column(String, default="pending_review")

class AuditEvent(Base):
    __tablename__ = "audit_events"
    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String)
    details = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime

VALID_ITEM_TYPES = {"pet", "hike", "service", "petting_zoo_booking"}

class ModeConfig(BaseModel):
    key: str
    active: bool
    emoji: str
    label: str

class OwnerConfigResponse(BaseModel):
    id: int
    business_name: str
    site_emoji: str = "🐾"
    tagline: str
    chat_greeting: Optional[str] = None
    chat_placeholder: Optional[str] = None
    chat_disclaimer: Optional[str] = None
    mode_config: List[ModeConfig]
    hero_photos: List[str]

    class Config:
        from_attributes = True

class OwnerConfigUpdate(BaseModel):
    business_name: Optional[str] = None
    site_emoji: Optional[str] = None
    tagline: Optional[str] = None
    chat_greeting: Optional[str] = None
    chat_placeholder: Optional[str] = None
    chat_disclaimer: Optional[str] = None
    mode_config: Optional[List[ModeConfig]] = None
    hero_photos: Optional[List[str]] = None

class CatalogueItemBase(BaseModel):
    item_type: str
    name: str
    description: str
    price: Optional[str] = None
    image_url: Optional[str] = None
    listing_meta: Optional[dict] = None

class CatalogueItemCreate(CatalogueItemBase):
    pass

class CatalogueItemResponse(CatalogueItemBase):
    id: int
    status: str

    class Config:
        from_attributes = True

class EnquiryBase(BaseModel):
    item_id: int
    message: str

class EnquiryCreate(EnquiryBase):
    pass

class EnquiryResponse(EnquiryBase):
    id: int
    user_id: int
    status: str
    booking_date: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AuditEventResponse(BaseModel):
    id: int
    event_type: str
    details: str
    created_at: datetime

    class Config:
        from_attributes = True

VALID_PROFILE_TYPES = {
    "individual", "rescue_group", "foster_carer",
    "pet_service_provider", "stall_holder", "event_organiser", "petting_zoo_provider",
}

VALID_BROWSING_MODES = {
    "adopt_or_foster", "pet_services", "pet_events",
    "stalls_and_shops", "lost_and_found", "mini_petting_zoo_bookings",
}

class ProfileBase(BaseModel):
    display_name: Optional[str] = None
    profile_type: Optional[str] = "individual"
    location: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    bio: Optional[str] = None
    preferred_modes_json: Optional[List[str]] = None
    profile_meta_json: Optional[dict] = None

class ProfileCreate(ProfileBase):
    user_id: int

class ProfileUpdate(ProfileBase):
    pass

class ProfileResponse(ProfileBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

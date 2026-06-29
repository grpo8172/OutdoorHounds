from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime

VALID_ITEM_TYPES = {"pet", "hike", "service", "petting_zoo_booking"}

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

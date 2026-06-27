from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class CatalogueItemBase(BaseModel):
    item_type: str
    name: str
    description: str
    price: Optional[str] = None
    image_url: Optional[str] = None

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

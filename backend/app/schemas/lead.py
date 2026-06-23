"""app/schemas/lead.py"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class LeadCreate(BaseModel):
    name:    Optional[str] = None
    phone:   str = Field(..., min_length=10, max_length=20)
    intent:  Optional[str] = None
    tag:     Optional[str] = None
    channel: str = "whatsapp"
    notes:   Optional[str] = None


class LeadUpdate(BaseModel):
    name:   Optional[str] = None
    intent: Optional[str] = None
    tag:    Optional[str] = None
    status: Optional[str] = None
    notes:  Optional[str] = None


class LeadOut(BaseModel):
    id:           str
    name:         Optional[str]
    phone:        str
    intent:       Optional[str]
    tag:          Optional[str]
    status:       str
    ai_confidence: Optional[float]
    channel:      str
    notes:        Optional[str]
    created_at:   datetime
    model_config = {"from_attributes": True}


class LeadListResponse(BaseModel):
    items:     List[LeadOut]
    total:     int
    page:      int
    page_size: int


class BulkImportResponse(BaseModel):
    imported: int
    skipped:  int
    errors:   List[str]

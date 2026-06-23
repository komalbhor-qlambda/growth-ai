"""app/schemas/tenant.py"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class TenantOut(BaseModel):
    id:                      str
    business_name:           str
    slug:                    str
    whatsapp_number:         Optional[str]
    location:                Optional[str]
    website:                 Optional[str]
    plan:                    str
    subscription_status:     str
    messages_used_this_month: int
    hinglish_mode:           bool
    voice_enabled:           bool
    confidence_threshold:    float
    escalation_keywords:     str
    ai_persona:              str
    created_at:              datetime
    model_config = {"from_attributes": True}


class TenantUpdateRequest(BaseModel):
    business_name:        Optional[str]   = None
    whatsapp_number:      Optional[str]   = None
    location:             Optional[str]   = None
    website:              Optional[str]   = None
    ai_persona:           Optional[str]   = None
    confidence_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)
    escalation_keywords:  Optional[str]   = None
    hinglish_mode:        Optional[bool]  = None
    voice_enabled:        Optional[bool]  = None

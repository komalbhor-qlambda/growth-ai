"""app/schemas/knowledge.py"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class KBDocOut(BaseModel):
    id:              str
    name:            str
    source_type:     str
    source_url:      Optional[str]
    file_size_bytes: Optional[int]
    chunk_count:     int
    status:          str
    error_message:   Optional[str]
    created_at:      datetime
    model_config = {"from_attributes": True}


class AddURLRequest(BaseModel):
    url:  str = Field(..., pattern=r"^https?://")
    name: Optional[str] = None

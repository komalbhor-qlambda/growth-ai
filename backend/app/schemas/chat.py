"""app/schemas/chat.py"""
from typing import Optional, List
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message:              str = Field(..., min_length=1, max_length=4096)
    customer_phone:       str
    conversation_history: Optional[List[dict]] = []


class ChatResponse(BaseModel):
    reply:      str
    confidence: float
    escalated:  bool
    intent:     Optional[str]
    language:   Optional[str]
    latency_ms: int

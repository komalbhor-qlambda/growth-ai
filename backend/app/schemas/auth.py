"""app/schemas/auth.py"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator
import re


class RegisterRequest(BaseModel):
    full_name:       str = Field(..., min_length=2, max_length=200)
    email:           EmailStr
    password:        str = Field(..., min_length=8, max_length=128)
    business_name:   str = Field(..., min_length=2, max_length=200)
    whatsapp_number: Optional[str] = None
    phone:           Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Must contain at least one uppercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Must contain at least one digit")
        return v


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token:  str
    refresh_token: str
    token_type:    str = "bearer"
    expires_in:    int


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    id:         str
    email:      str
    full_name:  str
    phone:      Optional[str]
    is_owner:   bool
    tenant_id:  str
    created_at: datetime
    model_config = {"from_attributes": True}

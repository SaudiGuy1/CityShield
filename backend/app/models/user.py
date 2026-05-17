"""User data models."""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    """Base user model."""
    username: str
    email: EmailStr
    role: str
    manager_username: Optional[str] = None


class UserCreate(UserBase):
    """User creation model."""
    password: str


class UserUpdate(BaseModel):
    """User update model."""
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    manager_username: Optional[str] = None


class ManagerAssignment(BaseModel):
    """Request body for assigning or clearing a user's manager."""
    manager_username: Optional[str] = None


class User(UserBase):
    """User model."""
    created_at: datetime
    is_active: bool = True

    class Config:
        from_attributes = True


class UserInDB(User):
    """User model with hashed password."""
    hashed_password: str


class Token(BaseModel):
    """Token model."""
    access_token: str
    token_type: str


class TokenData(BaseModel):
    """Token data model."""
    username: Optional[str] = None
    role: Optional[str] = None


class LoginRequest(BaseModel):
    """Login request model."""
    username: str
    password: str

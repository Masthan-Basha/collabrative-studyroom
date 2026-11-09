import re
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime


# ── Auth ──────────────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)

    @field_validator("password")
    @classmethod
    def validate_password_complexity(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter (A-Z)")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter (a-z)")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one number (0-9)")
        if not re.search(r"[^A-Za-z0-9]", v):
            raise ValueError("Password must contain at least one special character (!@#$%^&*...)")
        return v

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"

class UserOut(BaseModel):
    id: str
    username: str
    email: str
    avatar_url: Optional[str] = None
    avatar_color: str
    xp: int
    streak_days: int
    created_at: datetime

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    avatar_color: Optional[str] = None


# ── Rooms ─────────────────────────────────────────────────────────────────────
class RoomCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    subject: Optional[str] = None
    ambient_sound: str = "none"
    max_members: int = Field(default=20, ge=2, le=50)

class RoomOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    invite_code: str
    owner_id: str
    subject: Optional[str] = None
    ambient_sound: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class RoomJoin(BaseModel):
    invite_code: str


# ── Flashcards ────────────────────────────────────────────────────────────────
class FlashcardSetCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    subject: Optional[str] = None

class FlashcardSetOut(BaseModel):
    id: str
    room_id: str
    title: str
    subject: Optional[str] = None
    created_by: str
    created_at: datetime

    class Config:
        from_attributes = True

class FlashcardCreate(BaseModel):
    front: str = Field(..., min_length=1)
    back: str = Field(..., min_length=1)
    hint: Optional[str] = None
    position: int = 0

class FlashcardOut(BaseModel):
    id: str
    set_id: str
    front: str
    back: str
    hint: Optional[str] = None
    position: int

    class Config:
        from_attributes = True

class FlashcardUpdate(BaseModel):
    front: Optional[str] = None
    back: Optional[str] = None
    hint: Optional[str] = None

class QuizScoreCreate(BaseModel):
    set_id: Optional[str] = None
    score: int
    total: int
    time_secs: int = 0

class QuizScoreOut(BaseModel):
    id: str
    user_id: str
    score: int
    total: int
    time_secs: int
    played_at: datetime
    user: Optional[UserOut] = None

    class Config:
        from_attributes = True


# ── AI Coach ──────────────────────────────────────────────────────────────────
class AICoachRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    room_id: str
    context_type: str = "general"  # general | explain | quiz | summarize


# ── Analytics ─────────────────────────────────────────────────────────────────
class SessionAnalyticsOut(BaseModel):
    total_sessions: int
    total_study_secs: int
    total_pomodoros: int
    avg_focus_score: float
    total_xp: int
    streak_days: int

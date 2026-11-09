import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, Integer, Text, ForeignKey, DateTime, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base

def utcnow():
    return datetime.now(timezone.utc)

def gen_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_pw: Mapped[str] = mapped_column(Text, nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    avatar_color: Mapped[str] = mapped_column(String(7), default="#6366f1")
    xp: Mapped[int] = mapped_column(Integer, default=0)
    streak_days: Mapped[int] = mapped_column(Integer, default=0)
    last_active: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    owned_rooms: Mapped[list["Room"]] = relationship("Room", back_populates="owner", cascade="all, delete-orphan")
    quiz_scores: Mapped[list["QuizScore"]] = relationship("QuizScore", back_populates="user")
    sessions: Mapped[list["StudySession"]] = relationship("StudySession", back_populates="user")

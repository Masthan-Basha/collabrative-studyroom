import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Float, ForeignKey, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

def utcnow():
    return datetime.now(timezone.utc)

def gen_uuid():
    return str(uuid.uuid4())


class StudySession(Base):
    """Tracks each user's time in a room for analytics & XP calculation."""
    __tablename__ = "study_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    room_id: Mapped[str] = mapped_column(String(36), ForeignKey("rooms.id", ondelete="CASCADE"))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"))
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    left_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_secs: Mapped[int] = mapped_column(Integer, default=0)
    pomodoros_completed: Mapped[int] = mapped_column(Integer, default=0)
    messages_sent: Mapped[int] = mapped_column(Integer, default=0)
    whiteboard_actions: Mapped[int] = mapped_column(Integer, default=0)
    focus_score: Mapped[float] = mapped_column(Float, default=0.0)
    xp_earned: Mapped[int] = mapped_column(Integer, default=0)

    room: Mapped["Room"] = relationship("Room", back_populates="study_sessions")
    user: Mapped["User"] = relationship("User", back_populates="sessions")

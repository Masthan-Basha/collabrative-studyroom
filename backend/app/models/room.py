import uuid, random, string
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, Integer, Text, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

def utcnow():
    return datetime.now(timezone.utc)

def gen_uuid():
    return str(uuid.uuid4())

def gen_invite_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    invite_code: Mapped[str] = mapped_column(String(8), unique=True, default=gen_invite_code)
    owner_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    # New: room subject tag and ambient sound preference
    subject: Mapped[str | None] = mapped_column(String(50), nullable=True)
    ambient_sound: Mapped[str] = mapped_column(String(20), default="none")  # none|lofi|rain|cafe|forest
    max_members: Mapped[int] = mapped_column(Integer, default=20)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    owner: Mapped["User"] = relationship("User", back_populates="owned_rooms")
    flashcard_sets: Mapped[list["FlashcardSet"]] = relationship("FlashcardSet", back_populates="room", cascade="all, delete-orphan")
    quiz_scores: Mapped[list["QuizScore"]] = relationship("QuizScore", back_populates="room", cascade="all, delete-orphan")
    study_sessions: Mapped[list["StudySession"]] = relationship("StudySession", back_populates="room", cascade="all, delete-orphan")

import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Text, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

def utcnow():
    return datetime.now(timezone.utc)

def gen_uuid():
    return str(uuid.uuid4())


class FlashcardSet(Base):
    __tablename__ = "flashcard_sets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    room_id: Mapped[str] = mapped_column(String(36), ForeignKey("rooms.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    subject: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    room: Mapped["Room"] = relationship("Room", back_populates="flashcard_sets")
    cards: Mapped[list["Flashcard"]] = relationship("Flashcard", back_populates="set", cascade="all, delete-orphan", order_by="Flashcard.position")
    quiz_scores: Mapped[list["QuizScore"]] = relationship("QuizScore", back_populates="flashcard_set")


class Flashcard(Base):
    __tablename__ = "flashcards"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    set_id: Mapped[str] = mapped_column(String(36), ForeignKey("flashcard_sets.id", ondelete="CASCADE"))
    front: Mapped[str] = mapped_column(Text, nullable=False)
    back: Mapped[str] = mapped_column(Text, nullable=False)
    hint: Mapped[str | None] = mapped_column(Text, nullable=True)
    position: Mapped[int] = mapped_column(Integer, default=0)

    set: Mapped["FlashcardSet"] = relationship("FlashcardSet", back_populates="cards")


class QuizScore(Base):
    __tablename__ = "quiz_scores"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    room_id: Mapped[str] = mapped_column(String(36), ForeignKey("rooms.id", ondelete="CASCADE"))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"))
    set_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("flashcard_sets.id"), nullable=True)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    total: Mapped[int] = mapped_column(Integer, nullable=False)
    time_secs: Mapped[int] = mapped_column(Integer, default=0)
    played_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    room: Mapped["Room"] = relationship("Room", back_populates="quiz_scores")
    user: Mapped["User"] = relationship("User", back_populates="quiz_scores")
    flashcard_set: Mapped["FlashcardSet"] = relationship("FlashcardSet", back_populates="quiz_scores")

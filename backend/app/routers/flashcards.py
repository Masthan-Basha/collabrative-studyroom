from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.flashcard import FlashcardSet, Flashcard, QuizScore
from app.models.user import User
from app.schemas import (
    FlashcardSetCreate, FlashcardSetOut,
    FlashcardCreate, FlashcardOut, FlashcardUpdate,
    QuizScoreCreate, QuizScoreOut, UserOut
)
from app.utils.auth import get_current_user

router = APIRouter(tags=["flashcards"])


@router.get("/rooms/{room_id}/flashcard-sets", response_model=list[FlashcardSetOut])
async def list_sets(room_id: str, _=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FlashcardSet).where(FlashcardSet.room_id == room_id))
    return [FlashcardSetOut.model_validate(s) for s in result.scalars().all()]


@router.post("/rooms/{room_id}/flashcard-sets", response_model=FlashcardSetOut, status_code=201)
async def create_set(
    room_id: str, body: FlashcardSetCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    fset = FlashcardSet(room_id=room_id, title=body.title, subject=body.subject, created_by=current_user.id)
    db.add(fset)
    await db.flush()
    return FlashcardSetOut.model_validate(fset)


@router.get("/flashcard-sets/{set_id}/cards", response_model=list[FlashcardOut])
async def list_cards(set_id: str, _=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Flashcard).where(Flashcard.set_id == set_id).order_by(Flashcard.position))
    return [FlashcardOut.model_validate(c) for c in result.scalars().all()]


@router.post("/flashcard-sets/{set_id}/cards", response_model=FlashcardOut, status_code=201)
async def add_card(
    set_id: str, body: FlashcardCreate,
    _=Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    card = Flashcard(set_id=set_id, front=body.front, back=body.back, hint=body.hint, position=body.position)
    db.add(card)
    await db.flush()
    return FlashcardOut.model_validate(card)


@router.put("/flashcards/{card_id}", response_model=FlashcardOut)
async def update_card(
    card_id: str, body: FlashcardUpdate,
    _=Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Flashcard).where(Flashcard.id == card_id))
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(404, "Card not found")
    if body.front: card.front = body.front
    if body.back:  card.back  = body.back
    if body.hint is not None: card.hint = body.hint
    db.add(card)
    return FlashcardOut.model_validate(card)


@router.delete("/flashcards/{card_id}", status_code=204)
async def delete_card(card_id: str, _=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Flashcard).where(Flashcard.id == card_id))
    card = result.scalar_one_or_none()
    if card:
        await db.delete(card)


@router.get("/rooms/{room_id}/quiz-scores", response_model=list[QuizScoreOut])
async def leaderboard(room_id: str, _=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(QuizScore)
        .options(selectinload(QuizScore.user))
        .where(QuizScore.room_id == room_id)
        .order_by(QuizScore.score.desc())
        .limit(20)
    )
    scores = result.scalars().all()
    out = []
    for s in scores:
        item = QuizScoreOut.model_validate(s)
        if s.user:
            item.user = UserOut.model_validate(s.user)
        out.append(item)
    return out


@router.post("/rooms/{room_id}/quiz-scores", response_model=QuizScoreOut, status_code=201)
async def submit_score(
    room_id: str, body: QuizScoreCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    score = QuizScore(
        room_id=room_id, user_id=current_user.id,
        set_id=body.set_id, score=body.score,
        total=body.total, time_secs=body.time_secs,
    )
    db.add(score)
    # Award XP
    current_user.xp += int((body.score / max(body.total, 1)) * 50)
    db.add(current_user)
    await db.flush()
    item = QuizScoreOut.model_validate(score)
    item.user = UserOut.model_validate(current_user)
    return item

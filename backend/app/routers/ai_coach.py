from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from app.utils.auth import get_current_user
from app.services.ai_coach import get_coach_response, generate_flashcards
from app.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.flashcard import Flashcard, FlashcardSet
from sqlalchemy import select

router = APIRouter(prefix="/ai", tags=["AI Coach"])


class CoachRequest(BaseModel):
    room_id: Optional[str] = None
    roomId: Optional[str] = None
    message: str
    history: Optional[List[dict]] = []
    subject: Optional[str] = "general"
    mode: Optional[str] = "chat"

    @property
    def target_room_id(self) -> str:
        return self.room_id or self.roomId or ""


class GenerateCardsRequest(BaseModel):
    topic: str
    set_id: Optional[str] = None
    setId: Optional[str] = None
    count: Optional[int] = 5

    @property
    def target_set_id(self) -> str:
        return self.set_id or self.setId or ""


class GenerateQuizRequest(BaseModel):
    room_id: Optional[str] = None
    roomId: Optional[str] = None
    topic: str
    count: Optional[int] = 5
    subject: Optional[str] = "General"

    @property
    def target_room_id(self) -> str:
        return self.room_id or self.roomId or ""


@router.post("/coach")
async def ai_coach(
    body: CoachRequest,
    current_user=Depends(get_current_user),
):
    """Get a response from the AI study coach."""
    try:
        reply = await get_coach_response(
            message=body.message,
            history=body.history or [],
            subject=body.subject or "general",
            mode=body.mode or "chat",
        )
        return {"reply": reply}
    except Exception as e:
        # Fallback will prevent exceptions, but return a friendly reply if unexpected
        return {"reply": f"Study Coach Note: I encountered an issue processing that query ({str(e)}). Please try asking again or rephrasing!"}


@router.post("/generate-cards")
async def generate_cards(
    body: GenerateCardsRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate flashcards using AI and save them to a set."""
    set_id = body.target_set_id
    if not set_id:
        raise HTTPException(status_code=400, detail="set_id is required")

    result = await db.execute(select(FlashcardSet).where(FlashcardSet.id == set_id))
    flashcard_set = result.scalar_one_or_none()
    if not flashcard_set:
        raise HTTPException(status_code=404, detail="Flashcard set not found")

    card_data = await generate_flashcards(topic=body.topic, count=body.count or 5)

    if not card_data:
        raise HTTPException(status_code=422, detail="Unable to generate cards. Try a different topic.")

    # Save cards to database
    saved_cards = []
    for c in card_data:
        card = Flashcard(
            set_id=set_id,
            front=c.get("question", c.get("front", "")),
            back=c.get("answer", c.get("back", "")),
            hint=c.get("hint", ""),
        )
        db.add(card)
        saved_cards.append(card)

    await db.commit()

    for card in saved_cards:
        await db.refresh(card)

    return {
        "cards": [
            {
                "id": c.id,
                "front": c.front,
                "back": c.back,
                "question": c.front,
                "answer": c.back,
                "hint": c.hint,
                "set_id": c.set_id
            }
            for c in saved_cards
        ],
        "count": len(saved_cards),
    }


@router.post("/generate-quiz")
async def generate_quiz(
    body: GenerateQuizRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a brand new flashcard set with AI cards for instant quiz play."""
    room_id = body.target_room_id
    if not room_id:
        raise HTTPException(status_code=400, detail="room_id is required")

    # 1. Create a new FlashcardSet
    set_title = f"{body.topic.strip().title()} Quiz"
    fset = FlashcardSet(
        room_id=room_id,
        title=set_title,
        subject=body.subject or "General",
        created_by=current_user.id
    )
    db.add(fset)
    await db.flush()

    # 2. Generate cards with AI
    card_data = await generate_flashcards(topic=body.topic, count=body.count or 5)
    
    saved_cards = []
    for c in card_data:
        card = Flashcard(
            set_id=fset.id,
            front=c.get("question", c.get("front", "")),
            back=c.get("answer", c.get("back", "")),
            hint=c.get("hint", ""),
        )
        db.add(card)
        saved_cards.append(card)

    await db.commit()

    for card in saved_cards:
        await db.refresh(card)

    return {
        "set": {
            "id": fset.id,
            "title": fset.title,
            "subject": fset.subject,
            "room_id": fset.room_id,
        },
        "cards": [
            {
                "id": c.id,
                "front": c.front,
                "back": c.back,
                "question": c.front,
                "answer": c.back,
                "hint": c.hint,
                "set_id": c.set_id
            }
            for c in saved_cards
        ],
        "count": len(saved_cards),
    }

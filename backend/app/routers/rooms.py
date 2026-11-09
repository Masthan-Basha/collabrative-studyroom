from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.room import Room
from app.models.user import User
from app.schemas import RoomCreate, RoomOut, RoomJoin
from app.utils.auth import get_current_user
from app.redis_client import get_redis, room_members_key

router = APIRouter(prefix="/rooms", tags=["rooms"])


@router.post("", response_model=RoomOut, status_code=201)
async def create_room(
    body: RoomCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    room = Room(
        name=body.name,
        description=body.description,
        subject=body.subject,
        ambient_sound=body.ambient_sound,
        max_members=body.max_members,
        owner_id=current_user.id,
    )
    db.add(room)
    await db.flush()
    return RoomOut.model_validate(room)


@router.get("", response_model=list[RoomOut])
async def list_rooms(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Room).where(Room.is_active == True).order_by(Room.created_at.desc())
    )
    return [RoomOut.model_validate(r) for r in result.scalars().all()]


@router.get("/{room_id}", response_model=RoomOut)
async def get_room(
    room_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    room = await _get_or_404(room_id, db)
    return RoomOut.model_validate(room)


@router.post("/join", response_model=RoomOut)
async def join_by_invite(
    body: RoomJoin,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Room).where(Room.invite_code == body.invite_code.upper(), Room.is_active == True)
    )
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found or inactive")
    return RoomOut.model_validate(room)


@router.delete("/{room_id}", status_code=204)
async def archive_room(
    room_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    room = await _get_or_404(room_id, db)
    if room.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can archive this room")
    room.is_active = False
    db.add(room)


async def _get_or_404(room_id: str, db: AsyncSession) -> Room:
    result = await db.execute(select(Room).where(Room.id == room_id))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room

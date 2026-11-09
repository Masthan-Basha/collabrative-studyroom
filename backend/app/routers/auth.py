from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.schemas import RegisterRequest, LoginRequest, TokenResponse, UserOut, UserUpdate
from app.utils.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check uniqueness
    existing = await db.execute(
        select(User).where((User.email == body.email) | (User.username == body.username))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email or username already taken")

    user = User(
        username=body.username,
        email=body.email,
        hashed_pw=hash_password(body.password),
        avatar_color=_pick_color(body.username),
    )
    db.add(user)
    await db.flush()

    token = create_access_token(user.id, user.username)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))



@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.hashed_pw):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(user.id, user.username)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserOut)
async def update_profile(
    body: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.username:
        current_user.username = body.username
    if body.avatar_color:
        current_user.avatar_color = body.avatar_color
    db.add(current_user)
    return current_user


def _pick_color(username: str) -> str:
    colors = ["#6366f1","#8b5cf6","#ec4899","#14b8a6","#f59e0b","#10b981","#3b82f6","#ef4444"]
    return colors[sum(ord(c) for c in username) % len(colors)]

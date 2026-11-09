from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.session_analytics import StudySession
from app.models.user import User
from app.schemas import SessionAnalyticsOut
from app.utils.auth import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/me", response_model=SessionAnalyticsOut)
async def my_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(
            func.count(StudySession.id).label("total_sessions"),
            func.coalesce(func.sum(StudySession.duration_secs), 0).label("total_study_secs"),
            func.coalesce(func.sum(StudySession.pomodoros_completed), 0).label("total_pomodoros"),
            func.coalesce(func.avg(StudySession.focus_score), 0.0).label("avg_focus_score"),
            func.coalesce(func.sum(StudySession.xp_earned), 0).label("total_xp"),
        ).where(StudySession.user_id == current_user.id)
    )
    row = result.one()
    return SessionAnalyticsOut(
        total_sessions=row.total_sessions,
        total_study_secs=row.total_study_secs,
        total_pomodoros=row.total_pomodoros,
        avg_focus_score=round(float(row.avg_focus_score), 1),
        total_xp=row.total_xp,
        streak_days=current_user.streak_days,
    )

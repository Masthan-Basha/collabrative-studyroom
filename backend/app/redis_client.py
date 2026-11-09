import json
import redis.asyncio as aioredis
from app.config import settings
from typing import Optional, Any

redis_client: aioredis.Redis = None

async def get_redis() -> aioredis.Redis:
    global redis_client
    if redis_client is None:
        redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True
        )
    return redis_client

async def startup_redis():
    global redis_client
    redis_client = aioredis.from_url(
        settings.REDIS_URL,
        encoding="utf-8",
        decode_responses=True
    )

async def shutdown_redis():
    global redis_client
    if redis_client:
        await redis_client.aclose()

# ── Key helpers ────────────────────────────────────────────────────────────────
def room_canvas_key(room_id: str) -> str:     return f"room:{room_id}:canvas"
def room_timer_key(room_id: str) -> str:      return f"room:{room_id}:timer"
def room_members_key(room_id: str) -> str:    return f"room:{room_id}:members"
def room_chat_key(room_id: str) -> str:       return f"room:{room_id}:chat"
def room_notes_key(room_id: str) -> str:      return f"room:{room_id}:notes"
def room_focus_key(room_id: str) -> str:      return f"room:{room_id}:focus_scores"
def user_session_key(user_id: str) -> str:    return f"user:{user_id}:session"
def room_ai_ctx_key(room_id: str) -> str:     return f"room:{room_id}:ai_context"

SESSION_TTL = 3600 * 6  # 6 hours

# ── Convenience wrappers ───────────────────────────────────────────────────────
async def rset(key: str, value: Any, ex: int = SESSION_TTL):
    r = await get_redis()
    if isinstance(value, (dict, list)):
        value = json.dumps(value)
    await r.set(key, value, ex=ex)

async def rget(key: str) -> Optional[Any]:
    r = await get_redis()
    val = await r.get(key)
    if val is None:
        return None
    try:
        return json.loads(val)
    except (json.JSONDecodeError, TypeError):
        return val

async def rpush_capped(key: str, value: Any, cap: int = 100):
    r = await get_redis()
    if isinstance(value, (dict, list)):
        value = json.dumps(value)
    pipe = r.pipeline()
    pipe.lpush(key, value)
    pipe.ltrim(key, 0, cap - 1)
    pipe.expire(key, SESSION_TTL)
    await pipe.execute()

async def rlist(key: str) -> list:
    r = await get_redis()
    items = await r.lrange(key, 0, -1)
    result = []
    for item in reversed(items):
        try:
            result.append(json.loads(item))
        except (json.JSONDecodeError, TypeError):
            result.append(item)
    return result

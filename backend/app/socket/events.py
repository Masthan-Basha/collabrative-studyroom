import time
import uuid
import asyncio
import json
from datetime import datetime, timezone

import socketio
from jose import JWTError, jwt

from app.config import settings
from app.redis_client import (
    get_redis,
    room_canvas_key, room_timer_key, room_members_key,
    room_chat_key, room_notes_key, room_focus_key,
    user_session_key, rset, rget, rpush_capped, rlist,
    SESSION_TTL,
)

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False,
)

# sid → { user_id, username, avatar_color, room_id }
_sessions: dict[str, dict] = {}


def _decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None


# ── Connection ────────────────────────────────────────────────────────────────
@sio.event
async def connect(sid, environ, auth):
    token = (auth or {}).get("token")
    if not token:
        raise socketio.exceptions.ConnectionRefusedError("Unauthorized")
    payload = _decode_token(token)
    if not payload:
        raise socketio.exceptions.ConnectionRefusedError("Invalid token")
    _sessions[sid] = {
        "user_id": payload["sub"],
        "username": payload.get("username", "Unknown"),
        "avatar_color": "#6366f1",
        "room_id": None,
    }


@sio.event
async def disconnect(sid):
    session = _sessions.pop(sid, None)
    if session and session.get("room_id"):
        await _leave_room(sid, session["room_id"], session)


# ── Room Events ───────────────────────────────────────────────────────────────
@sio.on("room:join")
async def handle_join(sid, data):
    session = _sessions.get(sid)
    if not session:
        return

    room_id = data.get("room_id")
    if not room_id:
        await sio.emit("room:error", {"code": "NO_ROOM", "message": "room_id required"}, to=sid)
        return

    # Leave previous room if any
    if session.get("room_id"):
        await _leave_room(sid, session["room_id"], session)

    session["room_id"] = room_id
    session["avatar_color"] = data.get("avatar_color", "#6366f1")
    await sio.enter_room(sid, room_id)

    r = await get_redis()
    # Track member
    member_data = json.dumps({
        "sid": sid,
        "user_id": session["user_id"],
        "username": session["username"],
        "avatar_color": session["avatar_color"],
    })
    await r.sadd(room_members_key(room_id), member_data)
    await r.expire(room_members_key(room_id), SESSION_TTL)

    # Send full room state to the joiner
    canvas = await rget(room_canvas_key(room_id)) or {}
    chat_history = await rlist(room_chat_key(room_id))
    timer_raw = await r.hgetall(room_timer_key(room_id))
    notes = await rget(room_notes_key(room_id)) or ""

    timer = {}
    if timer_raw:
        timer = {
            "end_ts": float(timer_raw.get("end_ts", 0)),
            "duration": int(timer_raw.get("duration", 1500)),
            "is_running": timer_raw.get("is_running", "0") == "1",
        }

    await sio.emit("room:state", {
        "canvas": canvas,
        "chat_history": chat_history,
        "timer": timer,
        "notes": notes,
    }, to=sid)

    # Broadcast updated presence
    await _broadcast_presence(room_id)


@sio.on("room:leave")
async def handle_leave(sid, data):
    session = _sessions.get(sid)
    if session and session.get("room_id"):
        await _leave_room(sid, session["room_id"], session)
        session["room_id"] = None


async def _leave_room(sid: str, room_id: str, session: dict):
    r = await get_redis()
    # Remove this sid's member entry
    members_raw = await r.smembers(room_members_key(room_id))
    for m in members_raw:
        try:
            parsed = json.loads(m)
            if parsed.get("sid") == sid:
                await r.srem(room_members_key(room_id), m)
                break
        except Exception:
            pass
    await sio.leave_room(sid, room_id)
    await _broadcast_presence(room_id)


async def _broadcast_presence(room_id: str):
    r = await get_redis()
    members_raw = await r.smembers(room_members_key(room_id))
    members = []
    for m in members_raw:
        try:
            members.append(json.loads(m))
        except Exception:
            pass
    await sio.emit("presence:update", {"members": members}, room=room_id)


# ── Whiteboard Events ─────────────────────────────────────────────────────────
@sio.on("whiteboard:draw")
async def handle_draw(sid, data):
    room_id = data.get("room_id")
    delta = data.get("delta")
    if not room_id or delta is None:
        return

    # Persist: merge into canvas state
    r = await get_redis()
    canvas_key = room_canvas_key(room_id)
    canvas = await rget(canvas_key) or {"objects": [], "background": "#1e1e2e"}

    # Append new object to canvas objects list
    if "objects" not in canvas:
        canvas["objects"] = []
    canvas["objects"].append(delta)
    await rset(canvas_key, canvas)

    # Broadcast to others in room (not sender)
    await sio.emit("whiteboard:draw", {"delta": delta}, room=room_id, skip_sid=sid)

    # Update focus score (whiteboard activity = focused)
    await _increment_focus(room_id, sid, 1)


@sio.on("whiteboard:clear")
async def handle_clear(sid, data):
    room_id = data.get("room_id")
    if not room_id:
        return
    empty_canvas = {"objects": [], "background": "#1e1e2e"}
    await rset(room_canvas_key(room_id), empty_canvas)
    await sio.emit("whiteboard:clear", {}, room=room_id)


@sio.on("whiteboard:update_canvas")
async def handle_canvas_update(sid, data):
    """Full canvas JSON update (e.g. after delete/reorder)."""
    room_id = data.get("room_id")
    canvas = data.get("canvas")
    if not room_id or canvas is None:
        return
    await rset(room_canvas_key(room_id), canvas)
    await sio.emit("whiteboard:full_sync", {"canvas": canvas}, room=room_id, skip_sid=sid)


# ── Chat Events ───────────────────────────────────────────────────────────────
@sio.on("chat:send")
async def handle_chat(sid, data):
    session = _sessions.get(sid, {})
    room_id = data.get("room_id")
    text = (data.get("text") or "").strip()
    if not room_id or not text:
        return

    msg = {
        "id": str(uuid.uuid4()),
        "user": {
            "id": session.get("user_id"),
            "username": session.get("username"),
            "avatar_color": session.get("avatar_color", "#6366f1"),
        },
        "text": text,
        "ts": datetime.now(timezone.utc).isoformat(),
    }

    await rpush_capped(room_chat_key(room_id), msg)
    await sio.emit("chat:message", msg, room=room_id)
    await _increment_focus(room_id, sid, 0.5)


@sio.on("chat:typing")
async def handle_typing(sid, data):
    session = _sessions.get(sid, {})
    room_id = data.get("room_id")
    if not room_id:
        return
    await sio.emit("chat:typing", {
        "user_id": session.get("user_id"),
        "username": session.get("username"),
        "is_typing": data.get("is_typing", False),
    }, room=room_id, skip_sid=sid)


# ── Pomodoro Timer Events ─────────────────────────────────────────────────────
@sio.on("timer:start")
async def handle_timer_start(sid, data):
    session = _sessions.get(sid, {})
    room_id = data.get("room_id")
    duration = int(data.get("duration_secs", 1500))
    if not room_id:
        return

    end_ts = time.time() + duration
    r = await get_redis()
    await r.hset(room_timer_key(room_id), mapping={
        "end_ts": end_ts,
        "duration": duration,
        "is_running": 1,
        "started_by": session.get("username", "someone"),
    })
    await r.expire(room_timer_key(room_id), duration + 120)

    await sio.emit("timer:state", {
        "end_ts": end_ts,
        "duration": duration,
        "is_running": True,
        "started_by": session.get("username"),
    }, room=room_id)

    # Schedule done notification
    asyncio.create_task(_timer_done_task(room_id, duration, end_ts))


@sio.on("timer:pause")
async def handle_timer_pause(sid, data):
    room_id = data.get("room_id")
    if not room_id:
        return
    r = await get_redis()
    timer = await r.hgetall(room_timer_key(room_id))
    if timer:
        remaining = max(0, float(timer.get("end_ts", 0)) - time.time())
        await r.hset(room_timer_key(room_id), mapping={"is_running": 0, "remaining": remaining})
    await sio.emit("timer:paused", {"remaining": remaining if timer else 0}, room=room_id)


@sio.on("timer:reset")
async def handle_timer_reset(sid, data):
    room_id = data.get("room_id")
    if not room_id:
        return
    r = await get_redis()
    await r.delete(room_timer_key(room_id))
    await sio.emit("timer:reset", {}, room=room_id)


async def _timer_done_task(room_id: str, duration: int, expected_end_ts: float):
    await asyncio.sleep(duration + 1)
    # Verify the timer wasn't reset
    r = await get_redis()
    timer = await r.hgetall(room_timer_key(room_id))
    if timer and abs(float(timer.get("end_ts", 0)) - expected_end_ts) < 2:
        await sio.emit("timer:done", {
            "message": "🎉 Pomodoro complete! Take a 5-minute break.",
        }, room=room_id)
        # Award focus score to all members
        await _broadcast_focus_boost(room_id, 10)


# ── Collaborative Notes Events ────────────────────────────────────────────────
@sio.on("notes:update")
async def handle_notes_update(sid, data):
    session = _sessions.get(sid, {})
    room_id = data.get("room_id")
    content = data.get("content", "")
    if not room_id:
        return
    await rset(room_notes_key(room_id), content)
    await sio.emit("notes:update", {
        "content": content,
        "updated_by": session.get("username"),
    }, room=room_id, skip_sid=sid)


# ── Quiz Live Events ──────────────────────────────────────────────────────────
@sio.on("quiz:start")
async def handle_quiz_start(sid, data):
    session = _sessions.get(sid, {})
    room_id = data.get("room_id")
    if not room_id:
        return
    await sio.emit("quiz:started", {
        "set_id": data.get("set_id"),
        "started_by": session.get("username"),
    }, room=room_id)


@sio.on("quiz:answer")
async def handle_quiz_answer(sid, data):
    session = _sessions.get(sid, {})
    room_id = data.get("room_id")
    if not room_id:
        return
    await sio.emit("quiz:answer_broadcast", {
        "user_id": session.get("user_id"),
        "username": session.get("username"),
        "card_id": data.get("card_id"),
        "correct": data.get("correct"),
    }, room=room_id)


# ── Focus Score Helpers ───────────────────────────────────────────────────────
async def _increment_focus(room_id: str, sid: str, amount: float):
    session = _sessions.get(sid, {})
    user_id = session.get("user_id")
    if not user_id:
        return
    r = await get_redis()
    key = room_focus_key(room_id)
    await r.hincrbyfloat(key, user_id, amount)
    await r.expire(key, SESSION_TTL)


async def _broadcast_focus_boost(room_id: str, amount: float):
    r = await get_redis()
    members_raw = await r.smembers(room_members_key(room_id))
    for m in members_raw:
        try:
            parsed = json.loads(m)
            uid = parsed.get("user_id")
            if uid:
                await r.hincrbyfloat(room_focus_key(room_id), uid, amount)
        except Exception:
            pass
    await r.expire(room_focus_key(room_id), SESSION_TTL)


# ── Ambient Sound Sync ────────────────────────────────────────────────────────
@sio.on("ambient:change")
async def handle_ambient(sid, data):
    room_id = data.get("room_id")
    sound = data.get("sound", "none")
    if not room_id:
        return
    await sio.emit("ambient:change", {"sound": sound}, room=room_id, skip_sid=sid)

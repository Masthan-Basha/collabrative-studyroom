# 🎓 Collaborative Study Room

A real-time collaborative study platform with AI coaching, synchronized whiteboard, Pomodoro timer, flashcards, quiz mode, shared notes, and ambient sounds.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Whiteboard | Fabric.js + delta sync over Socket.IO |
| Real-time | Socket.IO (python-socketio ASGI) |
| Backend | FastAPI + Uvicorn (async) |
| Cache | Redis (canvas, timer, chat, notes — volatile) |
| Database | PostgreSQL 15 (users, rooms, flashcards, scores) |
| ORM | SQLAlchemy 2.0 async |
| AI Coach | Anthropic Claude API |

---

## Features

- **Real-time Whiteboard** — draw, shapes, text, eraser, undo, download. Delta sync via Socket.IO. Full state restored for late joiners.
- **Group Chat** — typing indicators, message history, avatar colors
- **Synchronized Pomodoro Timer** — one user starts it, everyone counts down together. Accurate via `end_ts` architecture.
- **Flashcards** — create sets, flip cards, add hints. AI card generation from any topic.
- **Quiz Mode** — self-graded, live leaderboard, confetti on high scores, socket-synced so the room sees who's answering
- **AI Study Coach** — powered by Claude API. Explain concepts, quiz you, summarize notes, give study tips.
- **Collaborative Notes** — shared markdown editor, throttled sync so everyone sees changes live
- **Ambient Sounds** — Lo-Fi, Rain, Café, Forest — room-synced so everyone hears the same vibe
- **Focus Scores** — gamified activity score per user, shown in presence sidebar
- **XP & Streaks** — earn XP from quiz scores, tracked per user
- **Session Analytics** — study time, pomodoros, average focus score dashboard

---

## 🏁 Local Development

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker (for PostgreSQL + Redis)

### Backend

```bash
cd backend

# 1. Start services
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=secret -e POSTGRES_DB=studyroom -e POSTGRES_USER=studyroom postgres:15
docker run -d -p 6379:6379 redis:7

# 2. Create venv and install
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# 3. Copy env
cp .env.example .env
# Edit .env: set SECRET_KEY, ANTHROPIC_API_KEY, etc.

# 4. Run (tables auto-created on startup)
uvicorn main:combined --reload --port 8000
```

API docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend

npm install

cp .env.example .env
# .env already points to localhost:8000

npm run dev
# → http://localhost:5173
```

---
## 📁 Project Structure

```
collaborative-study-room/
├── backend/
│   ├── main.py                    # ASGI assembly
│   ├── requirements.txt
│   ├── render.yaml
│   ├── .env.example
│   └── app/
│       ├── config.py
│       ├── database.py
│       ├── redis_client.py
│       ├── models/                # SQLAlchemy ORM
│       ├── schemas/               # Pydantic schemas
│       ├── routers/               # REST endpoints
│       ├── socket/                # Socket.IO events
│       └── services/              # AI coach service
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── .env.example
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── socket.js              # Socket.IO singleton
        ├── api/                   # Axios client + named methods
        ├── store/                 # Zustand stores
        ├── hooks/                 # useSocket
        └── components/
            ├── whiteboard/        # Fabric.js whiteboard
            ├── chat/              # Group chat
            ├── timer/             # Pomodoro + ambient sounds
            ├── flashcards/        # Card sets + AI generation
            ├── quiz/              # Quiz mode + leaderboard
            ├── ai/                # AI Coach panel
            ├── notes/             # Collaborative notes
            └── presence/          # Online users
```

---

## Environment Variables Reference

### Backend
| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL async URL (postgresql+asyncpg://...) |
| `REDIS_URL` | Redis URL (redis://...) |
| `SECRET_KEY` | 32-byte hex JWT signing key |
| `JWT_EXPIRE_MINUTES` | Token lifetime (default: 60) |
| `ANTHROPIC_API_KEY` | Claude API key for AI Coach |
| `CORS_ORIGINS` | JSON array of allowed frontend origins |
| `DEBUG` | true/false |

### Frontend
| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend REST base URL |
| `VITE_SOCKET_URL` | Backend Socket.IO URL |

---

## New Features (Beyond Standard Spec)

| Feature | Description |
|---|---|
| AI Study Coach | Claude-powered assistant with explain/quiz/summarize modes |
| AI Card Generation | Generate 5 flashcards from any topic with one click |
| Collaborative Notes | Shared markdown editor, throttled real-time sync |
| Ambient Sounds | Lo-Fi/Rain/Café/Forest — room-synced |
| Focus Scores | Live activity-based score per member in sidebar |
| XP System | Earn XP from quiz scores, tracked across sessions |
| Analytics Dashboard | Personal study time, pomodoros, focus score stats |
| Room Roles | Owner badge, per-user avatar colors |
| Confetti | Fires on quiz scores ≥ 80% |


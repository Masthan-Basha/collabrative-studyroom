import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { roomsAPI } from '../api'
import { useSocket } from '../hooks/useSocket'
import { useRoomStore } from '../store/roomStore'
import { useAuthStore } from '../store/authStore'
import { connectSocket } from '../socket'

import Whiteboard   from '../components/whiteboard/Whiteboard'
import Chat         from '../components/chat/Chat'
import Pomodoro     from '../components/timer/Pomodoro'
import Flashcards   from '../components/flashcards/Flashcards'
import Quiz         from '../components/quiz/Quiz'
import AICoach      from '../components/ai/AICoach'
import Notes        from '../components/notes/Notes'
import Presence     from '../components/presence/Presence'
import AmbientPlayer from '../components/timer/AmbientPlayer'

import {
  PenLine, MessageSquare, Timer, BookOpen, Brain,
  Sparkles, FileText, Users, Copy, ChevronLeft,
  Menu, X, Hash, Wifi, WifiOff
} from 'lucide-react'
import toast from 'react-hot-toast'

const PANELS = [
  { id: 'whiteboard', label: 'Board',     Icon: PenLine      },
  { id: 'chat',       label: 'Chat',      Icon: MessageSquare },
  { id: 'timer',      label: 'Focus',     Icon: Timer        },
  { id: 'flashcards', label: 'Cards',     Icon: BookOpen     },
  { id: 'quiz',       label: 'Quiz',      Icon: Brain        },
  { id: 'ai',         label: 'AI Coach',  Icon: Sparkles     },
  { id: 'notes',      label: 'Notes',     Icon: FileText     },
]

export default function StudyRoom() {
  const { roomId }                         = useParams()
  const navigate                           = useNavigate()
  const { user }                           = useAuthStore()
  const { activePanel, setActivePanel, members, reset } = useRoomStore()

  const [room,        setRoom]        = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [connected,   setConnected]   = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [rightOpen,   setRightOpen]   = useState(true)

  // Connect socket on mount
  useEffect(() => {
    connectSocket()
  }, [])

  // Load room data
  useEffect(() => {
    roomsAPI.get(roomId)
      .then(r => setRoom(r.data))
      .catch(() => { toast.error('Room not found'); navigate('/dashboard') })
      .finally(() => setLoading(false))
    return () => reset()
  }, [roomId])

  // Socket connection + all room events
  const socketRef = useSocket(roomId)

  // Track connection status
  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return
    const onConnect    = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    socket.on('connect',    onConnect)
    socket.on('disconnect', onDisconnect)
    if (socket.connected) setConnected(true)
    return () => {
      socket.off('connect',    onConnect)
      socket.off('disconnect', onDisconnect)
    }
  }, [socketRef.current])

  const copyInvite = () => {
    if (!room) return
    navigator.clipboard.writeText(room.invite_code)
    toast.success(`Invite code copied: ${room.invite_code}`)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted text-sm">Joining room…</p>
      </div>
    </div>
  )

  const renderPanel = () => {
    switch (activePanel) {
      case 'whiteboard': return <Whiteboard roomId={roomId} />
      case 'chat':       return <Chat roomId={roomId} />
      case 'timer':      return (
        <div className="h-full flex flex-col">
          <div className="flex-1"><Pomodoro roomId={roomId} /></div>
          <div className="border-t border-border/50"><AmbientPlayer roomId={roomId} /></div>
        </div>
      )
      case 'flashcards': return <Flashcards roomId={roomId} subject={room?.subject} />
      case 'quiz':       return <Quiz roomId={roomId} subject={room?.subject} />
      case 'ai':         return <AICoach roomId={roomId} subject={room?.subject} />
      case 'notes':      return <Notes roomId={roomId} />
      default:           return null
    }
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* ── Top bar ── */}
      <header className="h-13 border-b border-border/50 bg-void/90 backdrop-blur-xl shrink-0 flex items-center px-4 gap-3 z-30">
        <button onClick={() => navigate('/dashboard')} className="btn-ghost p-2 rounded-lg">
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h1 className="font-display font-semibold text-sm truncate">{room?.name}</h1>
          {room?.subject && (
            <span className="badge bg-primary/20 text-primary border border-primary/30 text-[10px] hidden sm:inline-flex">
              {room.subject}
            </span>
          )}
        </div>

        {/* Connection + invite */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            {connected
              ? <Wifi className="w-3.5 h-3.5 text-success" />
              : <WifiOff className="w-3.5 h-3.5 text-danger animate-pulse" />
            }
          </div>

          <button onClick={copyInvite}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-surface-50 border border-border rounded-xl text-xs text-muted hover:text-white transition-all">
            <Hash className="w-3 h-3" />
            {room?.invite_code}
            <Copy className="w-3 h-3" />
          </button>

          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface border border-border rounded-xl text-xs text-success">
            <Users className="w-3 h-3" />
            {members.length}
          </div>

          <button onClick={() => setRightOpen(!rightOpen)} className="btn-ghost p-2 rounded-lg hidden lg:flex">
            <Users className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── Main layout ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left nav (desktop) ── */}
        <nav className="hidden md:flex flex-col w-[68px] border-r border-border/50 bg-void/60 shrink-0 py-3 items-center gap-1">
          {PANELS.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setActivePanel(id)} title={label}
              className={`w-11 h-11 flex flex-col items-center justify-center rounded-xl transition-all gap-0.5 ${
                activePanel === id
                  ? 'bg-primary/20 text-primary shadow-glow'
                  : 'text-muted hover:text-white hover:bg-surface-50'
              }`}>
              <Icon className="w-4.5 h-4.5" style={{ width: '18px', height: '18px' }} />
              <span className="text-[9px] uppercase tracking-wide leading-none">{label}</span>
            </button>
          ))}
        </nav>

        {/* ── Center panel ── */}
        <main className="flex-1 overflow-hidden">
          {renderPanel()}
        </main>

        {/* ── Right sidebar - presence (desktop) ── */}
        {rightOpen && (
          <aside className="hidden lg:flex flex-col w-56 border-l border-border/50 bg-void/60 shrink-0 overflow-y-auto">
            <Presence ownerId={room?.owner_id} />
          </aside>
        )}
      </div>

      {/* ── Bottom nav (mobile) ── */}
      <nav className="md:hidden flex border-t border-border/50 bg-void/90 backdrop-blur-xl shrink-0">
        {PANELS.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setActivePanel(id)}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-all ${
              activePanel === id ? 'text-primary' : 'text-muted'
            }`}>
            <Icon style={{ width: '17px', height: '17px' }} />
            <span className="text-[9px]">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

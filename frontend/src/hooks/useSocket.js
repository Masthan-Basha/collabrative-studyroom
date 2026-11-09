

import { useEffect, useRef } from 'react'
import { connectSocket, getSocket } from '../socket'
import { useRoomStore } from '../store/roomStore'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

export function useSocket(roomId) {
  const { user } = useAuthStore()
  const {
    setMembers, addChatMessage, setChatHistory,
    setTimerState, setNotes, setAmbientSound,
  } = useRoomStore()

  // Expose socket ref for emitting
  const socketRef = useRef(null)

  useEffect(() => {
    if (!roomId || !user) return
    const socket = connectSocket()
    socketRef.current = socket

    // ── Room state on join ───────────────────────────────────────────────────
    socket.on('room:state', ({ canvas, chat_history, timer, notes }) => {
      setChatHistory(chat_history || [])
      if (timer?.end_ts) setTimerState(timer)
      if (notes) setNotes(notes)
      // canvas is handled by Whiteboard component via its own listener
    })

    // ── Presence ─────────────────────────────────────────────────────────────
    socket.on('presence:update', ({ members }) => setMembers(members))

    // ── Chat ──────────────────────────────────────────────────────────────────
    socket.on('chat:message', (msg) => addChatMessage(msg))

    // ── Timer ─────────────────────────────────────────────────────────────────
    socket.on('timer:state', (t) => setTimerState({ ...t, is_running: true }))
    socket.on('timer:paused', (t) => setTimerState((prev) => ({ ...prev, is_running: false, remaining: t.remaining })))
    socket.on('timer:reset', () => setTimerState(null))
    socket.on('timer:done', ({ message }) => {
      toast.success(message || 'Pomodoro complete!', { duration: 5000 })
      setTimerState(null)
    })

    // ── Notes ─────────────────────────────────────────────────────────────────
    socket.on('notes:update', ({ content }) => setNotes(content))

    // ── Ambient ───────────────────────────────────────────────────────────────
    socket.on('ambient:change', ({ sound }) => setAmbientSound(sound))

    // ── Join room ─────────────────────────────────────────────────────────────
    socket.emit('room:join', {
      room_id: roomId,
      avatar_color: user.avatar_color,
    })

    return () => {
      socket.emit('room:leave', { room_id: roomId })
      socket.off('room:state')
      socket.off('presence:update')
      socket.off('chat:message')
      socket.off('timer:state')
      socket.off('timer:paused')
      socket.off('timer:reset')
      socket.off('timer:done')
      socket.off('notes:update')
      socket.off('ambient:change')
    }
  }, [roomId, user])

  return socketRef
}

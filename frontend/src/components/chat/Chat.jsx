import { useState, useEffect, useRef, useCallback } from 'react'
import { getSocket } from '../../socket'
import { useRoomStore } from '../../store/roomStore'
import { useAuthStore } from '../../store/authStore'
import { Send, Bot } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const throttle = (fn, delay) => {
  let last = 0
  return (...args) => { const now = Date.now(); if (now - last >= delay) { last = now; fn(...args) } }
}

export default function Chat({ roomId }) {
  const { user }       = useAuthStore()
  const { chatHistory } = useRoomStore()
  const [text,    setText]    = useState('')
  const [typing,  setTyping]  = useState([])   // [{username}]
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  // Typing events from server
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return
    const onTyping = ({ username, is_typing, user_id }) => {
      if (user_id === user?.id) return
      setTyping(prev =>
        is_typing
          ? prev.includes(username) ? prev : [...prev, username]
          : prev.filter(u => u !== username)
      )
    }
    socket.on('chat:typing', onTyping)
    return () => socket.off('chat:typing', onTyping)
  }, [user])

  // Emit typing indicator (throttled)
  const emitTyping = useCallback(throttle((isTyping) => {
    getSocket()?.emit('chat:typing', { room_id: roomId, is_typing: isTyping })
  }, 400), [roomId])

  const handleSend = (e) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    getSocket()?.emit('chat:send', { room_id: roomId, text: trimmed })
    setText('')
    emitTyping(false)
  }

  const handleChange = (e) => {
    setText(e.target.value)
    emitTyping(e.target.value.length > 0)
  }

  const getInitial = (username) => username?.[0]?.toUpperCase() || '?'

  const isOwn = (msg) => msg.user?.id === user?.id

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {chatHistory.length === 0 && (
          <div className="text-center text-muted text-sm py-8">
            <Bot className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No messages yet</p>
            <p className="text-xs mt-1">Say hello to your study group!</p>
          </div>
        )}
        {chatHistory.map((msg, i) => {
          const own = isOwn(msg)
          return (
            <div key={msg.id || i} className={`flex gap-2.5 animate-fade-in ${own ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              {!own && (
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5"
                  style={{ background: msg.user?.avatar_color || '#6366f1' }}>
                  {getInitial(msg.user?.username)}
                </div>
              )}
              <div className={`max-w-[75%] ${own ? 'items-end' : 'items-start'} flex flex-col`}>
                {!own && (
                  <span className="text-xs text-muted mb-1 ml-1">{msg.user?.username}</span>
                )}
                <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  own
                    ? 'bg-primary text-white rounded-tr-sm'
                    : 'bg-surface-50 text-white rounded-tl-sm border border-border/50'
                }`}>
                  {msg.text}
                </div>
                <span className="text-[10px] text-muted mt-1 mx-1">
                  {msg.ts ? formatDistanceToNow(new Date(msg.ts), { addSuffix: true }) : ''}
                </span>
              </div>
            </div>
          )
        })}

        {/* Typing indicator */}
        {typing.length > 0 && (
          <div className="flex items-center gap-2 animate-fade-in">
            <div className="w-7 h-7 rounded-lg bg-surface-50 border border-border flex items-center justify-center">
              <span className="flex gap-0.5">
                {[0,1,2].map(i => (
                  <span key={i} className="w-1 h-1 bg-muted rounded-full animate-pulse-dot"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </span>
            </div>
            <span className="text-xs text-muted">
              {typing.length === 1 ? `${typing[0]} is typing…` : `${typing.join(', ')} are typing…`}
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            ref={inputRef}
            className="input flex-1 py-2 text-sm"
            placeholder="Message the room…"
            value={text}
            onChange={handleChange}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSend(e) }}
            maxLength={500}
          />
          <button type="submit" disabled={!text.trim()}
            className="btn-primary px-3 py-2 flex items-center justify-center rounded-xl disabled:opacity-30">
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}

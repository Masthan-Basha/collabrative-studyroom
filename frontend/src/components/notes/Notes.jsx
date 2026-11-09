import { useState, useEffect, useRef, useCallback } from 'react'
import { getSocket } from '../../socket'
import { useRoomStore } from '../../store/roomStore'
import { useAuthStore } from '../../store/authStore'
import { FileText, Save, Users } from 'lucide-react'

const throttle = (fn, ms) => {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms) }
}

export default function Notes({ roomId }) {
  const { notes, setNotes }    = useRoomStore()
  const { user }               = useAuthStore()
  const [lastEditor, setLastEditor] = useState(null)
  const [saved, setSaved]      = useState(true)
  const textRef = useRef(null)

  // Emit updates throttled at 800ms
  const emitUpdate = useCallback(
    throttle((content) => {
      getSocket()?.emit('notes:update', { room_id: roomId, content })
      setSaved(true)
    }, 800),
    [roomId]
  )

  // Incoming remote updates
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return
    const onUpdate = ({ content, updated_by }) => {
      setNotes(content)
      setLastEditor(updated_by)
    }
    socket.on('notes:update', onUpdate)
    return () => socket.off('notes:update', onUpdate)
  }, [])

  const handleChange = (e) => {
    const val = e.target.value
    setNotes(val)
    setSaved(false)
    emitUpdate(val)
  }

  // Tab support in textarea
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const start = e.target.selectionStart
      const end   = e.target.selectionEnd
      const val   = notes.substring(0, start) + '  ' + notes.substring(end)
      setNotes(val)
      requestAnimationFrame(() => {
        if (textRef.current) {
          textRef.current.selectionStart = start + 2
          textRef.current.selectionEnd   = start + 2
        }
      })
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted" />
          <span className="text-sm font-medium">Shared Notes</span>
        </div>
        <div className="flex items-center gap-3">
          {lastEditor && (
            <span className="text-[10px] text-muted flex items-center gap-1">
              <Users className="w-3 h-3" /> edited by {lastEditor}
            </span>
          )}
          <span className={`text-[10px] font-medium transition-colors ${saved ? 'text-success' : 'text-amber'}`}>
            {saved ? '✓ Saved' : '● Syncing…'}
          </span>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 p-4">
        <textarea
          ref={textRef}
          className="w-full h-full bg-transparent text-white font-mono text-sm resize-none focus:outline-none leading-relaxed placeholder-muted/40"
          placeholder={`# Shared Notes\n\nStart typing — all room members see changes in real time.\n\nMarkdown supported:\n- **bold**, *italic*, \`code\`\n- ## Headings\n- - Lists`}
          value={notes}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          spellCheck={false}
        />
      </div>
    </div>
  )
}

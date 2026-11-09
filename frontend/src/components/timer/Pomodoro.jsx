import { useState, useEffect, useRef } from 'react'
import { getSocket } from '../../socket'
import { useRoomStore } from '../../store/roomStore'
import { useAuthStore } from '../../store/authStore'
import { Play, Pause, RotateCcw, Timer, ChevronDown } from 'lucide-react'

const PRESETS = [
  { label: '25 min', secs: 25 * 60 },
  { label: '50 min', secs: 50 * 60 },
  { label: '15 min', secs: 15 * 60 },
  { label: '5 min',  secs: 5 * 60  },
]

export default function Pomodoro({ roomId }) {
  const { timerState } = useRoomStore()
  const { user }       = useAuthStore()

  const [displaySecs, setDisplaySecs] = useState(25 * 60)
  const [selected,    setSelected]    = useState(0)
  const [phase,       setPhase]       = useState('work')  // work | break
  const intervalRef = useRef(null)

  // Compute display from server state
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)

    if (!timerState) {
      setDisplaySecs(PRESETS[selected].secs)
      return
    }

    if (timerState.is_running && timerState.end_ts) {
      const tick = () => {
        const remaining = Math.max(0, Math.round(timerState.end_ts - Date.now() / 1000))
        setDisplaySecs(remaining)
        if (remaining === 0) clearInterval(intervalRef.current)
      }
      tick()
      intervalRef.current = setInterval(tick, 500)
    } else if (timerState.remaining !== undefined) {
      setDisplaySecs(Math.round(timerState.remaining))
    } else {
      setDisplaySecs(timerState.duration || PRESETS[selected].secs)
    }

    return () => clearInterval(intervalRef.current)
  }, [timerState])

  const isRunning = timerState?.is_running
  const total     = timerState?.duration || PRESETS[selected].secs
  const progress  = total > 0 ? 1 - displaySecs / total : 0

  const fmt = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const handleStart = () => {
    getSocket()?.emit('timer:start', { room_id: roomId, duration_secs: PRESETS[selected].secs })
  }

  const handlePause = () => {
    getSocket()?.emit('timer:pause', { room_id: roomId })
  }

  const handleReset = () => {
    getSocket()?.emit('timer:reset', { room_id: roomId })
  }

  // SVG circle progress
  const R        = 54
  const CIRC     = 2 * Math.PI * R
  const dashOffset = CIRC * (1 - progress)

  const getColor = () => {
    if (!isRunning) return '#333355'
    if (progress < 0.5) return '#7c6af7'
    if (progress < 0.8) return '#fbbf24'
    return '#f87171'
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-6">
      <div className="text-center">
        <p className="panel-title mb-1">Synchronized Timer</p>
        {timerState?.started_by && (
          <p className="text-xs text-muted">Started by {timerState.started_by}</p>
        )}
      </div>

      {/* Circular progress */}
      <div className="relative w-40 h-40">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          {/* Track */}
          <circle cx="60" cy="60" r={R} fill="none" stroke="#252538" strokeWidth="8" />
          {/* Progress */}
          <circle cx="60" cy="60" r={R} fill="none"
            stroke={getColor()}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-3xl font-bold text-white tracking-tight">
            {fmt(displaySecs)}
          </span>
          <span className="text-xs text-muted mt-1 uppercase tracking-wider">
            {isRunning ? phase : 'Ready'}
          </span>
        </div>
        {/* Glow when running */}
        {isRunning && (
          <div className="absolute inset-0 rounded-full animate-glow-ring pointer-events-none" />
        )}
      </div>

      {/* Preset selector */}
      {!isRunning && !timerState && (
        <div className="flex gap-2 flex-wrap justify-center">
          {PRESETS.map((p, i) => (
            <button key={i} onClick={() => { setSelected(i); setDisplaySecs(p.secs) }}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all border ${
                selected === i
                  ? 'bg-primary/20 text-primary border-primary/40'
                  : 'text-muted border-border hover:text-white hover:border-muted'
              }`}>
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3">
        {!isRunning ? (
          <button onClick={handleStart}
            className="btn-primary flex items-center gap-2 px-6 py-3 text-sm">
            <Play className="w-4 h-4 fill-white" />
            {timerState ? 'Resume' : 'Start'}
          </button>
        ) : (
          <button onClick={handlePause}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber/20 hover:bg-amber/30 text-amber border border-amber/30 text-sm font-medium transition-all">
            <Pause className="w-4 h-4 fill-amber" />
            Pause
          </button>
        )}
        {timerState && (
          <button onClick={handleReset}
            className="btn-ghost border border-border px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        )}
      </div>

      {/* Phase toggle */}
      <div className="flex gap-2">
        {['work','break'].map(p => (
          <button key={p} onClick={() => setPhase(p)}
            className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
              phase === p ? 'bg-surface-50 text-white' : 'text-muted hover:text-white'
            }`}>
            {p === 'work' ? 'Focus' : 'Break'}
          </button>
        ))}
      </div>
    </div>
  )
}

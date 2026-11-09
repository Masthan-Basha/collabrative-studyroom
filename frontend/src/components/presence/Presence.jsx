import { useRoomStore } from '../../store/roomStore'
import { useAuthStore } from '../../store/authStore'
import { Crown, Wifi } from 'lucide-react'

export default function Presence({ ownerId }) {
  const { members, focusScores } = useRoomStore()
  const { user }                 = useAuthStore()

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between mb-2">
        <p className="panel-title">Online</p>
        <span className="flex items-center gap-1 text-xs text-success font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          {members.length}
        </span>
      </div>

      {members.map((m) => {
        const isOwner = m.user_id === ownerId
        const isMe    = m.user_id === user?.id
        const score   = focusScores?.[m.user_id]

        return (
          <div key={m.sid} className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-surface-50 transition-all group">
            <div className="relative">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold text-white"
                style={{ background: m.avatar_color || '#6366f1' }}>
                {m.username?.[0]?.toUpperCase()}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full border-2 border-void" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium truncate">
                  {m.username}
                  {isMe && <span className="text-muted font-normal"> (you)</span>}
                </span>
                {isOwner && <Crown className="w-3 h-3 text-amber shrink-0" />}
              </div>
              {score !== undefined && (
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="flex-1 h-1 bg-surface rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.min(score, 100)}%` }} />
                  </div>
                  <span className="text-[10px] text-muted">{Math.round(score)}</span>
                </div>
              )}
            </div>
          </div>
        )
      })}

      {members.length === 0 && (
        <p className="text-xs text-muted text-center py-4">No one else here yet</p>
      )}
    </div>
  )
}

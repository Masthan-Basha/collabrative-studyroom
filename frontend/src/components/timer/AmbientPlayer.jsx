import { useState, useEffect, useRef } from 'react'
import { getSocket } from '../../socket'
import { useRoomStore } from '../../store/roomStore'
import { Volume2, VolumeX, Music, CloudRain, Coffee, Trees, Disc } from 'lucide-react'

const SOUNDS = {
  none:   { label: 'None',   Icon: VolumeX,   url: null },
  lofi:   { label: 'Lo-Fi',  Icon: Disc,      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  rain:   { label: 'Rain',   Icon: CloudRain, url: 'https://www.soundjay.com/nature/sounds/rain-01.mp3' },
  cafe:   { label: 'Café',   Icon: Coffee,    url: 'https://www.soundjay.com/misc/sounds/coffee-shop.mp3' },
  forest: { label: 'Forest', Icon: Trees,     url: 'https://www.soundjay.com/nature/sounds/forest-birds-1.mp3' },
}

export default function AmbientPlayer({ roomId }) {
  const { ambientSound, setAmbientSound } = useRoomStore()
  const [volume,  setVolume]  = useState(0.3)
  const [muted,   setMuted]   = useState(false)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    if (!audioRef.current) return
    const sound = SOUNDS[ambientSound]
    if (!sound?.url) {
      audioRef.current.pause()
      audioRef.current.src = ''
      setPlaying(false)
      return
    }
    audioRef.current.src    = sound.url
    audioRef.current.loop   = true
    audioRef.current.volume = muted ? 0 : volume
    audioRef.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
  }, [ambientSound])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume
  }, [volume, muted])

  const handleChange = (sound) => {
    setAmbientSound(sound)
    getSocket()?.emit('ambient:change', { room_id: roomId, sound })
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center gap-2 text-xs text-muted">
        <Music className="w-3.5 h-3.5 text-primary" />
        <span className="uppercase tracking-widest font-semibold">Ambient Sound</span>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {Object.entries(SOUNDS).map(([key, { label, Icon }]) => (
          <button
            key={key}
            onClick={() => handleChange(key)}
            className={`px-2.5 py-2 rounded-xl text-xs font-medium transition-all border flex items-center gap-2 ${
              ambientSound === key
                ? 'bg-primary/20 text-primary border-primary/40 font-semibold'
                : 'text-muted border-border hover:text-white hover:border-muted/60'
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {ambientSound !== 'none' && (
        <div className="flex items-center gap-2 mt-1">
          <button onClick={() => setMuted(!muted)} className="text-muted hover:text-white transition-colors">
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={e => setVolume(parseFloat(e.target.value))}
            className="flex-1 h-1 accent-primary cursor-pointer"
          />
          <span className="text-xs text-muted w-8 text-right font-mono">{Math.round(volume * 100)}%</span>
        </div>
      )}

      <audio ref={audioRef} />
    </div>
  )
}

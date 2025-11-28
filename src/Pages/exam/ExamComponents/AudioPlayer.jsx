import React, { useState, useRef, useEffect } from 'react'
import { Play, Pause, ChevronLeft, ChevronRight, Volume2 } from 'lucide-react'

// AudioPlayer replicates the UI in the provided image
// - Uses lucide-react for icons
// - Tailwind for layout and styling
// - Responsive and accessible
// Props:
//   duration (number, seconds) - total length (optional; component can infer from audio element)
//   sourceLabel (string) - right-side label

export default function AudioPlayer({ src, sourceLabel = 'Source 1', initialVolume = 0.8 }) {
  const audioRef = useRef(null)
  const progressRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(initialVolume)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onLoaded = () => setDuration(audio.duration || 0)
    const onTime = () => setCurrentTime(audio.currentTime)

    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('timeupdate', onTime)

    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('timeupdate', onTime)
    }
  }, [src])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play()
      setIsPlaying(true)
    }
  }

  function formatTime(sec) {
    if (!sec || isNaN(sec)) return '0:00'
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  function seekTo(percent) {
    if (!audioRef.current || !duration) return
    audioRef.current.currentTime = percent * duration
  }

  function handleProgressChange(e) {
    const val = Number(e.target.value)
    seekTo(val / 100)
  }

  function skip(seconds) {
    if (!audioRef.current) return
    audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds))
  }

  return (
    <div className="w-full mx-auto px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm">
      <audio ref={audioRef} src={src} preload="metadata" />

      <div className="flex items-center gap-3">


        {/* play/pause */}
        <button
          aria-label={isPlaying ? 'pause' : 'play'}
          onClick={togglePlay}
          className="h-9 w-9 rounded-full flex items-center justify-center shadow-md transition-all hover:shadow-lg"
          style={{ background: isPlaying ? '#FF3200' : '#FF3200' }}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5 text-white" />
          ) : (
            <Play className="h-5 w-5 text-white ml-0.5" />
          )}
        </button>


        {/* current time */}
        <div className="text-sm text-gray-700 font-mono w-12 text-center">{formatTime(currentTime)}</div>

        {/* progress bar */}
        <div className="flex-1 px-3">
          <div className="relative">
            <div className="w-full h-2 bg-gray-200 rounded-full">
              <div
                className="h-2 bg-teal-500 rounded-full transition-all"
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              ></div>
            </div>
            <input
              ref={progressRef}
              type="range"
              min={0}
              max={100}
              value={duration ? (currentTime / duration) * 100 : 0}
              onChange={handleProgressChange}
              className="absolute top-0 left-0 w-full h-2 opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {/* remaining time */}
        <div className="text-sm text-gray-700 font-mono w-12 text-center">-{formatTime(Math.max(0, duration - currentTime))}</div>

        {/* volume icon + slider */}
        <div className="flex items-center gap-2 w-32">
          <Volume2 className="h-5 w-5 text-[#FF3200]" />
          <div className="relative flex-1">
            <div className="w-full h-1 bg-gray-200 rounded-full">
              <div
                className="h-1 bg-[#FF3200] rounded-full transition-all"
                style={{ width: `${volume * 100}%` }}
              ></div>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
              className="absolute top-0 left-0 w-full h-1 opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {/* source label */}
        <div className="ml-2">
          <div className="px-3 py-1.5 border border-gray-300 rounded-full text-sm bg-gray-50 text-gray-700">
            {sourceLabel}
          </div>
        </div>
      </div>
    </div>
  )
}

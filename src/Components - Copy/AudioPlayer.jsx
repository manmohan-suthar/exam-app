import React, { useState, useRef, useEffect } from "react";

const AudioPlayer = ({ src }) => {
  const audioRef = useRef(null);
  const progressBarRef = useRef(null);
  const volumeBarRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnd = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnd);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnd);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingProgress && progressBarRef.current) {
        const rect = progressBarRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        const newTime = percentage * duration;
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      }
      if (isDraggingVolume && volumeBarRef.current) {
        const rect = volumeBarRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        setVolume(percentage);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingProgress(false);
      setIsDraggingVolume(false);
    };

    if (isDraggingProgress || isDraggingVolume) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingProgress, isDraggingVolume, duration]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const rewind = () => {
    const audio = audioRef.current;
    audio.currentTime = Math.max(0, audio.currentTime - 5);
  };

  const forward = () => {
    const audio = audioRef.current;
    audio.currentTime = Math.min(duration, audio.currentTime + 5);
  };

  const handleSeek = (e) => {
    if (isDraggingProgress) return;
    const audio = audioRef.current;
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    audio.currentTime = percentage * duration;
  };

  const handleVolumeChange = (e) => {
    if (isDraggingVolume) return;
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    setVolume(percentage);
  };

  const formatTime = (time) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const remainingTime = duration - currentTime;

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm">
      {/* Controls Row */}
      <div className="flex items-center justify-center mb-4 space-x-4">
        {/* Rewind Button */}
        <button
          onClick={rewind}
          className="w-12 h-12 bg-[#25B7C4] rounded-full flex items-center justify-center text-white hover:bg-[#1a8a94] transition-colors"
          aria-label="Rewind 5 seconds"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 6 C12 6 8 10 8 12 C8 14 12 18 16 18" />
            <polygon points="18,10 22,12 18,14" fill="currentColor" />
            <text x="12" y="15" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">5</text>
          </svg>
        </button>

        {/* Play/Pause Button */}
        <button
          onClick={togglePlayPause}
          className="w-12 h-12 bg-[#25B7C4] rounded-full flex items-center justify-center text-white hover:bg-[#1a8a94] transition-colors"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16"/>
              <rect x="14" y="4" width="4" height="16"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="8,5 8,19 19,12"/>
            </svg>
          )}
        </button>

        {/* Forward Button */}
        <button
          onClick={forward}
          className="w-12 h-12 bg-[#25B7C4] rounded-full flex items-center justify-center text-white hover:bg-[#1a8a94] transition-colors"
          aria-label="Forward 5 seconds"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 6 C12 6 16 10 16 12 C16 14 12 18 8 18" />
            <polygon points="6,10 2,12 6,14" fill="currentColor" />
            <text x="12" y="15" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">5</text>
          </svg>
        </button>

        {/* Time Display */}
        <div className="text-[#0D4F5A] text-lg font-sans min-w-[80px] text-center">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      {/* Progress and Volume Row */}
      <div className="flex items-center space-x-4">
        {/* Progress Bar */}
        <div className="flex-1">
          <div
            ref={progressBarRef}
            className="relative h-4 bg-[#E0F7FA] rounded-full cursor-pointer"
            onClick={handleSeek}
          >
            <div
              className="absolute top-0 left-0 h-4 bg-[#25B7C4] rounded-full"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
            <div
              className="absolute top-0 w-6 h-6 bg-white border-2 border-[#25B7C4] rounded-full cursor-pointer"
              style={{ left: `calc(${(currentTime / duration) * 100}% - 12px)`, top: '-6px' }}
              onMouseDown={() => setIsDraggingProgress(true)}
            />
          </div>
        </div>

        {/* Volume Icon */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-[#25B7C4]">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
        </svg>

        {/* Volume Slider */}
        <div
          ref={volumeBarRef}
          className="relative h-2 bg-[#E0F7FA] rounded-full cursor-pointer w-24"
          onClick={handleVolumeChange}
        >
          <div
            className="absolute top-0 left-0 h-2 bg-[#25B7C4] rounded-full"
            style={{ width: `${volume * 100}%` }}
          />
          <div
            className="absolute top-0 w-5 h-5 bg-white border-2 border-[#25B7C4] rounded-full cursor-pointer"
            style={{ left: `calc(${volume * 100}% - 10px)`, top: '-7px' }}
            onMouseDown={() => setIsDraggingVolume(true)}
          />
        </div>
      </div>

      <audio ref={audioRef} src={src} preload="metadata" />
    </div>
  );
};

export default AudioPlayer;
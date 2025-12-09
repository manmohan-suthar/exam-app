import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2 } from "lucide-react";

const audioFiles = {
  start_exam: new URL('../assets/audio/start_exam.mp3', import.meta.url).href,
  part_first: new URL('../assets/audio/part_fist.mp3', import.meta.url).href,
  part_two: new URL('../assets/audio/part_two.mp3', import.meta.url).href,
  part_three: new URL('../assets/audio/part_three.mp3', import.meta.url).href,
  part_foure: new URL('../assets/audio/part_foure.mp3', import.meta.url).href,
  repeat: new URL('../assets/audio/repeat.mp3', import.meta.url).href,
};

export default function AudioPlayer({
  examData,
  onSectionChange,
  onExamEnd,
  audioRef, // expects a ref passed from parent
  sourceLabel = "Listening",
  initialVolume = 1,
}) {
  const progressRef = useRef(null);
  const volumeRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(initialVolume);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);

  const [currentSection, setCurrentSection] = useState(0);
  const [queue, setQueue] = useState([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [currentSrc, setCurrentSrc] = useState("");

  const buildQueue = (section) => {
    const partAudios = ["part_first", "part_two", "part_three", "part_foure"];
    const originalUrls = [
      examData?.audioUrl1,
      examData?.audioUrl2,
      examData?.audioUrl3,
      examData?.audioUrl4,
    ];
    let q = [];
    if (section === 0) {
      q = [
        audioFiles.start_exam,
        audioFiles.part_first,
        originalUrls[0],
        audioFiles.repeat,
        audioFiles.part_first,
        originalUrls[0],
      ];
    } else {
      q = [
        audioFiles[partAudios[section]],
        originalUrls[section],
        audioFiles.repeat,
        audioFiles[partAudios[section]],
        originalUrls[section],
      ];
    }
    return q.filter(Boolean);
  };

  // build queue on section or examData change
  useEffect(() => {
    const newQueue = buildQueue(currentSection);
    setQueue(newQueue);
    setCurrentQueueIndex(0);
    setCurrentSrc(newQueue[0] || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (onSectionChange) onSectionChange(currentSection);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSection, examData]);

  // load and play when currentSrc changes
  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;
    if (currentSrc) {
      audio.src = currentSrc;
      audio.load();
      // try autoplay
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }, [currentSrc, audioRef]);

  // audio events: timeupdate, loadedmetadata, ended
  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;

    const onTime = () => setCurrentTime(audio.currentTime || 0);
    const onLoaded = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      setIsPlaying(false);
      if (currentQueueIndex < queue.length - 1) {
        const next = currentQueueIndex + 1;
        setCurrentQueueIndex(next);
        setCurrentSrc(queue[next]);
      } else {
        // queue finished -> go to next section or finish exam
        if (currentSection < 3) {
          setCurrentSection((s) => s + 1);
        } else {
          if (onExamEnd) onExamEnd();
        }
      }
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
    };
  }, [audioRef, currentQueueIndex, queue, currentSection, onExamEnd]);

  // sync volume
  useEffect(() => {
    if (audioRef?.current) audioRef.current.volume = volume;
  }, [volume, audioRef]);

  // dragging handlers (global mousemove/up)
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingProgress && progressRef.current && duration) {
        const rect = progressRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pct = Math.max(0, Math.min(1, x / rect.width));
        const newTime = pct * duration;
        if (audioRef?.current) audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      }
      if (isDraggingVolume && volumeRef.current) {
        const rect = volumeRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pct = Math.max(0, Math.min(1, x / rect.width));
        setVolume(pct);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingProgress(false);
      setIsDraggingVolume(false);
    };

    if (isDraggingProgress || isDraggingVolume) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingProgress, isDraggingVolume, duration, audioRef]);

  const togglePlayPause = () => {
    const audio = audioRef?.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const handleProgressClick = (e) => {
    if (!progressRef.current || !duration || !audioRef?.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    audioRef.current.currentTime = pct * duration;
    setCurrentTime(pct * duration);
  };

  const handleVolumeClick = (e) => {
    if (!volumeRef.current) return;
    const rect = volumeRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    setVolume(pct);
  };

  const formatTime = (sec) => {
    if (!sec || isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;
  const remaining = Math.max(0, duration - currentTime);

  return (
    <div className=" mx-auto px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Hidden audio element is expected from parent via audioRef - but keep fallback too */}
      {!audioRef?.current && <audio ref={audioRef} preload="metadata" />}

      <div className="flex items-center gap-3">
        {/* Play/Pause */}
        <button
          aria-label={isPlaying ? "Pause" : "Play"}
          onClick={togglePlayPause}
          className="h-9 w-9 rounded-full flex items-center justify-center shadow-md transition-all"
          style={{ background: "#FF3200" }}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5 text-white" />
          ) : (
            <Play className="h-5 w-5 text-white ml-0.5" />
          )}
        </button>

        {/* current time */}
        <div className="text-sm text-gray-700 font-mono w-12 text-center">
          {formatTime(currentTime)}
        </div>

        {/* progress bar (single timeline) */}
        <div className="flex-1 px-3">
          <div className="relative">
            <div
              ref={progressRef}
              className="w-full h-2 bg-gray-200 rounded-full"
              onClick={handleProgressClick}
              role="presentation"
            >
              <div
                className="h-2 bg-teal-500 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* draggable invisible range on top for accessibility */}
            <input
              type="range"
              min={0}
              max={100}
              value={progressPercent}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (!duration || !audioRef?.current) return;
                audioRef.current.currentTime = (val / 100) * duration;
                setCurrentTime((val / 100) * duration);
              }}
              className="absolute top-0 left-0 w-full h-2 opacity-0 cursor-pointer"
            />

            {/* draggable knob */}
            <div
              className="absolute top-0 w-3 h-3 bg-white border-2 border-teal-500 rounded-full cursor-pointer"
              style={{
                left: `calc(${progressPercent}% - 6px)`,
                transform: "translateY(-4px)",
              }}
              onMouseDown={() => setIsDraggingProgress(true)}
            />
          </div>
        </div>

        {/* remaining time */}
        <div className="text-sm text-gray-700 font-mono w-12 text-center">
          -{formatTime(remaining)}
        </div>

        {/* volume icon + slider */}
        <div className="flex items-center gap-2 w-32">
          <Volume2 className="h-5 w-5 text-[#FF3200]" />
          <div className="relative flex-1">
            <div
              ref={volumeRef}
              className="w-full h-1 bg-gray-200 rounded-full cursor-pointer"
              onClick={handleVolumeClick}
            >
              <div
                className="h-1 bg-[#FF3200] rounded-full transition-all"
                style={{ width: `${volume * 100}%` }}
              />
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

        {/* source / section label */}
        <div className="ml-2">
          <div className="px-3 py-1.5 border border-gray-300 rounded-full text-sm bg-gray-50 text-gray-700">
            {sourceLabel} {`• Part ${currentSection + 1}`}
          </div>
        </div>
      </div>

      {/* keep audio element (in case parent didn't pass one) */}
      <audio ref={audioRef} preload="metadata" style={{ display: "none" }} />
    </div>
  );
}

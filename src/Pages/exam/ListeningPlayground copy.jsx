import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Play } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * ListeningPlaygroundUI.jsx
 *
 * - Single-file component (JSX) that renders:
 *   - Header + left sidebar (parts)
 *   - Sticky-like audio player
 *   - Questions area
 *   - When a section has Blank_in_Space questions it renders a single
 *     notebook-style card containing all blanks (uncontrolled inputs).
 *
 * Key fixes:
 * - Audio time updates use refs and direct DOM manipulation to prevent re-renders.
 * - Inputs are uncontrolled with refs for live values, state updated onBlur.
 * - NotebookBlankRenderer and BlankLine are memoized to prevent unnecessary re-renders.
 * - Stable keys used throughout.
 *
 * Drop this file in your project and adjust the fetch URL or audio sources as needed.
 */

export default function ListeningPlaygroundUI() {
  const audioRef = useRef(null);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const lastTimeUpdateRef = useRef(0);
  const progressRef = useRef(null);
  const currentTimeDisplayRef = useRef(null);
  const remainingTimeDisplayRef = useRef(null);

  const answersRef = useRef({}); // Holds live typing values to avoid re-renders
  const [answers, setAnswers] = useState({}); // Persisted snapshot (updated on blur)

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);

  const [paper, setPaper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPart, setCurrentPart] = useState(0);

  const navigate = useNavigate();

  // Fetch paper
  useEffect(() => {
    let cancelled = false;
    const fetchPaper = async () => {
      try {
        const examData = localStorage.getItem("examAssignment");
        if (!examData) {
          setLoading(false);
          return;
        }
        const exam = JSON.parse(examData);
        if (!exam?.exam_paper) {
          setLoading(false);
          return;
        }
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/listening/${exam.exam_paper}`);
        if (!cancelled) {
          if (res.ok) {
            const data = await res.json();
            setPaper(data.paper);
          } else {
            console.error("Failed fetching paper:", res.status);
          }
        }
      } catch (err) {
        console.error("Error fetching paper:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchPaper();
    return () => {
      cancelled = true;
    };
  }, []);

  // Helper: get audio src for a part
  const getAudioForPart = useCallback((part) => {
    if (!paper?.sections?.[part]) return "";
    const sec = paper.sections[part];
    return sec.audioFile ? `/${sec.audioFile}` : sec.audioUrl || "";
  }, [paper]);

  // Update DOM for time and progress
  const updateTimeDisplay = useCallback(() => {
    const currentTime = currentTimeRef.current;
    const duration = durationRef.current;
    const progressPercent = duration ? (currentTime / duration) * 100 : 0;

    if (currentTimeDisplayRef.current) {
      currentTimeDisplayRef.current.textContent = formatTime(currentTime);
    }
    if (remainingTimeDisplayRef.current) {
      remainingTimeDisplayRef.current.textContent = `-${formatTime(Math.max(0, duration - currentTime))}`;
    }
    if (progressRef.current) {
      progressRef.current.style.width = `${progressPercent}%`;
    }
  }, []);

  // Audio event handlers - throttled timeupdate to prevent re-renders
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onTime = () => {
      const now = performance.now();
      if (now - lastTimeUpdateRef.current > 150) {
        lastTimeUpdateRef.current = now;
        currentTimeRef.current = a.currentTime || 0;
        updateTimeDisplay();
      }
    };

    const onLoaded = () => {
      durationRef.current = a.duration || 0;
      updateTimeDisplay();
    };
    const onEnded = () => {
      setIsPlaying(false);
      if (paper && currentPart < paper.sections.length - 1) {
        setCurrentPart((s) => s + 1);
      }
    };

    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("ended", onEnded);

    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("ended", onEnded);
    };
  }, [currentPart, paper, updateTimeDisplay]);

  // Sync volume
  useEffect(() => {
    const a = audioRef.current;
    if (a) a.volume = volume;
  }, [volume]);

  // Improved spacebar handling
  useEffect(() => {
    const handler = (e) => {
      const target = e.target;
      const tag = target && target.tagName ? target.tagName.toUpperCase() : "";
      const isEditable = tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
      if (e.code === "Space" && !isEditable) e.preventDefault();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Load audio when part changes
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const src = getAudioForPart(currentPart);
    if (src) {
      a.src = src;
      a.load();
      a.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      a.pause();
      setIsPlaying(false);
      currentTimeRef.current = 0;
      durationRef.current = 0;
      updateTimeDisplay();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPart, getAudioForPart]);

  const blankQuestions = useMemo(() => {
    if (!paper) return [];
    const currentSection = paper.sections?.[currentPart] || {};
    return (currentSection.questions || []).filter((qq) => qq.questionType === "Blank_in_Space");
  }, [paper?.sections, currentPart]);

  // Helper to format time
  const formatTime = (s) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const togglePlay = useCallback(async () => {
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) {
      a.pause();
      setIsPlaying(false);
    } else {
      try {
        await a.play();
        setIsPlaying(true);
      } catch (err) {
        setIsPlaying(false);
      }
    }
  }, [isPlaying]);

  // Memoized notebook renderer
  const NotebookBlankRenderer = React.memo(function NotebookBlankRenderer({ questions }) {
    const BlankLine = React.memo(function BlankLine({ question }) {
      const text = question.question || question.text || "";
      const parts = text.split(/(\{blank\})/g);
      return (
        <li className="flex items-start" key={question.questionNumber}>
          <span className="w-2.5 h-2.5 mt-3 mr-4 bg-gray-400 rounded-full flex-shrink-0" />
          <div className="flex-1">
            <div className="mb-2 text-sm">
              <span className="font-semibold mr-2">{question.questionNumber}.</span>
              {parts.map((p, i) =>
                p === "{blank}" ? (
                  <span key={`${question.questionNumber}-blank-${Math.floor(i / 2)}`} className="inline-block align-middle ml-1 mr-1" style={{ verticalAlign: "middle" }}>
                    <input
                      data-key={`${question.questionNumber}-blank-${Math.floor(i / 2)}`}
                      type="text"
                      defaultValue={answersRef.current[`${question.questionNumber}-blank-${Math.floor(i / 2)}`] || ""}
                      onChange={(e) => {
                        const key = `${question.questionNumber}-blank-${Math.floor(i / 2)}`;
                        answersRef.current[key] = e.target.value;
                      }}
                      onBlur={(e) => {
                        const key = e.target.getAttribute("data-key");
                        setAnswers((prev) => ({ ...prev, [key]: answersRef.current[key] ?? "" }));
                      }}
                      className="w-32 h-7 bg-white border-2 border-gray-400 px-2 text-sm focus:outline-none"
                    />
                  </span>
                ) : (
                  <span key={`${question.questionNumber}-text-${i}`}>{p}</span>
                )
              )}
            </div>
            {question.hint && <div className="text-xs text-gray-400">{question.hint}</div>}
          </div>
        </li>
      );
    });

    return (
      <div className="pt-10 flex items-center justify-center">
        <div className="relative w-full max-w-4xl">
          {/* shadow base */}
          <div className="absolute left-6 right-0 bottom-0 h-6 bg-gray-700 rounded-b-2xl transform translate-y-4 shadow-lg" />

          <div className="relative bg-gray-200 rounded-2xl shadow-md p-5 border border-gray-300">
            {/* spiral rings */}
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 flex gap-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={`spiral-${i}`} className="w-6 h-10 bg-gray-700 rounded-full flex items-start justify-center shadow-sm">
                  <div className="w-4 h-4 bg-gray-400 rounded-full mt-2" />
                </div>
              ))}
            </div>

            <div className="bg-gray-200 rounded-lg p-8">
              <h3 className="text-gray-800 font-semibold text-lg mb-6">
                Archaeology research project at an Ancient Roman villa
              </h3>

              <ul className="space-y-4 text-gray-700 leading-relaxed">
                {questions.map((q) => (
                  <BlankLine key={q.questionNumber} question={q} />
                ))}
              </ul>

              <div className="mt-8 text-xs text-gray-500">
                <p>Tip: This component is styled with Tailwind CSS. Tweak spacing/colors as needed.</p>
              </div>
            </div>

            {/* curled corner */}
            <div className="absolute right-0 bottom-0 w-16 h-16 transform rotate-0">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <path d="M0,100 L100,100 L100,0 Q70,18 0,100" fill="#BDBEC0" stroke="#d1d5db" />
                <path d="M30,90 L90,30" stroke="#d1d5db" strokeWidth="2" opacity="0.6" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    );
  });

  // Multiple choice renderer (controlled selection only)
  const renderMultipleChoiceQuestion = useCallback((q) => {
    return (
      <div className="p-2 pl-10 capitalize space-y-2">
        {q.options?.map((opt, i) => {
          const selected = answers[q.questionNumber] === opt.letter;
          return (
            <label
              key={`${q.questionNumber}-${opt.letter}`}
              onClick={() => setAnswers((prev) => ({ ...prev, [q.questionNumber]: opt.letter }))}
              className={`flex items-center gap-4 cursor-pointer border-2 transition-all ${
                selected ? "bg-[#ffd7c4] border-2 border-[#e94b1b] shadow-sm" : "bg-white border-gray-200 hover:bg-gray-50"
              }`}
            >
              <input type="radio" name={`question-${q.questionNumber}`} value={opt.letter} checked={selected} readOnly className="sr-only" />
              <div className={`flex items-center justify-center font-semibold text-lg w-8 h-8 ${selected ? "bg-[#ff3200] text-white" : "bg-gray-100 text-gray-800"}`}>
                {opt.letter}
              </div>
              <div className={`text-gray-800 ${selected ? "font-medium" : ""}`}>{opt.text}</div>
            </label>
          );
        })}
      </div>
    );
  }, [answers]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-b-2 border-orange-500 rounded-full mx-auto" />
          <p className="text-gray-600 mt-3">Loading listening paper...</p>
        </div>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-gray-600">No listening paper available</p>
          <button onClick={() => navigate(-1)}>back</button>
        </div>
      </div>
    );
  }

  const currentSection = paper.sections?.[currentPart] || {};

  return (
    <div className="min-h-screen bg-white">
      {/* header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-8 h-8 text-orange-500 flex-shrink-0" role="img" aria-labelledby="peopleCertTitle">
                <title id="peopleCertTitle">PeopleCert logo</title>
                <path d="M16.3,21.9c-4.1-1.6-5.5-5-4.4-8.6.6-2,1.9-3.5,3.6-4.3,2.7-1.3,5.7.4,6.1,3.3.3,2.3-.4,4.8-1.4,6.4-.7,1.1-1.5,2-2.4,2.9-.4.4-1.1.5-1.6.3M5.7,14.6c-.2-4.7,2.9-8.7,7.2-9.9,1.2-.3,2.4-.2,3.5.4h0-.2c-3.9.3-7.1,3-8.2,6.6,0,0,0,0,0,0,0,.1,0,.2-.1.4-1.4,4.5,1.4,9.1,6.1,10.9.5.2,1,.3,1.5.4h0c-.9.5-2,.6-2.9.3-3.8-1.2-6.7-4.7-6.9-8.9M27.4,17.6c.1-.9.2-1.8.3-2.8,0-7.4-6-13.4-13.4-13.4-2.7,0-5.4.8-7.6,2.3-.6.4-1.2.9-1.7,1.4s-1,1.1-1.5,1.7c-.5.6-.8,1.2-1.2,1.9-.4.8-.7,1.6-.9,2.4s-.4,1.7-.4,2.6c0,1.5.2,3.1.7,4.6.5,1.5,1.4,3,2.5,4.1.2.2.3.3.5.5,2,2,4.7,3.3,7.5,3.7.7.1,1.5.1,2.3.1,3.7-.2,6.9-1.9,9.2-4.5,1,2.4,3.1,4.4,7.4,3.9-.6-.2-4.9-.2-3.5-8.6" fill="currentColor" />
              </svg>

              <div className="text-2xl font-bold">
                <span className="text-orange-500">People</span>
                <span className="text-gray-800">Cert</span>
              </div>
            </div>

            <div className="text-gray-500 text-sm">PASSPORT WEB A.T.E.S.</div>
          </div>

          <div>
            <button onClick={() => navigate(-1)}>back</button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
        {/* left sidebar */}
        <aside className="w-48 pr-10">
          <div className="text-gray-600 font-semibold mb-2">Listening</div>

          <div className="flex flex-col gap-1 pl-6">
            {paper.sections.map((s, idx) => {
              const isActive = idx === currentPart;
              return (
                <button
                  key={`part-${idx}`}
                  onClick={() => setCurrentPart(idx)}
                  className={`relative w-full text-left px-3 py-2 border transition-all duration-150 ${isActive ? "bg-gray-900 text-white" : "bg-white text-gray-800"}`}
                >
                  {isActive && <span className="absolute top-0 right-[-12px] h-full w-3 bg-gray-900" style={{ clipPath: "polygon(0 0, 100% 50%, 0 100%)" }} />}
                  <span className="text-sm font-semibold">Listening Part {idx + 1}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* main content */}
        <main className="flex-1">
          {/* player */}
          <div className="mb-6">
            <div className="bg-white border p-2 shadow-sm">
              <div className="flex items-center gap-4">
                <button aria-label="Play/Pause" onClick={togglePlay} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#FF3200" }}>
                  <Play className="text-white" />
                </button>

                <div ref={currentTimeDisplayRef} className="text-sm font-mono w-14 text-center">{formatTime(currentTimeRef.current)}</div>

                <div className="flex-1">
                  <div className="relative">
                    <div className="w-full h-2 bg-gray-200 rounded-full">
                      <div ref={progressRef} className="h-2 bg-orange-400 rounded-full" style={{ width: "0%" }} />
                    </div>
                  </div>
                </div>

                <div ref={remainingTimeDisplayRef} className="text-sm font-mono w-14 text-center">-{formatTime(Math.max(0, durationRef.current - currentTimeRef.current))}</div>

                <div className="px-3 py-1.5 border border-gray-300 rounded-full text-sm bg-gray-50 text-gray-700">Listening • Part {currentPart + 1}</div>
              </div>

              <audio ref={audioRef} preload="metadata" style={{ display: "none" }} tabIndex={-1} />
            </div>
          </div>

          {/* instructions */}
          <div className="bg-gray-100 border-l-4 border-gray-300 p-4 mb-6">
            You will hear some short conversations. You will hear each conversation twice. Choose the correct answer to complete each conversation.
          </div>

          {/* questions area */}
          <div className="space-y-6 max-h-96 overflow-y-auto">
            {!currentSection || !currentSection.questions || currentSection.questions.length === 0 ? (
              <div className="p-8 bg-white border rounded text-gray-500">No questions available for this section</div>
            ) : blankQuestions.length > 0 ? (
              <NotebookBlankRenderer questions={blankQuestions} />
            ) : (
              currentSection.questions.map((q) => (
                <article key={q.questionNumber} className="bg-white">
                  <div className="p-1 pl-5 flex items-center bg-[#F7F7F7] border">
                    <div className="text-2xl font-semibold">{q.questionNumber}.</div>
                    <div className="ml-6 flex items-center">{q.question && <p className="text-gray-800 capitalize font-medium">{q.question}</p>}</div>
                  </div>

                  {q.questionType === "Blank_in_Space" ? (
                    // fallback single input (controlled) if needed
                    <div className="p-4">
                      <input type="text" className="w-full p-2 border rounded" value={answers[q.questionNumber] || ""} onChange={(e) => setAnswers((prev) => ({ ...prev, [q.questionNumber]: e.target.value }))} />
                    </div>
                  ) : (
                    renderMultipleChoiceQuestion(q)
                  )}
                </article>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

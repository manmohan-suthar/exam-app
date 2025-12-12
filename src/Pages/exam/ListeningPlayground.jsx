import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import { Play } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * ListeningPlaygroundUI.jsx
 *FF
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

export default function ListeningPlaygroundUI({
  currentPart: propCurrentPart,
  onPartChange,
  onCompletedPartsChange,
  onListeningCompleted,
}) {
  const audioRef = useRef(null);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const lastTimeUpdateRef = useRef(0);
  const progressRef = useRef(null);
  const currentTimeDisplayRef = useRef(null);
  const remainingTimeDisplayRef = useRef(null);
  const submittedRef = useRef(false); // Prevent duplicate submissions

  const answersRef = useRef({}); // Holds live typing values to avoid re-renders
  const [answers, setAnswers] = useState({}); // Persisted snapshot (updated on blur)

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);

  const [paper, setPaper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [internalCurrentPart, setInternalCurrentPart] = useState(0);
  const currentPart =
    propCurrentPart !== undefined ? propCurrentPart : internalCurrentPart;
  const [examCompleted, setExamCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  // Fetch paper
  useEffect(() => {
    let cancelled = false;
    const fetchPaper = async () => {
      try {
        // First try combined exams data
        const combinedExams = localStorage.getItem("combinedExams");
        const combinedAssignments = localStorage.getItem("combinedAssignments");

        let examData = null;
        if (combinedExams && combinedAssignments) {
          const exams = JSON.parse(combinedExams);
          const assignments = JSON.parse(combinedAssignments);
          const listeningExam = exams.find(
            (exam) => exam.skill === "listening"
          );
          if (listeningExam) {
            examData = { ...listeningExam, assignments };
          }
        }

        // Fallback to individual exam data
        if (!examData) {
          examData = localStorage.getItem("examAssignment");
          if (!examData) {
            setLoading(false);
            return;
          }
          examData = JSON.parse(examData);
        }

        if (!examData?.exam_paper) {
          setLoading(false);
          return;
        }
        const paperId =
          examData.exam_paper.listening_exam_paper ||
          examData.exam_paper.listening ||
          examData.exam_paper;
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/listening/${paperId}`
        );
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
  const getAudioForPart = useCallback(
    (part) => {
      if (!paper?.sections?.[part]) return "";
      const sec = paper.sections[part];
      return sec.audioFile ? `/${sec.audioFile}` : sec.audioUrl || "";
    },
    [paper]
  );

  // Update DOM for time and progress
  const updateTimeDisplay = useCallback(() => {
    const currentTime = currentTimeRef.current;
    const duration = durationRef.current;
    const progressPercent = duration ? (currentTime / duration) * 100 : 0;

    if (currentTimeDisplayRef.current) {
      currentTimeDisplayRef.current.textContent = formatTime(currentTime);
    }
    if (remainingTimeDisplayRef.current) {
      remainingTimeDisplayRef.current.textContent = `-${formatTime(
        Math.max(0, duration - currentTime)
      )}`;
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
        // ✅ tell parent: this part is completed
        onCompletedPartsChange?.((prev) =>
          prev.includes(currentPart) ? prev : [...prev, currentPart]
        );
      } else {
        setExamCompleted(true);
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
      const isEditable =
        tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
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
      a.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      a.pause();
      setIsPlaying(false);
      currentTimeRef.current = 0;
      durationRef.current = 0;
      updateTimeDisplay();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPart, getAudioForPart]);

  // Auto-submit when exam completes
  useEffect(() => {
    if (examCompleted) {
      if (onListeningCompleted) {
        onListeningCompleted();
      }
      submitExam();
    }
  }, [examCompleted, onListeningCompleted]);

  const blankQuestions = useMemo(() => {
    if (!paper) return [];
    const currentSection = paper.sections?.[currentPart] || {};
    return (currentSection.questions || []).filter(
      (qq) => qq.questionType === "Blank_in_Space"
    );
  }, [paper?.sections, currentPart]);

  const handleAnswerChange = useCallback((questionNumber, value) => {
    setAnswers((prev) => ({ ...prev, [questionNumber]: value }));
  }, []);

  // Helper to format time
  const formatTime = (s) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const togglePlay = useCallback(async () => {
    const a = audioRef.current;
    if (!a || isPlaying) return; // Only allow play if not playing
    try {
      await a.play();
      setIsPlaying(true);
    } catch (err) {
      setIsPlaying(false);
    }
  }, [isPlaying]);

  const submitExam = async () => {
    if (!paper) return;
    if (submittedRef.current) return; // Prevent duplicate submissions

    submittedRef.current = true;
    setSubmitting(true);
    try {
      // Check if we're in combined mode
      const combinedExams = localStorage.getItem("combinedExams");
      const combinedAssignments = localStorage.getItem("combinedAssignments");

      let examData = null;
      if (combinedExams && combinedAssignments) {
        const exams = JSON.parse(combinedExams);
        const assignments = JSON.parse(combinedAssignments);
        const listeningExam = exams.find((exam) => exam.skill === "listening");
        if (listeningExam) {
          examData = { ...listeningExam, assignments };
        }
      }

      // Fallback to individual exam data
      if (!examData) {
        examData = localStorage.getItem("examAssignment");
        if (!examData) {
          alert("Exam data not found");
          return;
        }
        examData = JSON.parse(examData);
      }

      const studentData = localStorage.getItem("student");
      if (!studentData) {
        alert("Student data not found");
        return;
      }
      const student = JSON.parse(studentData);

      const paperId =
        examData.exam_paper.listening_exam_paper ||
        examData.exam_paper.listening ||
        examData.exam_paper;
      const payload = {
        studentId: student._id || student.student_id,
        assignmentId: examData.assignmentId,
        answers: answers,
      };

      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL
        }/listening/${paperId}/submit-results`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        const result = await response.json();
        // In combined mode, don't navigate - let the parent handle it
        if (!(combinedExams && combinedAssignments)) {
          // Only navigate if not in combined mode
          navigate("/exam/verification", { state: { skill: "reading" } });
        }
      } else {
        const error = await response.json();
        alert(`Submission failed: ${error.error}`);
      }
    } catch (error) {
      console.error("Submit error:", error);
      alert("An error occurred while submitting the exam");
    } finally {
      setSubmitting(false);
    }
  };

  // Memoized notebook renderer
  const NotebookBlankRenderer = React.memo(function NotebookBlankRenderer({
    questions,
  }) {
    const BlankLine = React.memo(function BlankLine({ question }) {
      const text = question.question || question.text || "";
      const parts = text.split(/(\{blank\})/g);
      return (
        <li className="flex items-start" key={question.questionNumber}>
          <span className="w-2.5 h-2.5 mt-3 mr-4 bg-gray-400 rounded-full flex-shrink-0" />
          <div className="flex-1">
            <div className="mb-2 text-sm">
              <span className="font-semibold mr-2">
                {question.questionNumber}.
              </span>
              {parts.map((p, i) =>
                p === "{blank}" ? (
                  <span
                    key={`${question.questionNumber}-blank-${Math.floor(
                      i / 2
                    )}`}
                    className="inline-block align-middle ml-1 mr-1"
                    style={{ verticalAlign: "middle" }}
                  >
                    <input
                      data-key={`${question.questionNumber}-blank-${Math.floor(
                        i / 2
                      )}`}
                      type="text"
                      defaultValue={
                        answersRef.current[
                          `${question.questionNumber}-blank-${Math.floor(
                            i / 2
                          )}`
                        ] || ""
                      }
                      onChange={(e) => {
                        const key = `${
                          question.questionNumber
                        }-blank-${Math.floor(i / 2)}`;
                        answersRef.current[key] = e.target.value;
                      }}
                      onBlur={(e) => {
                        const key = e.target.getAttribute("data-key");
                        setAnswers((prev) => ({
                          ...prev,
                          [key]: answersRef.current[key] ?? "",
                        }));
                      }}
                      className="w-32 h-7 rounded-2xl bg-white border-2 border-gray-400 px-2 text-sm focus:outline-none"
                    />
                  </span>
                ) : (
                  <span key={`${question.questionNumber}-text-${i}`}>{p}</span>
                )
              )}
            </div>
            {question.hint && (
              <div className="text-xs text-gray-400">{question.hint}</div>
            )}
          </div>
        </li>
      );
    });

    return (
      <div className="pt-10 flex items-center justify-center">
        <div className="relative ">
          {/* shadow base */}
          <div className="absolute left-6 right-0 bottom-0 h-6 bg-gray-700 rounded-b-2xl transform translate-y-4 shadow-lg" />

          <div className="relative bg-gray-200 rounded-2xl shadow-md p-5 border border-gray-300">
            {/* spiral rings */}
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 flex gap-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={`spiral-${i}`}
                  className="w-6 h-10 bg-gray-700 rounded-full flex items-start justify-center shadow-sm"
                >
                  <div className="w-4 h-4 bg-gray-400 rounded-full mt-2" />
                </div>
              ))}
            </div>

            <div className="bg-gray-200 rounded-lg p-8">
          

              <ul className="space-y-4 text-gray-700  leading-relaxed">
                {questions.map((q) => (
                  <BlankLine key={q.questionNumber} question={q} />
                ))}
              </ul>

             
            </div>

            {/* curled corner */}
            <div className="absolute right-0 bottom-0 w-16 h-16 transform rotate-0">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <path
                  d="M0,100 L100,100 L100,0 Q70,18 0,100"
                  fill="#BDBEC0"
                  stroke="#d1d5db"
                />
                <path
                  d="M30,90 L90,30"
                  stroke="#d1d5db"
                  strokeWidth="2"
                  opacity="0.6"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    );
  });

  // Multiple choice renderer (controlled selection only)
  const renderMultipleChoiceQuestion = useCallback(
    (q) => {
      return (
        <div className="p-2 pl-10 capitalize space-y-2">
          {q.options?.map((opt, i) => {
            const selected = answers[q.questionNumber] === opt.letter;
            return (
              <label
                key={`${q.questionNumber}-${opt.letter}`}
                onClick={() =>
                  setAnswers((prev) => ({
                    ...prev,
                    [q.questionNumber]: opt.letter,
                  }))
                }
                className={`flex items-center gap-4 cursor-pointer border-2 transition-all ${
                  selected
                    ? "bg-[#ffd7c4] border-2 border-[#e94b1b] shadow-sm"
                    : "bg-white border-gray-200 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name={`question-${q.questionNumber}`}
                  value={opt.letter}
                  checked={selected}
                  readOnly
                  className="hidden"
                />
                <div
                  className={`flex items-center justify-center font-semibold text-lg w-8 h-8 ${
                    selected
                      ? "bg-[#ff3200] text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {opt.letter}
                </div>
                <div
                  className={`text-gray-800 ${selected ? "font-medium" : ""}`}
                >
                  {opt.text}
                </div>
              </label>
            );
          })}
        </div>
      );
    },
    [answers]
  );

  const currentSection = paper?.sections?.[currentPart] || {};

  const renderedQuestions = useMemo(() => {
    if (
      !currentSection ||
      !currentSection.questions ||
      currentSection.questions.length === 0
    ) {
      return (
        <div className="p-8 bg-white border rounded text-gray-500">
          No questions available for this section
        </div>
      );
    }
    if (blankQuestions.length > 0) {
      return <NotebookBlankRenderer questions={blankQuestions} />;
    }
    return currentSection.questions.map((q) => (
      <article key={q.questionNumber} className="bg-white">
        <div className="p-1 pl-5 flex items-center bg-[#F7F7F7] border">
          <div className="text-2xl font-semibold">{q.questionNumber}.</div>
          <div className="ml-6 flex items-center">
            {q.question && (
              <p className="text-gray-800 capitalize font-medium">
                {q.question}
              </p>
            )}
          </div>
        </div>

        {q.questionType === "Blank_in_Space" ? (
          <div className="p-4">
            <input
              type="text"
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type your answer here..."
              value={answers[q.questionNumber] || ""}
              onChange={(e) =>
                handleAnswerChange(q.questionNumber, e.target.value)
              }
            />
          </div>
        ) : (
          renderMultipleChoiceQuestion(q)
        )}
      </article>
    ));
  }, [
    currentSection,
    answers,
    blankQuestions,
    handleAnswerChange,
    renderMultipleChoiceQuestion,
  ]);

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

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
        {/* main content */}
        <main className="flex-1">
          {/* player */}

          <div className="mb-6 grid grid-cols-3">
            <div className="grid-cols-1"></div>
            <div className="relative w-45 grid-cols-1 bg-white border p-1 shadow-sm">
              <div className="flex  items-center gap-3">
                {/* Play/Pause button (same red as screenshot) */}
                <button
                  aria-label="Play/Pause"
                  onClick={togglePlay}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: "#FF3200" }}
                >
                  {/* Swap to Pause icon if you already track play state; otherwise Play is fine */}
                  <Play className="text-white w-4 h-4" />
                </button>

                {/* Small speaker icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M11 5L6 9H3v6h3l5 4V5z" />
                  <path d="M15.54 8.46a5 5 0 010 7.07M18.07 5.93a9 9 0 010 12.73" />
                </svg>

                {/* Volume slider */}
                <div className="flex-1">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={volume * 100}
                    onChange={(e) => setVolume(e.target.value / 100)}
                    className="w-20 h-1.5 appearance-none bg-red-600 rounded-lg outline-none volume-slider cursor-pointer"
                  />
                </div>
              </div>

              {/* tiny red progress strip at the bottom-left (purely visual) */}
              <div className="absolute left-0 bottom-0 h-1">
                <div
                  ref={progressRef}
                  className="h-1"
                  style={{ width: "0%", background: "#FF3200" }}
                />
              </div>

              {/* keep existing elements but hide to match the screenshot */}
              <div ref={currentTimeDisplayRef} className="hidden">
                {formatTime(currentTimeRef.current)}
              </div>
              <div ref={remainingTimeDisplayRef} className="hidden">
                -
                {formatTime(
                  Math.max(0, durationRef.current - currentTimeRef.current)
                )}
              </div>
              <div className="hidden">Listening • Part {currentPart + 1}</div>

              <audio
                ref={audioRef}
                preload="metadata"
                style={{ display: "none" }}
                tabIndex={-1}
                
              />
            </div>
            <div className="w-full flex items-center justify-end ">
        <div className="flex items-center gap-2 font-mono text-[13px] font-semibold   text-white ">
          <button className="bg-[#FF3200]   pl-5 pr-5 ">Preview</button>
          <button className="bg-[#FF3200]   pl-5 pr-5 ">Next</button>

        </div>
      </div>
          </div>

          {/* instructions */}
          <div className="bg-gray-100 border-l-4 border-gray-300 p-4 mb-6">
            {currentSection?.introduction && (
              <p className="text-gray-600">{currentSection.introduction}</p>
            )}
          </div>

          {/* questions area */}
          <div className="space-y-6 max-h-96 pb-25 overflow-y-auto">
            {renderedQuestions}
          </div>

          {/* Submit button */}
          {examCompleted && (
            <div className="mt-8 text-center">
              <button
                onClick={submitExam}
                disabled={submitting}
                className="px-6 py-3 bg-[#FF3200] text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                {submitting ? "Submitting..." : "Submit Exam"}
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import io from "socket.io-client";

export default function ReadingPlayground() {
  const [paper, setPaper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPart, setCurrentPart] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [assignment, setAssignment] = useState(null);

  const [socket, setSocket] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { test } = location.state || {};

  // Fetch paper and assignment
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        if (!test?.exam_paper || !test?.assignmentId) {
          setLoading(false);
          return;
        }

        // Fetch assignment to get reading_timing
        const assignmentRes = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/exam-assignments/${
            test.assignmentId
          }`
        );
        if (!cancelled && assignmentRes.ok) {
          const assignmentData = await assignmentRes.json();
          setAssignment(assignmentData);
          const readingTiming =
            assignmentData?.assignment?.exam_paper?.reading_timing || 40;
          const readingRemaining =
            parseInt(localStorage.getItem("readingRemainingTime")) || 0;
          const totalTime = readingTiming * 60 + readingRemaining;
          setTimeLeft(totalTime);
        } else {
          console.error("Failed fetching assignment:", assignmentRes.status);
          // Fallback to default
          setTimeLeft(20 * 60);
        }

        // Fetch paper
        const paperRes = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/reading/${test.exam_paper}`
        );
        if (!cancelled) {
          if (paperRes.ok) {
            const data = await paperRes.json();
            setPaper(data.paper);
          } else {
            console.error("Failed fetching paper:", paperRes.status);
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        // Fallback timer
        setTimeLeft(20 * 60);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [test]);

  // Socket connection setup
  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_API_BASE_URL);
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Student connected to Socket.IO");
      newSocket.emit("join", { room: test._id, role: "student" });
    });

    newSocket.on("change-section", (data) => {
      setCurrentPart(data.section);
    });

    newSocket.on("peer-joined", (data) => {
      console.log("Peer joined:", data);
    });

    newSocket.on("disconnect", () => {
      console.log("Student disconnected from Socket.IO");
    });

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [test]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Timer expired, auto-submit
          submitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const currentQuestions =
    paper?.questions?.filter((q) => q.unitNumber === currentPart + 1) || [];
  // Format time helper
  const formatTime = (s) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const submitExam = async () => {
    if (!paper || !test || submitted) return;

    setSubmitting(true);
    try {
      const studentData = localStorage.getItem("student");
      if (!studentData) {
        alert("Student data not found");
        return;
      }
      const student = JSON.parse(studentData);

      if (!student || (!student._id && !student.student_id)) {
        alert("Invalid student data");
        return;
      }

      const paperId = test.exam_paper;

      // Transform answers to keep prefixes for API compatibility
      const transformedAnswers = {};
      Object.entries(answers).forEach(([key, val]) => {
        transformedAnswers[key] = val;
      });

      console.log("Submitting transformedAnswers:", transformedAnswers);

      const payload = {
        studentId: student._id || student.student_id,
        assignmentId: test.assignmentId,
        answers: transformedAnswers,
      };

      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL
        }/reading-results/${paperId}/submit-results`,
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
        setSubmitted(true);
        // Store remaining reading time for writing exam bonus
        localStorage.setItem("readingRemainingTime", timeLeft || 0);
        // After successful submission, transition to writing exam
        navigate("/exam/verification", { state: { skill: "writing" } });
      } else if (response.status === 409) {
        // Already submitted, still navigate
        setSubmitted(true);
        localStorage.setItem("readingRemainingTime", timeLeft || 0);
        navigate("/exam/verification", { state: { skill: "writing" } });
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

  const endExam = async () => {
    // Stop the timer
    setTimeLeft(null);
    // Autosave and navigate
    await submitExam();
  };

  const renderQuestion = (q) => {
    switch (q.type) {
      case "type1_word_replacement":
        return renderType1(q);
      case "type2_gap_fill":
        return renderType2(q);
      case "type3_sentence_completion":
        return renderType3(q);
      case "type4_matching_headings":
        return renderType4(q);
      case "type5":
      case "type5_reading_comprehension":
        return renderType5(q);
      default:
        return <div>Unknown question type</div>;
    }
  };

  const renderType1 = (q) => {
    const questionKey = `type1-${q.questionNumber || q.order + 1}`;
    return (
      <div className="p-4">
        <div className="space-y-2">
          {q.options?.map((opt, i) => {
            const selected = answers[questionKey] === opt.letter;
            return (
              <label
                key={`${questionKey}-${opt.letter}`}
                onClick={() =>
                  setAnswers((prev) => ({ ...prev, [questionKey]: opt.letter }))
                }
                className={`flex items-center gap-4 cursor-pointer border-2 transition-all ${
                  selected
                    ? "bg-[#ffd7c4] border-2 border-[#e94b1b]"
                    : "bg-white border-gray-200 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name={`question-${questionKey}`}
                  value={opt.letter}
                  checked={selected}
                  readOnly
                  className="sr-only"
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
      </div>
    );
  };

  const renderType2 = (q) => {
    console.log("Rendering Type 2 question:", q);
    const questionKey = `type2-${q.questionNumber || q.order + 1}`;
    return (
      <div className="p-4">
        <div className="space-y-2">
          {q.options?.map((opt, i) => {
            const selected = answers[questionKey] === opt.letter;
            return (
              <label
                key={`${questionKey}-${opt.letter}`}
                onClick={() =>
                  setAnswers((prev) => ({ ...prev, [questionKey]: opt.letter }))
                }
                className={`flex items-center gap-4 cursor-pointer border-2 transition-all ${
                  selected
                    ? "bg-[#ffd7c4] border-2 border-[#e94b1b] "
                    : "bg-white border-gray-200 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name={`question-${questionKey}`}
                  value={opt.letter}
                  checked={selected}
                  readOnly
                  className="sr-only"
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
      </div>
    );
  };

  const renderType3 = (q) => {
    const passage = paper?.passages?.find(
      (p) => p.globalIndex === q.passageIndex
    );
    const content = passage?.content || "";
    const parts = content.split(/(\{gap\d+\})/g);
    const usedLetters = Object.entries(answers)
      .filter(([key]) => key.startsWith("gap-"))
      .map(([, val]) => val);
    return (
      <div className="p-4 flex gap-6">
        <div className="flex-1 mb-4 bg-[#EEEEEE] p-4 border max-h-96 overflow-y-auto">
          {parts.map((part, i) => {
            if (part.match(/\{gap\d+\}/)) {
              const gapNum = part.match(/\{gap(\d+)\}/)[1];
              const assigned = answers[`gap-${gapNum}`];
              const assignedSentence = q.sentences?.find(
                (s) => s.letter === assigned
              );
              return (
                <span
                  key={i}
                  className="inline-block border-2 border-dashed border-gray-400 px-2 py-1 mx-1 min-w-32 text-center relative"
                  onDrop={(e) => {
                    e.preventDefault();
                    const sentenceLetter = e.dataTransfer.getData("text");
                    setAnswers((prev) => ({
                      ...prev,
                      [`gap-${gapNum}`]: sentenceLetter,
                    }));
                  }}
                  onDragOver={(e) => e.preventDefault()}
                >
                  {assigned ? (
                    <div className="flex items-center justify-between">
                      <span>{assignedSentence?.text || assigned}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAnswers((prev) => {
                            const newAnswers = { ...prev };
                            delete newAnswers[`gap-${gapNum}`];
                            return newAnswers;
                          });
                        }}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    "Drop sentence here"
                  )}
                </span>
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </div>
        <div className="flex-1 space-y-2">
          {q.sentences?.map((sent) => {
            const isUsed = usedLetters.includes(sent.letter);
            return (
              <div
                key={sent.letter}
                draggable={!isUsed}
                onDragStart={(e) => e.dataTransfer.setData("text", sent.letter)}
                className={`p-2 border cursor-move last:mb-0 ${
                  isUsed
                    ? "border-gray-300 bg-gray-200 text-gray-500"
                    : "border-[#ff3200] bg-[#f8b592] hover:bg-[#FFDFCA]"
                }`}
              >
                <strong>{sent.letter}.</strong> {sent.text}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderType4 = (q) => {
    const usedTextLetters = Object.entries(answers)
      .filter(([key]) => key.startsWith("type4-"))
      .map(([, val]) => val);
    return (
      <div className="p-4 flex gap-6">
        <div className="flex-1 space-y-4 max-h-96 overflow-y-auto">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Texts:</h2>
          {q.texts?.map((text) => {
            const isUsed = usedTextLetters.includes(text.letter);
            return (
              <div
                key={text.letter}
                draggable={true}
                onDragStart={(e) => e.dataTransfer.setData("text", text.letter)}
                className={`p-4 rounded-lg border cursor-move last:mb-0 ${
                  isUsed
                    ? "bg-orange-100 border-gray-300 text-gray-500"
                    : "bg-orange-100 border-orange-300 hover:bg-orange-200"
                }`}
              >
                <div className="font-bold text-lg mb-2">{text.letter}.</div>
                <div className="text-gray-800 text-[10px] leading-relaxed">
                  {text.content}
                </div>
              </div>
            );
          })}
        </div>

        <div class="flex-1 space-y-4 max-h-96 overflow-y-auto">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Questions:
          </h2>
          {q.matchingQuestions?.map((mq) => {
            return (
              <div
                key={mq.questionNumber}
                className="p-3 border border-gray-300 rounded-lg bg-gray-50 last:mb-0"
              >
                <p className="text-gray-700 text-[13px]  mb-2 leading-relaxed">
                  {mq.questionNumber}. {mq.question}
                </p>

                <div
                  className={`border-2 text-[13px] border-dashed px-3 py-2 min-h-10 text-center flex items-center justify-center relative ${
                    answers[`type4-${mq.questionNumber}`]
                      ? "bg-[#ffd7c4] border-[#e94b1b]"
                      : "border-gray-400"
                  }`}
                  onDrop={(e) => {
                    e.preventDefault();
                    const textLetter = e.dataTransfer.getData("text");
                    setAnswers((prev) => ({
                      ...prev,
                      [`type4-${mq.questionNumber}`]: textLetter,
                    }));
                  }}
                  onDragOver={(e) => e.preventDefault()}
                >
                  {answers[`type4-${mq.questionNumber}`] ? (
                    <div className="flex text-[13px] items-center justify-between w-full">
                      <span>Text {answers[`type4-${mq.questionNumber}`]}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAnswers((prev) => {
                            const newAnswers = { ...prev };
                            delete newAnswers[`type4-${mq.questionNumber}`];
                            return newAnswers;
                          });
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    "Drop text here"
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderComprehensionQuestion = (cq, questionKey) => {
    switch (cq.questionType) {
      case "multiple_choice":
        return (
          <div className="p-4">
            <div className="space-y-2">
              {cq.options?.map((opt, i) => {
                const selected = answers[questionKey] === opt.letter;
                return (
                  <label
                    key={`${questionKey}-${opt.letter}`}
                    onClick={() =>
                      setAnswers((prev) => ({
                        ...prev,
                        [questionKey]: opt.letter,
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
                      name={`question-${questionKey}`}
                      value={opt.letter}
                      checked={selected}
                      readOnly
                      className="sr-only"
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
                      className={`text-gray-800 ${
                        selected ? "font-medium" : ""
                      }`}
                    >
                      {opt.text}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        );
      case "true_false":
        return (
          <div className="p-4">
            <div className="space-y-2">
              {cq.options?.map((opt, i) => {
                const selected = answers[questionKey] === opt.letter;
                return (
                  <label
                    key={`${questionKey}-${opt.letter}`}
                    onClick={() =>
                      setAnswers((prev) => ({
                        ...prev,
                        [questionKey]: opt.letter,
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
                      name={`question-${questionKey}`}
                      value={opt.letter}
                      checked={selected}
                      readOnly
                      className="sr-only"
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
                      className={`text-gray-800 ${
                        selected ? "font-medium" : ""
                      }`}
                    >
                      {opt.text}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        );
      case "short_answer":
        return (
          <div className="p-4">
            <input
              type="text"
              value={answers[questionKey] || ""}
              onChange={(e) =>
                setAnswers((prev) => ({
                  ...prev,
                  [questionKey]: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={`Answer (max ${cq.maxWords} words)`}
            />
          </div>
        );
      case "gap_fill":
        return (
          <div className="p-4">
            <input
              type="text"
              value={answers[questionKey] || ""}
              onChange={(e) =>
                setAnswers((prev) => ({
                  ...prev,
                  [questionKey]: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Fill the gap"
            />
          </div>
        );
      default:
        return (
          <div className="p-4">
            <div className="space-y-2">
              {cq.options?.map((opt, i) => {
                const selected = answers[questionKey] === opt.letter;
                return (
                  <label
                    key={`${questionKey}-${opt.letter}`}
                    onClick={() =>
                      setAnswers((prev) => ({
                        ...prev,
                        [questionKey]: opt.letter,
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
                      name={`question-${questionKey}`}
                      value={opt.letter}
                      checked={selected}
                      readOnly
                      className="sr-only"
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
                      className={`text-gray-800 ${
                        selected ? "font-medium" : ""
                      }`}
                    >
                      {opt.text}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        );
    }
  };

  const renderType5 = (q) => {
    if (q.comprehensionQuestions && q.comprehensionQuestions.length > 0) {
      return (
        <div className="space-y-6">
          {q.comprehensionQuestions.map((cq, index) => {
            const questionKey = `type5-${cq.questionNumber}`;
            return (
              <div key={index} className="bg-white border rounded p-4">
                <div className="mb-2">
                  <strong>{cq.questionNumber}.</strong> {cq.question}
                </div>
                {renderComprehensionQuestion(cq, questionKey)}
              </div>
            );
          })}
        </div>
      );
    } else {
      // Render single question with options from q.options
      const questionKey = `type5-${q.questionNumber || q.order + 1}`;
      return (
        <div className="">
          <div className="p-4">
            <div className="space-y-2">
              {q.options?.map((opt, i) => {
                const selected = answers[questionKey] === opt.letter;
                return (
                  <label
                    key={`${questionKey}-${opt.letter}`}
                    onClick={() =>
                      setAnswers((prev) => ({
                        ...prev,
                        [questionKey]: opt.letter,
                      }))
                    }
                    className={`flex items-center gap-4 cursor-pointer border-2 transition-all ${
                      selected
                        ? "bg-[#ffd7c4] border-2 border-[#e94b1b]"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${questionKey}`}
                      value={opt.letter}
                      checked={selected}
                      readOnly
                      className="sr-only"
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
                      className={`text-gray-800 ${
                        selected ? "font-medium" : ""
                      }`}
                    >
                      {opt.text}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-b-2 border-orange-500 rounded-full mx-auto" />
          <p className="text-gray-600 mt-3">Loading reading paper...</p>
        </div>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-gray-600">No reading paper available</p>
          <button onClick={() => navigate(-1)}>back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="https://examsimulation.languagecert.org/images/peoplecert-logo.svg"
              alt="logo"
              className="h-8"
            />
          </div>

          {timeLeft !== null && (
            <div className="text-red-600 font-mono text-lg">
              Time Left: {formatTime(timeLeft)}
            </div>
          )}
          <button
            onClick={submitExam}
            disabled={submitting}
            className=" bg-[#ff3200] p-2 text-white font-semibold rounded-lg hover:bg-[#ff3300bd] disabled:bg-gray-400"
          >
            {submitting ? "Submitting..." : "Submit Exam"}
          </button>

          {/* <div>
            <button onClick={() => navigate(-1)}>back</button>
          </div> */}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
        {/* left sidebar (sticky) */}
        <aside className="w-48 pr-10 sticky top-24 self-start h-fit">
          <div className="text-gray-600 font-semibold mb-2">Reading</div>

          <div className="flex flex-col gap-1 pl-6">
            {paper.passages?.map((s, idx) => {
              const isActive = idx === currentPart;
              return (
                <button
                  key={`part-${idx}`}
                  onClick={() => setCurrentPart(idx)}
                  className={`relative w-full text-left px-3 py-2 border transition-all duration-150 rounded-md ${
                    isActive
                      ? "bg-gray-900 text-white shadow-md"
                      : "bg-white text-gray-800 hover:bg-gray-100"
                  }`}
                >
                  {isActive && (
                    <span
                      className="absolute top-0 right-[-12px] h-full w-3 bg-gray-900"
                      style={{ clipPath: "polygon(0 0, 100% 50%, 0 100%)" }}
                    />
                  )}
                  <span className="text-sm font-semibold">
                    Reading Part {idx + 1}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* main content (scrollable) */}
        <main className="flex-1  overflow-y-auto pr-2">
          {/* instructions */}
          <div className="bg-gray-100 border-l-4 border-gray-300 p-4 mb-6">
            Read the text and answer the questions.
          </div>

          {/* Passage and Questions for Type 2 and Type 5 */}
          {currentQuestions.some(
            (q) =>
              q.type === "type2_gap_fill" ||
              q.type === "type5_reading_comprehension"
          ) ? (
            <div className="flex w-full gap-6">
              {/* Passage Content (sticky, no height/width, no inner scroll) */}
              {(() => {
                const currentPassage = paper.passages?.find(
                  (p) => p.unitNumber === currentPart + 1
                );

                const type2Questions = currentQuestions
                  .filter((q) => q.type === "type2_gap_fill")
                  .sort((a, b) => a.order - b.order);

                const hasType5 = currentQuestions.some(
                  (q) => q.type === "type5_reading_comprehension"
                );

                let processedContent = currentPassage?.content;

                if (processedContent && !hasType5) {
                  processedContent = processedContent.replace(
                    /\[GAP(\d+)\]/g,
                    (match, num) => {
                      const index = parseInt(num) - 1;
                      const question = type2Questions[index];
                      return question
                        ? `<strong>(${question.order + 1})……………</strong>`
                        : match;
                    }
                  );
                }

                return processedContent ? (
                  <div className="flex-1 sticky top-24 self-start">
                    <div className="bg-white border border-gray-200 p-4 rounded">
                      <div
                        className="text-gray-800 leading-relaxed [&>*]:my-0 [&>p]:my-0"
                        dangerouslySetInnerHTML={{ __html: processedContent }}
                      />
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Questions area (normal flow; page scrolls these) */}
              <div className="flex-1 space-y-6">
                {currentQuestions.map((q) => (
                  <article key={q._id} className="bg-white last:mb-0">
                    <div className="p-1 pl-5 flex items-center bg-[#F7F7F7] border">
                      <div className="text-2xl font-semibold">
                        {q.order + 1}.
                      </div>
                      <div className="ml-6 flex items-center">
                        {q.type !== "type3_sentence_completion" &&
                          q.question && (
                            <div
                              className="text-gray-800 font-medium m-0"
                              dangerouslySetInnerHTML={{
                                __html: q.question.replace(
                                  /\*\*(.*?)\*\*/g,
                                  "<strong>$1</strong>"
                                ),
                              }}
                            />
                          )}
                      </div>
                    </div>

                    {renderQuestion(q)}
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {currentQuestions.length === 0 ? (
                <div className="p-8 bg-white border rounded text-gray-500">
                  No questions available for this section
                </div>
              ) : (
                currentQuestions.map((q) => (
                  <article key={q._id} className="bg-white last:mb-0">
                    <div className="p-1 pl-5 flex items-center bg-[#F7F7F7] border">
                      <div className="text-2xl font-semibold">
                        {q.order + 1}.
                      </div>
                      <div className="ml-6 flex items-center">
                        {q.type !== "type3_sentence_completion" &&
                          q.question && (
                            <div
                              className="text-gray-800 font-medium m-0"
                              dangerouslySetInnerHTML={{
                                __html: q.question.replace(
                                  /\*\*(.*?)\*\*/g,
                                  "<strong>$1</strong>"
                                ),
                              }}
                            />
                          )}
                      </div>
                    </div>

                    {renderQuestion(q)}
                  </article>
                ))
              )}
            </div>
          )}

          {/* Buttons */}
          <div className="mt-8 flex justify-center gap-4">
            {/* Add your buttons here if needed */}
          </div>
        </main>
      </div>
    </div>
  );
}

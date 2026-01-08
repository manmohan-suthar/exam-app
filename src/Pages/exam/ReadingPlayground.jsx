import React from "react";
import { Clock6 } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import io from "socket.io-client";
import "quill/dist/quill.snow.css";


export default function ReadingPlayground({
  test,
  currentPart = 0,
  onPartChange,
  onReadingCompleted,
}) {
  const [paper, setPaper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [assignment, setAssignment] = useState(null);

  const [socket, setSocket] = useState(null);
  const hasRefreshedRef = useRef(false);

  const navigate = useNavigate();

  // One-time page refresh on load
  // useEffect(() => {
  //   if (!hasRefreshedRef.current && !sessionStorage.getItem('readingPlaygroundRefreshed')) {
  //     hasRefreshedRef.current = true;
  //     sessionStorage.setItem('readingPlaygroundRefreshed', 'true');
  //     window.location.reload();
  //   }
  // }, []);

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

          // Fetch real-time reading timing from API
          const timingRes = await fetch(
            `${import.meta.env.VITE_API_BASE_URL}/reading-timing/${
              test.exam_paper
            }`
          );
          if (!cancelled && timingRes.ok) {
            const timingData = await timingRes.json();
            const realTimeTiming = timingData.timing || 40; // assuming timing in minutes
            setTimeLeft(realTimeTiming * 60);
          } else {
            console.error(
              "Failed fetching real-time timing:",
              timingRes.status
            );
            // Fallback to assignment timing
            const readingTiming =
              assignmentData?.assignment?.exam_paper?.reading_timing || 40;
            setTimeLeft(readingTiming * 60);
          }
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
        if (prev <= 1 && !submitted) {
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
        // Notify parent of completion
        if (onReadingCompleted) {
          onReadingCompleted();
        }
        // In combined mode, don't navigate - let the parent handle it
        const combinedExams = localStorage.getItem("combinedExams");
        if (!combinedExams) {
          // Only navigate if not in combined mode
          navigate("/exam/verification", { state: { skill: "writing" } });
        }
      } else if (response.status === 409) {
        // Already submitted, still navigate
        setSubmitted(true);
        const combinedExams = localStorage.getItem("combinedExams");
        if (!combinedExams) {
          navigate("/exam/verification", { state: { skill: "writing" } });
        }
      } else {
        const error = await response.json();
        // alert(`Submission failed: ${error.error}`);
      }
    } catch (error) {
      console.error("Submit error:", error);
      // alert("An error occurred while submitting the exam");
    } finally {
      setSubmitting(false);
    }
  };

  const endExam = async () => {
    // Store remaining time for bonus to writing exam
    if (timeLeft > 0) {
      localStorage.setItem("readingRemainingTime", timeLeft.toString());
    }
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
      </div>
    );
  };

  const renderType2 = (q) => {
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
      </div>
    );
  };

  function cleanHTML(html) {
    let cleaned = html
      .replace(/\bclass="/g, 'className="')
      .replace(/\bclassname="/gi, 'className="')
      .replace(/className="ql-align-center"/g, 'className="text-center"')
      .replace(/className="ql-align-right"/g, 'className="text-right"')
      .replace(/<span className="ql-ui"[^>]*><\/span>/g, "")
      .replace(/contenteditable="false"/gi, "");
  
    // FIX: Convert OL → UL if bullet items exist
    cleaned = cleaned.replace(
      /<ol([^>]*)>([\s\S]*?)<\/ol>/g,
      (match, attrs, inner) => {
        if (inner.includes('data-list="bullet"')) {
          return `<ul className="list-disc list-inside ml-4">${inner}</ul>`;
        }
        return `<ol className="list-decimal list-inside ml-4">${inner}</ol>`;
      }
    );
  
    // Fix UL normally
    cleaned = cleaned.replace(
      /<ul([^>]*)>/g,
      '<ul className="list-disc list-inside ml-4">'
    );
  
    return cleaned;
  }
  
  
  
  
  const renderType3 = (q) => {
    const passage = paper?.passages?.find(
      (p) => p.globalIndex === q.passageIndex
    );
  
    const rawHTML = passage?.content || "";
    const safeHTML = cleanHTML(rawHTML);
  
    function renderHTMLWithGaps(html) {
      const template = document.createElement("template");
      template.innerHTML = html;
    
      function walk(node, key = "k") {
        // TEXT NODE
        if (node.nodeType === 3) {
          const text = node.textContent;
          const parts = text.split(/(\{gap\d+\})/g);
    
          if (parts.length === 1) return text;
    
          return parts.map((p, i) => {
            const m = p.match(/\{gap(\d+)\}/);
            if (!m) return p;
    
            const gap = m[1];
            const assigned = answers[`gap-${gap}`];
            const assignedSentence = q.sentences.find(
              (s) => s.letter === assigned
            );
    
            return (
              <span
                key={`gap-${gap}-${i}`}
                className={`inline-block border rounded px-1 min-w-24 bg-white ${
                  assigned ? "border-[#e94b1b]" : "border-gray-400"
                }`}
                onDrop={(e) => {
                  e.preventDefault();
                  const letter = e.dataTransfer.getData("text");
                  setAnswers((prev) => ({
                    ...prev,
                    [`gap-${gap}`]: letter,
                  }));
                }}
                onDragOver={(e) => e.preventDefault()}
              >
                {assigned ? (
                  <div className="flex justify-between">
                    <span>{assignedSentence?.text}</span>
                    <button
                      className="text-red-500"
                      onClick={() =>
                        setAnswers((prev) => {
                          const c = { ...prev };
                          delete c[`gap-${gap}`];
                          return c;
                        })
                      }
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <span>&nbsp;&nbsp;&nbsp;&nbsp;</span>
                )}
              </span>
            );
          });
        }
    
        // ELEMENT NODE
        if (node.nodeType === 1) {
          const tag = node.tagName.toLowerCase();
          const attrs = {};
    
          [...node.attributes].forEach((a) => {
            let name = a.name;
            let value = a.value;
    
            if (name === "class") name = "className";
    
            attrs[name] = value;
          });
    
          // Self-closing tags
          if (["br", "hr", "img", "input"].includes(tag)) {
            return React.createElement(tag, { ...attrs, key });
          }
    
          const children = [...node.childNodes].map((child, i) =>
            walk(child, `${key}-${i}`)
          );
    
          return React.createElement(tag, { ...attrs, key }, children);
        }
    
        return null;
      }
    
      return [...template.content.childNodes].map((n, i) =>
        walk(n, `root-${i}`)
      );
    }
    
  
    const usedLetters = Object.values(answers);
  
    return (
      <div className="p-4 flex gap-6">
        <div className="flex-1 bg-[#EEEEEE] p-4 text-[11px] border max-h-96 overflow-y-auto ql-editor">
          {renderHTMLWithGaps(safeHTML)}
        </div>
  
        <div className="flex-1 space-y-2">
          {q.sentences?.map((sent) => {
            const isUsed = usedLetters.includes(sent.letter);
            return (
              <div
                key={sent.letter}
                draggable={!isUsed}
                onDragStart={(e) =>
                  e.dataTransfer.setData("text", sent.letter)
                }
                className={`p-1 rounded-2xl text-[14px] border cursor-move ${
                  isUsed
                    ? "border-gray-300 bg-gray-200 text-gray-500"
                    : "border-[#ff3200] bg-[#f8b592] hover:bg-[#FFDFCA]"
                }`}
              >
                <div className="flex flex-col text-center">
                  <strong>{sent.letter}.</strong>
                  {sent.text}
                </div>
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
                    ? "bg-[#F8B592] border-gray-300 text-gray-500"
                    : "bg-[#F8B592] border-orange-300 hover:bg-[#FEF2E7]"
                }`}
              >
                <div className="flex flex-col text-center ">
                  <div className="font-bold text-lg mb-2">{text.letter}.</div>
                  <div className="text-gray-800 text-[10px] text-start leading-relaxed">
                    {text.content}
                  </div>
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
                className={`p-3 rounded-lg last:mb-0 transition ${
                  answers[`type4-${mq.questionNumber}`]
                    ? "bg-[#FEF2E7] border-2 border-[#e94b1b]"
                    : "bg-gray-50 border-2 border-dashed border-gray-300 hover:bg-[#FFF5EE]"
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const textLetter = e.dataTransfer.getData("text");

                  if (!textLetter) return;

                  setAnswers((prev) => ({
                    ...prev,
                    [`type4-${mq.questionNumber}`]: textLetter,
                  }));
                }}
              >
                {/* QUESTION TEXT */}
                <p className="text-gray-700 text-[13px] mb-2 leading-relaxed">
                  {mq.questionNumber}. {mq.question}
                </p>

                {/* SELECTED ANSWER DISPLAY */}
                {answers[`type4-${mq.questionNumber}`] && (
                  <div className="mt-2 flex items-center justify-between bg-white p-2 rounded border">
                    <span className="text-[13px]">
                      Text {answers[`type4-${mq.questionNumber}`]}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAnswers((prev) => {
                          const newAnswers = { ...prev };
                          delete newAnswers[`type4-${mq.questionNumber}`];
                          return newAnswers;
                        });
                      }}
                      className="text-red-500 hover:text-red-700 font-bold"
                    >
                      ×
                    </button>
                  </div>
                )}
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
      {/* <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
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

      
        </div>
      </header> */}
      <div className="mb-2 w-full flex justify-between">
        <div className="w-full flex items-center justify-end ">
          <div className="flex items-center gap-2 font-mono text-[13px] font-semibold   text-white ">
            <button className="bg-[#FF3200]   pl-5 pr-5 " onClick={() => onPartChange(Math.max(0, currentPart - 1))}>Preview</button>
            <button className="bg-[#FF3200]   pl-5 pr-5 " onClick={() => onPartChange(currentPart + 1)} disabled={!paper?.questions?.some(q => q.unitNumber === currentPart + 2)}>Next</button>
            <button className="bg-[#FF3200]   pl-5 pr-5 " onClick={endExam}>
              End
            </button>
            <p className="bg-[#FF3200] px-5 flex items-center justify-center gap-1 text-white">
              {formatTime(timeLeft)}
              <Clock6 size={16} />
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl  mx-auto py-2">
        {/* main content (scrollable) */}
        <main className="w-full h-[96vh] overflow-y-scroll pb-20 pr-2">
          {/* Section Instructions - Dynamic from database with error handling */}
          <div className="bg-[#EEEEEE]  p-4 mb-6" role="region" aria-labelledby="section-instructions-heading">
            <div className="flex items-start gap-3">
          
              <div className="flex-1">
                <h3 id="section-instructions-heading" className="font-semibold mb-2 sr-only">
                  Section {currentPart + 1} Instructions
                </h3>
                <p className="text-sm capitalize leading-relaxed" aria-live="polite">
  {(() => {
    try {
      const currentPassage = paper?.passages?.find(
        (p) => p.unitNumber === currentPart + 1
      );

      if (!currentPassage) {
        console.warn(`No passage found for section ${currentPart + 1}`);
        return 'Read the text below and answer the questions.';
      }

      let instructions =
        currentPassage?.sectionInstructions ||
        currentPassage?.instructions ||
        'Read the text below and answer the questions.';

      // Ensure valid string
      if (typeof instructions !== 'string' || !instructions.trim()) {
        console.warn(`Invalid instructions for section ${currentPart + 1}`);
        return 'Read the text below and answer the questions.';
      }

      // 🔥 Remove wrapping quotes: "test" => test
      instructions = instructions.replace(/^"(.*)"$/, '$1');

      return instructions;
    } catch (error) {
      console.error('Error loading section instructions:', error);
      return 'Read the text below and answer the questions.';
    }
  })()}
</p>

              </div>
            </div>
          </div>

          {currentQuestions.some(
  (q) =>
    q.type === "type2_gap_fill" ||
    q.type === "type5_reading_comprehension"
) ? (
  <div className="flex w-full gap-6">
    {/* Passage */}
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
              ? `<strong>(${question.order + 1})...............</strong>`
              : match;
          }
        );
      }

      return processedContent ? (
        <div className="flex-1 sticky top-0 self-start">
          <div className="bg-white border border-gray-200 p-4 rounded">
            <div
              className="ql-editor text-gray-800 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: processedContent }}
            />
          </div>
        </div>
      ) : null;
    })()}

    {/* Questions */}
    <div className="flex-1 space-y-6">
      {currentQuestions.map((q) => (
        <article key={q._id} className="bg-white">
          <div className="p-1 pl-5 flex items-center bg-[#F7F7F7] border">
            <div className="text-2xl font-semibold">{q.order + 1}.</div>
            <div className="ml-6">
              {q.question && (
                <div
                  className="text-gray-800 font-medium"
                  dangerouslySetInnerHTML={{ __html: q.question }}
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
  /* fallback when no passage type */
  <div className="space-y-6">
    {currentQuestions.map((q) => (
      <article key={q._id} className="bg-white">
        <div className="p-1 pl-5 flex items-center bg-[#F7F7F7] border">
          <div className="text-2xl font-semibold">{q.order + 1}.</div>
          <div className="ml-6">
            {/* {q.question && (
              <div
                className="text-gray-800 font-medium"
                dangerouslySetInnerHTML={{ __html: q.question }}
              />
            )} */}
          </div>
        </div>
        {renderQuestion(q)}
      </article>
    ))}
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

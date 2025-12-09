import { Clock6 } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const WritingPlayground = ({ test, currentTask = 1, onTaskChange, onWritingCompleted }) => {
  const [paper, setPaper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [assignment, setAssignment] = useState(null);

  // History for undo/redo
  const [history, setHistory] = useState([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  const [isUndoing, setIsUndoing] = useState(false);

  const navigate = useNavigate();
  const textareaRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!test?.exam_paper || !test?.assignmentId) {
          setLoading(false);
          return;
        }

        // Fetch assignment to get writing_timing
        const assignmentRes = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/exam-assignments/${
            test.assignmentId
          }`
        );
        if (assignmentRes.ok) {
          const assignmentData = await assignmentRes.json();
          setAssignment(assignmentData);
        
          const writingTiming =
            assignmentData.assignment?.exam_paper?.writing_timing ?? 20; // minutes
        
          // --- SAFE bonus parsing ---
          const rawBonus = localStorage.getItem("readingRemainingTime");
          const parsedBonus = Number(rawBonus);
          const safeBonus = Number.isFinite(parsedBonus) && parsedBonus > 0 ? parsedBonus : 0;
        
          // --- Apply bonus only once per browser session to avoid double-applying on refresh ---
          const alreadyApplied = sessionStorage.getItem("readingBonusApplied") === "1";
          const appliedBonus = alreadyApplied ? 0 : safeBonus;
        
          const totalTime = writingTiming * 60 + safeBonus;
          setTimeLeft(totalTime);
          console.log("Total time:", totalTime);
        
          // Mark as applied for this session (but DO NOT remove from localStorage here)
          if (!alreadyApplied && safeBonus > 0) {
            sessionStorage.setItem("readingBonusApplied", "1");
          }
        } else {
          console.error("Failed fetching assignment:", assignmentRes.status);
          setTimeLeft(20 * 60);
        }
        

        // Fetch paper
        const paperRes = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/writing/${test.exam_paper}`
        );
        if (paperRes.ok) {
          const data = await paperRes.json();
          setPaper(data.paper);
        } else {
          console.error("Failed fetching paper:", paperRes.status);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        // Fallback
        setTimeLeft(20 * 60);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
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

  const handleAnswerChange = (taskNumber, answer) => {
    setAnswers((prev) => ({ ...prev, [taskNumber]: answer }));
  };

  console.log(timeLeft);

  // History management
  const addToHistory = (newText) => {
    const newHistory = history.slice(0, currentHistoryIndex + 1);
    newHistory.push(newText);
    setHistory(newHistory);
    setCurrentHistoryIndex(newHistory.length - 1);
  };

  // Initialize history
  useEffect(() => {
    if (paper && currentTask) {
      const initialText = answers[currentTask] || "";
      if (history.length === 0) {
        addToHistory(initialText);
      }
    }
  }, [paper, currentTask, answers]);

  // Toolbar handlers
  const handleUndo = () => {
    if (currentHistoryIndex > 0) {
      setIsUndoing(true);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      const newIndex = currentHistoryIndex - 1;
      setCurrentHistoryIndex(newIndex);
      const undoneText = history[newIndex];
      setAnswers((prev) => ({ ...prev, [currentTask]: undoneText }));
      // Restore cursor if possible
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
        setIsUndoing(false);
      }, 0);
    }
  };

  const handleRedo = () => {
    if (currentHistoryIndex < history.length - 1) {
      setIsUndoing(true);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      const newIndex = currentHistoryIndex + 1;
      setCurrentHistoryIndex(newIndex);
      const redoneText = history[newIndex];
      setAnswers((prev) => ({ ...prev, [currentTask]: redoneText }));
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
        setIsUndoing(false);
      }, 0);
    }
  };

  const applyFormat = (format) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = answers[currentTask] || "";
    const selectedText = text.substring(start, end);

    let formattedText = selectedText;
    if (format === 'bold') {
      formattedText = `**${selectedText}**`;
    } else if (format === 'italic') {
      formattedText = `*${selectedText}*`;
    } else if (format === 'underline') {
      formattedText = `__${selectedText}__`;
    }

    const newText = text.substring(0, start) + formattedText + text.substring(end);
    setAnswers((prev) => ({ ...prev, [currentTask]: newText }));

    // Clear any pending debounced save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    addToHistory(newText);

    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + formattedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleBold = () => applyFormat('bold');
  const handleItalic = () => applyFormat('italic');
  const handleUnderline = () => applyFormat('underline');

  // Format time helper
  const formatTime = (s) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };


  const submitExam = async () => {
    if (!paper || !test) return;

    setSubmitting(true);
    try {
      const examData = localStorage.getItem("examAssignment");
      if (!examData) {
        alert("Exam data not found");
        return;
      }
      const exam = JSON.parse(examData);

      const paperId =
        exam.exam_paper.writing_exam_paper ||
        exam.exam_paper.writing ||
        exam.exam_paper;

      const payload = {
        studentId: exam.student._id || exam.student,
        assignmentId: exam._id,
        answers: answers,
        timeLeft: timeLeft,
      };

      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL
        }/writing-results/${paperId}/submit-results`,
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
      
        // Clear carried-over time only after successful submission
        localStorage.removeItem("readingRemainingTime");
        sessionStorage.removeItem("readingBonusApplied");
      
        if (onWritingCompleted) {
          onWritingCompleted();
        }
        navigate("/thanks");
      }
       else {
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

  if (loading) {
    return (
      <div className="min-h-screen overflow-scroll  flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-b-2 border-orange-500 rounded-full mx-auto"></div>
          <p className="text-gray-600 mt-3">Loading writing paper...</p>
        </div>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="min-h-screen overflow-scroll flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No writing paper available</p>
          <button onClick={() => navigate(-1)}>Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-scroll  bg-white">
      {/* header */}
      {/* <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">


          <img src="https://examsimulation.languagecert.org/images/peoplecert-logo.svg" alt="logo" className="h-8" />
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
              {submitting ? 'Submitting...' : 'Submit Exam'}
            </button>
        \
        </div>
      </header> */}
      <div className="w-full flex items-center justify-end ">
        <div className="flex items-center gap-2 font-mono text-[13px] font-semibold   text-white ">
          <button className="bg-[#FF3200]   pl-5 pr-5 ">Preview</button>
          <button className="bg-[#FF3200]   pl-5 pr-5 ">Next</button>
          <button className="bg-[#FF3200]   pl-5 pr-5 " onClick={submitExam}>End</button>
          <p className="bg-[#FF3200] px-5 flex items-center justify-center gap-1 text-white">
  {formatTime(timeLeft)}
  <Clock6 size={16} />
</p>

        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-2 h-[95vh] p-20">
        {/* main content */}
        <main className="w-full">
          {/* instructions */}
          <div className="bg-gray-100 border-l-4 border-gray-300 p-2 mb-6">
            Read the task and write your answer.
          </div>

          {(() => {
            const currentTaskData = paper.tasks?.find(
              (t) => t.taskNumber === currentTask
            );
            if (!currentTaskData) return null;

            return (
              <div className="flex flex-col w-full gap-6">
                {/* Task Prompt */}
                <div className="flex-1 bg-[#EEEEEE] border border-gray-200 p-4 rounded  overflow-y-auto text-[13px]">
               

                  <div className="prose max-w-none">
                    <div
                      className="text-gray-800 leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: currentTaskData.prompt,
                      }}
                    />

                    {currentTaskData.images?.map((image, imgIdx) => (
                      <div key={imgIdx} className="my-4">
                        <img
                          src={`${import.meta.env.VITE_API_BASE_URL}/${
                            image.path
                          }`}
                          alt={image.originalName}
                          className="max-w-full h-auto rounded-lg shadow-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Answer Area */}
                <div className="flex-1 space-y-6">
  <div className="bg-white border border-gray-200 rounded overflow-hidden">

    {/* ===== HEADER TOOLBAR ===== */}
    <div className="flex items-center justify-between px-3 py-2 bg-gray-100 border-b border-gray-100">
      
      {/* Left tools */}
      <div className="flex items-center gap-1">
     

     

        <button onClick={handleBold} className="px-2 py-1 border border-gray-200 rounded font-bold hover:bg-gray-200">
          B
        </button>
        <button onClick={handleItalic} className="px-2 py-1 border border-gray-200 rounded italic hover:bg-gray-200">
          I
        </button>
        <button onClick={handleUnderline} className="px-2 py-1 border rounded underline border-gray-200 hover:bg-gray-200">
          U
        </button>
      </div>

      {/* Right side word count */}
      <span className="text-sm text-gray-600">
        Words:{" "}
        {
          (answers[currentTask] || "").trim().split(/\s+/).filter(Boolean).length
        }
      </span>
    </div>

    {/* ===== TEXTAREA ===== */}
    <textarea
      ref={textareaRef}
      value={answers[currentTask] || ""}
      onChange={(e) => {
        const newText = e.target.value;
        handleAnswerChange(currentTask, newText);
        // Debounced save to history
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
          if (!isUndoing) {
            addToHistory(newText);
          }
        }, 1000);
      }}
      onBlur={() => {
        // Immediate save on blur
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        if (!isUndoing) {
          addToHistory(answers[currentTask]);
        }
      }}
      placeholder="Write your answer here..."
      className="
        w-full
        min-h-[400px]
        p-4
        resize-none
        outline-none
        focus:outline-none
        border-none
      "
    />
  </div>
</div>

              </div>
            );
          })()}
        </main>
      </div>
    </div>
  );
};

export default WritingPlayground;

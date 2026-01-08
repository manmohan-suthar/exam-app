import { Clock6 } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Quill from "quill";
import "quill/dist/quill.snow.css";

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
  const editorRef = useRef(null);
  const quillRef = useRef(null);
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

  

  useEffect(() => {
    if (!paper) return;
    if (!editorRef.current) return;
    if (quillRef.current) return;

    quillRef.current = new Quill(editorRef.current, {
      theme: "snow",
      placeholder: "Write your answer here...",
      modules: {
        toolbar: [
          ["bold", "italic", "underline"],
          [{ list: "bullet" }],
          ["clean"],
        ],
      },
    });

    // ✅ SET INITIAL CONTENT
    quillRef.current.root.innerHTML = answers[currentTask] || "";
  }, [paper]);
  
  
  

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



  // History management
  const addToHistory = (newText) => {
    const newHistory = history.slice(0, currentHistoryIndex + 1);
    newHistory.push(newText);
    setHistory(newHistory);
    setCurrentHistoryIndex(newHistory.length - 1);
  };

// ✅ Initialize history ONLY when task changes
useEffect(() => {
  if (!quillRef.current) return;

  const html = answers[currentTask] || "";
  quillRef.current.setContents([]);
  quillRef.current.clipboard.dangerouslyPasteHTML(html);
}, [currentTask]);

// Text change handler that updates the correct task
useEffect(() => {
  if (!quillRef.current) return;

  const handleTextChange = () => {
    const html = quillRef.current.root.innerHTML;
    setAnswers((prev) => ({
      ...prev,
      [currentTask]: html,
    }));
  };

  quillRef.current.on("text-change", handleTextChange);

  return () => {
    quillRef.current.off("text-change", handleTextChange);
  };
}, [currentTask]);



  // Format time helper
  const formatTime = (s) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Word count from HTML
  const getWordCount = (html) => {
    if (!html) return 0;
    const text = html.replace(/<[^>]*>/g, "").trim();
    return text.split(/\s+/).filter(Boolean).length;
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
<div className="sticky top-0 z-50 bg-white border-b">
  <div className="w-full flex items-center justify-end px-4 py-2">
    <div className="flex items-center gap-2 font-mono text-[13px] font-semibold text-white">
      <button className="bg-[#FF3200] px-5" onClick={() => { if (currentTask > 1) onTaskChange(currentTask - 1); }}>Preview</button>
      <button className="bg-[#FF3200] px-5" onClick={() => { if (currentTask < 2) onTaskChange(currentTask + 1); }}>Next</button>
      <button className="bg-[#FF3200] px-5" onClick={submitExam}>End</button>
      <p className="bg-[#FF3200] px-5 flex items-center gap-1">
        {formatTime(timeLeft)}
        <Clock6 size={16} />
      </p>
    </div>
  </div>
</div>


      <div className="max-w-6xl mx-auto px-4 py-2 h-[95vh] p-20">
        {/* main content */}
        <main className="w-full">
          {/* Dynamic Task Instructions - Consistent with ReadingPlayground */}
          <div className="bg-[#EEEEEE]   p-4 mb-6 " role="region" aria-labelledby="task-instructions-heading">
            <div className="flex items-start gap-3">

              <div className="flex-1">
                <h3 id="task-instructions-heading" className="font-semibold  mb-2 sr-only">
                  Task {currentTask} Instructions
                </h3>
                <p className=" capitalize text-sm leading-relaxed" aria-live="polite">
                  {(() => {
                    try {
                      // Find the current task based on currentTask
                      const currentTaskData = paper?.tasks?.find(
                        (t) => t.taskNumber === currentTask
                      );

                      // Validate task structure
                      if (!currentTaskData) {
                        console.warn(`No task found for task number ${currentTask}`);
                        return 'Read the task and write your answer.';
                      }

                      // Get task instructions with fallback to default
                      const instructions = currentTaskData?.instructions ||
                                           'Read the task and write your answer.';

                      // Validate instructions
                      if (typeof instructions !== 'string' || !instructions.trim()) {
                        console.warn(`Invalid instructions for task ${currentTask}`);
                        return 'Read the task and write your answer.';
                      }

                      return instructions;
                    } catch (error) {
                      console.error('Error loading task instructions:', error);
                      return 'Read the task and write your answer.';
                    }
                  })()}
                </p>
              </div>
            </div>
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

{/* QUILL WRAPPER */}
<div className="bg-white border border-gray-200 rounded overflow-hidden">

  {/* WORD COUNT */}
  <div className="flex justify-end px-3 py-2 bg-gray-100 border-b">
    <span className="text-sm text-gray-600">
      Words: {getWordCount(answers[currentTask])}
    </span>
  </div>
  <div
  ref={editorRef}
  className="bg-white"
  style={{ height: "300px" }}
/>


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

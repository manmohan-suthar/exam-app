import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const WritingPlayground = () => {
  const [paper, setPaper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTask, setCurrentTask] = useState(1);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [assignment, setAssignment] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { test } = location.state || {};

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!test?.exam_paper || !test?.assignmentId) {
          setLoading(false);
          return;
        }

        // Fetch assignment to get writing_timing
        const assignmentRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/exam-assignments/${test.assignmentId}`);
        if (assignmentRes.ok) {
          const assignmentData = await assignmentRes.json();
          setAssignment(assignmentData);
          const writingTiming = assignmentData.assignment.exam_paper.writing_timing || 20; // base 20 minutes
          const readingRemaining = parseInt(localStorage.getItem("readingRemainingTime")) || 0;
          const totalTime = writingTiming * 60 + readingRemaining; // add extra time
          setTimeLeft(totalTime);
        } else {
          console.error("Failed fetching assignment:", assignmentRes.status);
          // Fallback
          setTimeLeft(20 * 60);
        }

        // Fetch paper
        const paperRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/writing/${test.exam_paper}`);
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
      setTimeLeft(prev => {
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
    setAnswers(prev => ({ ...prev, [taskNumber]: answer }));
  };

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

      const paperId = exam.exam_paper.writing_exam_paper || exam.exam_paper.writing || exam.exam_paper;
      const payload = {
        studentId: exam.student._id || exam.student,
        assignmentId: exam._id,
        answers: answers
      };

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/writing-results/${paperId}/submit-results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        navigate('/thanks');
      } else {
        const error = await response.json();
        alert(`Submission failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('An error occurred while submitting the exam');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-b-2 border-orange-500 rounded-full mx-auto"></div>
          <p className="text-gray-600 mt-3">Loading writing paper...</p>
        </div>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No writing paper available</p>
          <button onClick={() => navigate(-1)}>Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* header */}
      <header className="bg-white border-b border-gray-200">
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
          {/* <div>
            <button onClick={() => navigate(-1)}>back</button>
          </div> */}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
        {/* left sidebar */}
        <aside className="w-48 pr-10">
          <div className="text-gray-600 font-semibold mb-2">Writing</div>

          <div className="flex flex-col gap-1 pl-6">
            {paper.tasks?.filter(task => task.taskNumber <= 2).map((task) => {
              const isActive = task.taskNumber === currentTask;
              return (
                <button
                  key={`task-${task.taskNumber}`}
                  onClick={() => setCurrentTask(task.taskNumber)}
                  className={`relative w-full text-left px-3 py-2 border transition-all duration-150 ${isActive ? "bg-gray-900 text-white" : "bg-white text-gray-800"}`}
                >
                  {isActive && <span className="absolute top-0 right-[-12px] h-full w-3 bg-gray-900" style={{ clipPath: "polygon(0 0, 100% 50%, 0 100%)" }} />}
                  <span className="text-sm font-semibold">{task.title}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* main content */}
        <main className="flex-1">
          {/* instructions */}
          <div className="bg-gray-100 border-l-4 border-gray-300 p-4 mb-6">
            Read the task and write your answer.
          </div>

          {(() => {
            const currentTaskData = paper.tasks?.find(t => t.taskNumber === currentTask);
            if (!currentTaskData) return null;

            return (
              <div className="flex w-full gap-6">
                {/* Task Prompt */}
                <div className="flex-1 bg-white border border-gray-200 p-4 rounded  overflow-y-auto">
                
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-800">{currentTaskData.title}</h2>
                  
                  </div>


                  <div className="prose max-w-none">
                    <div
                      className="text-gray-800 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: currentTaskData.prompt }}
                    />

                    {currentTaskData.images?.map((image, imgIdx) => (
                      <div key={imgIdx} className="my-4">
                        <img
                          src={`${import.meta.env.VITE_API_BASE_URL}/${image.path}`}
                          alt={image.originalName}
                          className="max-w-full h-auto rounded-lg shadow-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Answer Area */}
                <div className="flex-1 space-y-6">
                  <div className="bg-white border border-gray-200 p-4 rounded">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Your Answer</h3>
                    <textarea
                      value={answers[currentTask] || ''}
                      onChange={(e) => handleAnswerChange(currentTask, e.target.value)}
                      placeholder="Write your answer here..."
                      className="w-full min-h-[400px] px-3 py-2  resize-none "
                    />
                    <div className="flex justify-between items-center mt-4 text-sm text-gray-500">
                      <span>Word count: {(answers[currentTask] || '').split(/\s+/).filter(word => word.length > 0).length} / {currentTaskData.wordCount}</span>
                      <span>Time remaining: {currentTaskData.estimatedTime}:00</span>
                    </div>
                  </div>

                  {/* Submit Section */}
                  {/* <div className="bg-white border border-gray-200 p-4 rounded">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Ready to Submit?</h3>
                      <p className="text-gray-600 text-sm mb-6">
                        Make sure you have completed all writing tasks before submitting.
                      </p>
                      <button
                        onClick={submitExam}
                        disabled={submitting}
                        className="px-8 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                      >
                        {submitting ? 'Submitting...' : 'Submit Writing Test'}
                      </button>
                    </div>
                  </div> */}
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
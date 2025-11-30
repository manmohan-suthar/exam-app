import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const WritingPlayground = () => {
  const [paper, setPaper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTask, setCurrentTask] = useState(1);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { test } = location.state || {};

  useEffect(() => {
    const fetchPaper = async () => {
      try {
        if (!test?.exam_paper) {
          setLoading(false);
          return;
        }
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/writing/${test.exam_paper}`);
        if (res.ok) {
          const data = await res.json();
          setPaper(data.paper);
        } else {
          console.error("Failed fetching paper:", res.status);
        }
      } catch (err) {
        console.error("Error fetching paper:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPaper();
  }, [test]);

  const handleAnswerChange = (taskNumber, answer) => {
    setAnswers(prev => ({ ...prev, [taskNumber]: answer }));
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
        alert(`Exam submitted successfully! Your answers have been saved for grading.`);
        navigate('/dashboard');
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
                  <div className="bg-white border border-gray-200 p-4 rounded">
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
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

const ExamResults = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { score, answers, exam, terminated } = location.state || {};

  if (terminated) {
    return (
      <div className="min-h-screen bg-[#F3F3F3] flex items-center justify-center">
        <div className="bg-white p-8 rounded shadow-lg text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Exam Terminated</h1>
          <p className="mb-4">The exam was terminated due to violation of rules.</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!exam || !score || !answers) {
    return (
      <div className="min-h-screen bg-[#F3F3F3] flex items-center justify-center">
        <div className="bg-white p-8 rounded shadow-lg text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="mb-4">Exam data is not available.</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F3F3] p-8">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded shadow-lg">
        <h1 className="text-3xl font-bold mb-6 text-center">Exam Results</h1>
        <div className="text-center mb-8">
          <p className="text-xl">Score: {score.correct} / {score.total}</p>
          <p className="text-lg">Percentage: {((score.correct / score.total) * 100).toFixed(2)}%</p>
        </div>

        <h2 className="text-2xl font-bold mb-4">Review Answers</h2>
        {exam.sections.map((section, sIndex) => (
          <div key={sIndex} className="mb-6">
            <h3 className="text-xl font-semibold">{section.title}</h3>
            {section.questions.map((question, qIndex) => (
              <div key={qIndex} className="mb-4 p-4 bg-gray-50 rounded">
                <p className="font-medium">{qIndex + 1}. {question.text}</p>
                <p>Your Answer: <span className={answers[`${sIndex}-${qIndex}`] === question.correctAnswer ? "text-green-600" : "text-red-600"}>{answers[`${sIndex}-${qIndex}`] || "Not answered"}</span></p>
                <p>Correct Answer: <span className="text-green-600">{question.correctAnswer}</span></p>
              </div>
            ))}
          </div>
        ))}

        <div className="text-center mt-8">
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-blue-500 text-white px-6 py-3 rounded"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExamResults;
import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const ExamInstructions = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { test } = location.state || {};

  useEffect(() => {
    if (!test) {
      navigate("/dashboard");
    }
  }, [test, navigate]);

  const handleStartExam = async () => {
    console.log(test);

    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/exam-assignments/${test.assignmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examStarted: true })
      });
    } catch (error) {
      console.error('Error updating assignment:', error);
    }

    // Navigate based on exam type
    if (test.skill === "listening") {
      navigate("/exam/listening", { state: { test } });
    } else if (test.skill === "speaking") {
      navigate("/exam/speaking", { state: { test } });
    } else if (test.skill === "reading") {
      navigate("/exam/reading", { state: { test } });
    } else {
      navigate("/exam/start", { state: { test } });
    }
  };

  const handleBack = () => {
    navigate("/exam/verification", { state: { test } });
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 p-8">
      
      {/* Page Title */}
      <h1 className="text-3xl font-semibold mb-6">Exam Instructions</h1>

      {/* Grey Box Container */}
      <div className="bg-[#F3F3F3] border border-gray-300 p-8 ">

        {/* Section Title */}
        <h2 className="text-xl font-bold mb-4">
          Academic ({test?.skill || "Listening"})
        </h2>

        {/* Time */}
        <p className="mb-3 text-[16px]">
          <strong>Time:</strong> {test?.duration || "40 minutes"}
        </p>

        {/* Bullet List */}
        <ul className="list-disc ml-6 space-y-2 text-[16px] leading-6">
          <li>Answer all the questions</li>
          <li>You can navigate between sections using the tabs at the top</li>
          <li>The exam will be in full-screen mode; do not attempt to exit or minimize the window</li>
          <li>Right-clicking, copying, pasting, and opening developer tools are disabled</li>
          <li>Switching tabs or minimizing the application will terminate the exam</li>
          <li>Webcam monitoring may be active to ensure exam integrity</li>
          <li>You will see a timer at the top; the exam will auto-submit when time expires</li>
          <li>Progress is auto-saved; you can resume if interrupted (but violations will terminate)</li>
          <li>When you have completed all sections, click <strong>Submit Exam</strong></li>
          <li>Ensure you are in a quiet, distraction-free environment</li>
        </ul>

        {/* Foot Notes */}
        <p className="mt-6 text-[15px] leading-6">
          * Violations of these rules will result in immediate exam termination.
        </p>
      </div>

      {/* Buttons */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={handleBack}
          className="bg-gray-500 text-white px-8 py-3 text-lg rounded-sm hover:bg-gray-600"
        >
          Back
        </button>
        <button
          onClick={handleStartExam}
          className="bg-[#FF3A00] text-white px-10 py-3 text-lg rounded-sm hover:bg-[#e03500]"
        >
          Start Exam
        </button>
      </div>
    </div>
  );
};

export default ExamInstructions;

import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

const ExamInstructions = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { test } = location.state || {};
  const [student, setStudent] = useState(null);
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!test) {
      navigate("/dashboard");
    }
  }, [test, navigate]);

  useEffect(() => {
    const s = localStorage.getItem("student");
    if (s) setStudent(JSON.parse(s));
  }, []);

  useEffect(() => {
    const fetchInstructions = async () => {
      if (!test?.skill) return;

      try {
        setLoading(true);
        setError('');
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/instructions?category=${test.skill}`);
        setInstructions(response.data.instruction.content || '');
      } catch (error) {
        console.error('Error fetching instructions:', error);
        setError('Failed to load instructions');
      } finally {
        setLoading(false);
      }
    };

    fetchInstructions();
  }, [test?.skill]);

  const handleStartExam = async () => {
    console.log(test);

    if (test.skill === "listening") {
      // Start the exam via API
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/listening/${test.exam_paper}/start-exam`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: student._id || student.student_id,
            assignmentId: test.assignmentId
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to start exam');
        }

        const examData = await response.json();

        // Update assignment status
        await fetch(`${import.meta.env.VITE_API_BASE_URL}/exam-assignments/${test.assignmentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            examStarted: true
          })
        });

        // Store exam data in localStorage
        localStorage.setItem("examAssignment", JSON.stringify({
          ...test,
          exam_type: test.skill,
          exam_paper: test.exam_paper,
          examStarted: true
        }));

        // Navigate to listening exam
        navigate("/exam/listening", {
          state: {
            test: {
              ...test,
              examStarted: true
            }
          }
        });

      } catch (error) {
        console.error('Error starting listening exam:', error);
        // Optionally show error to user
      }
    } else {
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
      if (test.skill === "speaking") {
        navigate("/exam/speaking", { state: { test } });
      } else if (test.skill === "reading") {
        navigate("/exam/reading", { state: { test } });
      } else {
        navigate("/exam/start", { state: { test } });
      }
    }
  };

  const handleBack = () => {
    navigate("/exam/verification", { state: { test } });
  };

  return (
    <div className="h-screen bg-white text-gray-900 p-5 flex flex-col">

      {/* Page Title */}
      <h1 className="text-3xl font-semibold mb-6">Exam Instructions</h1>

      {/* Grey Box Container */}
      <div className="bg-[#F3F3F3] border border-gray-300 p-8 flex-1 overflow-y-auto rounded-md">

        {/* Section Title */}
        <h2 className="text-xl font-bold mb-4">
          Academic ({test?.skill || "Listening"})
        </h2>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-600">Loading instructions...</div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Dynamic Instructions Content */}
        {!loading && !error && instructions && (
          <div
            className="text-[16px] leading-6"
            dangerouslySetInnerHTML={{ __html: instructions }}
          />
        )}

        {/* Default message if no instructions */}
        {!loading && !error && !instructions && (
          <div className="text-gray-600">
            No instructions available for this category.
          </div>
        )}

       
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

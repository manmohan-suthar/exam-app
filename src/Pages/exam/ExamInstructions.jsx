import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

const ExamInstructions = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { exams, assignments } = location.state || {};
  const [student, setStudent] = useState(null);
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');



  useEffect(() => {
    if (!exams || exams.length === 0) {
      navigate("/dashboard");
    }
  }, [exams, navigate]);

  useEffect(() => {
    const s = localStorage.getItem("student");
    if (s) setStudent(JSON.parse(s));
  }, []);

  useEffect(() => {
    const fetchInstructions = async () => {
      try {
        setLoading(true);
        setError('');
        // Fetch general instructions for all exams
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/instructions?category=listening`);
        setInstructions(response.data.instruction.content || '');
      } catch (error) {
        console.error('Error fetching instructions:', error);
        setError('Failed to load instructions');
      } finally {
        setLoading(false);
      }
    };

    fetchInstructions();
  }, []);

  const enterFullScreen = () => {
    const element = document.documentElement;
  
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.mozRequestFullScreen) { // Firefox
      element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) { // Chrome, Safari
      element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) { // IE/Edge
      element.msRequestFullscreen();
    }
  };
  

  const handleStartExam = () => {

    enterFullScreen();
    // Check if any exam is speaking type
    const hasSpeakingExam = exams?.some(exam => exam.skill === "speaking");
    
    if (hasSpeakingExam) {
      // Navigate directly to speaking interface within combined playground
      navigate("/exam/combined-playground", {
        state: {
          exams,
          assignments,
          initialModule: "speaking"
        }
      });
    } else {
      // Navigate to combined playground with all exam data
      navigate("/exam/combined-playground", { state: { exams, assignments } });
    }
  };

  const handleBack = () => {
    navigate("/exam/verification");
  };

  return (
    <div className="h-screen bg-white text-gray-900 p-5 flex flex-col">

      {/* Page Title */}
      <h1 className="text-3xl font-semibold mb-6">Exam Instructions</h1>

      {/* Grey Box Container */}
      <div className="bg-[#F3F3F3] border border-gray-300 p-8 flex-1 overflow-y-auto rounded-md">

        {/* Section Title */}
        {/* <h2 className="text-xl font-bold mb-4">
          Academic (Listening, Reading, Writing, Speaking)
        </h2> */}

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

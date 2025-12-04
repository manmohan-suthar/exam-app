import React, { useState, useEffect } from "react";

import { useNavigate, useLocation } from "react-router-dom";
import logo from "../../photos/Cerebral_Logo.png"

const CandidateDetailsVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { skill } = location.state || {};

  const [student, setStudent] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [activeTop, setActiveTop] = useState("academic");
  const [activeSkill, setActiveSkill] = useState("all");
  const [error, setError] = useState(null);
  const [startingExam, setStartingExam] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      let studentData = localStorage.getItem("student");
      let registrationData = localStorage.getItem("registration");

      // If not in localStorage, try electron-store
      if (!studentData && window.electronAPI) {
        studentData = await window.electronAPI.store.get("student");
        if (studentData) {
          localStorage.setItem("student", JSON.stringify(studentData));
        }
      }
      if (!registrationData && window.electronAPI) {
        registrationData = await window.electronAPI.store.get("registration");
        if (registrationData) {
          localStorage.setItem("registration", JSON.stringify(registrationData));
        }
      }

      console.log('CandidateDetailsVerification: studentData:', studentData);
      console.log('CandidateDetailsVerification: registrationData:', registrationData);

      if (studentData) setStudent(typeof studentData === 'string' ? JSON.parse(studentData) : studentData);
      if (registrationData) setRegistration(typeof registrationData === 'string' ? JSON.parse(registrationData) : registrationData);
    };

    loadData();
  }, []);

  useEffect(() => {
    if (student) {
      // Fetch assignments
      const fetchAssignments = async () => {
        console.log('CandidateDetailsVerification: Fetching assignments for student_id:', student.student_id);
        setError(null);
        try {
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/exam-assignments?student_id=${student.student_id}`);
          console.log('CandidateDetailsVerification: Assignments response status:', response.status);
          if (!response.ok) {
            const errorText = await response.text();
            console.error('CandidateDetailsVerification: Failed to fetch assignments, status:', response.status, 'text:', errorText);
            setError(`Failed to fetch assignments: ${response.status} ${errorText}`);
            throw new Error('Failed to fetch assignments');
          }
          const data = await response.json();
          console.log('CandidateDetailsVerification: Fetched assignments:', data.assignments.length, data.assignments.map(a => ({ _id: a._id, exam_type: a.exam_type })));

          setAssignments(data.assignments);
          localStorage.setItem("assignments", JSON.stringify(data.assignments));
        } catch (error) {
          console.error('CandidateDetailsVerification: Error fetching assignments:', error);
          setError('Error fetching assignments: ' + error.message);
        }
      };
      fetchAssignments();
    }
  }, [student]);

  const testsData = assignments.flatMap(assignment => {
    if (Array.isArray(assignment.exam_type)) {
      return assignment.exam_type.map(type => ({
        id: `${assignment._id}-${type}`,
        skill: type,
        name: assignment.exam_tittle || assignment.exam_paper?.[`${type}_exam_paper`]?.title || 'No Title',
        description: assignment.exam_bio || assignment.exam_paper?.[`${type}_exam_paper`]?.description || 'No Description',
        duration: assignment.duration + ' min',
        image: "https://plus.unsplash.com/premium_photo-1663054815371-9aaf7004d9b2?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1189",
        exam_date: assignment.exam_date,
        exam_paper: (() => {
          const paper = assignment.exam_paper?.[`${type}_exam_paper`];
          if (!paper) return null;
          return typeof paper === 'string' ? paper : paper._id;
        })(),
        exam_time: assignment.exam_time,
        status: assignment.status,
        assignmentId: assignment._id
      }));
    } else {
      return [{
        id: assignment._id,
        skill: assignment.exam_type,
        name: assignment.exam_tittle || assignment.exam_paper?.title || 'No Title',
        description: assignment.exam_bio || assignment.exam_paper?.description || 'No Description',
        duration: assignment.duration + ' min',
        image: "https://plus.unsplash.com/premium_photo-1663054815371-9aaf7004d9b2?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1189",
        exam_date: assignment.exam_date,
        exam_paper: assignment.exam_paper,
        exam_time: assignment.exam_time,
        status: assignment.status,
        assignmentId: assignment._id
      }];
    }
  });

  const filteredTests = activeSkill === "all" ? testsData : testsData.filter(test => test.skill === activeSkill);

  const test = filteredTests.find(t => t.skill === skill);
  console.log('CandidateDetailsVerification: skill:', skill, 'test:', test);

  // Get current exam validation (computed on demand)
  const getExamValidation = () => {
    console.log('CandidateDetailsVerification: getExamValidation called, test:', test);
    if (!test) return null;
    if (assignments.length === 0) {
      return { valid: false, message: "Loading exam information..." };
    }
    return validateExam(test);
  };

  // Validate exam timing and availability
  const validateExam = (examTest) => {
    console.log('CandidateDetailsVerification: validateExam called, examTest:', examTest);
    if (!examTest) return { valid: false, message: "Exam not found" };

    const now = new Date();
    const examDate = new Date(examTest.exam_date);
    const [hours, minutes] = examTest.exam_time.split(':');
    examDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const timeDiff = now - examDate;
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    console.log('CandidateDetailsVerification: now:', now, 'examDate:', examDate, 'timeDiff:', timeDiff, 'hoursDiff:', hoursDiff);

    if (hoursDiff < -24) {
      console.log('CandidateDetailsVerification: Exam not yet available');
      return { valid: false, message: "Exam is not yet available. Please check back closer to the exam time." };
    }

    if (hoursDiff > 24) {
      console.log('CandidateDetailsVerification: Exam expired');
      return { valid: false, message: "Exam has expired. Please contact your instructor." };
    }

    // Note: Removed visibility check to allow showing assigned exams
    const assignment = assignments.find(a => a._id === examTest.assignmentId);
    console.log('CandidateDetailsVerification: validation result: valid, assignment:', assignment);

    return { valid: true, assignment };
  };

  // Start listening exam
  const startListeningExam = async (examTest, assignment) => {
    setStartingExam(true);
    setError(null);

    try {
      // Start the exam via API
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/listening/${examTest.exam_paper}/start-exam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student._id || student.student_id,
          assignmentId: examTest.assignmentId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start exam');
      }

      const examData = await response.json();

      // Update assignment status
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/exam-assignments/${examTest.assignmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examStarted: true
        })
      });

      // Store exam data in localStorage
      localStorage.setItem("examAssignment", JSON.stringify({
        ...assignment,
        exam_type: examTest.skill,
        exam_paper: assignment.exam_paper,
        examStarted: true
      }));

      // Navigate to listening exam
      navigate("/exam/listening", {
        state: {
          test: {
            ...examTest,
            examStarted: true
          }
        }
      });

    } catch (error) {
      console.error('Error starting listening exam:', error);
      setError('Failed to start exam: ' + error.message);
    } finally {
      setStartingExam(false);
    }
  };

  // Start speaking exam
  const startspeakingExam = async (examTest, assignment) => {
    setStartingExam(true);
    setError(null);

    try {
      // Start the exam via API
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/speaking/${examTest.exam_paper}/start-exam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student._id || student.student_id,
          assignmentId: examTest.assignmentId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start exam');
      }

      const examData = await response.json();

      // Update assignment status
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/exam-assignments/${examTest.assignmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examStarted: true
        })
      });

      // Store exam data in localStorage
      localStorage.setItem("examAssignment", JSON.stringify({
        ...assignment,
        exam_type: examTest.skill,
        exam_paper: assignment.exam_paper,
        examStarted: true
      }));

      // Navigate to speaking exam
      navigate("/exam/speaking", {
        state: {
          test: {
            ...examTest,
            examStarted: true
          }
        }
      });

    } catch (error) {
      console.error('Error starting speaking exam:', error);
      setError('Failed to start exam: ' + error.message);
    } finally {
      setStartingExam(false);
    }
  };

  // Start writing exam
  const startWritingExam = async (examTest, assignment) => {
    setStartingExam(true);
    setError(null);

    try {
      // Start the exam via API
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/writing/${examTest.exam_paper}/start-exam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student._id || student.student_id,
          assignmentId: examTest.assignmentId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start exam');
      }

      const examData = await response.json();

      // Update assignment status
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/exam-assignments/${examTest.assignmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examStarted: true
        })
      });

      // Store exam data in localStorage
      localStorage.setItem("examAssignment", JSON.stringify({
        ...assignment,
        exam_type: examTest.skill,
        exam_paper: assignment.exam_paper,
        examStarted: true
      }));

      // Navigate to writing exam
      navigate("/exam/writing", {
        state: {
          test: {
            ...examTest,
            examStarted: true
          }
        }
      });

    } catch (error) {
      console.error('Error starting writing exam:', error);
      setError('Failed to start exam: ' + error.message);
    } finally {
      setStartingExam(false);
    }
  };

  // Handle next button click
  const handleNext = async () => {
    console.log('CandidateDetailsVerification: handleNext called, test:', test, 'test.skill:', test?.skill);
    if (!test) {
      console.log('CandidateDetailsVerification: No test found');
      setError("No exam found for the selected skill. Please try again.");
      return;
    }

    // Validate exam
    const validation = getExamValidation();
    console.log('CandidateDetailsVerification: validation:', validation);
    if (!validation || !validation.valid) {
      console.log('CandidateDetailsVerification: validation failed:', validation?.message);
      setError(validation?.message || "Exam validation failed. Please try again.");
      return;
    }

    // For speaking and writing exams, start directly; for listening, go to instructions
    if (test.skill === 'speaking') {
      console.log('CandidateDetailsVerification: Starting speaking exam');
      await startspeakingExam(test, validation.assignment);
    } else if (test.skill === 'listening') {
      console.log('CandidateDetailsVerification: Navigating to instructions for listening');
      navigate("/exam/instructions", { state: { test } });
    } else if (test.skill === 'writing') {
      console.log('CandidateDetailsVerification: Starting writing exam');
      await startWritingExam(test, validation.assignment);
    } else {
      console.log('CandidateDetailsVerification: Navigating to instructions for skill:', test.skill);
      // For other exams, go to instructions
      navigate("/exam/instructions", { state: { test } });
    }
  };

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600">Please login first.</p>
          <button
            onClick={() => navigate("/login")}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }


  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-red-600 mt-3">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-b-2 border-orange-500 rounded-full mx-auto"></div>
          <p className="text-gray-600 mt-3">Loading assignments...</p>
         <button onClick={() => navigate(-1)} className="mt-4 bg-[#FF3200] text-white px-4 py-2 rounded hover:bg-[#FF3200]">
          back
         </button>
        </div>
      </div>
    );
  }

  console.log('CandidateDetailsVerification: Render - startingExam:', startingExam, 'test:', !!test, 'validation:', getExamValidation());

  return (
<div className="h-screen bg-[#F3F3F3] text-gray-900 p-5 flex flex-col">

{/* Page Title */}
<h1 className="text-3xl font-semibold mb-6">Candidate Details Verification</h1>

{/* Main White Box (Scroll Inside) */}
<div className="bg-white p-8 border border-gray-300 flex-1 overflow-y-auto rounded-md">

  {/* Instructions */}
  <p className="text-[17px] leading-6 text-gray-700">
    Please confirm your personal details shown below.
    <br />
    In the case of error, please inform your invigilator.
  </p>

  {/* PERSONAL INFORMATION */}
  <h2 className="text-xl font-bold mt-8 mb-3">Personal Information</h2>

  <div className="grid grid-cols-2 gap-6 text-[17px]">
    <div>
      <p className="text-gray-600 text-sm">First / Middle Name(s)</p>
      <p className="font-medium">{student.name || "N/A"}</p>
    </div>

    {student.last_name && (
  <div>
    <p className="text-gray-600 text-sm">Last Name</p>
    <p className="font-medium">{student.last_name}</p>
  </div>
)}


    <div>
      <p className="text-gray-600 text-sm">Birth Date (DD/MM/YYYY)</p>
      <p className="font-medium">
        {student.dob ? new Date(student.dob).toLocaleDateString() : "N/A"}
      </p>
    </div>

    <div>
      <p className="text-gray-600 text-sm">Module Name</p>
      <p className="font-medium">
        {test ? test.name : "Academic (Listening speaking Writing)"}
      </p>
    </div>

    {/* <div className="col-span-2">
      <p className="text-gray-600 text-sm">URN</p>
      <p className="font-medium">
        {student.unr || registration?.urn || "LCA/010123/1234501234567891234567"}
      </p>
    </div> */}
  </div>

  {/* BUTTONS */}
  <div className="mt-10 flex justify-between">

    <button
      onClick={() => navigate("/dashboard")}
      className="bg-gray-500 text-white px-8 py-2 text-lg rounded hover:bg-gray-600"
      disabled={startingExam}
    >
      Back
    </button>

    <button
      onClick={handleNext}
      disabled={startingExam || !test || (getExamValidation()?.valid === false)}
      className="bg-[#FF3A00] text-white px-12 py-2 text-lg rounded hover:bg-[#e03500] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {startingExam ? (
        <div className="flex items-center gap-2">
          <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full"></div>
          Starting Exam...
        </div>
      ) : test?.skill === 'speaking' ? (
        'Start Speaking Exam'
      ) : test?.skill === 'listening' ? (
        'Start Listening Exam'
      ) : test?.skill === 'writing' ? (
        'Start Writing Exam'
      ) : (
        'Next'
      )}
    </button>
  </div>

  {/* Exam Validation Message */}
  {(() => {
    const validation = getExamValidation();
    return validation ? (
      <div
        className={`mt-4 p-3 rounded ${
          validation.valid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}
      >
        {validation.message}
      </div>
    ) : null;
  })()}
</div>
</div>

  );
};

export default CandidateDetailsVerification;

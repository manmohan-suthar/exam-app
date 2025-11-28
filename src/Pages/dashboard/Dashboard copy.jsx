import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import UserInfo from "../../Components/UserInfo";
import AudioPlayer from "../../Components/AudioPlayer";
import bgPhoto from "../../photos/bg-photo.jpg";
import logo from "../../photos/Cerebral_Logo.png";

const Dashboard = () => {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [activeTop, setActiveTop] = useState("academic");
  const [activeSkill, setActiveSkill] = useState("all");
  const [examAssignment, setExamAssignment] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [examEnded, setExamEnded] = useState(false);
  const [paper, setPaper] = useState(null);
  const [currentSection, setCurrentSection] = useState(0);
  const audioRef = useRef(null);
  const [examData, setExamData] = useState({});

  useEffect(() => {
    const studentData = localStorage.getItem("student");
    const registrationData = localStorage.getItem("registration");
    const examData = localStorage.getItem("examAssignment");

    if (studentData) {
      setStudent(JSON.parse(studentData));
    }
    if (registrationData) {
      setRegistration(JSON.parse(registrationData));
    }
    if (examData) {
      const exam = JSON.parse(examData);
      setExamAssignment(exam);

      const now = new Date();
      console.log('Dashboard: Calculating timer for exam:', exam._id, 'examStarted:', exam.examStarted, 'now:', now.toISOString());
      let timeInSeconds;
      let isEnded = false;

      if (!exam.examStarted) {
        // Time to start
        const startTime = new Date(`${exam.exam_date.split("T")[0]}T${exam.exam_time}`);
        console.log('Dashboard: Exam not started, startTime:', startTime.toISOString());
        const timeToStart = Math.max(0, startTime - now);
        timeInSeconds = Math.floor(timeToStart / 1000);
        console.log('Dashboard: Time to start:', timeInSeconds, 'seconds');
        isEnded = false; // Not ended, waiting to start
      } else {
        // Time remaining
        let startTime;
        if (exam.startedAt) {
          startTime = new Date(exam.startedAt);
        } else {
          startTime = new Date(exam.updatedAt);
        }
        console.log('Dashboard: Exam started, startTime:', startTime.toISOString(), 'duration:', exam.duration);
        const endTime = new Date(startTime.getTime() + exam.duration * 60 * 1000);
        console.log('Dashboard: End time:', endTime.toISOString());
        const remaining = Math.max(0, endTime - now);
        timeInSeconds = Math.floor(remaining / 1000);
        console.log('Dashboard: Time remaining:', timeInSeconds, 'seconds');
        isEnded = remaining <= 0;
      }

      console.log('Dashboard: Setting timeLeft:', timeInSeconds, 'isEnded:', isEnded);
      setTimeLeft(timeInSeconds);
      localStorage.setItem("examTimeLeft", timeInSeconds.toString());
      setExamEnded(isEnded);
      if (isEnded) {
        localStorage.setItem("examEnded", "true");
      } else {
        localStorage.removeItem("examEnded");
      }

      // Fetch paper if listening exam
      if (exam.exam_type === 'listening' && exam.exam_paper) {
        fetchPaper(exam.exam_paper);
      }
    }

    // Fetch assignments
    const fetchAssignments = async () => {
      console.log('Dashboard: Fetching assignments for student_id:', student.student_id);
      try {
        const response = await fetch(`http://localhost:3001/exam-assignments?student_id=${student.student_id}`);
        console.log('Dashboard: Assignments response status:', response.status);
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Dashboard: Failed to fetch assignments, status:", response.status, "text:", errorText);
          throw new Error("Failed to fetch assignments");
        }
        const data = await response.json();
        console.log("Dashboard: Fetched assignments:", data.assignments.length, data.assignments.map(a => ({ _id: a._id, exam_type: a.exam_type })));

        setAssignments(data.assignments);
        localStorage.setItem("assignments", JSON.stringify(data.assignments));
      } catch (error) {
        console.error("Dashboard: Error fetching assignments:", error);
      }
    };
    if (student) {
      fetchAssignments();
    }
  }, []);

  const fetchPaper = async (paperId) => {
    console.log('Dashboard: Fetching paper for id:', paperId);
    try {
      const response = await fetch(`http://localhost:3001/listening/${paperId}`);
      console.log('Dashboard: Response status:', response.status);
      if (response.ok) {
        const paperData = await response.json();
        console.log('Dashboard: Paper data received:', paperData.paper ? paperData.paper._id : 'null');
        setPaper(paperData.paper);
        const constructedExamData = {
          audioUrl1: paperData.paper.sections[0] ? (paperData.paper.sections[0].audioFile ? `/${paperData.paper.sections[0].audioFile.replace(/\\/g, '/')}` : paperData.paper.sections[0].audioUrl) : '',
          audioUrl2: paperData.paper.sections[1] ? (paperData.paper.sections[1].audioFile ? `/${paperData.paper.sections[1].audioFile.replace(/\\/g, '/')}` : paperData.paper.sections[1].audioUrl) : '',
          audioUrl3: paperData.paper.sections[2] ? (paperData.paper.sections[2].audioFile ? `/${paperData.paper.sections[2].audioFile.replace(/\\/g, '/')}` : paperData.paper.sections[2].audioUrl) : '',
          audioUrl4: paperData.paper.sections[3] ? (paperData.paper.sections[3].audioFile ? `/${paperData.paper.sections[3].audioFile.replace(/\\/g, '/')}` : paperData.paper.sections[3].audioUrl) : '',
        };
        setExamData(constructedExamData);
      } else {
        const errorText = await response.text();
        console.error('Dashboard: Failed to fetch paper, status:', response.status, 'text:', errorText);
      }
    } catch (error) {
      console.error('Dashboard: Error fetching paper:', error);
    }
  };

  // Timer effect
  useEffect(() => {
    if (examAssignment && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          const newTime = prev - 1;
          localStorage.setItem("examTimeLeft", newTime.toString());
          if (newTime <= 0) {
            setExamEnded(true);
            localStorage.setItem("examEnded", "true");
          }
          return Math.max(0, newTime);
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [examAssignment, timeLeft]);

  const testsData = assignments.map((assignment) => ({
    id: assignment._id,
    skill: assignment.exam_type,
    name: assignment.exam_tittle || assignment.exam_paper?.title || "No Title",
    description:
      assignment.exam_bio ||
      assignment.exam_paper?.description ||
      "No Description",
    duration: assignment.duration + " min",
    image:
      "https://plus.unsplash.com/premium_photo-1663054815371-9aaf7004d9b2?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1189",
    exam_date: assignment.exam_date,
    exam_paper: assignment.exam_paper,
    exam_time: assignment.exam_time,
    status: assignment.status,
  }));

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSubmitExam = async () => {
    try {
      await axios.put(
        `http://localhost:3001/admin/exam-assignments/${examAssignment._id}/status`,
        {
          status: "completed",
        }
      );
      localStorage.removeItem("examAssignment");
      localStorage.removeItem("examEnded");
      localStorage.removeItem("examTimeLeft");
      navigate("/exam-results");
    } catch (error) {
      console.error("Error submitting exam:", error);
    }
  };

  const skills = ["Writing", "Reading", "Listening", "Speaking", "Grammar"];

  const filteredTests =
    activeSkill === "all"
      ? testsData
      : testsData.filter((test) => test.skill === activeSkill);

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600">Please login first.</p>
          <button
            onClick={() => (window.location.href = "/login")}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // helper: check if a skill is the one currently in exam
  const isExamSkill = (skill) => {
    return (
      examAssignment &&
      examAssignment.exam_type &&
      examAssignment.exam_type.toLowerCase() === skill.toLowerCase()
    );
  };

  return (
    <>
      <div className="grid grid-cols-6">
        {/* Sidebar */}
        <div className="col-span-1">
          <div className="h-screen flex flex-col gap-5 bg-[#F2F2F2] p-4">
            {/* Logo */}
            <div className="flex items-center gap-2 ">
              <img src={logo} alt="Logo" className="w-10" />
              <h2>Cerebral Scholars</h2>
            </div>

            {/* Academic Section */}
            <div className="flex flex-col">
              <span className="font-bold">Academic</span>

              <ul className="ml-0 overflow-hidden w-full">
                {skills.map((item, index) => {
                  const examSkill = isExamSkill(item);
                  // disable the button only if this skill is the current exam and the exam is ended
                  // Disable sidebar button if exam for that skill has ended OR timeLeft is 0
                  // Disable skill button until timer reaches 00:00
                  // const disabled = examSkill && timeLeft > 0;
                  const disabled = false; // Allow navigation anytime

                  return (
                    <li key={index} className="w-full">
                      <button
                        disabled={disabled}
                        onClick={() => {
                          if (disabled) return;
                          navigate("/exam/verification", {
                            state: { skill: item.toLowerCase() },
                          });
                        }}
                        className={`w-full text-left flex items-center justify-between capitalize px-3 py-2 text-sm border-b border-[#cccccc] last:border-none cursor-pointer focus:outline-none ${
                          disabled ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        <span>{item}</span>

                        {/* Show timer if this is the exam skill */}
                        {examSkill && (
                          <span className="text-xs font-mono ml-2">
                            {examEnded ? "Completed" : timeLeft === 0 && !examAssignment.examStarted ? "Start Exam" : formatTime(timeLeft)}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Exam Section */}
            {examAssignment && (
              <div className="flex flex-col">
              
                {examEnded && (
                  <button
                    onClick={handleSubmitExam}
                    className="mt-2 bg-red-600 text-white px-2 py-1 rounded text-sm hover:bg-red-700"
                  >
                    Submit Exam
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Main Content */}
        <div className="col-span-5 relative w-full h-screen">
          {/* Background Image */}
          <img
            className="absolute inset-0 w-full h-full object-cover"
            src={bgPhoto}
            alt="Main Banner"
          />

          {/* Overlay (optional dim) */}
          <div className="absolute inset-0 "></div>

          {/* User Info Card on Top */}
          <div className="relative z-10 p-6">
            <UserInfo student={student} registration={registration} />
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;


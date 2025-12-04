// src/Pages/dashboard/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserInfo from "../../Components/UserInfo";
import bgPhoto from "../../photos/bg-photo.jpg";
import logo from "../../photos/Cerebral_Logo.png";

/**
 * Build the absolute start timestamp (ms) from:
 *  - exam_date (ISO string, date portion)
 *  - exam_time ("HH:MM", IST)
 * We combine yyyy-mm-dd (from exam_date in UTC) with HH:MM +05:30.
 */
function getExamStartMs(exam_date, exam_time) {
  if (!exam_date || !exam_time) return NaN;
  const examDateStr = new Date(exam_date).toISOString().split("T")[0]; // yyyy-mm-dd
  // Add explicit IST offset so it's timezone-safe
  return new Date(`${examDateStr}T${exam_time}:00+05:30`).getTime();
}

/** Format seconds to HH:MM:SS */
function formatHMS(s) {
  const n = Number.isFinite(s) ? Math.max(0, s) : 0;
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  const sec = n % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(
    2,
    "0"
  )}`;
}

const Dashboard = () => {
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [examAssignment, setExamAssignment] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null); // seconds to start

  // Load student from localStorage
  useEffect(() => {
    const s = localStorage.getItem("student");
    if (s) setStudent(JSON.parse(s));
  }, []);


  
  // Fetch assignments for this student
  useEffect(() => {
    if (!student?._id) return;

    const fetchAssignments = async () => {
      try {
        const url = `${import.meta.env.VITE_API_BASE_URL}/exam-assignments?studentId=${student._id}`;
        const res = await fetch(url);
        if (!res.ok) {
          console.error("Failed to fetch assignments:", res.status);
          return;
        }

        const data = await res.json();
        const list = Array.isArray(data?.assignments) ? data.assignments : [];
        setAssignments(list);
        localStorage.setItem("assignments", JSON.stringify(list));

        // Choose the next upcoming exam by absolute start time (IST)
        const nowMs = Date.now();
        let upcoming = null;
        let earliestStart = Infinity;

        for (const a of list) {
          const startMs = getExamStartMs(a.exam_date, a.exam_time);
          if (Number.isFinite(startMs) && startMs >= nowMs && startMs < earliestStart) {
            earliestStart = startMs;
            upcoming = a;
          }
        }

        if (!upcoming) {
          setExamAssignment(null);
          setTimeLeft(null);
          return;
        }

        setExamAssignment(upcoming);
        localStorage.setItem("examAssignment", JSON.stringify(upcoming));
        setTimeLeft(Math.floor((earliestStart - nowMs) / 1000));
      } catch (err) {
        console.error("fetchAssignments error:", err);
      }
    };

    fetchAssignments();
  }, [student]);

  // Real-time ticking countdown (uses current time every tick)
  useEffect(() => {
    if (!examAssignment) return;

    const timer = setInterval(() => {
      const examStartMs = getExamStartMs(examAssignment.exam_date, examAssignment.exam_time);
      const diffSec = Math.floor((examStartMs - Date.now()) / 1000);

      setTimeLeft(diffSec);

      if (diffSec <= 0) {
        clearInterval(timer);
        navigate("/exam/verification", { state: { skill: "listening" } });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [examAssignment, navigate]);

  if (!student) {
    return (
      <div className="h-screen flex items-center justify-center">
        <button
          onClick={() => navigate("/login")}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg"
        >
          Login Required
        </button>
      </div>
    );
  }

  const skills = ["Listening", "Reading", "Writing", "Speaking"];

  const isExamSkill = (skill) => {
    if (!examAssignment) return false;
    const t = examAssignment.exam_type;
    if (Array.isArray(t)) return t.includes(skill.toLowerCase());
    return String(t || "").toLowerCase() === skill.toLowerCase();
  };

  return (
    <div className="grid grid-cols-6">
      {/* Left Sidebar */}
      {/* <div className="col-span-1 bg-[#F2F2F2] p-4 h-screen">
        <div className="flex items-center gap-2 mb-4">
          <img src={logo} className="w-10" alt="logo" />
          <h2>Cerebral Scholars</h2>
        </div>

        <span className="font-bold mb-2 block">Academic</span>

        <ul>
          {skills.map((skill, i) => (
            <li key={i}>
              <button
                onClick={() =>
                  navigate("/exam/verification", { state: { skill: skill.toLowerCase() } })
                }
                className="w-full text-left flex justify-between px-3 py-2 border-b"
              >
                <span>{skill}</span>

                {isExamSkill(skill) && timeLeft != null && (
                  <span className="text-xs font-mono">
                    {timeLeft <= 0 ? "Starting..." : formatHMS(timeLeft)}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div> */}

      {/* Main Content */}
      <div className="col-span-6 relative h-screen">
        <img
          src={bgPhoto}
          className="absolute inset-0 w-full h-full object-cover"
          alt="background"
        />

        <div className="relative p-6">
        <img src="https://examsimulation.languagecert.org/images/peoplecert-logo.svg" alt="logo" className="h-15 mb-5" />
          <UserInfo student={student} />

          {examAssignment && timeLeft != null && (
            <div className="mt-6 ">
              
              <h3 className="text-[22px] font-semibold">Time Left to Start Exam</h3>
              <p className="text-2xl mt-2 font-bold ">
                {timeLeft <= 0 ? "Exam Starting..." : formatHMS(timeLeft)}
              </p>
              <p className=" mt-2 text-sm text-gray-600">
                Scheduled (IST): <b>{examAssignment.exam_time}</b>
              </p>
            </div>
          )}

          {!examAssignment && (
            <div className="mt-6 ">
             
              <h3 className="text-lg font-semibold">Upcoming Exam</h3>
              <p className="r text-gray-600">No upcoming exam found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

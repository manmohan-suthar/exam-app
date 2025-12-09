// src/Pages/dashboard/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserInfo from "../../Components/UserInfo";
import bgPhoto from "../../photos/bg-photo.jpg";

function getExamStartMs(exam_date, exam_time) {
  if (!exam_date || !exam_time) return NaN;
  const examDateStr = new Date(exam_date).toISOString().split("T")[0];
  return new Date(`${examDateStr}T${exam_time}:00+05:30`).getTime();
}

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
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    const s = localStorage.getItem("student");
    if (s) setStudent(JSON.parse(s));
  }, []);

  useEffect(() => {
    if (!student?._id) return;

    const fetchAssignments = async () => {
      try {
        const url = `${import.meta.env.VITE_API_BASE_URL}/exam-assignments?studentId=${student._id}`;
        const res = await fetch(url);

        if (!res.ok) return;

        const data = await res.json();
        const list = Array.isArray(data?.assignments) ? data.assignments : [];

        setAssignments(list);
        localStorage.setItem("assignments", JSON.stringify(list));

        let nowMs = Date.now();
        let upcoming = null;
        let earliest = Infinity;

        list.forEach((a) => {
          const start = getExamStartMs(a.exam_date, a.exam_time);
          if (Number.isFinite(start) && start >= nowMs && start < earliest) {
            earliest = start;
            upcoming = a;
          }
        });

        if (upcoming) {
          setExamAssignment(upcoming);
          localStorage.setItem("examAssignment", JSON.stringify(upcoming));
          setTimeLeft(Math.floor((earliest - nowMs) / 1000));
        } else {
          setExamAssignment(null);
          setTimeLeft(null);
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchAssignments();
  }, [student]);

  useEffect(() => {
    if (!examAssignment) return;

    const timer = setInterval(() => {
      const ms = getExamStartMs(examAssignment.exam_date, examAssignment.exam_time);
      const diff = Math.floor((ms - Date.now()) / 1000);

      setTimeLeft(diff);

      if (diff <= 0) {
        clearInterval(timer);
        navigate("/exam/verification", { state: { skill: "listening" } });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [examAssignment]);

  if (!student)
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

  return (
    <div
      style={{
        backgroundImage: `url(${bgPhoto})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      className="min-h-screen relative flex items-center justify-center px-4"
    >
      {/* Overlay */}
      <div className="absolute inset-0 "></div>

      {/* CARD – same UI as ThanksPage */}
      <div className="relative backdrop-blur-md bg-white/20 shadow-2xl rounded-2xl p-10 w-full max-w-2xl text-center">

        {/* Logo */}
        <img
          src="https://examsimulation.languagecert.org/images/peoplecert-logo.svg"
          className="h-14 mx-auto mb-6"
          alt="logo"
        />

        {/* Student Info */}
        <UserInfo student={student} />

        {/* Countdown */}
        {examAssignment && timeLeft != null && (
          <div className="mt-8">
            <h3 className="text-2xl font-semibold text-gray-800">
              Time Left to Start Exam
            </h3>

            <p className="text-4xl font-bold mt-3 text-gray-900 tracking-wide">
              {timeLeft <= 0 ? "Exam Starting..." : formatHMS(timeLeft)}
            </p>

            <p className="mt-3 text-sm text-gray-700">
              Scheduled at: <b>{examAssignment.exam_time}</b>
            </p>
          </div>
        )}

        {!examAssignment && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold text-gray-800">Upcoming Exam</h3>
            <p className="text-gray-700 mt-1">No upcoming exam found.</p>
          </div>
        )}

        {/* Button */}
        {/* <button
          onClick={() => navigate("/instructions")}
          className="mt-10 w-full bg-[#FF3200] text-white py-3 rounded-lg text-lg font-semibold shadow hover:bg-[#ff3300b1] transition"
        >
          View Instructions
        </button> */}
      </div>
    </div>
  );
};

export default Dashboard;

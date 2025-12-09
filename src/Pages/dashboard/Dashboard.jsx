// src/Pages/dashboard/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserInfo from "../../Components/UserInfo";
import bgPhoto from "../../photos/bg-photo.jpg";


const Dashboard = () => {
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [examAssignment, setExamAssignment] = useState(null);

  useEffect(() => {
    const s = localStorage.getItem("student");
    if (s) setStudent(JSON.parse(s));
  }, []);

  useEffect(() => {
    const hasRefreshed = sessionStorage.getItem("dashboard_refreshed");
    if (!hasRefreshed) {
      sessionStorage.setItem("dashboard_refreshed", "true");
      window.location.reload();
    }
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

        // Set the first assignment as the current one
        if (list.length > 0) {
          setExamAssignment(list[0]);
          localStorage.setItem("examAssignment", JSON.stringify(list[0]));
        } else {
          setExamAssignment(null);
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchAssignments();
  }, [student]);


  if (!student)
    return (
      <div className="h-screen flex items-center justify-center">
        <button
          onClick={() => navigate("/login")}
          className="bg-[#FF3200] text-white px-6 py-3 rounded-lg"
        >
          Login Required
        </button>
      </div>
    );

  return (
    <div

      className="min-h-screen relative flex items-center justify-center px-4"
    >
      {/* Overlay */}
      <div className="absolute inset-0 "></div>

      {/* CARD – same UI as ThanksPage */}
      <div className="relative  bg-white/20 rounded-2xl p-10 w-full max-w-2xl text-center">

 

        {/* Student Info */}
        <UserInfo student={student} />



        {!examAssignment && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold text-gray-800">Exam Assignment</h3>
            <p className="text-gray-700 mt-1">No exam assignment found.</p>
          </div>
        )}

        {/* Start Exam Button */}
        {examAssignment && (
          <button
            onClick={() => navigate("/exam/verification", { state: { skill: "listening" } })}
            className="mt-10 w-[220px] bg-[#FF3200] text-white py-3 rounded-lg  hover:bg-[#ff3300b1] transition"
          >
            Start Exam
          </button>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

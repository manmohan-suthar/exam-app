import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import bgPhoto from "../../photos/bg-photo.jpg";

const ThanksPage = () => {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);

  useEffect(() => {
    const s = localStorage.getItem("student");
    if (s) setStudent(JSON.parse(s));
  }, []);

  if (!student) return null;

  return (
    <div
      style={{
        // backgroundImage: `url(${bgPhoto})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      className="
        min-h-screen 
        relative 
        flex 
        items-center 
        justify-center 
        px-4
      "
    >
      {/* Overlay */}
      <div className="absolute inset-0  "></div>

      {/* Card */}
      <div className="relative  backdrop-blur-md shadow-2xl rounded-xl p-10 w-full max-w-md text-center ">

    




        <p className="text-gray-500 mb-6 text-sm">
          Student ID: {student.student_id || student._id}
        </p>

        {/* Message */}
        <h2 className="text-xl font-bold text-gray-700 mb-2">🎉 Thank You!</h2>
        <p className="text-gray-600 text-base mb-6">
          Your exam has been <span className="font-semibold">submitted successfully.</span>
        </p>

        {/* Button */}
        {/* <button
          onClick={() => navigate("/dashboard")}
          className="w-full bg-[#FF3200] text-white py-3 rounded-lg text-lg font-semibold shadow hover:bg-[#ff3300b1] transition"
        >
          Go to Dashboard
        </button> */}
      </div>
    </div>
  );
};

export default ThanksPage;

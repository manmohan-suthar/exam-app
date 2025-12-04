import React from "react";

const UserInfo = ({ student, registration }) => {
  return (
    <div className="w-full p-4  ">
      <div className="flex justify-center items-center gap-10 ">

        {/* Profile Photo */}
        <img
          className="w-24 h-24 rounded-full object-cover border-4 border-gray-300 shadow-md"
          src={student.student_photo}
          alt="User"
        />

       {/* Right Side Info */}
<div className="flex flex-col items-start text-left">

{/* Name */}
<h1 className="text-3xl capitalize font-bold text-gray-800 leading-tight">
  {student.name}
</h1>

{/* ID + DOB */}
<div className="mt-2 space-y-1 text-gray-700 text-[15px] text-left">
  <p className="text-left">
    <span className="font-semibold">Student ID: </span>
    {student.student_id || student._id}
  </p>

  <p className="text-left">
    <span className="font-semibold">DOB: </span>
    {new Date(student.dob).toLocaleDateString()}
  </p>
</div>

</div>

      </div>
    </div>
  );
};

export default UserInfo;

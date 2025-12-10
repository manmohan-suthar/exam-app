import React from "react";

const UserInfo = ({ student, registration }) => {
  return (
    <div className="w-full p-4  ">
      <div className=" flex justify-center items-center gap-10 ">
        {/* Profile Photo */}

      <div>
      <div className="flex flex-col items-start text-left">
          {/* ID + DOB */}
          <div className="mt-2 space-y-1 text-gray-700 text-[15px] text-left">
            <p className="text-left">
              <span className="font-semibold">ID: </span>
              {student.student_id || student._id}
            </p>
          </div>
        </div>
        <img
          className="w-50 h-50  object-cover shadow-md"
          src={student.student_photo}
          alt="User"
        />
        {console.log(student)}
      </div>

       
      </div>
    </div>
  );
};

export default UserInfo;

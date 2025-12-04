import React from 'react';

const UserInfo = ({ student, registration }) => {
  return (
    <div className="w-full rounded-lg p-6 mb-8 ">
      <div className="flex items-center gap-6">
        <img
          className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
          src={student.student_photo}
          alt="User"
        />
        <div className="flex flex-col">
          <h1 className="text-3xl capitalize font-bold text-gray-800 mb-2">
            {student.name}
          </h1>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <p><span className="font-medium">Student ID:</span> {student.student_id}</p>
            <p><span className="font-medium">Apply For:</span> America 🇺🇸</p>
            <p><span className="font-medium">Exam Type:</span> IELTS Academic</p>
            <p><span className="font-medium">Test Date:</span> 12 Nov 2025</p>
            <p><span className="font-medium">Exam Center:</span> {registration.centerName}</p>
            <p><span className="font-medium">UNR:</span> {student.unr}</p>
            <p><span className="font-medium">DOB:</span> {new Date(student.dob).toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserInfo;

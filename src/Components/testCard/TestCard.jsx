import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Clock, FileText } from 'lucide-react';

const TestCard = ({ test }) => {
  const navigate = useNavigate();
  const currentTime = new Date();
  const examDateTime = new Date(`${test.exam_date.split('T')[0]}T${test.exam_time}`);
  const examEndTime = new Date(examDateTime.getTime() + parseInt(test.duration) * 60 * 1000);
  const loginStartTime = new Date(examDateTime.getTime() - 10 * 60 * 1000);

  let statusMessage = '';
  let canStart = false;

  if (currentTime >= loginStartTime && currentTime < examDateTime) {
    canStart = true;
  } else if (currentTime >= examEndTime) {
    statusMessage = 'The exam is closed. You cannot log in.';
  } else if (currentTime >= examDateTime) {
    statusMessage = 'The exam has already started. You cannot log in now.';
  } else {
    const timeDiff = loginStartTime.getTime() - currentTime.getTime();
    const minutesRemaining = Math.ceil(timeDiff / (1000 * 60));
    statusMessage = `You can only log in 10 minutes before the scheduled exam time. Time remaining: ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}.`;
  }

  return (
    <div className="bg-white rounded-md p-4 max-w-xs transition-shadow hover:shadow-lg">
      <img
        src={test.image}
        alt={test.name}
        className="w-full h-40 object-cover rounded mb-3"
      />
      <div className="flex items-center mb-3">
        <FileText size={24} className="text-blue-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-800">{test.name}</h3>
      </div>
      <p className="text-sm text-gray-600 mb-3">
        {test.description}
      </p>
      <div className="flex items-center text-xs text-gray-500 mb-3">
        <Clock size={14} className="mr-1" />
        <span>{test.duration}</span>
      </div>
      {canStart ? (
        <button
          onClick={() => navigate('/exam/verification', { state: { test } })}
          className="w-full bg-blue-600 text-white py-1.5 px-3 rounded text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
        >
          <Play size={14} />
          Start Test
        </button>
      ) : (
        <div className="w-full bg-red-100 text-red-700 py-1.5 px-3 rounded text-sm text-center">
          {statusMessage}
        </div>
      )}
    </div>
  );
};

export default TestCard;

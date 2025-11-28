import React from 'react';
import { ListChecks, GraduationCap, Users } from 'lucide-react';

const TestTabs = ({ activeTop, setActiveTop }) => {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-8 text-lg font-medium text-gray-700 mb-4">
        <button
          onClick={() => setActiveTop("all")}
          className={`flex items-center gap-2 transition ${
            activeTop === "all" ? "text-blue-600 " : "text-gray-500"
          }`}
        >
          <ListChecks size={20} /> All Tests
        </button>
        <button
          onClick={() => setActiveTop("academic")}
          className={`flex items-center gap-2 transition ${
            activeTop === "academic" ? "text-blue-600 " : "text-gray-500"
          }`}
        >
          <GraduationCap size={20} /> Academic Test
        </button>
        <button
          onClick={() => setActiveTop("general")}
          className={`flex items-center gap-2 transition ${
            activeTop === "general" ? "text-blue-600 " : "text-gray-500"
          }`}
        >
          <Users size={20} /> General Training Test
        </button>
      </div>
      <div className="border-b border-gray-300"></div>
    </div>
  );
};

export default TestTabs;
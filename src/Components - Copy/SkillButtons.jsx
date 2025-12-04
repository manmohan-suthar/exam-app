import React from 'react';
import { Grid2x2, Headphones, BookOpen, PenLine, Mic } from 'lucide-react';

const SkillButtons = ({ activeSkill, setActiveSkill }) => {
  return (
    <div className="flex flex-wrap gap-4">
      <button
        onClick={() => setActiveSkill("all")}
        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
          activeSkill === "all"
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        }`}
      >
        <Grid2x2 size={18} /> All Skills
      </button>
      <button
        onClick={() => setActiveSkill("listening")}
        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
          activeSkill === "listening"
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        }`}
      >
        <Headphones size={18} /> Listening
      </button>
      <button
        onClick={() => setActiveSkill("speaking")}
        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
          activeSkill === "speaking"
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        }`}
      >
        <Mic size={18} /> Speaking
      </button>
      <button
        onClick={() => setActiveSkill("writing")}
        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
          activeSkill === "writing"
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        }`}
      >
        <PenLine size={18} /> Writing
      </button>
      <button
        onClick={() => setActiveSkill("speaking")}
        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
          activeSkill === "speaking"
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        }`}
      >
        <Mic size={18} /> Speaking
      </button>
    </div>
  );
};

export default SkillButtons;
import React, { useState } from 'react';
import { Plus, Trash2, Edit, Check } from 'lucide-react';

const MCQQuestion = ({ question, onUpdate, onDelete, index }) => {
  const [isEditing, setIsEditing] = useState(!question.question);
  const [editData, setEditData] = useState({
    question: question.question || '',
    options: question.options || [
      { letter: 'A', text: '' },
      { letter: 'B', text: '' },
      { letter: 'C', text: '' },
      { letter: 'D', text: '' }
    ],
    correctAnswer: question.correctAnswer || ''
  });

  const handleSave = () => {
    if (!editData.question.trim()) {
      alert('Please enter a question');
      return;
    }

    const hasValidOptions = editData.options.some(opt => opt.text.trim());
    if (!hasValidOptions) {
      alert('Please enter at least one option');
      return;
    }

    if (!editData.correctAnswer) {
      alert('Please select the correct answer');
      return;
    }

    onUpdate({
      ...question,
      ...editData,
      type: 'mcq'
    });
    setIsEditing(false);
  };

  const updateOption = (optionIndex, text) => {
    const newOptions = [...editData.options];
    newOptions[optionIndex] = { ...newOptions[optionIndex], text };
    setEditData({ ...editData, options: newOptions });
  };

  if (isEditing) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-medium text-slate-800">Multiple Choice Question {index + 1}</h4>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
            >
              <Check size={14} />
              Save
            </button>
            {onDelete && (
              <button
                onClick={onDelete}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
              >
                <Trash2 size={14} />
                Delete
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Question
            </label>
            <textarea
              value={editData.question}
              onChange={(e) => setEditData({ ...editData, question: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Enter your question here..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Options
            </label>
            <div className="space-y-2">
              {editData.options.map((option, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-sm font-medium text-slate-700">
                    {option.letter}
                  </span>
                  <input
                    type="text"
                    value={option.text}
                    onChange={(e) => updateOption(idx, e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Option ${option.letter}`}
                  />
                  <input
                    type="radio"
                    name={`correct-${index}`}
                    checked={editData.correctAnswer === option.letter}
                    onChange={() => setEditData({ ...editData, correctAnswer: option.letter })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <label className="text-sm text-slate-600">Correct</label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-medium text-slate-800">Multiple Choice Question {index + 1}</h4>
        <div className="flex gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
          >
            <Edit size={14} />
            Edit
          </button>
          {onDelete && (
            <button
              onClick={onDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
            >
              <Trash2 size={14} />
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <p className="font-medium text-slate-800">{question.question}</p>
        <div className="space-y-2">
          {question.options?.map((option, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium ${
                question.correctAnswer === option.letter
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-slate-300 text-slate-600'
              }`}>
                {option.letter}
              </span>
              <span className="text-slate-700">{option.text}</span>
              {question.correctAnswer === option.letter && (
                <span className="text-green-600 text-sm font-medium">(Correct Answer)</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MCQQuestion;
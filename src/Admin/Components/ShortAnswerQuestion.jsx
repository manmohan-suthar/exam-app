import React, { useState } from 'react';
import { Plus, Trash2, Edit, Check } from 'lucide-react';

const ShortAnswerQuestion = ({ question, onUpdate, onDelete, index }) => {
  const [isEditing, setIsEditing] = useState(!question.question);
  const [editData, setEditData] = useState({
    question: question.question || '',
    shortAnswerOptions: question.shortAnswerOptions || [{ text: '' }],
    correctAnswer: question.correctAnswer || ''
  });

  const handleSave = () => {
    if (!editData.question.trim()) {
      alert('Please enter a question or instruction');
      return;
    }

    const hasValidOptions = editData.shortAnswerOptions.some(opt => opt.text.trim());
    if (!hasValidOptions) {
      alert('Please enter at least one answer option');
      return;
    }

    if (!editData.correctAnswer) {
      alert('Please select the correct answer');
      return;
    }

    onUpdate({
      ...question,
      ...editData,
      type: 'short_answer'
    });
    setIsEditing(false);
  };

  const addOption = () => {
    setEditData({
      ...editData,
      shortAnswerOptions: [...editData.shortAnswerOptions, { text: '' }]
    });
  };

  const updateOption = (optionIndex, text) => {
    const newOptions = [...editData.shortAnswerOptions];
    newOptions[optionIndex] = { ...newOptions[optionIndex], text };
    setEditData({ ...editData, shortAnswerOptions: newOptions });
  };

  const removeOption = (optionIndex) => {
    if (editData.shortAnswerOptions.length <= 1) {
      alert('You must have at least one option');
      return;
    }
    const newOptions = editData.shortAnswerOptions.filter((_, idx) => idx !== optionIndex);
    setEditData({ ...editData, shortAnswerOptions: newOptions });
  };

  if (isEditing) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-medium text-slate-800">Short Answer Question {index + 1}</h4>
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
              Question/Instruction
            </label>
            <textarea
              value={editData.question}
              onChange={(e) => setEditData({ ...editData, question: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Enter question or instruction (e.g., 'Write NO MORE THAN THREE WORDS')"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-slate-700">
                Short Answer Options
              </label>
              <button
                onClick={addOption}
                className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs flex items-center gap-1"
              >
                <Plus size={12} />
                Add Option
              </button>
            </div>
            <div className="space-y-2">
              {editData.shortAnswerOptions.map((option, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={option.text}
                    onChange={(e) => updateOption(idx, e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Answer option ${idx + 1}`}
                  />
                  <input
                    type="radio"
                    name={`correct-${index}`}
                    checked={editData.correctAnswer === option.text}
                    onChange={() => setEditData({ ...editData, correctAnswer: option.text })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <label className="text-sm text-slate-600">Correct</label>
                  {editData.shortAnswerOptions.length > 1 && (
                    <button
                      onClick={() => removeOption(idx)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Remove option"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
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
        <h4 className="font-medium text-slate-800">Short Answer Question {index + 1}</h4>
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
        <div>
          <p className="text-sm text-slate-600 mb-2">Answer options:</p>
          <div className="flex flex-wrap gap-2">
            {question.shortAnswerOptions?.map((option, idx) => (
              <span
                key={idx}
                className={`px-3 py-1 rounded border text-sm ${
                  question.correctAnswer === option.text
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-slate-300 bg-slate-50 text-slate-700'
                }`}
              >
                {option.text}
                {question.correctAnswer === option.text && (
                  <span className="ml-1 text-green-600">(Correct)</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShortAnswerQuestion;
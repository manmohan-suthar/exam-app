import React, { useState } from 'react';
import { Plus, Trash2, Edit, Check } from 'lucide-react';

const Type1WordReplacement = ({ question, onUpdate, onDelete, index }) => {
  const [isEditing, setIsEditing] = useState(!question.question || question.question === '');
  const [editData, setEditData] = useState({
    instructions: question.instructions || 'Read the sentences below and decide which option (A, B, C or D) can best replace the word in bold so that the meaning of the sentence remains the same.',
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
    // Validate
    if (!editData.question.trim()) {
      alert('Please enter the sentence');
      return;
    }

    const hasValidOptions = editData.options.every(opt => opt.text.trim());
    if (!hasValidOptions) {
      alert('Please enter all four options (A, B, C, D)');
      return;
    }

    if (!editData.correctAnswer) {
      alert('Please select the correct answer');
      return;
    }

    onUpdate({
      ...question,
      ...editData,
      type: 'type1_word_replacement'
    });
    setIsEditing(false);
  };

  const updateOption = (optionIndex, text) => {
    const newOptions = [...editData.options];
    newOptions[optionIndex] = { ...newOptions[optionIndex], text };
    setEditData({ ...editData, options: newOptions });
  };

  const updateQuestion = (field, value) => {
    setEditData({ ...editData, [field]: value });
  };

  if (isEditing) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-medium text-slate-800">Type 1: Word Replacement Question {index + 1}</h4>
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

        <div className="space-y-6">
          {/* <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Instructions
            </label>
            <textarea
              value={editData.instructions}
              onChange={(e) => setEditData({ ...editData, instructions: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Enter instructions for this question type"
            />
          </div> */}

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Sentence (use **bold** for the word to replace)
              </label>
              <textarea
                value={editData.question}
                onChange={(e) => updateQuestion('question', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Enter the sentence with **bold** word to replace"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Replacement Options
              </label>
              <div className="space-y-2">
                {editData.options.map((option, optIdx) => (
                  <div key={optIdx} className="flex items-center gap-2">
                    <span className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-sm font-medium text-slate-700 border border-slate-300">
                      {option.letter}
                    </span>
                    <input
                      type="text"
                      value={option.text}
                      onChange={(e) => updateOption(optIdx, e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={`Option ${option.letter}`}
                    />
                    <input
                      type="radio"
                      name={`correct-${index}`}
                      checked={editData.correctAnswer === option.letter}
                      onChange={() => updateQuestion('correctAnswer', option.letter)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <label className="text-sm text-slate-600">Correct</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-medium text-slate-800">Type 1: Word Replacement Question {index + 1}</h4>
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

      <div className="space-y-4">
        <p className="text-slate-700 font-medium">{question.instructions}</p>
        <div className="bg-slate-50 p-4 rounded-lg">
          <div className="bg-white p-3 rounded mb-3">
            <p className="text-slate-800"><strong>Question {question.questionNumber}:</strong> <span dangerouslySetInnerHTML={{ __html: question.question.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}></span></p>
          </div>
          <div className="space-y-2">
            {question.options?.map((option, optIdx) => (
              <div key={optIdx} className="flex items-center gap-2">
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
    </div>
  );
};

export default Type1WordReplacement;
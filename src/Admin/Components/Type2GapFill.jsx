import React, { useState } from 'react';
import { Plus, Trash2, Edit, Check } from 'lucide-react';

const Type2GapFill = ({ question, onUpdate, onDelete, index }) => {
  const [isEditing, setIsEditing] = useState(!question.question);
  const [editData, setEditData] = useState({
    question: question.question || '',
    instructions: question.instructions || 'Read the text below and decide which option (A, B or C) best fits each gap.',
    gaps: question.gaps || [
      {
        gapNumber: 1,
        options: [
          { letter: 'A', text: '' },
          { letter: 'B', text: '' },
          { letter: 'C', text: '' }
        ],
        correctAnswer: ''
      }
    ]
  });

  const handleSave = () => {
    if (!editData.question.trim()) {
      alert('Please enter the text with gaps');
      return;
    }

    const hasValidGaps = editData.gaps.every(gap =>
      gap.options.every(opt => opt.text.trim()) && gap.correctAnswer
    );

    if (!hasValidGaps) {
      alert('Please fill all options and select correct answers for each gap');
      return;
    }

    onUpdate({
      ...question,
      ...editData,
      type: 'type2_gap_fill'
    });
    setIsEditing(false);
  };

  const addGap = () => {
    const newGap = {
      gapNumber: editData.gaps.length + 1,
      options: [
        { letter: 'A', text: '' },
        { letter: 'B', text: '' },
        { letter: 'C', text: '' }
      ],
      correctAnswer: ''
    };
    setEditData({
      ...editData,
      gaps: [...editData.gaps, newGap]
    });
  };

  const updateGapOption = (gapIndex, optionIndex, text) => {
    const newGaps = [...editData.gaps];
    newGaps[gapIndex].options[optionIndex] = {
      ...newGaps[gapIndex].options[optionIndex],
      text
    };
    setEditData({ ...editData, gaps: newGaps });
  };

  const updateGapAnswer = (gapIndex, correctAnswer) => {
    const newGaps = [...editData.gaps];
    newGaps[gapIndex].correctAnswer = correctAnswer;
    setEditData({ ...editData, gaps: newGaps });
  };

  const removeGap = (gapIndex) => {
    if (editData.gaps.length <= 1) {
      alert('You must have at least one gap');
      return;
    }
    const newGaps = editData.gaps.filter((_, idx) => idx !== gapIndex);
    // Renumber gaps
    const renumberedGaps = newGaps.map((gap, idx) => ({
      ...gap,
      gapNumber: idx + 1
    }));
    setEditData({ ...editData, gaps: renumberedGaps });
  };

  if (isEditing) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-medium text-slate-800">Type 2: Gap Fill Question {index + 1}</h4>
          <div className="flex gap-2">
            <button
              onClick={addGap}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
            >
              <Plus size={14} />
              Add Gap
            </button>
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
              Instructions
            </label>
            <textarea
              value={editData.instructions}
              onChange={(e) => setEditData({ ...editData, instructions: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Enter instructions for this question type"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Text with Gaps (use [GAP1], [GAP2], etc. for gap placeholders)
            </label>
            <textarea
              value={editData.question}
              onChange={(e) => setEditData({ ...editData, question: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={6}
              placeholder="Enter the text with [GAP1], [GAP2], etc. for gaps"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Gap Options
            </label>
            <div className="space-y-4">
              {editData.gaps.map((gap, gapIdx) => (
                <div key={gapIdx} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-3">
                    <h5 className="font-medium text-slate-800">Gap {gap.gapNumber}</h5>
                    {editData.gaps.length > 1 && (
                      <button
                        onClick={() => removeGap(gapIdx)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Remove gap"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {gap.options.map((option, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-2">
                        <span className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-sm font-medium text-slate-700">
                          {option.letter}
                        </span>
                        <input
                          type="text"
                          value={option.text}
                          onChange={(e) => updateGapOption(gapIdx, optIdx, e.target.value)}
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={`Option ${option.letter}`}
                        />
                        <input
                          type="radio"
                          name={`correct-gap-${gapIdx}`}
                          checked={gap.correctAnswer === option.letter}
                          onChange={() => updateGapAnswer(gapIdx, option.letter)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <label className="text-sm text-slate-600">Correct</label>
                      </div>
                    ))}
                  </div>
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
        <h4 className="font-medium text-slate-800">Type 2: Gap Fill Question {index + 1}</h4>
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
        <p className="text-slate-700 font-medium">{question.instructions}</p>
        <div className="bg-slate-50 p-3 rounded">
          <p className="text-slate-800 whitespace-pre-line">{question.question}</p>
        </div>
        <div className="space-y-3">
          {question.gaps?.map((gap, gapIdx) => (
            <div key={gapIdx} className="border-l-4 border-blue-400 pl-3">
              <p className="text-sm font-medium text-slate-700 mb-2">Gap {gap.gapNumber}:</p>
              <div className="space-y-1">
                {gap.options?.map((option, optIdx) => (
                  <div key={optIdx} className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs font-medium ${
                      gap.correctAnswer === option.letter
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-slate-300 text-slate-600'
                    }`}>
                      {option.letter}
                    </span>
                    <span className="text-slate-700 text-sm">{option.text}</span>
                    {gap.correctAnswer === option.letter && (
                      <span className="text-green-600 text-xs font-medium">(Correct)</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Type2GapFill;
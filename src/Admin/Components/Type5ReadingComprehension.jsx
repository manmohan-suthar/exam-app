import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Check } from 'lucide-react';

const Type5ReadingComprehension = ({ question, onUpdate, onDelete, index }) => {
  const [isEditing, setIsEditing] = useState(!question.question);
  const [editData, setEditData] = useState({
    question: question.question || '',
    instructions: question.instructions || 'Read the article about intelligence and ageing and answer the questions.',
    comprehensionQuestions: question.comprehensionQuestions || [
      {
        questionNumber: 1,
        question: '',
        questionType: 'multiple_choice',
        options: [
          { letter: 'A', text: '' },
          { letter: 'B', text: '' },
          { letter: 'C', text: '' },
          { letter: 'D', text: '' }
        ],
        correctAnswer: '',
        maxWords: 3
      }
    ]
  });

  useEffect(() => {
    setEditData({
      question: question.question || '',
      instructions: question.instructions || 'Read the article about intelligence and ageing and answer the questions.',
      comprehensionQuestions: question.comprehensionQuestions || [
        {
          questionNumber: 1,
          question: '',
          questionType: 'multiple_choice',
          options: [
            { letter: 'A', text: '' },
            { letter: 'B', text: '' },
            { letter: 'C', text: '' },
            { letter: 'D', text: '' }
          ],
          correctAnswer: '',
          maxWords: 3
        }
      ]
    });
  }, [question]);

  const handleSave = () => {
    if (!editData.question.trim()) {
      alert('Please enter the article text');
      return;
    }

    const hasValidQuestions = editData.comprehensionQuestions.every(q => {
      if (!q.question.trim()) return false;
      return q.options.every(opt => opt.text.trim()) && q.correctAnswer;
    });

    if (!hasValidQuestions) {
      alert('Please complete all questions with proper answers');
      return;
    }

    onUpdate({
      ...question,
      ...editData,
      type: 'type5_reading_comprehension'
    });
    setIsEditing(false);
  };

  const addQuestion = () => {
    const newQuestion = {
      questionNumber: editData.comprehensionQuestions.length + 1,
      question: '',
      questionType: 'multiple_choice',
      options: [
        { letter: 'A', text: '' },
        { letter: 'B', text: '' },
        { letter: 'C', text: '' },
        { letter: 'D', text: '' }
      ],
      correctAnswer: '',
      maxWords: 3
    };
    setEditData({
      ...editData,
      comprehensionQuestions: [...editData.comprehensionQuestions, newQuestion]
    });
  };

  const updateQuestion = (questionIndex, field, value) => {
    const newQuestions = [...editData.comprehensionQuestions];
    newQuestions[questionIndex] = { ...newQuestions[questionIndex], [field]: value };
    setEditData({ ...editData, comprehensionQuestions: newQuestions });
  };

  const updateQuestionOption = (questionIndex, optionIndex, text) => {
    const newQuestions = [...editData.comprehensionQuestions];
    newQuestions[questionIndex].options[optionIndex] = {
      ...newQuestions[questionIndex].options[optionIndex],
      text
    };
    setEditData({ ...editData, comprehensionQuestions: newQuestions });
  };

  const removeQuestion = (questionIndex) => {
    if (editData.comprehensionQuestions.length <= 1) {
      alert('You must have at least one question');
      return;
    }
    const newQuestions = editData.comprehensionQuestions.filter((_, idx) => idx !== questionIndex);
    // Renumber questions
    const renumberedQuestions = newQuestions.map((q, idx) => ({
      ...q,
      questionNumber: idx + 1
    }));
    setEditData({ ...editData, comprehensionQuestions: renumberedQuestions });
  };

  if (isEditing) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-medium text-slate-800">Type 5: Reading Comprehension Question {index + 1}</h4>
          <div className="flex gap-2">
            <button
              onClick={addQuestion}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
            >
              <Plus size={14} />
              Add Question
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

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Article Text
            </label>
            <textarea
              value={editData.question}
              onChange={(e) => setEditData({ ...editData, question: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={8}
              placeholder="Enter the article text that students will read"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Comprehension Questions
            </label>
            <div className="space-y-4">
              {editData.comprehensionQuestions.map((cq, qIdx) => (
                <div key={qIdx} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h5 className="font-medium text-slate-800">Question {cq.questionNumber}</h5>
                    {editData.comprehensionQuestions.length > 1 && (
                      <button
                        onClick={() => removeQuestion(qIdx)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Remove question"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Question
                      </label>
                      <textarea
                        value={cq.question}
                        onChange={(e) => updateQuestion(qIdx, 'question', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={2}
                        placeholder="Enter the question"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Options
                      </label>
                      <div className="space-y-2">
                        {cq.options.map((option, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <span className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-sm font-medium text-slate-700">
                              {option.letter}
                            </span>
                            <input
                              type="text"
                              value={option.text}
                              onChange={(e) => updateQuestionOption(qIdx, optIdx, e.target.value)}
                              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder={`Option ${option.letter}`}
                            />
                            <input
                              type="radio"
                              name={`correct-${qIdx}`}
                              checked={cq.correctAnswer === option.letter}
                              onChange={() => updateQuestion(qIdx, 'correctAnswer', option.letter)}
                              className="w-4 h-4 text-blue-600"
                            />
                            <label className="text-sm text-slate-600">Correct</label>
                          </div>
                        ))}
                      </div>
                    </div>
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
        <h4 className="font-medium text-slate-800">Type 5: Reading Comprehension Question {index + 1}</h4>
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
        {question.comprehensionQuestions && (
          <div className="bg-slate-50 p-3 rounded max-h-40 overflow-y-auto">
            <p className="text-slate-800 text-sm whitespace-pre-line">{question.question}</p>
          </div>
        )}

        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Questions:</p>
          <div className="space-y-3">
            {question.comprehensionQuestions ? (
              // Grouped questions
              question.comprehensionQuestions.map((cq, qIdx) => (
                <div key={qIdx} className="border-l-4 border-blue-400 pl-3">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-700 mt-0.5">
                      {cq.questionNumber}
                    </span>
                    <div className="flex-1">
                      <p className="text-slate-700 text-sm font-medium">{cq.question}</p>

                      <div className="mt-1">
                        {cq.options?.map((option, optIdx) => (
                          <span
                            key={optIdx}
                            className={`inline-block mr-2 px-2 py-1 text-xs rounded ${
                              cq.correctAnswer === option.letter
                                ? 'bg-green-100 text-green-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {option.letter}: {option.text}
                            {cq.correctAnswer === option.letter && ' ✓'}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              // Individual question
              <div className="border-l-4 border-blue-400 pl-3">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-700 mt-0.5">
                    {question.questionNumber}
                  </span>
                  <div className="flex-1">
                    <p className="text-slate-700 text-sm font-medium">{question.question}</p>

                    <div className="mt-1">
                      {question.options?.map((option, optIdx) => (
                        <span
                          key={optIdx}
                          className={`inline-block mr-2 px-2 py-1 text-xs rounded ${
                            question.correctAnswer === option.letter
                              ? 'bg-green-100 text-green-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {option.letter}: {option.text}
                          {question.correctAnswer === option.letter && ' ✓'}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Type5ReadingComprehension;
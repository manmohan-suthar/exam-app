import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Check } from 'lucide-react';

const Type4MatchingHeadings = ({ question, onUpdate, onDelete, index }) => {
  const [isEditing, setIsEditing] = useState(!question.question);
  const [editData, setEditData] = useState({
    question: question.question || '',
    instructions: question.instructions || 'Read the texts below. There are questions about the texts. Which text gives you the answer to each question? Drag and drop the correct text to answer each question.',
    texts: question.texts || [],
    matchingQuestions: question.matchingQuestions || []
  });

  // Update question numbers when questions change
  useEffect(() => {
    const updatedQuestions = editData.matchingQuestions.map((q, idx) => ({
      ...q,
      questionNumber: idx + 1
    }));
    if (JSON.stringify(updatedQuestions) !== JSON.stringify(editData.matchingQuestions)) {
      setEditData(prev => ({ ...prev, matchingQuestions: updatedQuestions }));
    }
  }, [editData.matchingQuestions.length]);

  const addText = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nextLetter = letters[editData.texts.length % 26];
    const newText = { letter: nextLetter, content: '' };
    setEditData(prev => ({ ...prev, texts: [...prev.texts, newText] }));
  };

  const removeText = (index) => {
    setEditData(prev => ({
      ...prev,
      texts: prev.texts.filter((_, i) => i !== index)
    }));
  };

  const addMatchingQuestion = () => {
    const newQuestion = {
      questionNumber: editData.matchingQuestions.length + 1,
      question: '',
      correctText: ''
    };
    setEditData(prev => ({ ...prev, matchingQuestions: [...prev.matchingQuestions, newQuestion] }));
  };

  const removeMatchingQuestion = (index) => {
    setEditData(prev => ({
      ...prev,
      matchingQuestions: prev.matchingQuestions.filter((_, i) => i !== index)
    }));
  };

  const handleSave = () => {
    if (!editData.question.trim()) {
      alert('Please enter introductory text');
      return;
    }

    if (editData.texts.length === 0) {
      alert('Please add at least one text');
      return;
    }

    const hasValidTexts = editData.texts.every(text => text.content.trim());
    if (!hasValidTexts) {
      alert('Please enter content for all texts');
      return;
    }

    const hasValidQuestions = editData.matchingQuestions.every(q => q.question.trim() && q.correctText);
    if (!hasValidQuestions) {
      alert('Please enter all questions and assign correct text answers');
      return;
    }

    onUpdate({
      ...question,
      ...editData,
      type: 'type4_matching_headings'
    });
    setIsEditing(false);
  };

  const updateText = (textIndex, content) => {
    const newTexts = [...editData.texts];
    newTexts[textIndex] = { ...newTexts[textIndex], content };
    setEditData({ ...editData, texts: newTexts });
  };

  const updateMatchingQuestion = (questionIndex, field, value) => {
    const newQuestions = [...editData.matchingQuestions];
    newQuestions[questionIndex] = { ...newQuestions[questionIndex], [field]: value };
    setEditData({ ...editData, matchingQuestions: newQuestions });
  };

  if (isEditing) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-medium text-slate-800">Type 4: Matching Headings Question {index + 1}</h4>
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
              Introductory Text
            </label>
            <textarea
              value={editData.question}
              onChange={(e) => setEditData({ ...editData, question: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Enter introductory text about the topic"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-slate-700">
                Texts
              </label>
              <button
                onClick={addText}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
              >
                <Plus size={14} />
                Add Text
              </button>
            </div>
            <div className="space-y-3">
              {editData.texts.map((text, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-sm font-medium text-slate-700">
                        {text.letter}
                      </span>
                      <span className="text-sm font-medium text-slate-700">Text {text.letter}</span>
                    </div>
                    <button
                      onClick={() => removeText(idx)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Remove text"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <textarea
                    value={text.content}
                    onChange={(e) => updateText(idx, e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder={`Enter content for Text ${text.letter}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-slate-700">
                Matching Questions
              </label>
              <button
                onClick={addMatchingQuestion}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
              >
                <Plus size={14} />
                Add Question
              </button>
            </div>
            <div className="space-y-3">
              {editData.matchingQuestions.map((mq, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-700">
                        {mq.questionNumber}
                      </span>
                      <span className="text-sm font-medium text-slate-700">Question {mq.questionNumber}</span>
                    </div>
                    <button
                      onClick={() => removeMatchingQuestion(idx)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Remove question"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={mq.question}
                      onChange={(e) => updateMatchingQuestion(idx, 'question', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter the question"
                    />
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-slate-600">Correct Text:</label>
                      <select
                        value={mq.correctText}
                        onChange={(e) => updateMatchingQuestion(idx, 'correctText', e.target.value)}
                        className="px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select text</option>
                        {editData.texts.map((text) => (
                          <option key={text.letter} value={text.letter}>
                            Text {text.letter}
                          </option>
                        ))}
                      </select>
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
        <h4 className="font-medium text-slate-800">Type 4: Matching Headings Question {index + 1}</h4>
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
          <p className="text-slate-800">{question.question}</p>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Texts:</p>
          <div className="space-y-2">
            {question.texts?.map((text, idx) => (
              <div key={idx} className="border-l-4 border-blue-400 pl-3">
                <p className="text-sm font-medium text-slate-700">Text {text.letter}:</p>
                <p className="text-slate-700 text-sm">{text.content}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Questions:</p>
          <div className="space-y-2">
            {question.matchingQuestions?.map((mq, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-700 mt-0.5">
                  {mq.questionNumber}
                </span>
                <div className="flex-1">
                  <p className="text-slate-700 text-sm">{mq.question}</p>
                  <p className="text-green-600 text-xs font-medium">Answer: Text {mq.correctText}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Type4MatchingHeadings;
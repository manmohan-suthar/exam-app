import React, { useState, useEffect } from 'react';

const BlankInSpaceQuestionRenderer = ({
  question,
  onUpdate,
  isEditable = true,
  showPreview = true,
  answers = {},
  onAnswerChange
}) => {
  const [questionText, setQuestionText] = useState(question.question || '');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    setQuestionText(question.question || '');
  }, [question.question]);

  const handleQuestionTextChange = (value) => {
    setQuestionText(value);
    onUpdate({ question: value });

    // Validation
    const blankCount = (value.match(/\{blank\}/g) || []).length;
    if (blankCount === 0) {
      setValidationError('Please include at least one {blank} placeholder in the question text.');
    } else {
      setValidationError('');
    }
  };

  const renderPreview = (text) => {
    if (!text) return null;

    const parts = text.split('{blank}');
    return (
      <div className="space-y-4">
        <p className="text-slate-800 font-medium text-lg leading-relaxed">
          {parts.map((part, index) => (
            <span key={index}>
              {part}
              {index < parts.length - 1 && (
                <input
                  type="text"
                  name={`question-${question.questionNumber}-blank-${index}`}
                  value={answers[`${question.questionNumber}-blank-${index}`] || ''}
                  onChange={(e) => onAnswerChange && onAnswerChange(`${question.questionNumber}-blank-${index}`, e.target.value)}
                  className="inline-block mx-1 px-2 py-1 border-b-2 border-slate-400 bg-transparent focus:outline-none focus:border-blue-500 min-w-20 text-center"
                  placeholder=""
                  aria-label={`Blank ${index + 1} for question ${question.questionNumber}`}
                  disabled={!onAnswerChange}
                />
              )}
            </span>
          ))}
        </p>
        {question.audioTimestamp && (
          <div className="text-sm text-slate-600">
            Audio timestamp: {question.audioTimestamp}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {isEditable && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Question Text
          </label>
          <textarea
            value={questionText}
            onChange={(e) => handleQuestionTextChange(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="Enter the question text with {blank} placeholders. Example: The weather is {blank} today."
          />
          {validationError && (
            <p className="text-red-500 text-sm mt-1">{validationError}</p>
          )}
          <p className="text-slate-500 text-xs mt-1">
            Use {'{blank}'} to create fill-in-the-blank spaces. Example: "The capital of France is {'{blank}'}."
          </p>
        </div>
      )}

      {showPreview && questionText && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Preview
          </label>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            {renderPreview(questionText)}
          </div>
        </div>
      )}

      {!isEditable && renderPreview(question.question)}
    </div>
  );
};

export default BlankInSpaceQuestionRenderer;
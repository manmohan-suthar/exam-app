import React from 'react';

const QuestionPreview = ({ question, index }) => {
  switch (question.type) {
    case 'mcq':
      return (
        <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-slate-800 mb-3">
            Question {index + 1} (Multiple Choice)
          </h4>
          <p className="text-slate-700 mb-3">{question.question}</p>
          <div className="space-y-2">
            {question.options?.map((option, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center text-xs font-medium text-slate-600">
                  {option.letter}
                </span>
                <span className="text-slate-700">{option.text}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case 'fill_in_blank':
      return (
        <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-slate-800 mb-3">
            Question {index + 1} (Fill-in-the-Blank)
          </h4>
          {question.question && (
            <p className="text-slate-700 mb-3">{question.question}</p>
          )}
          <div className="bg-slate-50 p-3 rounded">
            <p className="text-sm text-slate-600 mb-2">Fill options:</p>
            <div className="flex flex-wrap gap-2">
              {question.fillOptions?.map((option, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-white border border-slate-300 rounded text-sm text-slate-700"
                >
                  {option.text}
                </span>
              ))}
            </div>
          </div>
        </div>
      );

    case 'short_answer':
      return (
        <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-slate-800 mb-3">
            Question {index + 1} (Short Answer)
          </h4>
          {question.question && (
            <p className="text-slate-700 mb-3">{question.question}</p>
          )}
          <div className="bg-slate-50 p-3 rounded">
            <p className="text-sm text-slate-600 mb-2">Answer options:</p>
            <div className="flex flex-wrap gap-2">
              {question.shortAnswerOptions?.map((option, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-white border border-slate-300 rounded text-sm text-slate-700"
                >
                  {option.text}
                </span>
              ))}
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
};

export default QuestionPreview;
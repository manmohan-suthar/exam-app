import React from 'react'
import { Headset } from 'lucide-react'

// Component to display a listening question with dynamic data

export default function ListeningQuestionUI({ question, onPlayFromHere }) {
  if (!question) return null;

  return (
    <div className="mx-auto p-6 bg-white">
      {/* Header: Question number and listen button */}
      <div className="flex items-center gap-4 mb-4">
        <h3 className="text-[22px] font-extrabold text-[#FF3200]">Question {question.questionNumber}</h3>

        {question.audioTimestamp && (
          <button
            onClick={() => onPlayFromHere && onPlayFromHere(question.audioTimestamp)}
            className="ml-2 inline-flex items-center gap-2 border border-gray-200 rounded-full px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Headset />
            <span className="text-sm">Listen from here</span>
          </button>
        )}
      </div>

      {/* Instruction lines */}
      <div className="mb-4">
        {question.instruction && (
          <p className="text-[16px] text-gray-600">
            <em>{question.instruction}</em>
          </p>
        )}

        {question.question && (
          <p className="mt-3 text-[16px] italic text-gray-700">{question.question}</p>
        )}
      </div>

      {/* Options */}
      {question.options && question.options.length > 0 && (
        <div className="space-y-4 mt-6">
          {question.options.map((option, i) => (
            <div key={i} className="flex items-center gap-4">
              {/* Letter circle */}
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-100 text-gray-600 font-semibold">
                {option.letter || String.fromCharCode(65 + i)}
              </div>

              {/* checkbox square */}
              <div className="h-5 w-5 rounded-md border-2 border-[#FF3200] bg-white" />

              {/* option text */}
              <div className="text-[15px] text-gray-800">{option.text || option}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

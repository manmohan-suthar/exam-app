import React, { useState } from 'react';
import { Plus, Trash2, Edit, Check } from 'lucide-react';

const Type3SentenceCompletion = ({ question, onUpdate, onDelete, index }) => {
  const [isEditing, setIsEditing] = useState(!question.question);
  const [editData, setEditData] = useState({
    question: question.question || '',
    instructions: question.instructions || 'Read the article from an international news magazine. Drag and drop the correct sentence to complete the gaps in the text. There are extra sentences you will not need.',
    sentences: question.sentences || [],
    gapMappings: question.gapMappings || []
  });

  const handleSave = () => {
    if (!editData.question.trim()) {
      alert('Please enter the article text with gaps');
      return;
    }

    const hasValidSentences = editData.sentences.every(sent => sent.text.trim());
    if (!hasValidSentences) {
      alert(`Please enter all sentence options (${editData.sentences.map(s => s.letter).join(', ')})`);
      return;
    }

    const hasValidMappings = editData.gapMappings.every(mapping => mapping.correctSentence);
    if (!hasValidMappings) {
      alert('Please assign correct sentences to all gaps');
      return;
    }

    onUpdate({
      ...question,
      ...editData,
      type: 'type3_sentence_completion'
    });
    setIsEditing(false);
  };

  const updateSentence = (sentenceIndex, text) => {
    const newSentences = [...editData.sentences];
    newSentences[sentenceIndex] = { ...newSentences[sentenceIndex], text };
    setEditData({ ...editData, sentences: newSentences });
  };

  const updateGapMapping = (gapIndex, correctSentence) => {
    const newMappings = [...editData.gapMappings];
    newMappings[gapIndex] = { ...newMappings[gapIndex], correctSentence };
    setEditData({ ...editData, gapMappings: newMappings });
  };

  if (isEditing) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-medium text-slate-800">Type 3: Sentence Completion Question {index + 1}</h4>
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
              {`Article Text with Gaps (use {gap1}, {gap2}, etc. for gap placeholders)`}
            </label>
            <textarea
              value={editData.question}
              onChange={(e) => {
                const newText = e.target.value;
                // Auto-detect gaps and update gapMappings and sentences
                const gapMatches = newText.match(/\{gap(\d+)\}/g) || [];
                const gapNumbers = gapMatches.map(match => parseInt(match.match(/\{gap(\d+)\}/)[1])).sort((a, b) => a - b);
                const numGaps = gapNumbers.length;
                const numSentences = numGaps + 2; // gaps + 2 extra
                const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
                const newSentences = letters.slice(0, numSentences).map((letter, index) => ({
                  letter,
                  text: editData.sentences.find(s => s.letter === letter)?.text || '',
                  isExtra: index >= numGaps
                }));
                const newGapMappings = gapNumbers.map(num => ({
                  gapNumber: num,
                  correctSentence: editData.gapMappings.find(m => m.gapNumber === num)?.correctSentence || ''
                }));
                const dynamicInstructions = numGaps > 0
                  ? `Read the article from an international news magazine. Drag and drop the correct sentence to complete the ${numGaps} gaps in the text. There are ${numSentences - numGaps} extra sentences you will not need.`
                  : 'Read the article from an international news magazine. Drag and drop the correct sentence to complete the gaps in the text. There are extra sentences you will not need.';
                setEditData({
                  ...editData,
                  question: newText,
                  sentences: newSentences,
                  gapMappings: newGapMappings,
                  instructions: dynamicInstructions
                });
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={8}
              placeholder={`Enter the article text with {gap1}, {gap2}, etc. for gaps`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Sentence Options ({editData.sentences.length > 0 ? `${editData.sentences[0].letter}-${editData.sentences[editData.sentences.length - 1].letter}` : 'None'})
            </label>
            <div className="space-y-2">
              {editData.sentences.map((sentence, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    sentence.isExtra ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {sentence.letter}
                  </span>
                  <input
                    type="text"
                    value={sentence.text}
                    onChange={(e) => updateSentence(idx, e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Sentence ${sentence.letter}`}
                  />
                  <span className={`text-xs px-2 py-1 rounded ${
                    sentence.isExtra ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {sentence.isExtra ? 'Extra' : 'Used'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Gap Mappings (assign correct sentences to gaps)
            </label>
            <div className="grid grid-cols-2 gap-4">
              {editData.gapMappings.map((mapping, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-slate-700 mb-2">Gap {mapping.gapNumber}</p>
                  <select
                    value={mapping.correctSentence}
                    onChange={(e) => updateGapMapping(idx, e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select correct sentence</option>
                    {editData.sentences.map((sentence) => (
                      <option key={sentence.letter} value={sentence.letter}>
                        {sentence.letter}: {sentence.text.substring(0, 30)}...
                      </option>
                    ))}
                  </select>
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
        <h4 className="font-medium text-slate-800">Type 3: Sentence Completion Question {index + 1}</h4>
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

        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Sentence Options:</p>
          <div className="space-y-1">
            {question.sentences?.map((sentence, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mt-0.5 ${
                  sentence.isExtra ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                }`}>
                  {sentence.letter}
                </span>
                <span className="text-slate-700 text-sm flex-1">{sentence.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Gap Mappings:</p>
          <div className="grid grid-cols-2 gap-2">
            {question.gapMappings?.map((mapping, idx) => (
              <div key={idx} className="text-xs bg-blue-50 p-2 rounded">
                Gap {mapping.gapNumber} → Sentence {mapping.correctSentence}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Type3SentenceCompletion;
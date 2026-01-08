import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Edit, Check } from "lucide-react";
import Quill from "quill";
import "quill/dist/quill.snow.css";

const Type3SentenceCompletion = ({ question, onUpdate, onDelete, index }) => {
  const [isEditing, setIsEditing] = useState(!question.question);

  const [editData, setEditData] = useState({
    question: question.question || "",
    instructions:
      question.instructions ||
      "Read the article from an international news magazine. Drag and drop the correct sentence to complete the gaps in the text. There are extra sentences you will not need.",
    sentences: question.sentences || [],
    gapMappings: question.gapMappings || [],
  });

  /* ---------------------- QUILL EDITOR ---------------------- */

  const editorRef = useRef(null);
  const quillRef = useRef(null);

  useEffect(() => {
    if (!isEditing) return;
    if (quillRef.current) return; // prevent re-init bug

    quillRef.current = new Quill(editorRef.current, {
      theme: "snow",
      placeholder: "Enter article text with {gap1}, {gap2}, etc.",
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline"],
          [ { list: "bullet" }],
          [{ align: [] }],
          ["link"],
          ["clean"],
        ],
        keyboard: {
          bindings: {
            insertBulletAltB: {
              key: 66,        // B
              altKey: true,   // ALT + B
              handler: function (range) {
                if (!range) return false;
        
                const quill = quillRef.current;
                quill.insertText(range.index, "● ");
                quill.setSelection(range.index + 2);
                return false;
              },
            },
          },
        },
      },
    });

    quillRef.current.root.innerHTML = editData.question;

    quillRef.current.on("text-change", () => {
      const html = quillRef.current.root.innerHTML;

      // AUTO DETECT GAPS
      const gapMatches = html.match(/\{gap(\d+)\}/g) || [];
      const gapNums = gapMatches
        .map((m) => parseInt(m.match(/\{gap(\d+)\}/)[1]))
        .sort((a, b) => a - b);

      const numGaps = gapNums.length;
      const numSentences = numGaps + 2;
      const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

      const newSentences = letters.slice(0, numSentences).map((letter, i) => ({
        letter,
        text: editData.sentences.find((s) => s.letter === letter)?.text || "",
        isExtra: i >= numGaps,
      }));

      const newGapMappings = gapNums.map((num) => ({
        gapNumber: num,
        correctSentence:
          editData.gapMappings.find((m) => m.gapNumber === num)
            ?.correctSentence || "",
      }));

      setEditData((prev) => ({
        ...prev,
        question: html,
        sentences: newSentences,
        gapMappings: newGapMappings,
      }));
    });
  }, [isEditing]);

  /* ---------------------- SAVE ---------------------- */

  const handleSave = () => {
    if (!editData.question.trim()) {
      alert("Please enter the article text");
      return;
    }

    const validSentences = editData.sentences.every((s) => s.text.trim());
    if (!validSentences) {
      alert("Please fill all sentence options");
      return;
    }

    const validMapping = editData.gapMappings.every(
      (m) => m.correctSentence.trim()
    );
    if (!validMapping) {
      alert("Please link all gaps with correct sentences");
      return;
    }

    onUpdate({
      ...question,
      ...editData,
      type: "type3_sentence_completion",
    });

    setIsEditing(false);
    quillRef.current = null;
  };

  /* ---------------------- EDIT MODE ---------------------- */

  if (isEditing) {
    return (
      <div className="bg-white  p-4 rounded-lg">
        <div className="flex justify-between mb-4">
          <h4 className="font-medium">
            Type 3: Sentence Completion Question {index + 1}
          </h4>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="bg-green-600 text-white px-3 py-1 rounded flex items-center gap-1"
            >
              <Check size={14} /> Save
            </button>

            {onDelete && (
              <button
                onClick={onDelete}
                className="bg-red-600 text-white px-3 py-1 rounded flex items-center gap-1"
              >
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>
        </div>
<div>
<h5>Add Bullet Points : Alt+B</h5>

</div>
        {/* 🔥 QUILL EDITOR */}
        <div className="mb-4">
          <div ref={editorRef} style={{ minHeight: "200px" }} />
        </div>

        {/* SENTENCES */}
        <h5 className="font-medium mb-2">Sentence Options</h5>
        <div className="space-y-2">
          {editData.sentences.map((sentence, i) => (
            <div key={i} className="flex items-center gap-2">
              <span
                className={`w-8 h-8 flex items-center justify-center rounded-full ${
                  sentence.isExtra
                    ? "bg-red-100 text-red-600"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {sentence.letter}
              </span>

              <input
                type="text"
                value={sentence.text}
                onChange={(e) => {
                  const newList = [...editData.sentences];
                  newList[i].text = e.target.value;
                  setEditData({ ...editData, sentences: newList });
                }}
                className="flex-1 border px-3 py-2 rounded"
              />
            </div>
          ))}
        </div>

        {/* GAP MAPPINGS */}
        <h5 className="font-medium mt-4 mb-2">Gap Mappings</h5>

        {editData.gapMappings.map((mapping, i) => (
          <div key={i} className="border p-3 rounded mb-2">
            <p className="font-medium">Gap {mapping.gapNumber}</p>
            <select
              value={mapping.correctSentence}
              onChange={(e) => {
                const newList = [...editData.gapMappings];
                newList[i].correctSentence = e.target.value;
                setEditData({ ...editData, gapMappings: newList });
              }}
              className="border px-3 py-2 rounded w-full"
            >
              <option value="">Select Sentence</option>
              {editData.sentences.map((s) => (
                <option key={s.letter} value={s.letter}>
                  {s.letter}: {s.text.substring(0, 40)}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    );
  }

  /* ---------------------- VIEW MODE ---------------------- */

  return (
    <div className="bg-white border p-4 rounded-lg">
      <div className="flex justify-between mb-3">
        <h4 className="font-medium">
          Type 3: Sentence Completion Question {index + 1}
        </h4>

        <div className="flex gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="bg-blue-600 text-white px-3 py-1 rounded flex items-center gap-1"
          >
            <Edit size={14} /> Edit
          </button>

          {onDelete && (
            <button
              onClick={onDelete}
              className="bg-red-600 text-white px-3 py-1 rounded flex items-center gap-1"
            >
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>
      </div>

      <p className="font-medium mb-2">{question.instructions}</p>

      {/* 🔥 QUILL HTML PREVIEW FIX */}
      <div
        className="ql-snow ql-editor bg-slate-50 p-3 rounded"
        dangerouslySetInnerHTML={{ __html: question.question }}
      ></div>

      <h5 className="font-medium mt-4">Sentence Options</h5>
      {question.sentences?.map((s, i) => (
        <div key={i} className="flex gap-2 mt-1 text-sm">
          <span
            className={`w-6 h-6 flex items-center justify-center rounded-full ${
              s.isExtra ? "bg-red-100" : "bg-blue-100"
            }`}
          >
            {s.letter}
          </span>
          {s.text}
        </div>
      ))}

      <h5 className="font-medium mt-4">Gap Mappings</h5>
      {question.gapMappings?.map((m, i) => (
        <div key={i} className="text-xs bg-blue-50 p-2 rounded mt-1">
          Gap {m.gapNumber} → Sentence {m.correctSentence}
        </div>
      ))}
    </div>
  );
};

export default Type3SentenceCompletion;

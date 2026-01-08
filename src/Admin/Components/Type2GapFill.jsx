import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Edit, Check } from "lucide-react";
import Quill from "quill";
import "quill/dist/quill.snow.css";

const Type2GapFill = ({ question, onUpdate, onDelete, index }) => {
  const [isEditing, setIsEditing] = useState(!question.question);

  const [editData, setEditData] = useState({
    question: question.question || "",
    instructions:
      question.instructions ||
      "Read the text below and decide which option (A, B or C) best fits each gap.",
    gaps: question.gaps || [
      {
        gapNumber: 1,
        options: [
          { letter: "A", text: "" },
          { letter: "B", text: "" },
          { letter: "C", text: "" },
        ],
        correctAnswer: "",
      },
    ],
  });

  /* ================= QUILL ================= */
  const editorRef = useRef(null);
  const quillRef = useRef(null);

  useEffect(() => {
    if (!isEditing) return;
    if (quillRef.current) return; // 🔥 prevents re-render bug

    quillRef.current = new Quill(editorRef.current, {
      theme: "snow",
      placeholder: "Enter text with [GAP1], [GAP2] ...",
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
      setEditData((prev) => ({
        ...prev,
        question: quillRef.current.root.innerHTML,
      }));
    });
  }, [isEditing]);

  /* ================= SAVE ================= */
  const handleSave = () => {
    if (!editData.question.trim()) {
      alert("Please enter question text");
      return;
    }

    const valid = editData.gaps.every(
      (g) => g.correctAnswer && g.options.every((o) => o.text.trim())
    );

    if (!valid) {
      alert("Fill all options and correct answers");
      return;
    }

    onUpdate({
      ...question,
      ...editData,
      type: "type2_gap_fill",
    });

    setIsEditing(false);
    quillRef.current = null; // reset editor safely
  };

  /* ================= GAP HANDLERS ================= */
  const addGap = () => {
    setEditData({
      ...editData,
      gaps: [
        ...editData.gaps,
        {
          gapNumber: editData.gaps.length + 1,
          options: [
            { letter: "A", text: "" },
            { letter: "B", text: "" },
            { letter: "C", text: "" },
          ],
          correctAnswer: "",
        },
      ],
    });
  };

  const updateGapOption = (gapIdx, optIdx, text) => {
    const gaps = [...editData.gaps];
    gaps[gapIdx].options[optIdx].text = text;
    setEditData({ ...editData, gaps });
  };

  const updateGapAnswer = (gapIdx, letter) => {
    const gaps = [...editData.gaps];
    gaps[gapIdx].correctAnswer = letter;
    setEditData({ ...editData, gaps });
  };

  const removeGap = (gapIdx) => {
    if (editData.gaps.length <= 1) return alert("At least one gap required");

    const gaps = editData.gaps
      .filter((_, i) => i !== gapIdx)
      .map((g, i) => ({ ...g, gapNumber: i + 1 }));

    setEditData({ ...editData, gaps });
  };

  /* ================= EDIT MODE ================= */
  if (isEditing) {
    return (
      <div className="bg-white border rounded-lg p-4">
        <div className="flex justify-between mb-4">
          <h4 className="font-medium">
            Type 2: Gap Fill Question {index + 1}
          </h4>

          <div className="flex gap-2">
            <button
              onClick={addGap}
              className="bg-blue-600 text-white px-3 py-1 rounded flex items-center gap-1"
            >
              <Plus size={14} /> Add Gap
            </button>

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
        <div className="mb-6">
          <div ref={editorRef} style={{ minHeight: "220px" }} />
        </div>

        {/* GAP OPTIONS */}
        {editData.gaps.map((gap, gapIdx) => (
          <div key={gapIdx} className="border rounded p-3 mb-4">
            <div className="flex justify-between mb-2">
              <h5 className="font-medium">Gap {gap.gapNumber}</h5>
              {editData.gaps.length > 1 && (
                <button onClick={() => removeGap(gapIdx)}>
                  <Trash2 size={14} className="text-red-500" />
                </button>
              )}
            </div>

            {gap.options.map((opt, optIdx) => (
              <div key={optIdx} className="flex items-center gap-2 mb-2">
                <span className="w-8 text-center font-medium">
                  {opt.letter}
                </span>

                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) =>
                    updateGapOption(gapIdx, optIdx, e.target.value)
                  }
                  className="flex-1 border px-3 py-2 rounded"
                />

                <input
                  type="radio"
                  name={`gap-${gapIdx}`}
                  checked={gap.correctAnswer === opt.letter}
                  onChange={() =>
                    updateGapAnswer(gapIdx, opt.letter)
                  }
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  /* ================= VIEW MODE ================= */
  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex justify-between mb-3">
        <h4 className="font-medium">
          Type 2: Gap Fill Question {index + 1}
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

      {/* ✅ HTML RENDER (RIGHT WAY) */}
      <div
  className="ql-snow ql-editor bg-slate-50 p-3 rounded"
  dangerouslySetInnerHTML={{ __html: question.question }}
></div>



      {question.gaps?.map((gap, i) => (
        <div key={i} className="mt-3">
          <p className="font-medium">Gap {gap.gapNumber}</p>
          {gap.options.map((opt, j) => (
            <div key={j} className="flex items-center gap-2 text-sm">
              <span
                className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                  gap.correctAnswer === opt.letter
                    ? "bg-green-100 border-green-500"
                    : ""
                }`}
              >
                {opt.letter}
              </span>
              {opt.text}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default Type2GapFill;

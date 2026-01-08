import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Edit, Check } from "lucide-react";
import Quill from "quill";
import "quill/dist/quill.snow.css";

const Type5ReadingComprehension = ({ question, onUpdate, onDelete, index }) => {
  const [isEditing, setIsEditing] = useState(!question.question);

  const [editData, setEditData] = useState({
    question: question.question || "",
    instructions:
      question.instructions ||
      "Read the article about intelligence and ageing and answer the questions.",
    comprehensionQuestions: question.comprehensionQuestions || [
      {
        questionNumber: 1,
        question: "",
        questionType: "multiple_choice",
        options: [
          { letter: "A", text: "" },
          { letter: "B", text: "" },
          { letter: "C", text: "" },
          { letter: "D", text: "" },
        ],
        correctAnswer: "",
        maxWords: 3,
      },
    ],
  });

  /* -------------------------------------
      QUILL EDITOR
  -------------------------------------- */

  const editorRef = useRef(null);
  const quillRef = useRef(null);

  useEffect(() => {
    if (!isEditing) return;
    if (quillRef.current) return;

    quillRef.current = new Quill(editorRef.current, {
      theme: "snow",
      placeholder: "Enter article text...",
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
      setEditData((prev) => ({ ...prev, question: html }));
    });
  }, [isEditing]);

  /* -------------------------------------
      SAVE
  -------------------------------------- */

  const handleSave = () => {
    if (!editData.question.trim()) {
      alert("Please enter the article text");
      return;
    }

    const validQuestions = editData.comprehensionQuestions.every((q) => {
      if (!q.question.trim()) return false;
      return q.options.every((o) => o.text.trim()) && q.correctAnswer;
    });

    if (!validQuestions) {
      alert("Please complete all comprehension questions");
      return;
    }

    onUpdate({
      ...question,
      ...editData,
      type: "type5_reading_comprehension",
    });

    setIsEditing(false);
    quillRef.current = null;
  };

  /* -------------------------------------
      QUESTION HANDLERS
  -------------------------------------- */

  const addQuestion = () => {
    const newQ = {
      questionNumber: editData.comprehensionQuestions.length + 1,
      question: "",
      questionType: "multiple_choice",
      options: [
        { letter: "A", text: "" },
        { letter: "B", text: "" },
        { letter: "C", text: "" },
        { letter: "D", text: "" },
      ],
      correctAnswer: "",
      maxWords: 3,
    };

    setEditData({
      ...editData,
      comprehensionQuestions: [...editData.comprehensionQuestions, newQ],
    });
  };

  const updateQuestion = (qIdx, field, value) => {
    const list = [...editData.comprehensionQuestions];
    list[qIdx][field] = value;
    setEditData({ ...editData, comprehensionQuestions: list });
  };

  const updateOption = (qIdx, optIdx, text) => {
    const list = [...editData.comprehensionQuestions];
    list[qIdx].options[optIdx].text = text;
    setEditData({ ...editData, comprehensionQuestions: list });
  };

  const removeQuestion = (qIdx) => {
    if (editData.comprehensionQuestions.length <= 1) {
      alert("Must have at least ONE question.");
      return;
    }

    let list = editData.comprehensionQuestions.filter((_, i) => i !== qIdx);
    list = list.map((q, i) => ({ ...q, questionNumber: i + 1 }));

    setEditData({ ...editData, comprehensionQuestions: list });
  };

  /* -------------------------------------
      EDIT MODE
  -------------------------------------- */

  if (isEditing) {
    return (
      <div className="bg-white rounded-lg p-4">
        <div className="flex justify-between mb-4">
          <h4 className="font-medium">
            Type 5: Reading Comprehension {index + 1}
          </h4>

          <div className="flex gap-2">
            <button
              onClick={addQuestion}
              className="bg-blue-600 text-white px-3 py-1 rounded flex items-center gap-1"
            >
              <Plus size={14} /> Add
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

        {/* 🔥 QUILL ARTICLE EDITOR */}
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Article Text <br />
          <h5>Add Bullet Points : Alt+B</h5>

        
        </label>
        <div
          ref={editorRef}
          style={{ minHeight: "200px" }}
          className="mb-4"
        />

        {/* COMPREHENSION QUESTIONS */}
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Comprehension Questions
        </label>

        <div className="space-y-4">
          {editData.comprehensionQuestions.map((cq, idx) => (
            <div key={idx} className=" p-4 rounded">
              <div className="flex justify-between mb-2">
                <h5 className="font-medium">Question {cq.questionNumber}</h5>

                {editData.comprehensionQuestions.length > 1 && (
                  <button
                    onClick={() => removeQuestion(idx)}
                    className="text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <textarea
                value={cq.question}
                onChange={(e) =>
                  updateQuestion(idx, "question", e.target.value)
                }
                className="w-full border px-3 py-2 rounded mb-3"
                placeholder="Enter question..."
              />

              <div className="space-y-2">
                {cq.options.map((opt, oIdx) => (
                  <div key={oIdx} className="flex items-center gap-2">
                    <span className="w-8 h-8 bg-slate-100 flex items-center justify-center rounded-full">
                      {opt.letter}
                    </span>

                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) =>
                        updateOption(idx, oIdx, e.target.value)
                      }
                      className="flex-1 border px-3 py-2 rounded"
                      placeholder={`Option ${opt.letter}`}
                    />

                    <input
                      type="radio"
                      name={`correct-${idx}`}
                      checked={cq.correctAnswer === opt.letter}
                      onChange={() =>
                        updateQuestion(idx, "correctAnswer", opt.letter)
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* -------------------------------------
      VIEW MODE
  -------------------------------------- */

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex justify-between mb-4">
        <h4 className="font-medium">
          Type 5: Reading Comprehension {index + 1}
        </h4>

        <button
          onClick={() => setIsEditing(true)}
          className="bg-blue-600 text-white px-3 py-1 rounded flex items-center gap-1"
        >
          <Edit size={14} /> Edit
        </button>
      </div>

      {/* 🔥 QUILL HTML PREVIEW */}
      <div
        className="ql-snow ql-editor bg-slate-50 p-3 rounded"
        dangerouslySetInnerHTML={{ __html: question.question }}
      ></div>

      <h5 className="font-medium mt-4">Questions</h5>
      {question.comprehensionQuestions.map((cq, idx) => (
        <div key={idx} className="border-l-4 border-blue-400 pl-3 mt-2">
          <p className="font-medium">{cq.question}</p>

          <div className="mt-1">
            {cq.options.map((o, i) => (
              <span
                key={i}
                className={`inline-block text-xs px-2 py-1 rounded mr-2 ${
                  cq.correctAnswer === o.letter
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {o.letter}: {o.text}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Type5ReadingComprehension;

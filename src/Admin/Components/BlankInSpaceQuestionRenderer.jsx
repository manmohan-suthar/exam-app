import React, { useState, useEffect, useRef } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";

/* ======================================================
   FIX QUILL LIST BUG (NUMBERS + BULLETS MIXING)
====================================================== */
const Parchment = Quill.import("parchment");
const List = Quill.import("formats/list");

class FixedList extends List {
  static create(value) {
    // ALWAYS create clean lists
    if (value === "bullet") return super.create("bullet");
    if (value === "ordered") return super.create("ordered");
    return super.create(value);
  }
}

Quill.register(FixedList, true);

/* ======================================================
     COMPONENT START
====================================================== */

const BlankInSpaceQuestionRenderer = ({
  question,
  onUpdate,
  isEditable = true,
  showPreview = true,
  answers = {},
  onAnswerChange,
}) => {
  const [questionText, setQuestionText] = useState(question.question || "");
  const [validationError, setValidationError] = useState("");

  const editorRef = useRef(null);
  const quillRef = useRef(null);
  const onUpdateRef = useRef(onUpdate);

  /* --------------------------------------------------
     Keep onUpdate reference stable
  -------------------------------------------------- */
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  /* --------------------------------------------------
     Initialize Quill ONLY ONCE
  -------------------------------------------------- */
  useEffect(() => {
    if (!isEditable) return;
    if (!editorRef.current) return;
    if (quillRef.current) return;

    quillRef.current = new Quill(editorRef.current, {
      theme: "snow",
      placeholder: "Enter the question text with {blank} placeholders.",
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

    quillRef.current.root.innerHTML = question.question || "";

    quillRef.current.on("text-change", () => {
      const html = quillRef.current.root.innerHTML;
      setQuestionText(html);
      onUpdateRef.current?.({ question: html });

      const plainText = quillRef.current.getText();
      const blankCount = (plainText.match(/\{blank\}/g) || []).length;

      setValidationError(
        blankCount === 0
          ? "Please include at least one {blank} placeholder."
          : ""
      );
    });
  }, [isEditable, question.question]);

  /* --------------------------------------------------
     Sync external question updates
  -------------------------------------------------- */
  useEffect(() => {
    if (!quillRef.current) return;

    if (quillRef.current.root.innerHTML !== question.question) {
      quillRef.current.root.innerHTML = question.question || "";
    }

    setQuestionText(question.question || "");
  }, [question.question]);

  /* --------------------------------------------------
     Preview Input Slots
  -------------------------------------------------- */
  useEffect(() => {
    if (!showPreview) return;

    const container = document.querySelector(".preview-content");
    if (!container) return;

    const slots = container.querySelectorAll(".blank-slot");

    slots.forEach((slot, index) => {
      if (slot.querySelector("input")) return;

      const input = document.createElement("input");
      input.type = "text";
      input.value =
        answers[`${question.questionNumber}-blank-${index}`] || "";

      input.className =
        "inline-block mx-1 px-2 py-1 border-b-2 border-slate-400 bg-transparent focus:outline-none focus:border-blue-500 min-w-20 text-center";

      input.oninput = (e) =>
        onAnswerChange?.(
          `${question.questionNumber}-blank-${index}`,
          e.target.value
        );

      slot.appendChild(input);
    });
  }, [questionText, answers, showPreview]);

  /* --------------------------------------------------
     Preview Renderer (List Fixes)
  -------------------------------------------------- */
  const renderPreview = (html) => {
    if (!html) return null;

    let fixed = html;

    // FIX 1 — BREAK NESTED UL INSIDE OL
    fixed = fixed.replace(
      /<li[^>]*>\s*<ul[^>]*>([\s\S]*?)<\/ul>\s*<\/li>/g,
      (_, inner) => `</ol><ul>${inner}</ul><ol>`
    );

    // FIX 2 — CONVERT OL TO UL IF INNER UL EXISTS
    fixed = fixed.replace(
      /<ol([^>]*)>([\s\S]*?)<\/ol>/g,
      (_, attrs, inner) => {
        if (inner.includes("<ul")) {
          return `<ul>${inner.replace(/<ul>|<\/ul>/g, "")}</ul>`;
        }
        return `<ol>${inner}</ol>`;
      }
    );

    // FIX 3 — Remove duplicate numbers Quill inserts
    fixed = fixed.replace(/<li>\s*\d+\.\s*/g, "<li>");

    // FIX 4 — Remove data-list attributes
    fixed = fixed.replace(/data-list="[^"]*"/g, "");

    // FIX 5 — Convert {blank}
    fixed = fixed.replace(/\{blank\}/g, `<span class="blank-slot"></span>`);

    return (
      <div
        className="preview-content ql-editor"
        dangerouslySetInnerHTML={{ __html: fixed }}
      />
    );
  };

  const handleInsertHappy = () => {
    const quill = quillRef.current;
    if (quill) {
      const range = quill.getSelection(true);
      if (range) {
        quill.insertText(range.index, '●', 'header', 1);
      }
    }
  };


  /* --------------------------------------------------
     Render
  -------------------------------------------------- */
  return (
    <div className="space-y-4">
      {isEditable && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Question Text
          </label>
          <div className="mb-4">
        <span onClick={handleInsertHappy} className="cursor-pointer text-black hover:underline">
        Add Bulet Points: &#8226; (Alt + B)
        </span>
      </div>
          <div
            ref={editorRef}
            className="border border-slate-300 rounded-lg overflow-hidden"
          />

          {validationError && (
            <p className="text-red-500 text-sm mt-1">{validationError}</p>
          )}

          <p className="text-slate-500 text-xs mt-1">
            Use <b>{"{blank}"}</b> to create fill-in-the-blank spaces.
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

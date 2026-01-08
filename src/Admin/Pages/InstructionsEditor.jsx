import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import Quill from "quill";
import "quill/dist/quill.snow.css";

import { Save, Loader2 } from "lucide-react";

const InstructionsEditor = ({ category }) => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const editorRef = useRef(null);
  const quillRef = useRef(null);

  const categoryLabels = {
    "listening-instructions": "Listening",
    "reading-instructions": "Reading",
    "writing-instructions": "Writing",
  };
  

  const categoryNames = {
    "listening-instructions": "listening",
    "reading-instructions": "reading",
    "writing-instructions": "writing",
  };

  useEffect(() => {
    fetchInstructions();
  }, [category]);

  useEffect(() => {
    if (loading) return;
  
    quillRef.current = new Quill(editorRef.current, {
      theme: "snow",
      placeholder: "Write instructions here...",
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ["italic", "underline"],
          [{ list: "bullet", ordered: true }],
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
  
    quillRef.current.root.innerHTML = content;
  
    quillRef.current.on("text-change", () => {
      setContent(quillRef.current.root.innerHTML);
    });
  }, [loading]);
  
  

  const handleInsertHappy = () => {
    const quill = quillRef.current;
    if (quill) {
      const range = quill.getSelection(true);
      if (range) {
        quill.insertText(range.index, "● ");
        quill.setSelection(range.index + 2);
      }
    }
  };


  const fetchInstructions = async () => {
    try {
      setLoading(true);
      const categoryName = categoryNames[category];
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/admin/instructions/${categoryName}`
      );
      setContent(response.data.instruction.content || "");
    } catch (error) {
      console.error("Error fetching instructions:", error);
      setMessage("Error loading instructions");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage("");
      const categoryName = categoryNames[category];
      const admin = JSON.parse(localStorage.getItem("admin"));

      await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/admin/instructions/${categoryName}`,
        {
          content,
          createdBy: admin.admin,
        }
      );

      setMessage("Instructions saved successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error saving instructions:", error);
      setMessage("Error saving instructions");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-teal-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          All Instructions
        </h2>
        <p className="text-slate-600">
          Edit the instructions for the {categoryLabels[category].toLowerCase()} section.
        </p>
      </div>

      <div className="mb-4">
        <span onClick={handleInsertHappy} className="cursor-pointer text-black hover:underline">
        Add Bullet Points: shortcut: Alt + B
        </span>
        
      </div>

      {/* Quill Editor */}
      <div className="mb-4">
        <div ref={editorRef} style={{ height: "400px" }} />
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 
                     disabled:bg-teal-400 text-white px-6 py-2 rounded-lg transition-colors"
        >
          {saving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save size={16} />}
          {saving ? "Saving..." : "Save Instructions"}
        </button>

        {message && (
          <div
            className={`px-4 py-2 rounded-lg ${
              message.includes("Error")
                ? "bg-red-100 text-red-800"
                : "bg-green-100 text-green-800"
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default InstructionsEditor;

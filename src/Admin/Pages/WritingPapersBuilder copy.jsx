import React, { useState, useEffect, useRef } from 'react';

import Quill from "quill";
import "quill/dist/quill.snow.css";


import axios from 'axios';

import { Plus, Save, Eye, Upload, Trash2, Edit, Image, FileText } from 'lucide-react';

const WritingPapersBuilder = () => {
  const [papers, setPapers] = useState([]);
  const [currentPaper, setCurrentPaper] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'builder', or 'preview'
  const [currentTask, setCurrentTask] = useState(1); // Current task number (1-4)
  const [content, setContent] = useState('');
  useEffect(() => {
    fetchPapers();
  }, []);

  const editorRef = useRef(null);
  const quillInstance = useRef(null);
  
  useEffect(() => {
    if (editorRef.current && !quillInstance.current) {
      quillInstance.current = new Quill(editorRef.current, {
        theme: "snow",
        modules: {
          toolbar: [
            [{ header: [1, 2, 3, false] }],
            ["bold", "italic", "underline"],
            [{ list: "ordered" }, { list: "bullet" }],
            ["link", "image"],
          ],
        },
      });
    }
  }, []);
  
  // Setup Quill text-change handler
  useEffect(() => {
    if (!quillInstance.current) return;

    const quill = quillInstance.current;
    const handler = () => {
      if (isSettingContent.current) return; // skip update during setText/pasteHTML
      const html = quill.root.innerHTML;
      if (html !== content) {
        setContent(html);
        updateTask(currentTask, { prompt: html });
      }
    };

    quill.on("text-change", handler);
    return () => quill.off("text-change", handler);
  }, [currentTask, content]);

  const ImageHandler = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.click();
  
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
  
      const formData = new FormData();
      formData.append("image", file);
      formData.append("taskNumber", currentTask);
  
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/admin/writing-papers/${currentPaper._id}/upload-image`,
        { method: "POST", body: formData }
      );
  
      const data = await res.json();
  
      const range = quillInstance.current.getSelection();
      quillInstance.current.insertEmbed(
        range.index,
        "image",
        `${import.meta.env.VITE_API_BASE_URL}/${data.image.path}`
      );
    };
  };
  

  // Update content when task changes
  useEffect(() => {
    const currentTaskData = currentPaper?.tasks?.find(t => t.taskNumber === currentTask);
    if (currentTaskData?.prompt && currentTaskData.prompt !== content) {
      setContent(currentTaskData.prompt);
    } else if (!currentTaskData?.prompt && content !== '') {
      setContent('');
    }
  }, [currentPaper, currentTask, content]);

  const fetchPapers = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/writing-papers`);
      setPapers(response.data.papers);
    } catch (error) {
      console.error('Error fetching papers:', error);
    }
  };

  const createNewPaper = () => {
    setCurrentPaper({
      title: '',
      description: '',
      tasks: [
        {
          taskNumber: 1,
          title: 'Task 1',
          instructions: 'You should spend about 20 minutes on this task. Write at least 150 words.',
          prompt: '',
          wordCount: 150,
          estimatedTime: 20,
          images: [],
          order: 0
        },
        {
          taskNumber: 2,
          title: 'Task 2',
          instructions: 'You should spend about 40 minutes on this task. Write at least 250 words.',
          prompt: '',
          wordCount: 250,
          estimatedTime: 40,
          images: [],
          order: 1
        },
        {
          taskNumber: 3,
          title: 'Task 3',
          instructions: 'You should spend about 20 minutes on this task. Write at least 150 words.',
          prompt: '',
          wordCount: 150,
          estimatedTime: 20,
          images: [],
          order: 2
        },
        {
          taskNumber: 4,
          title: 'Task 4',
          instructions: 'You should spend about 40 minutes on this task. Write at least 250 words.',
          prompt: '',
          wordCount: 250,
          estimatedTime: 40,
          images: [],
          order: 3
        }
      ],
      status: 'draft',
      estimatedTime: 60
    });
    setCurrentTask(1);
    setIsEditing(true);
    setActiveTab('builder');
  };

  const editPaper = (paper) => {
    // Ensure paper has tasks structure (for backward compatibility)
    const paperWithTasks = { ...paper };
    if (!paperWithTasks.tasks || paperWithTasks.tasks.length === 0) {
      paperWithTasks.tasks = [
        {
          taskNumber: 1,
          title: 'Task 1',
          instructions: 'You should spend about 20 minutes on this task. Write at least 150 words.',
          prompt: '',
          wordCount: 150,
          estimatedTime: 20,
          images: [],
          order: 0
        },
        {
          taskNumber: 2,
          title: 'Task 2',
          instructions: 'You should spend about 40 minutes on this task. Write at least 250 words.',
          prompt: '',
          wordCount: 250,
          estimatedTime: 40,
          images: [],
          order: 1
        },
        {
          taskNumber: 3,
          title: 'Task 3',
          instructions: 'You should spend about 20 minutes on this task. Write at least 150 words.',
          prompt: '',
          wordCount: 150,
          estimatedTime: 20,
          images: [],
          order: 2
        },
        {
          taskNumber: 4,
          title: 'Task 4',
          instructions: 'You should spend about 40 minutes on this task. Write at least 250 words.',
          prompt: '',
          wordCount: 250,
          estimatedTime: 40,
          images: [],
          order: 3
        }
      ];
    }
    setCurrentPaper(paperWithTasks);
    setCurrentTask(1);
    setIsEditing(true);
    setActiveTab('builder');
  };

  const savePaper = async () => {
    if (!currentPaper.title.trim()) {
      alert('Please enter a title for the paper');
      return;
    }

    setLoading(true);
    try {
      const admin = JSON.parse(localStorage.getItem('admin'));

      const paperData = {
        ...currentPaper,
        createdBy: admin.admin
      };

      if (currentPaper._id) {
        await axios.put(`${import.meta.env.VITE_API_BASE_URL}/admin/writing-papers/${currentPaper._id}`, paperData);
      } else {
        const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/admin/writing-papers`, paperData);
        setCurrentPaper(response.data.paper);
      }

      await fetchPapers();
      alert('Paper saved successfully!');
    } catch (error) {
      console.error('Error saving paper:', error);
      alert('Error saving paper');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (editorRef.current && !quillInstance.current) {
      quillInstance.current = new Quill(editorRef.current, {
        theme: "snow",
        placeholder: "Write task prompt here...",
        modules: {
          toolbar: {
            container: [
              [{ header: [1, 2, 3, false] }],
              ["bold", "italic", "underline"],
              [{ list: "ordered" }, { list: "bullet" }],
              ["link", "image"]
            ],
            handlers: {
              image: ImageHandler // Image handler bind
            }
          }
        }
      });

      // Load initial content if exists
      if (currentPaper?.tasks?.length > 0) {
        const currentTaskData = currentPaper.tasks.find(t => t.taskNumber === currentTask);
        if (currentTaskData?.prompt) {
          quillInstance.current.clipboard.dangerouslyPasteHTML(currentTaskData.prompt);
        }
      }
    }
  }, [currentPaper, currentTask]);

  
  const isSettingContent = useRef(false);

  useEffect(() => {
    if (!quillInstance.current) return;
  
    const currentTaskData = currentPaper?.tasks?.find(t => t.taskNumber === currentTask);
    if (currentTaskData?.prompt) {
      isSettingContent.current = true; // prevent triggering onChange
      quillInstance.current.clipboard.dangerouslyPasteHTML(currentTaskData.prompt);
      isSettingContent.current = false;
    } else {
      isSettingContent.current = true;
      quillInstance.current.setText('');
      isSettingContent.current = false;
    }
  }, [currentTask, currentPaper]);
  
  // Quill text-change
  useEffect(() => {
    if (!quillInstance.current) return;

    const quill = quillInstance.current;
    const handler = () => {
      if (isSettingContent.current) return; // skip update during setText/pasteHTML
      const html = quill.root.innerHTML;
      if (html !== content) {
        setContent(html);
        updateTask(currentTask, { prompt: html });
      }
    };

    quill.on("text-change", handler);
    return () => quill.off("text-change", handler);
  }, [currentTask, content]);
  
  

  const deletePaper = async (id) => {
    if (!confirm('Are you sure you want to delete this paper?')) return;

    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/admin/writing-papers/${id}`);
      await fetchPapers();
      if (currentPaper && currentPaper._id === id) {
        setCurrentPaper(null);
        setIsEditing(false);
        setActiveTab('list');
      }
    } catch (error) {
      console.error('Error deleting paper:', error);
      alert('Error deleting paper');
    }
  };

  const updateTask = (taskNumber, updates) => {
    if (!currentPaper || !currentPaper.tasks) return;

    const updatedTasks = currentPaper.tasks.map(task =>
      task.taskNumber === taskNumber ? { ...task, ...updates } : task
    );
    setCurrentPaper({
      ...currentPaper,
      tasks: updatedTasks
    });
  };

  const showPreview = () => {
    setActiveTab('preview');
  };

  const onContentChange = (event, editor) => {
    const data = editor.getData();
    setContent(data);
    updateTask(currentTask, { prompt: data });
  };

  const publishPaper = async () => {
    const totalTasks = currentPaper.tasks?.length || 0;
    if (totalTasks === 0) {
      alert('Please add at least one task before publishing');
      return;
    }

    try {
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/admin/writing-papers/${currentPaper._id}`, {
        ...currentPaper,
        status: 'published'
      });
      setCurrentPaper({ ...currentPaper, status: 'published' });
      await fetchPapers();
      alert('Paper published successfully!');
    } catch (error) {
      console.error('Error publishing paper:', error);
      alert('Error publishing paper');
    }
  };

  if (activeTab === 'list') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">Writing Papers</h2>
          <button
            onClick={createNewPaper}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus size={20} />
            Create New Paper
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {papers.map((paper) => (
            <div key={paper._id} className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-slate-800">{paper.title}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  paper.status === 'published'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {paper.status}
                </span>
              </div>

              <p className="text-slate-600 text-sm mb-4 line-clamp-2">
                {paper.description || 'No description'}
              </p>

              <div className="flex justify-between items-center text-sm text-slate-500 mb-4">
                <span>
                  {paper.tasks?.length || 0} tasks
                </span>
                <span>
                  {paper.estimatedTime || 60} minutes
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => editPaper(paper)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center justify-center gap-1 text-sm"
                >
                  <Edit size={16} />
                  Edit
                </button>
                <button
                  onClick={() => deletePaper(paper._id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg flex items-center justify-center"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {papers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500 text-lg">No writing papers created yet.</p>
            <button
              onClick={createNewPaper}
              className="mt-4 bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg"
            >
              Create Your First Paper
            </button>
          </div>
        )}
      </div>
    );
  }

  // Preview Component - Professional Exam Interface
  if (activeTab === 'preview') {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{currentPaper.title}</h1>
              <p className="text-slate-600 text-sm mt-1">{currentPaper.description}</p>
              <p className="text-slate-500 text-sm mt-1">Estimated time: {currentPaper.estimatedTime} minutes</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-slate-600">IELTS Writing Test</div>
                <div className="text-lg font-semibold text-slate-800">
                  {currentPaper.tasks?.length || 0} Tasks
                </div>
              </div>
              <button
                onClick={() => setActiveTab('builder')}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Exit Preview
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Tasks Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 sticky top-6">
                <h3 className="font-semibold text-slate-800 mb-4">Writing Tasks</h3>

                <div className="space-y-2">
                  {currentPaper.tasks?.map((task) => (
                    <button
                      key={task.taskNumber}
                      onClick={() => setCurrentTask(task.taskNumber)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        currentTask === task.taskNumber
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {task.title}
                      <span className="float-right">{task.wordCount} words</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-2">
              {(() => {
                const currentTaskData = currentPaper.tasks?.find(t => t.taskNumber === currentTask);
                if (!currentTaskData) return null;

                return (
                  <div className="space-y-6">
                    {/* Task Header */}
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-slate-800">{currentTaskData.title}</h2>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          {currentTaskData.wordCount} Words
                        </span>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center mt-0.5">
                            <span className="text-white text-xs font-bold">i</span>
                          </div>
                          <p className="text-blue-800 font-medium text-sm leading-relaxed">
                            {currentTaskData.instructions}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Task Prompt */}
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                      <h3 className="text-lg font-bold text-slate-800 mb-4">Task Prompt</h3>

                      <div className="prose max-w-none">
                        <div
                          className="text-slate-700 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: currentTaskData.prompt }}
                        />

                        {currentTaskData.images?.map((image, imgIdx) => (
                          <div key={imgIdx} className="my-4">
                            <img
                              src={`${import.meta.env.VITE_API_BASE_URL}/${image.path}`}
                              alt={image.originalName}
                              className="max-w-full h-auto rounded-lg shadow-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Answer Area */}
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                      <h3 className="text-lg font-bold text-slate-800 mb-4">Your Answer</h3>
                      <div className="bg-slate-50 border border-slate-300 rounded-lg p-4">
                        <textarea
                          placeholder="Write your answer here..."
                          className="w-full min-h-[300px] bg-transparent border-none outline-none resize-none text-slate-700 placeholder-slate-400"
                        />
                      </div>
                      <div className="flex justify-between items-center mt-4 text-sm text-slate-500">
                        <span>Word count: 0 / {currentTaskData.wordCount}</span>
                        <span>Time remaining: {currentTaskData.estimatedTime}:00</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Submit Section */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mt-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">Ready to Submit?</h3>
                  <p className="text-slate-600 text-sm mb-6">
                    Make sure you have completed all writing tasks before submitting.
                  </p>
                  <button className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">
                    Submit Writing Test
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Don't render if currentPaper is not set
  if (!currentPaper) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">
          {currentPaper?._id ? 'Edit Paper' : 'Create New Paper'}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('list')}
            className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg"
          >
            Back to List
          </button>
          {currentPaper?._id && (
            <button
              onClick={showPreview}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Eye size={20} />
              Preview
            </button>
          )}
          <button
            onClick={savePaper}
            disabled={loading}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={20} />
            {loading ? 'Saving...' : 'Save Draft'}
          </button>
          {currentPaper?._id && currentPaper?.status === 'draft' && (
            <button
              onClick={publishPaper}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
            >
              Publish
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Paper Details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Paper Details</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={currentPaper?.title || ''}
                  onChange={(e) => setCurrentPaper({...currentPaper, title: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter paper title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={currentPaper?.description || ''}
                  onChange={(e) => setCurrentPaper({...currentPaper, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter paper description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Estimated Time (minutes)
                </label>
                <input
                  type="number"
                  value={currentPaper?.estimatedTime || 60}
                  onChange={(e) => setCurrentPaper({...currentPaper, estimatedTime: parseInt(e.target.value) || 60})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  min="1"
                  max="180"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Content Editor */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-lg p-6">
            {/* Task Navigation */}
            <div className="mb-6">
              <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
                {[1, 2, 3, 4].map((taskNum) => {
                  const task = currentPaper?.tasks?.find(t => t.taskNumber === taskNum);
                  return (
                    <button
                      key={taskNum}
                      onClick={() => setCurrentTask(taskNum)}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        currentTask === taskNum
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Task {taskNum}
                      <span className="ml-1 text-xs">
                        ({task?.wordCount || 0}w)
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Current Task Info */}
            {(() => {
              if (!currentPaper?.tasks) return null;

              const currentTaskData = currentPaper.tasks.find(t => t.taskNumber === currentTask);
              if (!currentTaskData) return null;

              return (
                <div className="mb-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <input
                        type="text"
                        value={currentTaskData.title || ''}
                        onChange={(e) => updateTask(currentTask, { title: e.target.value })}
                        className="text-xl font-semibold text-slate-800 bg-transparent border-none outline-none focus:bg-slate-50 px-2 py-1 rounded"
                        placeholder="Task title"
                      />
                    </div>
                  </div>


                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                    <textarea
                      value={currentTaskData.instructions || ''}
                      onChange={(e) => updateTask(currentTask, { instructions: e.target.value })}
                      className="w-full bg-transparent border-none outline-none resize-none text-slate-700 font-medium"
                      rows={3}
                      placeholder="Task instructions"
                    />
                  </div>
                </div>
              );
            })()}

            {/* Task Prompt Editor */}
            {(() => {
              const currentTaskData = currentPaper.tasks?.find(t => t.taskNumber === currentTask);
              if (!currentTaskData) return null;
              return (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-slate-800">Task Prompt</h3>
                  </div>

                  <div className="border border-slate-300 rounded-lg">
                  <div
  ref={editorRef}
  style={{ height: "400px", background: "white" }}
/>



                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WritingPapersBuilder;
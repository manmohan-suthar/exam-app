import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Plus, Save, Eye, Upload, Trash2, Edit, Play, Pause } from 'lucide-react';
import BlankInSpaceQuestionRenderer from '../Components/BlankInSpaceQuestionRenderer';

const ListeningPapersBuilder = () => {
  const [papers, setPapers] = useState([]);
  const [currentPaper, setCurrentPaper] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const audioInputRef = useRef(null);
  // NEW: per-section upload state
const [uploading, setUploading] = useState({});   // { [sectionIndex]: true/false }
const [progress, setProgress] = useState({});  

  const [activeTab, setActiveTab] = useState('list'); // 'list', 'builder', or 'preview'
  const [currentSection, setCurrentSection] = useState(0);

  useEffect(() => {
    fetchPapers();
  }, []);

  const fetchPapers = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/listening-papers`);
      setPapers(response.data.papers);
    } catch (error) {
      console.error('Error fetching papers:', error);
    }
  };


  const createNewPaper = () => {
    setCurrentPaper({
      title: '',
      description: '',
      sections: [
        {
          sectionNumber: 1,
          introduction: '',
          audioFile: '',
          audioUrl: '',
          startTime: '00:00',
          questions: []
        }
      ],
      status: 'draft'
    });
    setCurrentSection(0);
    setIsEditing(true);
    setActiveTab('builder');
  };

  const editPaper = (paper) => {
    // Ensure paper has sections structure (for backward compatibility)
    const paperWithSections = { ...paper };
    if (!paperWithSections.sections || paperWithSections.sections.length === 0) {
      paperWithSections.sections = [
        {
          sectionNumber: 1,
          introduction: '',
          audioFile: paperWithSections.audioFile || '',
          audioUrl: '',
          startTime: '00:00',
          questions: paperWithSections.questions || []
        }
      ];
      delete paperWithSections.questions; // Remove old structure
      delete paperWithSections.audioFile; // Remove old structure
    } else {
      // Ensure all sections have introduction field for backward compatibility
      paperWithSections.sections = paperWithSections.sections.map(section => ({
        ...section,
        introduction: section.introduction || ''
      }));
    }
    setCurrentPaper(paperWithSections);
    setCurrentSection(0);
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

      if (currentPaper?._id) {
        await axios.put(`${import.meta.env.VITE_API_BASE_URL}/admin/listening-papers/${currentPaper._id}`, paperData);
      } else {
        const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/admin/listening-papers`, paperData);
        setCurrentPaper(response.data.paper);
      }

      await fetchPapers();
      alert('Paper saved successfully!');
    } catch (error) {
      console.error('Error saving paper:', error);
      if (error.response && error.response.status === 404) {
        alert('Failed to save paper: Endpoint not found. Please check the server configuration.');
      } else {
        alert('Error saving paper');
      }
    } finally {
      setLoading(false);
    }
  };

  const deletePaper = async (id) => {
    if (!confirm('Are you sure you want to delete this paper?')) return;

    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/admin/listening-papers/${id}`);
      await fetchPapers();
      if (currentPaper && currentPaper?._id === id) {
        setCurrentPaper(null);
        setIsEditing(false);
        setActiveTab('list');
      }
    } catch (error) {
      console.error('Error deleting paper:', error);
      alert('Error deleting paper');
    }
  };

  const addQuestion = () => {
    if (!currentPaper || !currentPaper.sections) return;

    const currentSectionData = currentPaper.sections[currentSection];
    if (!currentSectionData) return;

    // Calculate global question number
    const totalQuestionsBefore = currentPaper.sections
      .slice(0, currentSection)
      .reduce((total, section) => total + section.questions.length, 0);

    const newQuestion = {
      questionNumber: totalQuestionsBefore + currentSectionData.questions.length + 1,
      questionType: 'multiple-choice',
      question: '',
      audioTimestamp: '',
      options: [
        { letter: 'A', text: '' },
        { letter: 'B', text: '' },
        { letter: 'C', text: '' }
       
      ],
      correctAnswer: ''
    };

    const updatedSections = [...currentPaper.sections];
    updatedSections[currentSection] = {
      ...currentSectionData,
      questions: [...currentSectionData.questions, newQuestion]
    };

    // Update question numbers for all subsequent questions
    for (let i = currentSection + 1; i < updatedSections.length; i++) {
      updatedSections[i].questions = updatedSections[i].questions.map((q, idx) => ({
        ...q,
        questionNumber: totalQuestionsBefore + currentSectionData.questions.length + 1 + idx + 1
      }));
    }

    setCurrentPaper({
      ...currentPaper,
      sections: updatedSections
    });
  };

  const addBlankInSpaceQuestion = () => {
    if (!currentPaper || !currentPaper.sections) return;

    const currentSectionData = currentPaper.sections[currentSection];
    if (!currentSectionData) return;

    // Calculate global question number
    const totalQuestionsBefore = currentPaper.sections
      .slice(0, currentSection)
      .reduce((total, section) => total + section.questions.length, 0);

    const newQuestion = {
      questionNumber: totalQuestionsBefore + currentSectionData.questions.length + 1,
      questionType: 'Blank_in_Space',
      question: '',
      audioTimestamp: ''
    };

    const updatedSections = [...currentPaper.sections];
    updatedSections[currentSection] = {
      ...currentSectionData,
      questions: [...currentSectionData.questions, newQuestion]
    };

    // Update question numbers for all subsequent questions
    for (let i = currentSection + 1; i < updatedSections.length; i++) {
      updatedSections[i].questions = updatedSections[i].questions.map((q, idx) => ({
        ...q,
        questionNumber: totalQuestionsBefore + currentSectionData.questions.length + 1 + idx + 1
      }));
    }

    setCurrentPaper({
      ...currentPaper,
      sections: updatedSections
    });
  };

  const updateQuestion = (index, updates) => {
    if (!currentPaper || !currentPaper.sections) return;

    const updatedSections = [...currentPaper.sections];
    updatedSections[currentSection] = {
      ...updatedSections[currentSection],
      questions: updatedSections[currentSection].questions.map((q, i) =>
        i === index ? { ...q, ...updates } : q
      )
    };
    setCurrentPaper({
      ...currentPaper,
      sections: updatedSections
    });
  };

  const removeQuestion = (index) => {
    if (!currentPaper || !currentPaper.sections) return;

    const updatedSections = [...currentPaper.sections];
    updatedSections[currentSection] = {
      ...updatedSections[currentSection],
      questions: updatedSections[currentSection].questions.filter((_, i) => i !== index)
    };

    // Recalculate question numbers for all questions after the removed one
    let questionNumber = 1;
    for (let s = 0; s < updatedSections.length; s++) {
      for (let q = 0; q < updatedSections[s].questions.length; q++) {
        updatedSections[s].questions[q].questionNumber = questionNumber++;
      }
    }

    setCurrentPaper({
      ...currentPaper,
      sections: updatedSections
    });
  };

  const updateSection = (sectionIndex, updates) => {
    if (!currentPaper || !currentPaper.sections) return;

    const updatedSections = [...currentPaper.sections];
    updatedSections[sectionIndex] = { ...updatedSections[sectionIndex], ...updates };
    setCurrentPaper({
      ...currentPaper,
      sections: updatedSections
    });
  };

  const addSection = () => {
    if (!currentPaper || !currentPaper.sections) return;

    const newSection = {
      sectionNumber: currentPaper.sections.length + 1,
      introduction: '',
      audioFile: '',
      audioUrl: '',
      startTime: '00:00',
      questions: []
    };

    setCurrentPaper({
      ...currentPaper,
      sections: [...currentPaper.sections, newSection]
    });
  };

  const removeSection = (sectionIndex) => {
    if (!currentPaper || !currentPaper.sections || currentPaper.sections.length <= 1) return;

    const updatedSections = currentPaper.sections.filter((_, i) => i !== sectionIndex);

    // Recalculate section numbers and question numbers
    let questionNumber = 1;
    updatedSections.forEach((section, idx) => {
      section.sectionNumber = idx + 1;
      section.questions.forEach(question => {
        question.questionNumber = questionNumber++;
      });
    });

    setCurrentPaper({
      ...currentPaper,
      sections: updatedSections
    });

    if (currentSection >= updatedSections.length) {
      setCurrentSection(updatedSections.length - 1);
    }
  };

  const showPreview = () => {
    setActiveTab('preview');
  };

  const fetchSinglePaper = async () => {
    const res = await axios.get(
      `${import.meta.env.VITE_API_BASE_URL}/admin/listening-papers/${currentPaper._id}`
    );
    setCurrentPaper(res.data.paper);
  };
  
  useEffect(() => {
    if (currentPaper?._id) {
      fetchSinglePaper();
    }
  }, []);
  
  const handleAudioUpload = async (event, sectionIndex) => {
    const file = event.target.files?.[0];
    if (!file) return;
  
    const formData = new FormData();
    formData.append("audio", file);
    formData.append("sectionIndex", sectionIndex + 1);
  
    // start UI state
    setUploading(prev => ({ ...prev, [sectionIndex]: true }));
    setProgress(prev => ({ ...prev, [sectionIndex]: 0 }));
  
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/admin/listening-papers/${currentPaper._id}/upload-audio`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (e) => {
            if (!e.total) {
              // kuch servers total nahi bhejte — is case me sirf loader dikhao
              setProgress(prev => ({ ...prev, [sectionIndex]: null }));
              return;
            }
            const pct = Math.round((e.loaded * 100) / e.total);
            setProgress(prev => ({ ...prev, [sectionIndex]: pct }));
          }
        }
      );
  
      // ✅ Update section audio
      setCurrentPaper(prev => ({
        ...prev,
        sections: prev.sections.map((section, idx) =>
          idx === sectionIndex
            ? {
                ...section,
                audioFile: res.data.audioFile,
                audioUrl: res.data.audioUrl
              }
            : section
        )
      }));
  
      // input clear
      event.target.value = "";
  
      alert("Audio uploaded successfully");
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "Audio upload failed");
    } finally {
      setUploading(prev => ({ ...prev, [sectionIndex]: false }));
      // progress ko chhod bhi sakte ho, ya success par 100 set karke 1-2s baad clear karna ho to:
      setTimeout(() => {
        setProgress(prev => {
          const copy = { ...prev };
          delete copy[sectionIndex];
          return copy;
        });
      }, 1200);
    }
  };
  
  
  
  
  

  const publishPaper = async () => {
    const hasAudio = currentPaper.sections.some(section => section.audioFile || section.audioUrl);
    if (!hasAudio) {
      alert('Please provide audio for at least one section before publishing');
      return;
    }

    const totalQuestions = currentPaper.sections?.reduce((total, section) => total + (section.questions?.length || 0), 0) || 0;
    if (totalQuestions === 0) {
      alert('Please add at least one question before publishing');
      return;
    }

    try {
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/admin/listening-papers/${currentPaper?._id}`, {
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
          <h2 className="text-2xl font-bold text-slate-800">Listening Papers</h2>
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
                  {paper.sections
                    ? paper.sections.reduce((total, section) => total + (section.questions?.length || 0), 0)
                    : 0
                  } questions
                </span>
                <span>{new Date(paper.createdAt).toLocaleDateString()}</span>
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
            <p className="text-slate-500 text-lg">No listening papers created yet.</p>
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
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-slate-600">Listening Test</div>
                <div className="text-lg font-semibold text-slate-800">Section {currentSection + 1}</div>
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
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 sticky top-6">
                <h3 className="font-semibold text-slate-800 mb-4">Test Progress</h3>

                {/* Section Navigation */}
                <div className="space-y-2 mb-6">
                  {currentPaper.sections?.map((section, index) => {
                    const questionCount = section.questions?.length || 0;
                    return (
                      <button
                        key={index}
                        onClick={() => setCurrentSection(index)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          currentSection === index
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Section {section.sectionNumber}
                        <span className="float-right">{questionCount} questions</span>
                      </button>
                    );
                  })}
                </div>

                {/* Audio Player */}
                {currentPaper.sections?.[currentSection] && (currentPaper.sections[currentSection].audioFile || currentPaper.sections[currentSection].audioUrl) && (
                  <div className="border-t border-slate-200 pt-4">
                    <h4 className="font-medium text-slate-800 mb-3">Audio Player</h4>
                    <div className="space-y-3">
                      <audio controls className="w-full">
                        <source src={currentPaper.sections[currentSection].audioFile ? `${import.meta.env.VITE_API_BASE_URL}/${currentPaper.sections[currentSection].audioFile}` : currentPaper.sections[currentSection].audioUrl} type="audio/mpeg" />
                      </audio>
                      <div className="text-xs text-slate-600 text-center">
                        Start at {currentPaper.sections[currentSection].startTime}
                      </div>
                    </div>
                  </div>
                )}

                {/* Instructions */}
                <div className="border-t border-slate-200 pt-4 mt-4">
                  <h4 className="font-medium text-slate-800 mb-2">Instructions</h4>
                  <ul className="text-xs text-slate-600 space-y-1">
                    <li>• Listen to the audio carefully</li>
                    <li>• Answer while listening</li>
                    <li>• Check your answers</li>
                    <li>• Submit when complete</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {(() => {
                const currentSectionData = currentPaper.sections?.[currentSection];
                if (!currentSectionData) return null;

                return (
                  <div className="space-y-6">
                    {/* Section Header */}
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-slate-800">Section {currentSectionData.sectionNumber}</h2>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          {currentSectionData.questions?.length || 0} Questions
                        </span>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center mt-0.5">
                            <span className="text-white text-xs font-bold">i</span>
                          </div>
                          <p className="text-blue-800 font-medium text-sm leading-relaxed">
                            Answer the questions while listening to the audio.
                          </p>
                        </div>
                      </div>

                      {currentSectionData.introduction && (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                          <h5 className="text-sm font-medium text-slate-700 mb-2">Introduction</h5>
                          <p className="text-slate-700 text-sm leading-relaxed">{currentSectionData.introduction}</p>
                        </div>
                      )}
                    </div>

                    {/* Questions */}
                    <div className="space-y-6">
                      {currentSectionData.questions?.map((question, qIndex) => (
                        <div key={qIndex} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                          {/* Question Header */}
                          <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
                            <div className="flex items-center gap-3">
                              <span className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full text-sm font-bold">
                                {question.questionNumber}
                              </span>
                              <span className="text-slate-800 font-medium">Question {question.questionNumber}</span>
                              {question.audioTimestamp && (
                                <span className="text-slate-600 text-sm">({question.audioTimestamp})</span>
                              )}
                            </div>
                          </div>

                          {/* Question Content */}
                          <div className="p-6">
                            {renderExamQuestion(question)}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Submit Section */}
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                      <div className="text-center">
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">Ready to Submit?</h3>
                        <p className="text-slate-600 text-sm mb-6">
                          Make sure you have answered all questions before submitting.
                        </p>
                        <button className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">
                          Submit Section {currentSectionData.sectionNumber}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
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
            </div>
          </div>

          {/* Section Management */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Sections</h3>

            <div className="space-y-3">
              {currentPaper.sections?.map((section, index) => (
                <div key={index} className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  currentSection === index ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-slate-300'
                }`} onClick={() => setCurrentSection(index)}>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-slate-800">Section {section.sectionNumber}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600">{section.questions.length} questions</span>
                      {currentPaper.sections.length > 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); removeSection(index); }}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Remove section"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  {section.audioFile && <div className="text-xs text-green-600 mt-1">Audio uploaded</div>}
                  {section.audioUrl && <div className="text-xs text-blue-600 mt-1">Audio URL set</div>}
                </div>
              ))}

              <button
                onClick={addSection}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Add Section
              </button>
            </div>
          </div>

          {/* Add Questions */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Add Questions</h3>

            <div className="space-y-3">
              <button
                onClick={addQuestion}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Add Multiple Choice Question
              </button>
              <button
                onClick={addBlankInSpaceQuestion}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Add Blank in Space Question
              </button>
            </div>
          </div>
        </div>

        {/* Section Details and Questions */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-lg p-6">
            {/* Current Section Info */}
            {(() => {
              if (!currentPaper?.sections) return null;

              const currentSectionData = currentPaper.sections[currentSection];
              if (!currentSectionData) return null;

              return (
                <div className="mb-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-slate-800">Section {currentSectionData.sectionNumber}</h3>
                    </div>
                  </div>

                  {/* Audio Configuration */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
                    <h4 className="text-sm font-medium text-slate-700 mb-3">Audio Configuration</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-slate-600 mb-1">Introduction</label>
                        <textarea
                          value={currentSectionData.introduction || ''}
                          onChange={(e) => updateSection(currentSection, { introduction: e.target.value })}
                          rows={3}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                          placeholder="Enter section introduction text"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-600 mb-1">Audio File</label>
                        {!currentPaper._id ? (
                          <div className="text-xs text-slate-500 mb-2">Save the paper first to upload audio</div>
                        ) : null}
<input
  type="file"
  ref={audioInputRef}
  accept="audio/*"
  onChange={(e) => handleAudioUpload(e, currentSection)}
  disabled={!currentPaper._id || uploading[currentSection]}
  className={`block w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
    !currentPaper._id ? 'opacity-50 cursor-not-allowed' : ''
  }`}
/>

{/* NEW: progress / loader */}
{uploading[currentSection] && (
  <div className="mt-3">
    {typeof progress[currentSection] === 'number' ? (
      <>
        <div className="h-2 w-full bg-slate-200 rounded">
          <div
            className="h-2 bg-teal-600 rounded transition-all"
            style={{ width: `${progress[currentSection]}%` }}
          />
        </div>
        <div className="text-xs text-slate-600 mt-1">
          Uploading… {progress[currentSection]}%
        </div>
      </>
    ) : (
      <div className="text-xs text-slate-600">Uploading…</div>
    )}
  </div>
)}

                        {currentSectionData.audioFile && (
                          <div className="text-xs text-green-600 mt-1">Audio file uploaded</div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm text-slate-600 mb-1">Or Audio URL</label>
                        <input
                          type="url"
                          value={currentSectionData.audioUrl || ''}
                          onChange={(e) => updateSection(currentSection, { audioUrl: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                          placeholder="https://example.com/audio.mp3"
                        />
                      </div>
                      {/* <div>
                        <label className="block text-sm text-slate-600 mb-1">Start Time</label>
                        <input
                          type="text"
                          value={currentSectionData.startTime || ''}
                          onChange={(e) => updateSection(currentSection, { startTime: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                          placeholder="00:00"
                        />
                      </div> */}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Questions for Current Section */}
            <div>
              <h4 className="text-lg font-semibold text-slate-800 mb-4">
                Questions ({currentPaper?.sections?.[currentSection]?.questions?.length || 0})
              </h4>

              {(!currentPaper?.sections?.[currentSection]?.questions?.length) ? (
                <div className="text-center py-12">
                  <p className="text-slate-500">No questions added to this section yet.</p>
                  <p className="text-slate-400 text-sm mt-2">Use the button above to add questions.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {currentPaper?.sections?.[currentSection]?.questions?.map((question, index) => (
                    <QuestionCard
                      key={index}
                      question={question}
                      index={index}
                      onUpdate={(updates) => updateQuestion(index, updates)}
                      onRemove={() => removeQuestion(index)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Professional Exam Question Renderer
const renderExamQuestion = (question) => {
  if (question.questionType === 'Blank_in_Space') {
    const parts = question.question.split('{blank}');
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
                  className="inline-block mx-1 px-2 py-1 border-b-2 border-slate-400 bg-transparent focus:outline-none focus:border-blue-500 min-w-20"
                  placeholder=""
                />
              )}
            </span>
          ))}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {question.question && (
        <p className="text-slate-800 font-medium text-lg leading-relaxed">{question.question}</p>
      )}
      <div className="space-y-3">
        {question.options?.map((option) => (
          <label key={option.letter} className="flex items-center gap-4 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
            <input
              type="radio"
              name={`question-${question.questionNumber}`}
              value={option.letter}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500"
            />
            <span className="font-medium text-slate-700 min-w-fit">{option.letter}.</span>
            <span className="text-slate-700 flex-1">{option.text}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

// Question Card Component
const QuestionCard = ({ question, index, onUpdate, onRemove }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            question.questionType === 'multiple-choice'
              ? 'bg-blue-100 text-blue-800'
              : question.questionType === 'Blank_in_Space'
              ? 'bg-purple-100 text-purple-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {question.questionType === 'multiple-choice' ? 'Multiple Choice' : question.questionType === 'Blank_in_Space' ? 'Blank in Space' : question.questionType}
          </span>
          <span className="text-slate-600 text-sm font-medium">Question {question.questionNumber}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-500 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition-colors"
            title="Edit question"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={onRemove}
            className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
            title="Delete question"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-200 bg-slate-50 -mx-4 px-4 pb-4 rounded-b-lg">
          <div className="space-y-3">
            {question.questionType === 'Blank_in_Space' ? (
              <BlankInSpaceQuestionRenderer
                question={question}
                onUpdate={onUpdate}
                isEditable={true}
                showPreview={true}
              />
            ) : (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Question Text
                </label>
                <textarea
                  value={question.question}
                  onChange={(e) => onUpdate({ question: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter the question"
                />
              </div>
            )}

            {/* <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Audio Timestamp (Optional)
              </label>
              <input
                type="text"
                value={question.audioTimestamp || ''}
                onChange={(e) => onUpdate({ audioTimestamp: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="e.g., 00:50 to 01:20"
              />
            </div> */}

            {question.questionType === 'multiple-choice' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Answer Options
                  </label>
                  <div className="space-y-2">
                    {question.options?.map((option, optIndex) => (
                      <div key={optIndex} className="flex items-center gap-2">
                        <span className="w-8 text-center font-medium text-slate-600">
                          {option.letter}
                        </span>
                        <input
                          type="text"
                          value={option.text}
                          onChange={(e) => {
                            const newOptions = [...question.options];
                            newOptions[optIndex] = { ...option, text: e.target.value };
                            onUpdate({ options: newOptions });
                          }}
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                          placeholder={`Option ${option.letter}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Correct Answer
                  </label>
                  <select
                    value={question.correctAnswer || ''}
                    onChange={(e) => onUpdate({ correctAnswer: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Select correct answer</option>
                    {question.options?.map((option) => (
                      <option key={option.letter} value={option.letter}>
                        {option.letter} - {option.text}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

export default ListeningPapersBuilder;
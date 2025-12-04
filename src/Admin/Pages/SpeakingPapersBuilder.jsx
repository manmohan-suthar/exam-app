import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Editor } from '@tinymce/tinymce-react';
import { Plus, Save, Eye, Trash2, Edit, FileText } from 'lucide-react';

const SpeakingPapersBuilder = () => {
  const [papers, setPapers] = useState([]);
  const [currentPaper, setCurrentPaper] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'builder', or 'preview'
  const [currentUnit, setCurrentUnit] = useState(1); // Current unit number (1-4)
  const [currentPassage, setCurrentPassage] = useState(0); // Current passage index within unit
  const [content, setContent] = useState('');

  useEffect(() => {
    fetchPapers();
  }, []);

  // Update content when unit or passage changes
  useEffect(() => {
    const currentUnitData = currentPaper?.units?.find(u => u.unitNumber === currentUnit);
    if (currentUnitData?.passages?.[currentPassage]?.content) {
      setContent(currentUnitData.passages[currentPassage].content);
    } else {
      setContent('');
    }
  }, [currentPaper, currentUnit, currentPassage]);

  const fetchPapers = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/speaking-papers`);
      setPapers(response.data.papers);
    } catch (error) {
      console.error('Error fetching papers:', error);
    }
  };

  const createNewPaper = () => {
    setCurrentPaper({
      title: '',
      description: '',
      units: [
        {
          unitNumber: 1,
          title: 'Section 1',
          instructions: 'Read the text below and answer the questions.',
          passages: []
        },
        {
          unitNumber: 2,
          title: 'Section 2',
          instructions: 'Read the text below and answer the questions.',
          passages: []
        },
        {
          unitNumber: 3,
          title: 'Section 3',
          instructions: 'Read the text below and answer the questions.',
          passages: []
        },
        {
          unitNumber: 4,
          title: 'Section 4',
          instructions: 'Read the text below and answer the questions.',
          passages: []
        }
      ],
      status: 'draft',
      estimatedTime: 60
    });
    setCurrentUnit(1);
    setCurrentPassage(0);
    setIsEditing(true);
    setActiveTab('builder');
  };

  const editPaper = (paper) => {
    // Always create units structure and distribute passages based on unitNumber
    const paperWithUnits = { ...paper };
    const units = [
      {
        unitNumber: 1,
        title: 'Section 1',
        instructions: 'Read the text below and answer the questions.',
        passages: []
      },
      {
        unitNumber: 2,
        title: 'Section 2',
        instructions: 'Read the text below and answer the questions.',
        passages: []
      },
      {
        unitNumber: 3,
        title: 'Section 3',
        instructions: 'Read the text below and answer the questions.',
        passages: []
      },
      {
        unitNumber: 4,
        title: 'Section 4',
        instructions: 'Read the text below and answer the questions.',
        passages: []
      }
    ];

    // Distribute passages across units based on unitNumber property
    if (paperWithUnits.passages && paperWithUnits.passages.length > 0) {
      paperWithUnits.passages.forEach(passage => {
        const unitIndex = (passage.unitNumber || 1) - 1;
        if (unitIndex >= 0 && unitIndex < 4) {
          units[unitIndex].passages.push(passage);
        } else {
          // If unitNumber is invalid, put in section 1
          units[0].passages.push(passage);
        }
      });
    }

    paperWithUnits.units = units;
    delete paperWithUnits.passages; // Remove old structure
    delete paperWithUnits.questions; // Remove old structure

    setCurrentPaper(paperWithUnits);
    setCurrentUnit(1);
    setCurrentPassage(0);
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

      // Flatten units structure to passages, preserving section context
      const flattenedPassages = [];

      currentPaper.units?.forEach(unit => {
        unit.passages?.forEach((passage, localIndex) => {
          flattenedPassages.push({
            ...passage,
            unitNumber: unit.unitNumber, // Store section ID with each passage
            sectionTitle: unit.title,
            globalIndex: flattenedPassages.length,
            localIndex: localIndex
          });
        });
      });

      const paperData = {
        ...currentPaper,
        passages: flattenedPassages,
        createdBy: admin.admin
      };

      // Remove units from paperData as backend doesn't expect it
      delete paperData.units;
      delete paperData.questions;

      if (currentPaper._id) {
        await axios.put(`${import.meta.env.VITE_API_BASE_URL}/admin/speaking-papers/${currentPaper._id}`, paperData);
      } else {
        const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/admin/speaking-papers`, paperData);
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

  const deletePaper = async (id) => {
    if (!confirm('Are you sure you want to delete this paper?')) return;

    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/admin/speaking-papers/${id}`);
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

  // Add a new passage to the currently selected section
  const addPassageToCurrentSection = () => {
    if (!currentPaper || !currentPaper.units) return;

    const currentUnitData = currentPaper.units.find(u => u.unitNumber === currentUnit);
    if (!currentUnitData) return;

    const newPassage = {
      title: `speaking Passage ${currentUnitData.passages.length + 1}`,
      content: '<p>Enter your speaking passage text here...</p>', // Default content
      images: [],
      order: currentUnitData.passages.length,
      unitNumber: currentUnit, // Explicitly set the section ID
      sectionTitle: currentUnitData.title
    };

    const updatedUnits = currentPaper.units.map(unit =>
      unit.unitNumber === currentUnit
        ? { ...unit, passages: [...unit.passages, newPassage] }
        : unit
    );

    setCurrentPaper({
      ...currentPaper,
      units: updatedUnits
    });

    // Automatically select the newly added passage
    setCurrentPassage(currentUnitData.passages.length);
    setContent(newPassage.content);
  };

  const updatePassage = (index, updates) => {
    if (!currentPaper || !currentPaper.units) return;

    const updatedUnits = currentPaper.units.map(unit =>
      unit.unitNumber === currentUnit
        ? {
            ...unit,
            passages: unit.passages.map((passage, i) =>
              i === index ? { ...passage, ...updates, unitNumber: currentUnit } : passage
            )
          }
        : unit
    );
    setCurrentPaper({
      ...currentPaper,
      units: updatedUnits
    });
  };

  const removePassage = (index) => {
    if (!currentPaper || !currentPaper.units) return;

    const currentUnitData = currentPaper.units.find(u => u.unitNumber === currentUnit);
    if (!currentUnitData) return;

    if (currentUnitData.passages.length <= 1) {
      alert('You must have at least one passage in this section');
      return;
    }

    const updatedUnits = currentPaper.units.map(unit =>
      unit.unitNumber === currentUnit
        ? { ...unit, passages: unit.passages.filter((_, i) => i !== index) }
        : unit
    );

    setCurrentPaper({
      ...currentPaper,
      units: updatedUnits
    });

    if (currentPassage >= currentUnitData.passages.length - 1) {
      setCurrentPassage(Math.max(0, currentUnitData.passages.length - 2));
    }
  };

  const updateUnit = (unitNumber, updates) => {
    if (!currentPaper || !currentPaper.units) return;

    const updatedUnits = currentPaper.units.map(unit =>
      unit.unitNumber === unitNumber ? { ...unit, ...updates } : unit
    );
    setCurrentPaper({
      ...currentPaper,
      units: updatedUnits
    });
  };

  const showPreview = () => {
    setActiveTab('preview');
  };

  const onContentChange = (event, editor) => {
    const data = editor.getData();
    setContent(data);
    updatePassage(currentPassage, { content: data });
  };

  const publishPaper = async () => {
    const totalPassages = currentPaper.units?.reduce((total, unit) => total + (unit.passages?.length || 0), 0) || 0;
    if (totalPassages === 0) {
      alert('Please add at least one passage before publishing');
      return;
    }

    try {
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/admin/speaking-papers/${currentPaper._id}`, {
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
          <h2 className="text-2xl font-bold text-slate-800">speaking Papers</h2>
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
                  {paper.units
                    ? paper.units.reduce((total, unit) => total + (unit.passages?.length || 0), 0)
                    : (paper.passages?.length || 0)
                  } passages
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
            <p className="text-slate-500 text-lg">No speaking papers created yet.</p>
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

  // Preview Component - Professional speaking Interface
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
                <div className="text-sm text-slate-600">IELTS speaking Test</div>
                <div className="text-lg font-semibold text-slate-800">
                  {currentPaper.passages?.length || 0} Passages
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
            {/* Sections Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 sticky top-6">
                <h3 className="font-semibold text-slate-800 mb-4">speaking Sections</h3>

                <div className="space-y-2">
                  {currentPaper.units?.map((unit) => (
                    <button
                      key={unit.unitNumber}
                      onClick={() => setCurrentUnit(unit.unitNumber)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        currentUnit === unit.unitNumber
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {unit.title}
                      <span className="float-right">{unit.passages?.length || 0} passages</span>
                    </button>
                  ))}
                </div>

                <div className="border-t border-slate-200 pt-4 mt-4">
                  <h4 className="font-medium text-slate-800 mb-2">Current Section Passages</h4>
                  <div className="space-y-1">
                    {(() => {
                      const currentUnitData = currentPaper.units?.find(u => u.unitNumber === currentUnit);
                      return currentUnitData?.passages?.map((passage, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentPassage(idx)}
                          className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${
                            currentPassage === idx
                              ? 'bg-blue-100 text-blue-800'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {passage.title}
                        </button>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-2">
              {(() => {
                const currentUnitData = currentPaper.units?.find(u => u.unitNumber === currentUnit);
                if (!currentUnitData) return null;

                return (
                  <div className="space-y-6">
                    {/* Section Header */}
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-slate-800">{currentUnitData.title}</h2>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          {currentUnitData.passages?.length || 0} Passages
                        </span>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center mt-0.5">
                            <span className="text-white text-xs font-bold">i</span>
                          </div>
                          <p className="text-blue-800 font-medium text-sm leading-relaxed">
                            {currentUnitData.instructions}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Current Passage */}
                    {currentUnitData.passages?.[currentPassage] && (
                      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">
                          {currentUnitData.passages[currentPassage].title}
                        </h3>

                        <div className="prose max-w-none">
                          <div
                            className="text-slate-700 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: currentUnitData.passages[currentPassage].content }}
                          />

                          {currentUnitData.passages[currentPassage].images?.map((image, imgIdx) => (
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
                    )}
                  </div>
                );
              })()}

              {/* Submit Section */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mt-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">speaking Complete</h3>
                  <p className="text-slate-600 text-sm mb-6">
                    You have read all the passages in this section.
                  </p>
                  <button className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">
                    Continue to Next Section
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

          {/* Section Selection and Passage Management */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-800">
                Section {currentUnit} - Passages
              </h3>
              <button
                onClick={addPassageToCurrentSection}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2"
              >
                <Plus size={16} />
                Add Passage to Section {currentUnit}
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-slate-600 mb-2">
                Currently editing: <span className="font-medium text-slate-800">Section {currentUnit}</span>
              </p>
              <p className="text-xs text-slate-500">
                Passages added here will be saved to Section {currentUnit} and will appear in Section {currentUnit} when students take the exam.
              </p>
            </div>

            <div className="space-y-2">
              {(() => {
                const currentUnitData = currentPaper.units?.find(u => u.unitNumber === currentUnit);
                return currentUnitData?.passages?.map((passage, idx) => (
                  <div
                    key={idx}
                    onClick={() => setCurrentPassage(idx)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                      currentPassage === idx
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-slate-500" />
                        <span className="font-medium text-slate-800">{passage.title}</span>
                        <span className="text-xs text-slate-500 bg-slate-200 px-2 py-1 rounded">
                          Section {passage.unitNumber}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {currentUnitData.passages.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removePassage(idx);
                            }}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="Delete passage"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ));
              })()}

              {(() => {
                const currentUnitData = currentPaper.units?.find(u => u.unitNumber === currentUnit);
                return currentUnitData?.passages?.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <FileText size={48} className="mx-auto mb-2 opacity-50" />
                    <p>No passages in Section {currentUnit} yet.</p>
                    <p className="text-sm">Click "Add Passage" to create your first passage.</p>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Content Editor */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-lg p-6">
            {/* Section Navigation */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-slate-700 mb-3">Select Section to Edit:</h4>
              <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
                {[1, 2, 3, 4].map((unitNum) => {
                  const unit = currentPaper?.units?.find(u => u.unitNumber === unitNum);
                  return (
                    <button
                      key={unitNum}
                      onClick={() => {
                        setCurrentUnit(unitNum);
                        setCurrentPassage(0);
                      }}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        currentUnit === unitNum
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Section {unitNum}
                      <span className="ml-1 text-xs">
                        ({unit?.passages?.length || 0} passages)
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Current Section Info */}
            {(() => {
              if (!currentPaper?.units) return null;

              const currentUnitData = currentPaper.units.find(u => u.unitNumber === currentUnit);
              if (!currentUnitData) return null;

              return (
                <div className="mb-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">
                        {currentUnitData.title}
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">
                        All passages added to this section will be saved here and displayed in this section during the exam.
                      </p>
                    </div>
                  </div>

                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                    <textarea
                      value={currentUnitData.instructions || ''}
                      onChange={(e) => updateUnit(currentUnit, { instructions: e.target.value })}
                      className="w-full bg-transparent border-none outline-none resize-none text-slate-700 font-medium"
                      rows={2}
                      placeholder="Section instructions"
                    />
                  </div>
                </div>
              );
            })()}

            {/* Passage Editor */}
            {(() => {
              const currentUnitData = currentPaper.units?.find(u => u.unitNumber === currentUnit);
              if (!currentUnitData?.passages?.[currentPassage]) {
                return (
                  <div className="text-center py-12">
                    <FileText size={64} className="mx-auto mb-4 text-slate-300" />
                    <h4 className="text-lg font-medium text-slate-600 mb-2">No Passage Selected</h4>
                    <p className="text-slate-500 mb-4">
                      Select a passage from the list or add a new passage to Section {currentUnit}.
                    </p>
                    <button
                      onClick={addPassageToCurrentSection}
                      className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg"
                    >
                      Add First Passage to Section {currentUnit}
                    </button>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <input
                      type="text"
                      value={currentUnitData.passages[currentPassage].title}
                      onChange={(e) => updatePassage(currentPassage, { title: e.target.value })}
                      className="text-xl font-semibold text-slate-800 bg-transparent border-none outline-none focus:bg-slate-50 px-2 py-1 rounded flex-1"
                      placeholder="Passage title"
                    />
                    <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                      Section {currentUnitData.passages[currentPassage].unitNumber}
                    </span>
                  </div>

                  <div className="border border-slate-300 rounded-lg">
                    <Editor
                      apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
                      value={content}
                      onEditorChange={(newContent) => {
                        setContent(newContent);
                        updatePassage(currentPassage, { content: newContent });
                      }}
                      init={{
                        height: 500,
                        menubar: true,
                        plugins: [
                          'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                          'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                          'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount',
                          'imagetools', 'paste', 'directionality', 'textcolor', 'colorpicker'
                        ],
                        toolbar: 'undo redo | formatselect | bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image media table | code fullscreen | help',
                        images_upload_handler: function(blobInfo, success, failure) {
                          if (!currentPaper || !currentPaper._id) {
                            failure('Please save the paper first before uploading images.');
                            return;
                          }

                          (async () => {
                            try {
                              const formData = new FormData();
                              formData.append('image', blobInfo.blob());
                              formData.append('unitNumber', currentUnit);
                              formData.append('passageIndex', currentPassage);

                              const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/speaking-papers/${currentPaper._id}/upload-image`, {
                                method: 'POST',
                                body: formData
                              });

                              if (!response.ok) {
                                throw new Error('Upload failed');
                              }

                              const data = await response.json();

                              if (data.image) {
                                success(`${import.meta.env.VITE_API_BASE_URL}/${data.image.path}`);
                              } else {
                                failure('Upload failed');
                              }
                            } catch (error) {
                              console.error('Upload error:', error);
                              failure('Upload failed');
                            }
                          })();
                        },
                        image_advtab: true,
                        image_title: true,
                        automatic_uploads: true,
                        file_picker_types: 'image',
                        paste_data_images: true,
                        content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                        placeholder: 'Write your speaking passage text here...'
                      }}
                    />
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 bg-yellow-600 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-white text-xs font-bold">!</span>
                      </div>
                      <div>
                        <p className="text-yellow-800 font-medium text-sm">
                          Section Association
                        </p>
                        <p className="text-yellow-700 text-sm mt-1">
                          This passage will be saved to <strong>Section {currentUnit}</strong> and will appear in Section {currentUnit} when students take this exam.
                        </p>
                      </div>
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
};

export default SpeakingPapersBuilder;

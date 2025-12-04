
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Users, BookOpen, Save, CheckSquare, Square } from 'lucide-react';

const SetExam = () => {
  const [students, setStudents] = useState([]);
  const [examPapers, setExamPapers] = useState({});
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedExamTypes, setSelectedExamTypes] = useState([]);
  const [selectedPapers, setSelectedPapers] = useState({});
  const [paperTimings, setPaperTimings] = useState({});
  const [agents, setAgents] = useState([]);
  const [formData, setFormData] = useState({
    student: '',
    agent: '',
    exam_date: '',
    exam_time: '',
    duration: '',
    exam_tittle: '',
    exam_bio: '',
    auto_login_time: '',
    is_visible: true
  });

  const examTypes = [
    { id: 'listening', label: 'Listening' },
    // { id: 'speaking', label: 'Speaking' },
    { id: 'writing', label: 'Writing' },
    { id: 'reading', label: 'Reading' }
  ];

  useEffect(() => {
    fetchStudents();
    fetchAgents();
    fetchAssignments();
    fetchExamPapers('reading'); // Pre-load reading papers
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/students`);
      setStudents(res.data.students);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchAssignments = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/exam-assignments`);
      setAssignments(res.data.assignments);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const fetchAgents = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/agents`);
      setAgents(res.data.agents);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const updateAssignmentStatus = async (id, status) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/admin/exam-assignments/${id}/status`, { status });
      setAssignments(assignments.map(assignment =>
        assignment._id === id ? { ...assignment, status } : assignment
      ));
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating assignment status');
    }
  };

  const updateAssignmentVisibility = async (id, is_visible) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/admin/exam-assignments/${id}/visibility`, { is_visible });
      setAssignments(assignments.map(assignment =>
        assignment._id === id ? { ...assignment, is_visible } : assignment
      ));
    } catch (error) {
      console.error('Error updating visibility:', error);
      alert('Error updating assignment visibility');
    }
  };

  const fetchExamPapers = async (examType) => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/exam-papers/${examType}`);
      setExamPapers(prev => ({
        ...prev,
        [examType]: res.data.papers
      }));
    } catch (error) {
      console.error('Error fetching exam papers:', error);
      setExamPapers(prev => ({
        ...prev,
        [examType]: []
      }));
    }
  };

  const handleExamTypeToggle = (examType) => {
    setSelectedExamTypes(prev => {
      const isSelected = prev.includes(examType);
      const newSelected = isSelected
        ? prev.filter(type => type !== examType)
        : [...prev, examType];

      // Fetch papers for newly selected type
      if (!isSelected && !examPapers[examType]) {
        fetchExamPapers(examType);
      }

      // Remove paper selection for deselected type
      if (isSelected) {
        setSelectedPapers(prevPapers => {
          const newPapers = { ...prevPapers };
          delete newPapers[examType];
          return newPapers;
        });
        setPaperTimings(prevTimings => {
          const newTimings = { ...prevTimings };
          delete newTimings[examType];
          return newTimings;
        });
      }

      return newSelected;
    });
  };

  const handlePaperSelect = (examType, paperId) => {
    setSelectedPapers(prev => ({
      ...prev,
      [examType]: paperId
    }));
  };

  const handleTimingChange = (examType, timing) => {
    setPaperTimings(prev => ({
      ...prev,
      [examType]: timing
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate that papers are selected for each type
      for (const examType of selectedExamTypes) {
        if (!selectedPapers[examType]) {
          throw new Error(`Please select a paper for ${examType}`);
        }
        if ((examType === 'writing' || examType === 'reading') && !paperTimings[examType]) {
          throw new Error(`Please set timing for ${examType} paper`);
        }
      }

      // Prepare exam_paper object
      const examPaperObj = {};
      selectedExamTypes.forEach(examType => {
        examPaperObj[`${examType}_exam_paper`] = selectedPapers[examType];
        if ((examType === 'reading' || examType === 'writing') && paperTimings[examType]) {
          examPaperObj[`${examType}_timing`] = parseInt(paperTimings[examType]);
        }
      });

      const assignmentData = {
        student: formData.student,
        agent: formData.agent || null,
        exam_type: selectedExamTypes,
        exam_paper: examPaperObj,
        exam_date: formData.exam_date,
        exam_time: formData.exam_time,
        duration: formData.duration || null,
        exam_tittle: formData.exam_tittle,
        exam_bio: formData.exam_bio,
        auto_login_time: formData.auto_login_time || null,
        is_visible: formData.is_visible
      };

      console.log('Creating assignment with agent:', formData.agent, assignmentData);

      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/admin/exam-assignments`, assignmentData);

      alert('Exam assignment created successfully!');
      setFormData({
        student: '',
        agent: '',
        exam_date: '',
        exam_time: '',
        duration: '',
        exam_tittle: '',
        exam_bio: '',
        auto_login_time: '',
        is_visible: true
      });
      setSelectedExamTypes([]);
      setSelectedPapers({});
      setPaperTimings({});
      setExamPapers({});
      fetchAssignments();
    } catch (error) {
      console.error('Error creating assignment:', error);
      alert(error.response?.data?.error || 'Error creating exam assignment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-slate-800">Set Exam Assignments</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Assignment Form */}
        <div className="bg-slate-50 rounded-lg p-6">
          <h4 className="text-lg font-medium text-slate-800 mb-4">Create New Assignment</h4>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Select Student *</label>
              <select
                name="student"
                value={formData.student}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Choose a student...</option>
                {students.map((student) => (
                  <option key={student._id} value={student._id}>
                    {student.name} ({student.student_id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Assign Agent (Optional)</label>
              <select
                name="agent"
                value={formData.agent}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">No agent assigned</option>
                {agents.filter(agent => agent.status === 'active').map((agent) => (
                  <option key={agent._id} value={agent._id}>
                    {agent.name} ({agent.agent_id})
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                Agent will monitor the student's exam and handle speaking tests
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Select Exam Types *</label>
              <div className="grid grid-cols-2 gap-3">
                {examTypes.map((type) => (
                  <label key={type.id} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedExamTypes.includes(type.id)}
                      onChange={() => handleExamTypeToggle(type.id)}
                      className="w-4 h-4 text-teal-600 bg-slate-100 border-slate-300 rounded focus:ring-teal-500"
                    />
                    <span className="text-sm text-slate-700">{type.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {selectedExamTypes.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Select Papers for Each Exam Type</label>
                <div className="space-y-4">
                  {selectedExamTypes.map((examType) => (
                    <div key={examType} className="border border-slate-200 rounded-lg p-4">
                      <h5 className="text-sm font-medium text-slate-800 mb-2 capitalize">
                        {examTypes.find(t => t.id === examType)?.label} Papers
                      </h5>
                      <select
                        value={selectedPapers[examType] || ''}
                        onChange={(e) => handlePaperSelect(examType, e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">Choose a paper...</option>
                        {(examPapers[examType] || []).map((paper) => (
                          <option key={paper._id} value={paper._id}>
                            {paper.title}
                          </option>
                        ))}
                      </select>
                      {(examType === 'writing' || examType === 'reading') && (
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Paper Timing (minutes) *
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="180"
                            value={paperTimings[examType] || ''}
                            onChange={(e) => handleTimingChange(examType, e.target.value)}
                            placeholder="e.g., 60"
                            required
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Exam Date *</label>
                <input
                  type="date"
                  name="exam_date"
                  value={formData.exam_date}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Exam Time *</label>
                <input
                  type="time"
                  name="exam_time"
                  value={formData.exam_time}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Duration (minutes) - Optional</label>
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  min="15"
                  max="180"
                  placeholder="Leave empty for no limit"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Exam Title *</label>
                <input
                  type="text"
                  name="exam_tittle"
                  value={formData.exam_tittle}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., IELTS Listening Test"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Exam Bio *</label>
                <input
                  type="text"
                  name="exam_bio"
                  value={formData.exam_bio}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Standard IELTS Listening Exam"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Auto Login Time (Optional)</label>
              <input
                type="datetime-local"
                name="auto_login_time"
                value={formData.auto_login_time}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div> */}

            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_visible"
                  checked={formData.is_visible}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_visible: e.target.checked }))}
                  className="w-4 h-4 text-teal-600 bg-slate-100 border-slate-300 rounded focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-slate-700">Make exam visible to student</span>
              </label>
              <p className="text-xs text-slate-500 mt-1">
                If unchecked, the exam will be assigned but not visible to the student until enabled.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || selectedExamTypes.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <Save size={16} />
              {loading ? 'Creating Assignment...' : 'Create Exam Assignment'}
            </button>
          </form>
        </div>

        {/* Assignments List */}
        <div className="bg-slate-50 rounded-lg p-6">
          <h4 className="text-lg font-medium text-slate-800 mb-4">Recent Assignments</h4>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {assignments.length === 0 ? (
              <p className="text-slate-500 text-center py-4">No assignments yet</p>
            ) : (
              assignments.slice(0, 10).map((assignment) => (
                <div key={assignment._id} className="bg-white rounded-lg p-4 border border-slate-200">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-medium text-slate-800">
                        {assignment.student.name} ({assignment.student.student_id})
                      </p>
                      <p className="text-sm text-slate-600 capitalize">
                        {Array.isArray(assignment.exam_type) ? assignment.exam_type.join(', ') : assignment.exam_type} Exam
                      </p>
                      <p className="text-sm text-slate-500">
                        {new Date(assignment.exam_date).toLocaleDateString()} at {assignment.exam_time}{assignment.duration ? ` (${assignment.duration} min)` : ''}
                      </p>
                      {assignment.agent && (
                        <p className="text-sm text-slate-500">
                          Agent: {assignment.agent.name} ({assignment.agent.agent_id})
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        assignment.status === 'assigned'
                          ? 'bg-blue-100 text-blue-800'
                          : assignment.status === 'in_progress'
                          ? 'bg-yellow-100 text-yellow-800'
                          : assignment.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {assignment.status.replace('_', ' ')}
                      </span>
                      {assignment.is_visible && (
                        <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                          Visible
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={assignment.status}
                      onChange={(e) => updateAssignmentStatus(assignment._id, e.target.value)}
                      className="text-xs px-2 py-1 border border-slate-300 rounded"
                    >
                      <option value="assigned">Assigned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={assignment.is_visible}
                        onChange={(e) => updateAssignmentVisibility(assignment._id, e.target.checked)}
                      />
                      Visible
                    </label>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetExam;

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ResultsPage = () => {
  const [assignments, setAssignments] = useState([]);
  const [results, setResults] = useState([]);
  const [speakingResults, setSpeakingResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState(undefined);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedExamType, setSelectedExamType] = useState('all'); // 'all', 'listening', 'reading', 'writing', 'speaking'
  const [resultsExamType, setResultsExamType] = useState('all'); // for filtering results table
  const [adminDecisions, setAdminDecisions] = useState({}); // { questionNumber: isCorrect } for listening
  const [writingScores, setWritingScores] = useState({}); // { taskNumber: score } for writing
  const [speakingAdminResults, setSpeakingAdminResults] = useState({}); // { resultId: adminResult } for speaking
  const [manualScores, setManualScores] = useState({ listening: '', reading: '', writing: '', speaking: '' }); // Manual scores for band calculation
  const [manualBreakdownBands, setManualBreakdownBands] = useState({ listening: '', reading: '', writing: '', speaking: '' }); // Manual bands for breakdown
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/exam-assignments`);
      setAssignments(response.data.assignments);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };


  const fetchResultsForAssignment = async (assignmentId) => {
    try {
      setLoading(true);
      const url = assignmentId
        ? `${import.meta.env.VITE_API_BASE_URL}/admin/results?assignment=${assignmentId}`
        : `${import.meta.env.VITE_API_BASE_URL}/admin/results`;
      const response = await axios.get(url);
      setResults(response.data.results || []);
      setSelectedAssignment(assignmentId || null);
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignmentClick = (assignmentId) => {
    fetchResultsForAssignment(assignmentId);
  };

  const handleBackToAssignments = () => {
    setSelectedAssignment(undefined);
    setSelectedStudent(null);
    setSelectedExamType('all');
    setResultsExamType('all');
    setAdminDecisions({});
    setWritingScores({});
    setSpeakingAdminResults({});
    setManualScores({ listening: '', reading: '', writing: '', speaking: '' });
    setManualBreakdownBands({ listening: '', reading: '', writing: '', speaking: '' });
    setResults([]);
  };

  const handleDeleteAssignment = async (assignmentId) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this assignment and all its associated results? This action cannot be undone.');
    if (!confirmDelete) return;

    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/admin/exam-assignments/${assignmentId}`);
      alert('Assignment and associated results deleted successfully.');
      fetchAssignments();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      let errorMessage = 'Error deleting assignment. Please try again.';
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = 'Unauthorized access. Please log in again.';
        } else if (error.response.status === 403) {
          errorMessage = 'You do not have permission to delete this assignment.';
        } else if (error.response.status === 404) {
          errorMessage = 'Assignment not found.';
        } else if (error.response.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        } else if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      alert(errorMessage);
    }
  };

  const handleRowClick = (studentId) => {
    // Initialize admin decisions with existing marks
    const studentResults = results.filter(result => result.student._id === studentId);
    const listeningResult = studentResults.find(result => result.examType === 'listening');
    const readingResult = studentResults.find(result => result.examType === 'reading');
    const writingResult = studentResults.find(result => result.examType === 'writing');
    const speakingResult = studentResults.find(result => result.examType === 'speaking');
    const existingDecisions = {};
    const existingWritingScores = {};
    const existingSpeakingAdminResults = {};

    if (listeningResult?.studentAnswers) {
      listeningResult.studentAnswers.forEach(answer => {
        if (answer.questionType === 'Blank_in_Space' && answer.adminMarked !== null) {
          existingDecisions[answer._id] = answer.adminMarked;
        }
      });
    }

    if (writingResult?.studentAnswers) {
      writingResult.studentAnswers.forEach(answer => {
        if (answer.adminScore !== null) {
          existingWritingScores[answer.taskNumber] = answer.adminScore;
        }
      });
    }

    if (speakingResult?.speakingData) {
      if (speakingResult.speakingData.adminResult !== null) {
        existingSpeakingAdminResults[speakingResult._id] = speakingResult.speakingData.adminResult;
      }
    }

    // Initialize manual scores with current scores for band calculation
    const currentManualScores = {
      listening: listeningResult?.score || '',
      reading: readingResult?.score || '',
      writing: writingResult?.score || '',
      speaking: speakingResult?.speakingData?.adminResult || speakingResult?.score || ''
    };

    setSelectedStudent(studentId);
    setSelectedExamType(resultsExamType); // Pass the current filter to student detail
    setAdminDecisions(existingDecisions);
    setWritingScores(existingWritingScores);
    setSpeakingAdminResults(existingSpeakingAdminResults);
    setManualScores(currentManualScores);
    setHasUnsavedChanges(false);
  };

  const handleAdminDecision = (answerId, isCorrect) => {
    setAdminDecisions(prev => ({
      ...prev,
      [answerId]: isCorrect
    }));
    setHasUnsavedChanges(true);
  };

  const handleWritingScoreChange = (taskNumber, score) => {
    const numScore = parseFloat(score) || 0;
    setWritingScores(prev => ({
      ...prev,
      [taskNumber]: numScore
    }));
    setHasUnsavedChanges(true);
  };

  const handleSpeakingAdminResultChange = (resultId, adminResult) => {
    const numResult = parseFloat(adminResult) || null;
    setSpeakingAdminResults(prev => ({
      ...prev,
      [resultId]: numResult
    }));
    setHasUnsavedChanges(true);
  };

  const handleManualScoreChange = (examType, score) => {
    const numScore = parseFloat(score) || '';
    setManualScores(prev => ({
      ...prev,
      [examType]: numScore
    }));
  };

  const roundBand = (avg) => {
    if (avg < 0.25) return 0;
    const floor = Math.floor(avg);
    const decimal = avg - floor;
    if (decimal < 0.25) return floor;
    if (decimal < 0.75) return floor + 0.5;
    return floor + 1;
  };

  const getListeningBand = (score) => {
    if (score >= 39) return 9;
    if (score >= 37) return 8.5;
    if (score >= 35) return 8;
    if (score >= 32) return 7.5;
    if (score >= 30) return 7;
    if (score >= 26) return 6.5;
    if (score >= 23) return 6;
    if (score >= 18) return 5.5;
    if (score >= 16) return 5;
    return 0;
  };

  const getReadingBand = (score) => {
    if (score >= 39) return 9;
    if (score >= 37) return 8.5;
    if (score >= 35) return 8;
    if (score >= 30) return 7.5;
    if (score >= 27) return 7;
    if (score >= 23) return 6.5;
    if (score >= 19) return 6;
    if (score >= 13) return 5.5;
    return 0;
  };

  const getWritingBand = (score) => {
    // Assuming score is out of 20, band is score / 2
    return Math.min(9, Math.max(0, score / 2));
  };

  const getSpeakingBand = (score) => {
    // Assuming score is out of 100, band is score / 10
    return Math.min(9, Math.max(0, score / 10));
  };

  const calculateBand = (examType, score) => {
    switch (examType) {
      case 'listening': return getListeningBand(score);
      case 'reading': return getReadingBand(score);
      case 'writing': return getWritingBand(score);
      case 'speaking': return getSpeakingBand(score);
      default: return 0;
    }
  };

  const saveAdminDecisions = async () => {
    if (!selectedStudent) return;

    const studentResults = results.filter(result => result.student._id === selectedStudent);
    let hasChanges = false;

    // Save listening decisions
    if (Object.keys(adminDecisions).length > 0) {
      const listeningResult = studentResults.find(result => result.examType === 'listening');
      if (listeningResult) {
        try {
          const decisionsArray = Object.entries(adminDecisions).map(([answerId, isCorrect]) => {
            const answer = listeningResult.studentAnswers.find(a => a._id === answerId);
            if (answer) {
              return {
                questionNumber: answer.questionNumber,
                blankIndex: answer.blankIndex,
                isCorrect
              };
            }
            return null;
          }).filter(Boolean);

          const response = await axios.put(`${import.meta.env.VITE_API_BASE_URL}/admin/listening-results/${listeningResult._id}/admin-mark`, {
            adminDecisions: decisionsArray
          });

          // Update local state
          setResults(prevResults =>
            prevResults.map(result => {
              if (result._id === listeningResult._id) {
                const updatedResult = { ...result, ...response.data.result };
                // Recalculate score based on admin decisions
                if (updatedResult.studentAnswers) {
                  let totalScore = 0;
                  updatedResult.studentAnswers.forEach(answer => {
                    if (answer.questionType === 'Blank_in_Space') {
                      const adminMarked = adminDecisions[answer._id] !== undefined ? adminDecisions[answer._id] : answer.adminMarked;
                      if (adminMarked === true) totalScore += 1;
                    } else {
                      if (answer.userAnswer === answer.correctAnswer) totalScore += 1;
                    }
                  });
                  updatedResult.score = totalScore;
                }
                return updatedResult;
              }
              return result;
            })
          );
          hasChanges = true;
        } catch (error) {
          console.error('Error saving listening decisions:', error);
          alert('Error saving listening decisions. Please try again.');
          return;
        }
      }
    }

    // Save writing scores
    if (Object.keys(writingScores).length > 0) {
      const writingResult = studentResults.find(result => result.examType === 'writing');
      if (writingResult) {
        try {
          const scoresArray = Object.entries(writingScores).map(([taskNumber, score]) => ({
            taskNumber: parseInt(taskNumber),
            score: parseFloat(score) || 0
          }));

          const response = await axios.put(`${import.meta.env.VITE_API_BASE_URL}/admin/writing-results/${writingResult._id}/admin-score`, {
            adminScores: scoresArray
          });

          // Update local state
          setResults(prevResults =>
            prevResults.map(result =>
              result._id === writingResult._id
                ? { ...result, ...response.data.result }
                : result
            )
          );
          hasChanges = true;
        } catch (error) {
          console.error('Error saving writing scores:', error);
          alert('Error saving writing scores. Please try again.');
          return;
        }
      }
    }

    // Save speaking admin results
    if (Object.keys(speakingAdminResults).length > 0) {
      for (const [resultId, adminResult] of Object.entries(speakingAdminResults)) {
        const speakingResult = studentResults.find(result => result._id === resultId && result.examType === 'speaking');
        if (speakingResult) {
          try {
            const response = await axios.put(`${import.meta.env.VITE_API_BASE_URL}/admin/speaking-results/${resultId}/admin-result`, {
              adminResult: adminResult
            });

            // Update local state
            setResults(prevResults =>
              prevResults.map(result =>
                result._id === resultId
                  ? { ...result, speakingData: { ...result.speakingData, adminResult: adminResult } }
                  : result
              )
            );
            hasChanges = true;
          } catch (error) {
            console.error('Error saving speaking admin result:', error);
            alert('Error saving speaking admin result. Please try again.');
            return;
          }
        }
      }
    }

    if (hasChanges) {
      setHasUnsavedChanges(false);
      alert('All changes saved successfully!');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-slate-600">Loading results...</div>
      </div>
    );
  }

  if (selectedStudent) {
    // Show student detail page - Combined view of all exams
    const allStudentResults = results.filter(result => result.student._id === selectedStudent);

    // Sort results by submitted date
    allStudentResults.sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));

    // Filter results based on selected exam type
    const studentResults = selectedExamType === 'all'
      ? allStudentResults
      : allStudentResults.filter(result => result.examType === selectedExamType);

    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800">
            {selectedExamType === 'all' ? 'Combined Exam Results' : `${selectedExamType.charAt(0).toUpperCase() + selectedExamType.slice(1)} Exam Results`}
          </h2>
          <button
            onClick={() => {
              setSelectedStudent(null);
              setAdminDecisions({});
              setWritingScores({});
              setSpeakingAdminResults({});
              setManualScores({ listening: '', reading: '', writing: '', speaking: '' });
              setManualBreakdownBands({ listening: '', reading: '', writing: '', speaking: '' });
              setHasUnsavedChanges(false);
            }}
            className="px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-colors"
          >
            Back to Results
          </button>
        </div>

        {allStudentResults.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-slate-700 mb-4">
              {allStudentResults[0].student.name} ({allStudentResults[0].student.student_id})
            </h3>
          </div>
        )}




        {/* Question-by-Question Analysis */}
        <div className="mb-8">
          <h4 className="text-lg font-semibold text-slate-800 mb-4">
            {selectedExamType === 'all' ? 'All Exams' : selectedExamType.charAt(0).toUpperCase() + selectedExamType.slice(1)} - Question Analysis
          </h4>

          {studentResults.length === 0 ? (
            <p className="text-slate-500 text-center py-8">
              No {selectedExamType} results found for this student
            </p>
          ) : (
            studentResults.map((result, resultIndex) => (
              <div key={resultIndex} className="mb-6">
                <div className="bg-slate-100 p-3 rounded-lg mb-3">
                  <h5 className="font-medium text-slate-700 capitalize">
                    {result.examType} Exam - {result.paper?.title || 'Unknown Paper'}
                    <span className="ml-4 text-sm">
                      Score: {result.score || 'Not graded'} |
                      Status: <span className={result.status === 'graded' ? 'text-green-600' : 'text-yellow-600'}>{result.status}</span> |
                      Submitted: {new Date(result.submittedAt).toLocaleDateString()}
                    </span>
                  </h5>
                </div>

                {result.examType === 'speaking' && result.speakingData ? (
                  // Display speaking results
                  <div className="p-4 bg-slate-50 rounded-lg border">
                    <div className="mb-3">
                      <p className="text-sm text-slate-600 mb-2">
                        <strong>Agent:</strong> {result.speakingData.marks}/100 |
                        <strong> Admin:</strong> {result.speakingData.adminResult !== null ? `${result.speakingData.adminResult}/100` : 'Not set'}
                      </p>
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <div className="flex items-center justify-center space-x-4">
                          <label className="text-sm font-medium text-slate-700">Admin Result:</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={speakingAdminResults[result._id] !== undefined ? speakingAdminResults[result._id] : (result.speakingData.adminResult || '')}
                            onChange={(e) => handleSpeakingAdminResultChange(result._id, e.target.value)}
                            className="w-20 px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0-100"
                          />
                          <span className="text-sm text-slate-500">/100</span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">
                        <strong>Feedback:</strong>
                      </p>
                      <div className="bg-white p-3 rounded border text-sm whitespace-pre-wrap">
                        {result.speakingData.feedback || 'No feedback provided'}
                      </div>
                      <p className="text-sm text-slate-600 mt-2">
                        <strong>Agent ID:</strong> {result.speakingData.agentId?.name || result.speakingData.agentId}
                      </p>
                      <p className="text-sm text-slate-600">
                        <strong>Submitted:</strong> {new Date(result.speakingData.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ) : result.examType === 'reading' && result.detailedResults && result.detailedResults.length > 0 ? (
                  // Use detailedResults for reading questions
                  <div className="grid gap-3">
                    {result.detailedResults.map((detail, idx) => {
                      if (detail.type === 'type4_matching_headings') {
                        // Handle type4 matching headings specially
                        return detail.matchingQuestions?.map((mq, mqIdx) => {
                          const studentAnswer = detail.studentAnswers?.find(sa => sa.questionNumber === mq.questionNumber);
                          const isCorrect = studentAnswer?.isCorrect || false;
                          const selectedText = studentAnswer?.selectedText || '';

                          return (
                            <div key={`${idx}-${mqIdx}`} className="p-4 bg-slate-50 rounded-lg border">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center space-x-3">
                                  <span className="font-medium text-slate-700">
                                    Q{detail.questionNumber}.{mq.questionNumber}
                                  </span>
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {isCorrect ? '✓ Correct' : '✗ Wrong'}
                                  </span>
                                </div>
                              </div>

                              <div className="mb-3">
                                <div className="text-sm text-slate-600 mb-2">
                                  <strong>Question:</strong>
                                  <p className="whitespace-pre-line mt-1">{mq.question}</p>
                                </div>
                              </div>

                              <div className="mb-3">
                                <p className="text-sm text-slate-600 mb-2">
                                  <strong>Student Answer:</strong>
                                </p>
                                <div className="bg-white p-3 rounded border text-sm whitespace-pre-wrap">
                                  {selectedText || 'N/A'}
                                </div>
                              </div>

                              <div className="flex items-center space-x-6 text-sm">
                                <span className="text-slate-600">
                                  <strong>Correct:</strong> <span className="font-medium">{mq.correctText}</span>
                                </span>
                              </div>
                            </div>
                          );
                        });
                      } else if (detail.type === 'type3_sentence_completion') {
                        // Handle type3 sentence completion specially
                        return detail.gapMappings?.map((gap, gapIdx) => {
                          const studentAnswer = detail.studentAnswers?.find(sa => sa.gapNumber === gap.gapNumber);
                          const isCorrect = studentAnswer?.isCorrect || false;
                          const selectedOption = studentAnswer?.selectedOption || '';

                          return (
                            <div key={`${idx}-${gapIdx}`} className="p-4 bg-slate-50 rounded-lg border">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center space-x-3">
                                  <span className="font-medium text-slate-700">
                                    Q{detail.questionNumber}.{gap.gapNumber}
                                  </span>
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {isCorrect ? '✓ Correct' : '✗ Wrong'}
                                  </span>
                                </div>
                              </div>

                              <div className="mb-3">
                                <div className="text-sm text-slate-600 mb-2">
                                  <strong>Gap {gap.gapNumber}:</strong>
                                  <p className="whitespace-pre-line mt-1">{detail.question}</p>
                                  {detail.instructions && (
                                    <p className="text-slate-500 mt-1">{detail.instructions}</p>
                                  )}
                                </div>
                              </div>

                              <div className="mb-3">
                                <p className="text-sm text-slate-600 mb-2">
                                  <strong>Student Answer:</strong>
                                </p>
                                <div className="bg-white p-3 rounded border text-sm whitespace-pre-wrap">
                                  {selectedOption || 'N/A'}
                                </div>
                              </div>

                              <div className="flex items-center space-x-6 text-sm">
                                <span className="text-slate-600">
                                  <strong>Correct:</strong> <span className="font-medium">{gap.correctSentence}</span>
                                </span>
                              </div>
                            </div>
                          );
                        });
                      } else if (detail.type === 'type5' || detail.type === 'type5_reading_comprehension') {
                        // Handle type5 reading comprehension specially
                        if (detail.comprehensionQuestions?.length > 0) {
                          return detail.comprehensionQuestions?.map((cq, cqIdx) => {
                            const studentAnswer = detail.studentAnswers?.find(sa => sa.questionNumber === cq.questionNumber);
                            const isCorrect = studentAnswer?.isCorrect || false;
                            const userAnswer = studentAnswer?.userAnswer || '';

                            return (
                              <div key={`${idx}-${cqIdx}`} className="p-4 bg-slate-50 rounded-lg border">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center space-x-3">
                                    <span className="font-medium text-slate-700">
                                      Q{detail.questionNumber}.{cq.questionNumber}
                                    </span>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                      {isCorrect ? '✓ Correct' : '✗ Wrong'}
                                    </span>
                                  </div>
                                </div>

                                <div className="mb-3">
                                  <div className="text-sm text-slate-600 mb-2">
                                    <strong>Question:</strong>
                                    <p className="whitespace-pre-line mt-1">{cq.question}</p>
                                  </div>
                                </div>

                                <div className="mb-3">
                                  <p className="text-sm text-slate-600 mb-2">
                                    <strong>Student Answer:</strong>
                                  </p>
                                  <div className="bg-white p-3 rounded border text-sm whitespace-pre-wrap">
                                    {userAnswer || 'N/A'}
                                  </div>
                                </div>

                                <div className="flex items-center space-x-6 text-sm">
                                  <span className="text-slate-600">
                                    <strong>Correct:</strong> <span className="font-medium">{cq.correctAnswer}</span>
                                  </span>
                                </div>
                              </div>
                            );
                          });
                      
                          let filterOptions = [
                            { key: 'all', label: 'All Exams' },
                            { key: 'listening', label: 'Listening' },
                            { key: 'reading', label: 'Reading' },
                            { key: 'writing', label: 'Writing' },
                            { key: 'speaking', label: 'Speaking' }
                          ];
                          if (exam_type === 'speaking') {
                            filterOptions = [{ key: 'speaking', label: 'Speaking' }];
                          }
                        } else {
                          // Single type5 question
                          const studentAnswer = detail.studentAnswers?.[0];
                          const isCorrect = studentAnswer?.isCorrect || false;
                          const userAnswer = studentAnswer?.userAnswer || '';

                          return (
                            <div key={idx} className="p-4 bg-slate-50 rounded-lg border">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center space-x-3">
                                  <span className="font-medium text-slate-700">
                                    Q{detail.questionNumber}
                                  </span>
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {isCorrect ? '✓ Correct' : '✗ Wrong'}
                                  </span>
                                </div>
                              </div>

                              <div className="mb-3">
                                <div className="text-sm text-slate-600 mb-2">
                                  <strong>Question:</strong>
                                  <p className="whitespace-pre-line mt-1">{detail.question}</p>
                                  {detail.instructions && (
                                    <p className="text-slate-500 mt-1">{detail.instructions}</p>
                                  )}
                                </div>
                              </div>

                              <div className="mb-3">
                                <p className="text-sm text-slate-600 mb-2">
                                  <strong>Student Answer:</strong>
                                </p>
                                <div className="bg-white p-3 rounded border text-sm whitespace-pre-wrap">
                                  {userAnswer || 'N/A'}
                                </div>
                              </div>

                              <div className="flex items-center space-x-6 text-sm">
                                {detail.correctAnswer && (
                                  <span className="text-slate-600">
                                    <strong>Correct:</strong> <span className="font-medium">{detail.correctAnswer}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        }
                      } else {
                        // Handle other question types
                        const studentAnswer = detail.studentAnswers?.[0];
                        const isCorrect = studentAnswer?.isCorrect || (studentAnswer?.userAnswer === detail.correctAnswer);
                        const userAnswer = studentAnswer?.userAnswer || '';

                        return (
                          <div key={idx} className="p-4 bg-slate-50 rounded-lg border">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-3">
                                <span className="font-medium text-slate-700">
                                  Q{detail.questionNumber}
                                </span>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {isCorrect ? '✓ Correct' : '✗ Wrong'}
                                </span>
                              </div>
                            </div>

                            <div className="mb-3">
                              <div className="text-sm text-slate-600 mb-2">
                                <strong>Question:</strong>
                                <p className="whitespace-pre-line mt-1">{detail.question}</p>
                                {detail.instructions && (
                                  <p className="text-slate-500 mt-1">{detail.instructions}</p>
                                )}
                              </div>
                            </div>

                            <div className="mb-3">
                              <p className="text-sm text-slate-600 mb-2">
                                <strong>Student Answer:</strong>
                              </p>
                              <div className="bg-white p-3 rounded border text-sm whitespace-pre-wrap">
                                {userAnswer || 'N/A'}
                              </div>
                            </div>

                            <div className="flex items-center space-x-6 text-sm">
                              {detail.correctAnswer && (
                                <span className="text-slate-600">
                                  <strong>Correct:</strong> <span className="font-medium">{detail.correctAnswer}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      }
                    }).flat()}
                  </div>
                ) : result.studentAnswers && result.studentAnswers.length > 0 ? (
                  // Fallback to studentAnswers for other exam types
                  <div className="grid gap-3">
                    {(() => {
                      const groupedAnswers = result.studentAnswers.reduce((acc, answer) => {
                        const key = result.examType === 'writing' ? answer.taskNumber : answer.questionNumber;
                        if (!acc[key]) acc[key] = [];
                        acc[key].push(answer);
                        return acc;
                      }, {});

                      return Object.entries(groupedAnswers).map(([key, answers]) => {
                        // Find question text based on exam type
                        let questionText = '';
                        const isWritingTask = result.examType === 'writing';
                        if (result.examType === 'listening' && result.paper?.sections) {
                          // Find question in listening sections
                          for (const section of result.paper.sections) {
                            if (section.questions) {
                              const question = section.questions.find(q => q.questionNumber === parseInt(key));
                              if (question) {
                                questionText = question.question || question.instructions || 'Question text not available';
                                break;
                              }
                            }
                          }
                        } else if (result.examType === 'reading' && result.paper?.questions) {
                          // Find question in reading questions
                          const question = result.paper.questions.find(q => q.questionNumber === parseInt(key));
                          if (question) {
                            questionText = question.question || question.instructions || 'Question text not available';
                          }
                        } else if (isWritingTask && result.paper?.tasks) {
                          // Find task in writing tasks
                          const task = result.paper.tasks.find(t => t.taskNumber === parseInt(key));
                          if (task) {
                            // Store task data for HTML rendering
                            questionText = {
                              title: task.title || `Task ${key}`,
                              instructions: task.instructions || '',
                              prompt: task.prompt || ''
                            };
                          }
                        }

                        const isBlankInSpace = answers[0].questionType === 'Blank_in_Space';
                        const hasMultipleBlanks = isBlankInSpace && answers.length > 1;

                        return (
                          <div key={key} className="p-4 bg-slate-50 rounded-lg border">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-3">
                                <span className="font-medium text-slate-700">
                                  {isWritingTask ? `Task ${key}` : `Q${key}`}
                                </span>
                                {!hasMultipleBlanks && !isWritingTask && (() => {
                                  const answer = answers[0];
                                  const adminMarked = isBlankInSpace
                                    ? (adminDecisions[answer._id] !== undefined ? adminDecisions[answer._id] : answer.adminMarked)
                                    : answer.adminMarked;
                                  const isCorrect = isBlankInSpace ? adminMarked : answer.userAnswer === answer.correctAnswer;
                                  return (
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                      {isCorrect ? '✓ Correct' : '✗ Wrong'}
                                    </span>
                                  );
                                })()}
                              </div>
                            </div>

                            {isWritingTask ? (
                              <div className="flex gap-6">
                                {/* Student Answer on Left */}
                                <div className="flex-1">
                                  <div className="mb-3">
                                    <p className="text-sm text-slate-600 mb-2">
                                      <strong>Student Answer:</strong>
                                    </p>
                                    <div className="bg-white p-3 rounded border text-sm whitespace-pre-wrap min-h-[200px]">
                                      {answers[0].answer || 'N/A'}
                                    </div>
                                    {answers[0].wordCount && (
                                      <p className="text-xs text-slate-500 mt-1">Word count: {answers[0].wordCount}</p>
                                    )}
                                  </div>
                                </div>

                                {/* Question on Right */}
                                <div className="flex-1">
                                  <div className="mb-3">
                                    <div className="text-sm text-slate-600 mb-2">
                                      <strong>Question:</strong>
                                      {questionText ? (
                                        <div className="mt-1">
                                          <h6 className="font-medium text-slate-700">{questionText.title}</h6>
                                          {questionText.instructions && (
                                            <p className="mt-1 text-slate-600">{questionText.instructions}</p>
                                          )}
                                          {questionText.prompt && (
                                            <div
                                              className="mt-2 prose prose-sm max-w-none"
                                              dangerouslySetInnerHTML={{ __html: questionText.prompt }}
                                            />
                                          )}
                                        </div>
                                      ) : (
                                        <p className="whitespace-pre-line mt-1">{questionText}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="mb-3">
                                  <div className="text-sm text-slate-600 mb-2">
                                    <strong>Question:</strong>
                                    <p className="whitespace-pre-line mt-1">{questionText}</p>
                                  </div>
                                </div>

                                {hasMultipleBlanks ? (
                                  // Sub-questions for Blank_in_Space
                                  <div className="space-y-3">
                                    {answers.sort((a, b) => (parseInt(a.blankIndex) || 0) - (parseInt(b.blankIndex) || 0)).map((answer, subIdx) => {
                                      const adminMarked = adminDecisions[answer._id] !== undefined ? adminDecisions[answer._id] : answer.adminMarked;
                                      const subNumber = answer.blankIndex !== undefined ? (parseInt(answer.blankIndex) + 1) : (subIdx + 1);
                                      return (
                                        <div key={subIdx} className="pl-4 border-l-2 border-slate-200">
                                          <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center space-x-3">
                                              <span className="font-medium text-slate-700">
                                                Q{answer.questionNumber}.{subNumber}
                                              </span>
                                              <div className="flex space-x-2">
                                                <button
                                                  onClick={() => handleAdminDecision(answer._id, true)}
                                                  className={`px-3 py-1 rounded text-xs font-medium ${
                                                    adminMarked === true ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800 hover:bg-green-200'
                                                  }`}
                                                >
                                                  Right
                                                </button>
                                                <button
                                                  onClick={() => handleAdminDecision(answer._id, false)}
                                                  className={`px-3 py-1 rounded text-xs font-medium ${
                                                    adminMarked === false ? 'bg-red-600 text-white' : 'bg-red-100 text-red-800 hover:bg-red-200'
                                                  }`}
                                                >
                                                  Wrong
                                                </button>
                                              </div>
                                            </div>
                                          </div>

                                          <div className="mb-3">
                                            <p className="text-sm text-slate-600 mb-2">
                                              <strong>Student Answer:</strong>
                                            </p>
                                            <div className="bg-white p-3 rounded border text-sm whitespace-pre-wrap">
                                              {answer.userAnswer || 'N/A'}
                                            </div>
                                          </div>

                                          <div className="flex items-center space-x-6 text-sm">
                                            <span className="text-slate-600">
                                              <strong>Admin marked:</strong> <span className="font-medium">
                                                {adminMarked === true ? 'Correct' : adminMarked === false ? 'Incorrect' : 'Not marked'}
                                              </span>
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  // Single answer
                                  (() => {
                                    const answer = answers[0];
                                    const isBlankInSpace = answer.questionType === 'Blank_in_Space';
                                    const adminMarked = isBlankInSpace
                                      ? (adminDecisions[answer._id] !== undefined ? adminDecisions[answer._id] : answer.adminMarked)
                                      : answer.adminMarked;

                                    return (
                                      <>
                                        <div className="mb-3">
                                          <p className="text-sm text-slate-600 mb-2">
                                            <strong>Student Answer:</strong>
                                          </p>
                                          <div className="bg-white p-3 rounded border text-sm whitespace-pre-wrap">
                                            {answer.userAnswer || 'N/A'}
                                          </div>
                                        </div>

                                        {isBlankInSpace && (
                                          <div className="mb-3">
                                            <div className="flex space-x-2">
                                              <button
                                                onClick={() => handleAdminDecision(answer._id, true)}
                                                className={`px-3 py-1 rounded text-xs font-medium ${
                                                  adminMarked === true ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800 hover:bg-green-200'
                                                }`}
                                              >
                                                Right
                                              </button>
                                              <button
                                                onClick={() => handleAdminDecision(answer._id, false)}
                                                className={`px-3 py-1 rounded text-xs font-medium ${
                                                  adminMarked === false ? 'bg-red-600 text-white' : 'bg-red-100 text-red-800 hover:bg-red-200'
                                                }`}
                                              >
                                                Wrong
                                              </button>
                                            </div>
                                          </div>
                                        )}

                                        <div className="flex items-center space-x-6 text-sm">
                                          {answer.correctAnswer && !isBlankInSpace && (
                                            <span className="text-slate-600">
                                              <strong>Correct:</strong> <span className="font-medium">{answer.correctAnswer}</span>
                                            </span>
                                          )}
                                          {isBlankInSpace && (
                                            <span className="text-slate-600">
                                              <strong>Admin marked:</strong> <span className="font-medium">
                                                {adminMarked === true ? 'Correct' : adminMarked === false ? 'Incorrect' : 'Not marked'}
                                              </span>
                                            </span>
                                          )}
                                        </div>
                                      </>
                                    );
                                  })()
                                )}
                              </>
                            )}

                            {isWritingTask && (
                              <div className="mt-4 pt-4 border-t border-slate-200">
                                <div className="flex items-center justify-center space-x-4">
                                  <label className="text-sm font-medium text-slate-700">Score:</label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="9"
                                    step="0.5"
                                    value={writingScores[key] !== undefined ? writingScores[key] : (answers[0].adminScore || '')}
                                    onChange={(e) => handleWritingScoreChange(key, e.target.value)}
                                    className="w-20 px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="0-9"
                                  />
                                  <span className="text-sm text-slate-500">/9</span>
                                </div>
                              </div>
                            )}

                            {isWritingTask && answers[0].adminScore !== null && (
                              <div className="text-sm text-slate-600">
                                <strong>Current Score:</strong> <span className="font-medium">{answers[0].adminScore}/9</span>
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm p-3 bg-slate-50 rounded">No detailed answers available for this exam</p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Save Button for Admin Decisions */}
        {hasUnsavedChanges && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={saveAdminDecisions}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Save Changes
            </button>
          </div>
        )}

        {/* Overall Total Score - Only show when viewing all exams */}
        {selectedExamType === 'all' && (
          <div className="p-4 bg-slate-100 rounded-lg">
            <h4 className="font-semibold text-slate-800 mb-2">Overall Total Score</h4>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-800">
                {allStudentResults.reduce((sum, result) => sum + (result.score || 0), 0)} / 200
              </p>
              <p className="text-sm text-slate-600">Maximum possible score across all exams</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (selectedAssignment !== undefined) {
    // Show results for selected assignment or all results
    const title = selectedAssignment ? 'Exam Results' : 'All Student Results';

    // Filter results based on selected exam type
    const filteredResults = resultsExamType === 'all'
      ? results
      : results.filter(result => result.examType === resultsExamType);

    const currentAssignment = assignments.find(a => a._id === selectedAssignment);
    const exam_type = currentAssignment?.exam_type?.length === 1 ? currentAssignment.exam_type[0] : null;

    // Calculate score breakdown
    let typesToShow = ['listening', 'reading', 'writing', 'speaking'];
    if (exam_type === 'writing') {
      typesToShow = typesToShow.filter(t => t !== 'speaking');
    } else if (exam_type === 'speaking') {
      typesToShow = ['speaking'];
    }
    const scoreBreakdown = typesToShow.map(examType => {
      const typeResults = filteredResults.filter(r => r.examType === examType);
      const totalScore = typeResults.reduce((sum, result) => {
        if (examType === 'speaking' && result.speakingData?.adminResult !== null) {
          return sum + (result.speakingData.adminResult || 0);
        }
        return sum + (result.score || 0);
      }, 0);
      const agentTotalScore = examType === 'speaking'
        ? typeResults.reduce((sum, result) => sum + (result.speakingData?.marks || 0), 0)
        : totalScore;
      const maxScore = examType === 'listening' ? 40 : examType === 'reading' ? 40 : examType === 'writing' ? 20 : examType === 'speaking' ? 100 : 0;
      const gradedCount = typeResults.filter(r => r.status === 'graded').length;
      const totalCount = typeResults.length;
      const averageScore = totalCount > 0 ? Math.round((totalScore / totalCount) * 10) / 10 : 0;
      const calculatedBand = calculateBand(examType, averageScore);
      const band = manualBreakdownBands[examType] !== '' ? parseFloat(manualBreakdownBands[examType]) : calculatedBand;

      return {
        examType,
        totalScore,
        agentTotalScore,
        maxScore,
        gradedCount,
        totalCount,
        averageScore,
        band
      };
    });

    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
          <button
            onClick={handleBackToAssignments}
            className="px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-colors"
          >
            Back to Assignments
          </button>
        </div>

        {/* Score Breakdown */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Score Breakdown by Exam Type</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {scoreBreakdown.map(item => (
              <div key={item.examType} className="bg-slate-50 p-4 rounded-lg">
                <h4 className="font-medium text-slate-800 capitalize mb-2">{item.examType}</h4>
                <div className="space-y-1 text-sm">
                  <p>Admin Score: <span className="font-bold">{item.totalScore}</span></p>
                  {item.examType === 'speaking' && (
                    <p>Agent Score: <span className="font-bold">{item.agentTotalScore || 'Not graded'}</span></p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Exam Type Filter Tabs */}
        {exam_type !== 'writing' && (() => {
          let filterOptions = [
            { key: 'all', label: 'All Exams' },
            { key: 'listening', label: 'Listening' },
            { key: 'reading', label: 'Reading' },
            { key: 'writing', label: 'Writing' },
            { key: 'speaking', label: 'Speaking' }
          ];
          if (exam_type === 'speaking') {
            filterOptions = [{ key: 'speaking', label: 'Speaking' }];
          }
          return (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Filter by Exam Type</h3>
              <div className="flex flex-wrap gap-2">
                {filterOptions.map(examType => (
                  <button
                    key={examType.key}
                    onClick={() => setResultsExamType(examType.key)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      resultsExamType === examType.key
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {examType.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Student Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Student ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Exam Type</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Paper</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Score</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((result, index) => (
                <tr
                  key={index}
                  className="border-t border-slate-200 hover:bg-slate-50 cursor-pointer"
                  onClick={() => handleRowClick(result.student._id)}
                >
                  <td className="px-4 py-3 text-sm text-slate-800">{result.student.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{result.student.student_id}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 capitalize">{result.examType}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{result.paper?.title || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{result.score || 'Not graded'}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      result.status === 'graded' ? 'bg-green-100 text-green-800' :
                      result.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {result.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {new Date(result.submittedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredResults.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            No {resultsExamType === 'all' ? '' : resultsExamType} results found
          </div>
        )}
      </div>
    );
  }

  // Show assignments list
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Exam Assignments</h2>
        <button
          onClick={() => fetchResultsForAssignment(null)}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          View All Results
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Student Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Student ID</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Exam Types</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Exam Date</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((assignment, index) => (
              <tr key={index} className="border-t border-slate-200 hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-slate-800">{assignment.student?.name || 'N/A'}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{assignment.student?.student_id || 'N/A'}</td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {assignment.exam_type ? assignment.exam_type.join(', ').toUpperCase() : 'N/A'}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {assignment.exam_date ? new Date(assignment.exam_date).toLocaleDateString() : 'N/A'}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    assignment.status === 'completed' ? 'bg-green-100 text-green-800' :
                    assignment.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {assignment.status || 'assigned'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleAssignmentClick(assignment._id)}
                      className="px-3 py-1 bg-teal-600 text-white rounded text-xs hover:bg-teal-700 transition-colors"
                    >
                      View Results
                    </button>
                    <button
                      onClick={() => handleDeleteAssignment(assignment._id)}
                      className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {assignments.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          No assignments found
        </div>
      )}
    </div>
  );
};

export default ResultsPage;
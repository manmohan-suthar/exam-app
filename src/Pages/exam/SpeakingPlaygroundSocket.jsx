import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

const SpeakingPlaygroundSocket = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { test } = location.state || {};

  const [paper, setPaper] = useState(null);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentSection, setCurrentSection] = useState(0);
  const [currentPassage, setCurrentPassage] = useState(0);

  const [waitingForAgent, setWaitingForAgent] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [socket, setSocket] = useState(null);

  const [examStarted, setExamStarted] = useState(false);
  const [examEnded, setExamEnded] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  // --- initialize / validate input and fetch paper ---
  useEffect(() => {
    if (!test) {
      navigate('/dashboard');
      return;
    }

    // Basic exam date/time check (keeps your original logic but concise)
    try {
      const now = new Date();
      const examDate = new Date(test.exam_date);
      const [hours = '0', minutes = '0'] = (test.exam_time || '').split(':');
      examDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

      const hoursDiff = (now - examDate) / (1000 * 60 * 60);
      if (hoursDiff < -24) {
        setError('Exam is not yet available. Please check back closer to the exam time.');
        setLoading(false);
        return;
      }
      if (hoursDiff > 24) {
        setError('Exam has expired. Please contact your instructor.');
        setLoading(false);
        return;
      }
    } catch (err) {
      // If date parsing fails just continue to fetch (fallback)
      console.warn('Date parsing failed', err);
    }

    fetchPaper();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test]);

  const fetchPaper = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_BASE_URL}/speaking/${test.exam_paper}`);
      if (!resp.ok) throw new Error('Failed to load paper');
      const data = await resp.json();
      const p = data.paper || {};
      setPaper(p);

      // Organize into 4 units (safe)
      const organized = [
        { unitNumber: 1, title: 'Section 1', passages: [] },
        { unitNumber: 2, title: 'Section 2', passages: [] },
        { unitNumber: 3, title: 'Section 3', passages: [] },
        { unitNumber: 4, title: 'Section 4', passages: [] },
      ];

      (p.passages || []).forEach((passage, idx) => {
        const unitNumber = Number(passage.unitNumber) || 1;
        const target = organized[Math.max(0, Math.min(3, unitNumber - 1))];
        target.passages.push({ ...passage, globalIndex: idx });
      });

      setUnits(organized);
      setWaitingForAgent(true);
    } catch (err) {
      console.error(err);
      setError('Error loading speaking exam. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  // --- start exam (called when socket connected) ---
  const startExam = async () => {
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_BASE_URL}/exam-assignments/${test.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examStarted: true,
          startedAt: new Date().toISOString(),
        }),
      });

      if (!resp.ok) throw new Error('Failed to start exam');

      setExamStarted(true);
      setTimeLeft((test.duration || 60) * 60); // minutes -> seconds
      setWaitingForAgent(false);
      setSocketConnected(true);
    } catch (err) {
      console.error(err);
      setError('Failed to start exam. Please try again.');
    }
  };

  const handlePermissionGranted = () => {
    setPermissionGranted(true);
    // Establish Socket.IO connection
    const newSocket = io(import.meta.env.VITE_API_BASE_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to Socket.IO');
      newSocket.emit('join-exam-room', test.id);
      setSocketConnected(true);
      startExam();
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from Socket.IO');
      setSocketConnected(false);
    });
  };

  // --- Timer effect ---
  useEffect(() => {
    if (!examStarted || examEnded || timeLeft <= 0) return;

    const t = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(t);
          setExamEnded(true);
          handleSubmitExam(true);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examStarted, examEnded]);

  // --- prevent navigation while exam active ---
  useEffect(() => {
    const beforeUnload = (e) => {
      if (examStarted && !examEnded) {
        e.preventDefault();
        e.returnValue = 'You have an active exam. Are you sure you want to leave?';
      }
    };
    if (examStarted && !examEnded) {
      window.addEventListener('beforeunload', beforeUnload);
    }
    return () => window.removeEventListener('beforeunload');
  }, [examStarted, examEnded]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSubmitExam = async (auto = false) => {
    if (!auto && !window.confirm('Submit exam now?')) return;
    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/exam-assignments/${test.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          completedAt: new Date().toISOString(),
        }),
      });
      navigate('/exam-results');
    } catch (err) {
      console.error(err);
      if (!auto) alert('Error submitting exam. Please try again.');
    }
  };

  // --- navigation helpers for sections/passages ---
  const goNextPassage = () => {
    const unit = units[currentSection];
    if (!unit) return;
    if (currentPassage < unit.passages.length - 1) {
      setCurrentPassage((p) => p + 1);
    }
  };
  const goPrevPassage = () => setCurrentPassage((p) => Math.max(0, p - 1));
  const goNextSection = () => {
    if (currentSection < units.length - 1) {
      setCurrentSection((s) => s + 1);
      setCurrentPassage(0);
    }
  };
  const goPrevSection = () => {
    if (currentSection > 0) {
      setCurrentSection((s) => s - 1);
      setCurrentPassage(0);
    }
  };

  // --- render states ---
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-b-2 border-blue-500 rounded-full mx-auto" />
          <p className="text-gray-600 mt-3">Loading speaking exam...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={() => navigate('/dashboard')} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600">Failed to load speaking exam</p>
          <button onClick={() => navigate('/dashboard')} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentUnit = units[currentSection] || { passages: [] };
  const passage = currentUnit.passages[currentPassage];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Socket Connection */}
        <aside className="lg:col-span-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4">
          <div className="text-sm font-medium text-gray-800 mb-4 flex items-center gap-2">
            Socket.IO Connection
            {waitingForAgent && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                WAITING
              </span>
            )}
            {socketConnected && (
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                CONNECTED
              </span>
            )}
          </div>

          {/* Show waiting state until permission granted */}
          {waitingForAgent && !socketConnected && (
            <div className="flex flex-col items-center gap-4">
              <div className="text-center">
                <p className="text-gray-600 mb-4">Waiting for admin permission to join video call.</p>
                {!permissionGranted && (
                  <button
                    onClick={handlePermissionGranted}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Allow Joining Video Call (Admin)
                  </button>
                )}
                {permissionGranted && !socketConnected && (
                  <p className="text-gray-600">Connecting via Socket.IO...</p>
                )}
              </div>
            </div>
          )}

          {/* Once connected, show exam controls */}
          {socketConnected && (
            <div className="space-y-4">
              <div className="border-t border-gray-200 pt-4">
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-gray-500">Exam Status</div>
                    <div className="text-sm font-medium">{examStarted ? (examEnded ? 'Ended' : 'In progress') : 'Not started'}</div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-500">Time Left</div>
                    <div className="text-xl font-mono">{formatTime(timeLeft)}</div>
                  </div>

                  <div className="flex gap-2">
                    {!examStarted && (
                      <button onClick={startExam} className="flex-1 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 text-sm">
                        Start Exam
                      </button>
                    )}
                    <button onClick={() => handleSubmitExam(false)} className="flex-1 bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 text-sm">
                      Submit
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fallback */}
          {!waitingForAgent && !socketConnected && (
            <div className="text-sm text-gray-500 text-center py-8">Socket connection will appear here when available.</div>
          )}
        </aside>

        {/* Right column: speaking content */}
        <main className="lg:col-span-8">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
            <header className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-gray-800">{paper.title || 'speaking Exam'}</h1>
                <p className="text-sm text-gray-500 mt-1">{paper.description}</p>
              </div>

              <div className="text-right">
                <div className="text-sm text-gray-500">Section</div>
                <div className="font-medium text-gray-800">{currentSection + 1} / {units.length}</div>
                <div className="text-sm text-gray-500 mt-2">Passage</div>
                <div className="font-medium text-gray-800">{(currentPassage + 1) || 0} / {currentUnit.passages.length || 0}</div>
              </div>
            </header>

            {/* Passage content */}
            <section className="prose max-w-none mb-6">
              {passage ? (
                <>
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">{passage.title || `Passage ${currentPassage + 1}`}</h2>
                  <div className="text-gray-700 leading-relaxed">
                    {passage.content || passage.text || 'No passage content.'}
                  </div>
                </>
              ) : (
                <p className="text-gray-500">No passage available in this section.</p>
              )}
            </section>

            {/* Controls */}
            <footer className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex gap-2">
                <button onClick={goPrevSection} disabled={currentSection === 0} className="px-4 py-2 rounded border bg-white disabled:opacity-50 hover:bg-gray-50 text-sm">
                  Prev Section
                </button>
                <button onClick={goNextSection} disabled={currentSection >= units.length - 1} className="px-4 py-2 rounded border bg-white disabled:opacity-50 hover:bg-gray-50 text-sm">
                  Next Section
                </button>
              </div>

              <div className="flex gap-2 items-center">
                <button onClick={goPrevPassage} disabled={currentPassage === 0} className="px-4 py-2 rounded border bg-white disabled:opacity-50 hover:bg-gray-50 text-sm">
                  Prev Passage
                </button>
                <button onClick={goNextPassage} disabled={currentPassage >= (currentUnit.passages.length - 1)} className="px-4 py-2 rounded border bg-white disabled:opacity-50 hover:bg-gray-50 text-sm">
                  Next Passage
                </button>
              </div>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SpeakingPlaygroundSocket;

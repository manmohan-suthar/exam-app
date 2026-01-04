import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Eye, Video, Clock, CheckCircle, AlertCircle, LogOut } from 'lucide-react';
import io from 'socket.io-client';

const AgentDashboard = () => {
  const navigate = useNavigate();
  const [agent, setAgent] = useState(null);
  const [assignedExams, setAssignedExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeExam, setActiveExam] = useState(null);
  const [activeVideoCallExam, setActiveVideoCallExam] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [socket, setSocket] = useState(null);

  // WebRTC states
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [videoError, setVideoError] = useState('');

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    // Check if agent is logged in
    const agentData = localStorage.getItem('agent');
    const agentToken = localStorage.getItem('agentToken');

    if (!agentData || !agentToken) {
      navigate('/agent-login');
      return;
    }

    const parsedAgent = JSON.parse(agentData);
    setAgent(parsedAgent);
    setLoading(false);

    // Connect to Socket.IO
    const newSocket = io(import.meta.env.VITE_API_BASE_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Agent connected to Socket.IO');
    });

    newSocket.on('disconnect', () => {
      console.log('Agent disconnected from Socket.IO');
    });

    // Update current time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => {
      clearInterval(timer);
      if (newSocket) {
        newSocket.disconnect();
      }
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (peerConnection) {
        peerConnection.close();
      }
    };
  }, [navigate]);

  // Fetch assigned exams when agent is loaded
  useEffect(() => {
    if (agent && !loading) {
      fetchAssignedExams(agent._id, localStorage.getItem('agentToken'));
    }
  }, [agent, loading]);

  // WebRTC setup when activeVideoCallExam changes
  useEffect(() => {
    if (activeVideoCallExam && socket) {
      initWebRTC();

      socket.on('peer-joined', (data) => {
        console.log('Peer joined:', data);
        if (data.role === 'student') {
          // Student joined, create offer
          createOffer();
        }
      });

      socket.on('answer', handleAnswer);
      socket.on('ice', handleIceCandidate);

      return () => {
        socket.off('peer-joined');
        socket.off('answer');
        socket.off('ice');
      };
    }
  }, [activeVideoCallExam, socket]);

  // Set remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const fetchAssignedExams = async (agentId, agentToken) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/agents/${agentId}/assigned-exams`, {
        headers: {
          'Authorization': `Bearer ${agentToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAssignedExams(data.assignedExams);
        // Store in localStorage for offline access
        localStorage.setItem('agentAssignedExams', JSON.stringify(data.assignedExams));
      } else {
        console.error('Failed to fetch assigned exams');
      }
    } catch (error) {
      console.error('Error fetching assigned exams:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('agent');
    localStorage.removeItem('agentToken');
    localStorage.removeItem('agentAssignedExams');
    navigate('/agent-login');
  };

  const getExamStatus = (exam) => {
    if (exam.status === 'completed') return { status: 'completed', color: 'green' };
    if (exam.status === 'in_progress') return { status: 'in_progress', color: 'blue' };
    if (exam.status === 'available') return { status: 'available', color: 'yellow' };
    if (exam.status === 'assigned') return { status: 'assigned', color: 'yellow' };
    return { status: 'scheduled', color: 'gray' };
  };

  const formatExamTime = (exam) => {
    const examDate = new Date(exam.exam_date);
    return examDate.toLocaleString();
  };

  const startMonitoring = async (exam) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/agents/${agent._id}/start-monitoring/${exam._id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('agentToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setActiveExam(exam);
        // Update local state
        setAssignedExams(prev => prev.map(e =>
          e._id === exam._id ? { ...e, status: 'in_progress' } : e
        ));
        // Join exam room for control
        if (socket) {
          socket.emit('join-exam-room', exam._id);
        }
        // Refresh data from server
        fetchAssignedExams(agent._id, localStorage.getItem('agentToken'));
      } else {
        alert('Failed to start monitoring session');
      }
    } catch (error) {
      console.error('Error starting monitoring:', error);
      alert('Error starting monitoring session');
    }
  };

  const endMonitoring = async (exam) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/agents/${agent._id}/end-monitoring/${exam._id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('agentToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setActiveExam(null);
        // Update local state
        setAssignedExams(prev => prev.map(e =>
          e._id === exam._id ? { ...e, status: 'completed' } : e
        ));
        // Refresh data from server
        fetchAssignedExams(agent._id, localStorage.getItem('agentToken'));
      }
    } catch (error) {
      console.error('Error ending monitoring:', error);
    }
  };

  const startVideoCall = (exam) => {
    // For speaking tests, initiate video call
    const isSpeaking = Array.isArray(exam.exam_type) ? exam.exam_type.includes('speaking') : exam.exam_type === 'speaking';
    if (isSpeaking) {
      alert(`Initiating video call for ${exam.student.name}'s speaking test`);
      // Here you would integrate with a video conferencing service
      // For now, just show a placeholder
      window.open('/video-call/' + exam._id, '_blank');
    }
  };

  const joinExam = (exam) => {
    const isSpeaking = Array.isArray(exam.exam_type) ? exam.exam_type.includes('speaking') : exam.exam_type === 'speaking';
    if (isSpeaking) {
      // Check if speaking paper is configured
      const hasSpeakingPaper = exam.exam_paper?.speaking_exam_paper || exam.exam_paper?.speaking;
      if (!hasSpeakingPaper) {
        alert('Speaking paper not configured for this exam');
        return;
      }
      navigate(`/agent/speaking-control/${exam._id}`, { state: { exam } });
    } else {
      setActiveVideoCallExam(exam);
    }
  };

  const grantPermission = (exam) => {
    if (socket) {
      socket.emit('grant-permission', exam._id);
      alert(`Permission granted for ${exam.student.name}'s exam`);
    } else {
      alert('Socket not connected');
    }
  };

  const changeSection = (examId, section) => {
    if (socket) {
      socket.emit('change-section', { examId, section });
    }
  };

  const changePassage = (examId, passage) => {
    if (socket) {
      socket.emit('change-passage', { examId, passage });
    }
  };

  const endExam = (examId) => {
    if (socket) {
      socket.emit('end-exam', examId);
    }
  };

  const handleVideoCallStarted = () => {
    // Video call started successfully
    console.log('Video call started for exam:', activeVideoCallExam?.id);
  };

  // WebRTC functions
  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice', {
          room: activeVideoCallExam._id,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      setIsConnected(pc.connectionState === 'connected');
    };

    return pc;
  };

  const initWebRTC = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = createPeerConnection();
      setPeerConnection(pc);

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Join room as agent
      socket.emit('join', { room: activeVideoCallExam._id, role: 'agent' });

    } catch (err) {
      console.error('Error starting video call:', err);
      setVideoError('Failed to access camera/microphone');
    }
  };

  const createOffer = async () => {
    if (!peerConnection) return;

    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      socket.emit('offer', {
        room: activeVideoCallExam._id,
        sdp: offer.sdp,
        from: socket.id
      });
    } catch (err) {
      console.error('Error creating offer:', err);
    }
  };

  const handleAnswer = async (data) => {
    if (!peerConnection) return;

    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription({
        type: 'answer',
        sdp: data.sdp
      }));
    } catch (err) {
      console.error('Error handling answer:', err);
    }
  };

  const handleIceCandidate = async (data) => {
    if (!peerConnection) return;

    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (err) {
      console.error('Error adding ICE candidate:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-b-2 border-purple-500 rounded-full mx-auto"></div>
          <p className="text-gray-600 mt-3">Loading agent dashboard...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600">Access denied. Please login as an agent.</p>
          <button
            onClick={() => navigate('/agent-login')}
            className="mt-4 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            Go to Agent Login
          </button>
        </div>
      </div>
    );
  }

  return (
   <div className="min-h-screen bg-gray-50">

<div className="h-screen overflow-auto" >
      {/* Video Call Section */}
      {activeVideoCallExam && (
        <div className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-4">
          <h3 className="text-lg font-semibold mb-4">Video Call - {activeVideoCallExam.student.name}</h3>

          <div className="grid grid-cols-1 gap-4">
            {/* Local Video - You (Agent) */}
            <div>
              <h4 className="text-sm font-medium mb-2">You (Agent)</h4>
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-64 h-48 bg-black rounded"
              />
              {!localStream && <p className="text-gray-500 mt-1 text-xs">Initializing camera...</p>}
            </div>

            {/* Remote Video - Student */}
            <div>
              <h4 className="text-sm font-medium mb-2">Student</h4>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-64 h-48 bg-black rounded"
              />
              {!isConnected && <p className="text-gray-500 mt-1 text-xs">Waiting for student...</p>}
            </div>
          </div>

          {videoError && (
            <div className="mt-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-xs">
              {videoError}
            </div>
          )}

          {isConnected && (
            <div className="mt-2 text-xs text-green-600">Connected</div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Agent Dashboard</h1>
            <p className="text-gray-600">Welcome back, {agent.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-600">Agent ID</div>
              <div className="text-lg font-semibold text-gray-800">{agent.agent_id}</div>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Exams</p>
                <p className="text-2xl font-bold text-gray-900">{assignedExams.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">
                  {assignedExams.filter(exam => exam.status === 'in_progress').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {assignedExams.filter(exam => exam.status === 'completed').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <Video className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Speaking Tests</p>
                <p className="text-2xl font-bold text-gray-900">
                  {assignedExams.filter(exam => Array.isArray(exam.exam_type) ? exam.exam_type.includes('speaking') : exam.exam_type === 'speaking').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Monitoring Session */}
        {activeExam && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-800">Active Monitoring Session</h3>
                <p className="text-blue-600">
                  Monitoring {activeExam.student.name}'s {Array.isArray(activeExam.exam_type) ? activeExam.exam_type.join(', ') : activeExam.exam_type} exam
                </p>
                {(Array.isArray(activeExam.exam_type) ? activeExam.exam_type.includes('speaking') : activeExam.exam_type === 'speaking') && (
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-blue-700">Change Section</label>
                      <select
                        onChange={(e) => changeSection(activeExam._id, parseInt(e.target.value))}
                        className="mt-1 block w-full px-3 py-2 border border-blue-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Section</option>
                        <option value="0">Section 1</option>
                        <option value="1">Section 2</option>
                        <option value="2">Section 3</option>
                        <option value="3">Section 4</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => changePassage(activeExam._id, 'prev')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                      >
                        Prev Passage
                      </button>
                      <button
                        onClick={() => changePassage(activeExam._id, 'next')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                      >
                        Next Passage
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-3 ml-4">
                {(Array.isArray(activeExam.exam_type) ? activeExam.exam_type.includes('speaking') : activeExam.exam_type === 'speaking') && (
                  <button
                    onClick={() => startVideoCall(activeExam)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                  >
                    <Video size={16} />
                    Start Video Call
                  </button>
                )}
                {(Array.isArray(activeExam.exam_type) ? activeExam.exam_type.includes('speaking') : activeExam.exam_type === 'speaking') && (
                  <button
                    onClick={() => endExam(activeExam._id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                  >
                    End Exam
                  </button>
                )}
                <button
                  onClick={() => endMonitoring(activeExam)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
                >
                  End Monitoring
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assigned Exams */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">Assigned Exams</h2>
          </div>

          <div className="p-6">
            {assignedExams.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No exams assigned yet</p>
            ) : (
              <div className="space-y-4">
                {assignedExams.map((exam) => {
                  const examStatus = getExamStatus(exam);
                  console.log(examStatus);
                  
                  return (
                    <div key={exam._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-800">
                              {exam.student.name} ({exam.student.student_id})
                            </h3>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              (Array.isArray(exam.exam_type) ? exam.exam_type.includes('speaking') : exam.exam_type === 'speaking') ? 'bg-purple-100 text-purple-800' :
                              (Array.isArray(exam.exam_type) ? exam.exam_type.includes('listening') : exam.exam_type === 'listening') ? 'bg-green-100 text-green-800' :
                              (Array.isArray(exam.exam_type) ? exam.exam_type.includes('writing') : exam.exam_type === 'writing') ? 'bg-blue-100 text-blue-800' :
                              'bg-orange-100 text-orange-800'
                            }`}>
                              {Array.isArray(exam.exam_type) ? exam.exam_type.join(', ') : exam.exam_type}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              examStatus.color === 'green' ? 'bg-green-100 text-green-800' :
                              examStatus.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                              examStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                              examStatus.color === 'red' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {examStatus.status.replace('_', ' ')}
                            </span>
                          </div>

                          <div className="text-sm text-gray-600 space-y-1">
                            <p><strong>Exam:</strong> {exam.exam_tittle}</p>
                            <p><strong>Duration:</strong> {exam.duration} minutes</p>
                            {exam.pc && (
                              <p><strong>PC:</strong> {exam.pc.macAddress} ({exam.pc.pcName})</p>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 ml-4">
                          {examStatus.status === 'in_progress' && (
                            <>
                              <button
                                onClick={() => startMonitoring(exam)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                              >
                                <Eye size={16} />
                                Monitor
                              </button>
                              {(Array.isArray(exam.exam_type) ? exam.exam_type.includes('speaking') : exam.exam_type === 'speaking') && (
                                <button
                                  onClick={() => startVideoCall(exam)}
                                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                                >
                                  <Video size={16} />
                                  Video Call
                                </button>
                              )}
                              {(Array.isArray(exam.exam_type) ? exam.exam_type.includes('speaking') : exam.exam_type === 'speaking') && (
                                <button
                                  onClick={() => grantPermission(exam)}
                                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                                >
                                  <CheckCircle size={16} />
                                  Grant Permission
                                </button>
                              )}
                            </>
                          )}

                          {(examStatus.status === 'available' || examStatus.status === 'in_progress' || examStatus.status === 'assigned') && (
                            <>
                              <button
                                onClick={() => startMonitoring(exam)}
                                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                              >
                                <Clock size={16} />
                                Prepare
                              </button>
                              {(Array.isArray(exam.exam_type) ? exam.exam_type.includes('speaking') : exam.exam_type === 'speaking') && (
                                <>
                                  <button
                                    onClick={() => grantPermission(exam)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                                  >
                                    <CheckCircle size={16} />
                                    Grant Permission
                                  </button>
                                  <button
                                    onClick={() => joinExam(exam)}
                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                                  >
                                    <Video size={16} />
                                    Join Now
                                  </button>
                                </>
                              )}
                            </>
                          )}

                          {examStatus.status === 'expired' && (
                            <span className="text-red-600 text-sm font-medium">Exam Expired</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
   </div>
    
  );
};

export default AgentDashboard;

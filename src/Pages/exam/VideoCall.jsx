import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Video, Mic, MicOff, Phone, PhoneOff, MessageSquare } from 'lucide-react';

const VideoCall = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [isConnected, setIsConnected] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [studentConnected, setStudentConnected] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);

  useEffect(() => {
    // Initialize video call
    initializeVideoCall();

    return () => {
      // Cleanup
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, []);

  const initializeVideoCall = async () => {
    try {
      // Get user media (camera and microphone)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Initialize WebRTC peer connection
      peerConnectionRef.current = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        peerConnectionRef.current.addTrack(track, stream);
      });

      // Handle remote stream
      peerConnectionRef.current.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        setStudentConnected(true);
      };

      // Handle ICE candidates
      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          // Send ICE candidate to signaling server
          sendSignalingMessage('ice-candidate', event.candidate);
        }
      };

      setIsConnected(true);

      // Create offer for WebRTC connection
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);

      // Send offer to signaling server
      sendSignalingMessage('offer', offer);

    } catch (error) {
      console.error('Error initializing video call:', error);
      alert('Failed to access camera/microphone. Please check permissions.');
    }
  };

  const sendSignalingMessage = (type, data) => {
    // This would send messages to a signaling server
    // For now, we'll simulate the connection
    console.log('Signaling message:', type, data);

    // Simulate receiving answer (in real implementation, this would come from server)
    if (type === 'offer') {
      setTimeout(() => {
        // Simulate student connecting
        setStudentConnected(true);
        addMessage('System', 'Student has joined the call');
      }, 2000);
    }
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMicOn(!isMicOn);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOn(!isVideoOn);
    }
  };

  const endCall = () => {
    // Cleanup and navigate back
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    navigate('/agent-dashboard');
  };

  const addMessage = (sender, text) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      sender,
      text,
      timestamp: new Date()
    }]);
  };

  const sendMessage = () => {
    if (newMessage.trim()) {
      addMessage('Agent', newMessage.trim());
      setNewMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Speaking Test - Video Call</h1>
            <p className="text-gray-300 text-sm">Exam ID: {examId}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${studentConnected ? 'text-green-400' : 'text-red-400'}`}>
              <div className={`w-3 h-3 rounded-full ${studentConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              {studentConnected ? 'Student Connected' : 'Waiting for Student'}
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Video Area */}
        <div className="flex-1 flex">
          {/* Remote Video (Student) */}
          <div className="flex-1 bg-gray-800 flex items-center justify-center relative">
            {studentConnected ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center">
                <Video size={64} className="mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400">Waiting for student to join...</p>
              </div>
            )}

            {/* Local Video (Agent) */}
            <div className="absolute top-4 right-4 w-48 h-36 bg-gray-700 rounded-lg overflow-hidden border-2 border-white">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {!isVideoOn && (
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                  <Video size={32} className="text-gray-400" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chat Sidebar */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MessageSquare size={20} />
              Chat
            </h3>

            <div className="space-y-3">
              {messages.map((message) => (
                <div key={message.id} className="bg-gray-700 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-blue-400">{message.sender}</span>
                    <span className="text-xs text-gray-400">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-gray-200">{message.text}</p>
                </div>
              ))}

              {messages.length === 0 && (
                <p className="text-gray-400 text-center py-8">No messages yet</p>
              )}
            </div>
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-800 rounded-full px-6 py-4 flex items-center gap-4 shadow-lg">
        <button
          onClick={toggleMic}
          className={`p-3 rounded-full ${isMicOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'} transition-colors`}
        >
          {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
        </button>

        <button
          onClick={toggleVideo}
          className={`p-3 rounded-full ${isVideoOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'} transition-colors`}
        >
          <Video size={24} />
        </button>

        <div className="w-px h-8 bg-gray-600 mx-2"></div>

        <button
          onClick={endCall}
          className="p-3 rounded-full bg-red-600 hover:bg-red-700 transition-colors"
        >
          <PhoneOff size={24} />
        </button>
      </div>
    </div>
  );
};

export default VideoCall;
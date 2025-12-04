import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

const VideoCall = ({ examId, isAgent, onCallStarted, testMode, fixed = true, onPermissionError }) => {
  // Default to real camera mode for production
  // Set testMode={true} for testing without camera conflicts
  const isTestMode = testMode !== undefined ? testMode : false;

  // Early return if examId is not provided
  if (!examId) {
    return (
      <div className={`${fixed ? 'fixed top-4 right-4 z-50' : ''} bg-white rounded-lg shadow-lg border border-gray-200 p-4`}>
        <div className="text-red-600 text-sm">Error: Exam ID is required for video call</div>
      </div>
    );
  }

  const [socket, setSocket] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [iceCandidatesQueue, setIceCandidatesQueue] = useState([]);
  const [connectionState, setConnectionState] = useState('new');
  const [hasCreatedOffer, setHasCreatedOffer] = useState(false);
  const [hasCreatedAnswer, setHasCreatedAnswer] = useState(false);

  const navigate = useNavigate();

  const myVideoRef = useRef();
  const remoteVideoRef = useRef();
  const initializedRef = useRef(false);

  // Function to retry camera access
  const retryCameraAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      // If successful, update the local stream and clear error
      setLocalStream(stream);
      if (myVideoRef.current) {
        myVideoRef.current.srcObject = stream;
      }
      setError(null);
      console.log('Camera access granted on retry');
    } catch (mediaError) {
      console.warn('Camera access still denied:', mediaError);
      setError('Camera still blocked. Please check browser permissions.');
    }
  };
  // Create a test video stream for development/testing
  const createTestStream = async (isAgent, isFallback = false) => {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');

    // Create animated test pattern
    const drawFrame = () => {
      // Create a gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      if (isAgent) {
        gradient.addColorStop(0, '#4CAF50'); // Green for agent
        gradient.addColorStop(1, '#66BB6A');
      } else {
        gradient.addColorStop(0, '#2196F3'); // Blue for student
        gradient.addColorStop(1, '#42A5F5');
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = 'white';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(isAgent ? 'AGENT' : 'STUDENT', canvas.width / 2, canvas.height / 2 - 10);

      ctx.font = '14px Arial';
      ctx.fillText(isFallback ? 'CAMERA BUSY' : 'TEST MODE', canvas.width / 2, canvas.height / 2 + 20);
    };

    drawFrame();

    // Create a MediaStream from the canvas
    const stream = canvas.captureStream ? canvas.captureStream(30) : null; // 30 FPS
    if (!stream) {
      throw new Error('Canvas capture not supported');
    }

    // Add a silent audio track
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(0, audioContext.currentTime); // Silent
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);

    oscillator.start();

    // Create audio stream
    const audioStream = audioContext.createMediaStreamDestination().stream;

    // Combine video and audio streams
    const combinedStream = new MediaStream([
      ...stream.getVideoTracks(),
      ...audioStream.getAudioTracks()
    ]);

    return combinedStream;
  };

  useEffect(() => {
    // Prevent multiple initializations
    if (initializedRef.current) {
      return;
    }
    initializedRef.current = true;


    const initWebRTC = async () => {
      try {
        // Connect to socket
        const newSocket = io(import.meta.env.VITE_API_BASE_URL);
        setSocket(newSocket);

        // Join exam room
        newSocket.emit('join-exam-room', examId);

        // Get user media based on test mode and role
        let stream;
        if (isTestMode) {
          // One-way video in test mode
          if (!isAgent) {
            // Student: send real camera + audio
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
              });
            } catch (mediaError) {
              console.warn('Student camera access failed, using test mode:', mediaError);
              stream = await createTestStream(false, true);
              // Show info message about camera permissions
              const errorMsg = 'Camera blocked - using test mode. Click your browser\'s camera icon to enable video.';
              setError(errorMsg);
              if (onPermissionError) {
                onPermissionError(errorMsg);
              }
            }
          } else {
            // Agent: send only audio (no video)
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                video: false,
                audio: true
              });
            } catch (mediaError) {
              console.warn('Agent audio access failed:', mediaError);
              // Create silent audio stream
              const audioContext = new AudioContext();
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();
              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);
              oscillator.frequency.setValueAtTime(0, audioContext.currentTime);
              gainNode.gain.setValueAtTime(0, audioContext.currentTime);
              oscillator.start();
              const audioStream = audioContext.createMediaStreamDestination().stream;
              stream = audioStream;
              setError('Audio unavailable');
            }
          }
        } else {
          // Normal mode: both get real cameras
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true
            });
          } catch (mediaError) {
            console.warn('Camera access failed:', mediaError);
            setError('Camera access failed');
            return;
          }
        }
        setLocalStream(stream);

        // Set up local video display
        if (myVideoRef.current) {
          myVideoRef.current.srcObject = stream;
        }

        // Create peer connection
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        });
        setPeerConnection(pc);

        // Monitor connection state
        pc.onconnectionstatechange = () => {
          setConnectionState(pc.connectionState);
          console.log('Connection state:', pc.connectionState);

          if (pc.connectionState === 'failed') {
            setError('Connection failed. Please refresh and try again.');
          } else if (pc.connectionState === 'connected') {
            setError(null); // Clear any previous errors
          }
        };

        // Monitor signaling state
        pc.onsignalingstatechange = () => {
          console.log('Signaling state:', pc.signalingState);
        };

        // Handle connection failures
        pc.oniceconnectionstatechange = () => {
          console.log('ICE connection state:', pc.iceConnectionState);
          if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
            setError('Connection lost. Attempting to reconnect...');
          } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
            setError(null);
          }
        };

        // Add local stream to peer connection
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        // Handle remote stream
        pc.ontrack = (event) => {
          const receivedStream = event.streams[0];
          setRemoteStream(receivedStream);

          if (remoteVideoRef.current) {
            if (isTestMode) {
              // One-way video in test mode
              if (!isAgent) {
                // Student receives agent's stream but shows name instead
                createTestStream(true, false).then(testStream => {
                  remoteVideoRef.current.srcObject = testStream;
                });
              } else {
                // Agent receives student's real video stream
                remoteVideoRef.current.srcObject = receivedStream;
              }
            } else {
              // Normal mode: show received stream
              remoteVideoRef.current.srcObject = receivedStream;
            }
          }

          setIsConnected(true);
          if (onCallStarted) {
            onCallStarted();
          }
        };

        // Function to process queued ICE candidates
        const processIceCandidatesQueue = async (queue) => {
          for (const candidate of queue) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
              console.error('Error adding queued ICE candidate:', e);
            }
          }
          setIceCandidatesQueue([]);
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            newSocket.emit('ice-candidate', {
              candidate: event.candidate,
              room: examId
            });
          }
        };

        // Wait for peer connection to be ready, then initiate signaling
        const startSignaling = () => {
          if (isAgent) {
            // Agent creates offer
            newSocket.emit('agent-joined', examId);

            if (!hasCreatedOffer && pc.signalingState === 'stable') {
              setHasCreatedOffer(true);
              pc.createOffer()
                .then(offer => pc.setLocalDescription(offer))
                .then(() => {
                  newSocket.emit('offer', {
                    offer: pc.localDescription,
                    room: examId
                  });
                })
                .catch(err => {
                  console.error('Error creating offer:', err);
                  setError('Failed to create video call offer');
                  setHasCreatedOffer(false); // Reset on error
                });
            }
          } else {
            // Student waits for offer
            newSocket.on('offer', (data) => {
              if (!hasCreatedAnswer && pc.signalingState === 'stable') {
                setHasCreatedAnswer(true);
                pc.setRemoteDescription(new RTCSessionDescription(data.offer))
                  .then(() => {
                    // Process any queued ICE candidates
                    setIceCandidatesQueue(currentQueue => {
                      processIceCandidatesQueue(currentQueue);
                      return [];
                    });
                    return pc.createAnswer();
                  })
                  .then(answer => pc.setLocalDescription(answer))
                  .then(() => {
                    newSocket.emit('answer', {
                      answer: pc.localDescription,
                      room: examId
                    });
                  })
                  .catch(err => {
                    console.error('Error creating answer:', err);
                    setError('Failed to create video call answer');
                    setHasCreatedAnswer(false); // Reset on error
                  });
              }
            });
          }
        };

        // Start signaling after a short delay to ensure peer connection is ready
        setTimeout(startSignaling, 1000);

        // Handle answer from student
        newSocket.on('answer', (data) => {
          if (isAgent && !hasCreatedAnswer && pc.signalingState === 'have-local-offer') {
            setHasCreatedAnswer(true);
            pc.setRemoteDescription(new RTCSessionDescription(data.answer))
              .then(() => {
                // Process any queued ICE candidates
                setIceCandidatesQueue(currentQueue => {
                  processIceCandidatesQueue(currentQueue);
                  return [];
                });
              })
              .catch(err => {
                console.error('Error setting remote answer:', err);
                setError('Failed to establish video call connection');
                setHasCreatedAnswer(false); // Reset on error
              });
          }
        });

        // Handle ICE candidates
        newSocket.on('ice-candidate', async (data) => {
          if (pc.remoteDescription) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (e) {
              console.error('Error adding ICE candidate:', e);
            }
          } else {
            // Queue ICE candidate until remote description is set
            setIceCandidatesQueue(prev => [...prev, data.candidate]);
          }
        });

      } catch (err) {
        console.error('Error initializing WebRTC:', err);
        if (isTestMode) {
          setError('Failed to create test video stream');
        } else {
          setError('Could not access camera/microphone or establish connection');
        }
      }
    };

    initWebRTC();

    return () => {
      if (socket) {
        socket.disconnect();
      }
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (peerConnection) {
        peerConnection.close();
      }
      // Reset state on cleanup
      setHasCreatedOffer(false);
      setHasCreatedAnswer(false);
      setIceCandidatesQueue([]);
      setConnectionState('new');
      initializedRef.current = false;
    };
  }, [examId, isAgent]);

  return (
    <div className={`${fixed ? 'fixed top-4 right-4 z-50' : ''} bg-white  border-gray-200 p-2`}>
      <div className="text-sm font-medium text-gray-800 mb-2 flex items-center gap-2">
        {isAgent ? 'Agent Video Call' : 'Student Video Call'}
        {isTestMode && (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
            TEST MODE 
            <button onClick={() => navigate(-1)}>back</button>
          </span>
        )}
      </div>

      {error && (
        <div className="text-red-600 text-sm mb-2 p-2 bg-red-50 rounded border">
          {error}
          {(error.includes('Connection failed') || error.includes('Connection lost')) && (
            <button
              onClick={() => window.location.reload()}
              className="ml-2 px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
            >
              Retry
            </button>
          )}
          {error.includes('Camera blocked') && (
            <button
              onClick={retryCameraAccess}
              className="ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
            >
              Retry Camera
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {/* Local video */}
        <div className="flex flex-col">
          <div className="text-xs text-gray-600 mb-1">You</div>
          <video
            ref={myVideoRef}
            autoPlay
            muted
            className={`${fixed ? 'w-32 h-24' : 'w-full h-50'} bg-gray-200 rounded border`}
          />
        </div>

        {/* Remote video */}
        <div className="flex flex-col">
          <div className="text-xs text-gray-600 mb-1">
            {isAgent ? 'Student' : 'Agent'}
          </div>
          <video
            ref={remoteVideoRef}
            autoPlay
            className={`${fixed ? 'w-32 h-24' : 'w-full h-50'} bg-gray-200 rounded border`}
          />
        </div>
      </div>

      {!isConnected && !error && (
        <div className="text-xs text-gray-500 mt-2">
          {isAgent ? 'Connecting to student...' : 'Waiting for agent...'}
        </div>
      )}

      {isConnected && (
        <div className="text-xs text-green-600 mt-2">Connected</div>
      )}
    </div>
  );
};

export default VideoCall;
import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import io from "socket.io-client";
import { Mic, MicOff, Video, VideoOff, GripHorizontal } from "lucide-react";

const SpeakingPlayground = ({ test, onSectionChange }) => {
  const navigate = useNavigate();

  const studentName = test?.student?.name || "Suthar";
  const agentName = "Agent";

  const [paper, setPaper] = useState(null);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentSection, setCurrentSection] = useState(0);
  const [currentPassage, setCurrentPassage] = useState(0);

  const [waitingForAgent, setWaitingForAgent] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [agentSelected, setAgentSelected] = useState(false);
  const [socket, setSocket] = useState(null);
  const [agentConnected, setAgentConnected] = useState(false);

  // WebRTC states
  const [peerConnection, setPeerConnection] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [videoCallError, setVideoCallError] = useState(null);

  // Draggable container state
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [containerPosition, setContainerPosition] = useState({ x: 20, y: 20 });
  const [containerSize, setContainerSize] = useState({
    width: 320,
    height: 240,
  });
  const [isResizing, setIsResizing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [lastPosition, setLastPosition] = useState({ x: 20, y: 20 });
  const [lastSize, setLastSize] = useState({ width: 320, height: 240 });
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);

  // Video refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const socketRef = useRef(null);
  const iceCandidatesQueueRef = useRef([]);

  // Guards for one-time init
  const initializedRef = useRef(false);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const examStartedRef = useRef(false);

  const [examStarted, setExamStarted] = useState(false);
  const [examEnded, setExamEnded] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionError, setPermissionError] = useState("");

  // Update video elements when streams change (only set srcObject once)
  useEffect(() => {
    if (
      localVideoRef.current &&
      localStreamRef.current &&
      !localVideoRef.current.srcObject
    ) {
      localVideoRef.current.srcObject = localStreamRef.current;
      localVideoRef.current
        .play()
        .catch((e) => console.log("Student local video play failed", e));
    }
  }, [localStream]);

  useEffect(() => {
    if (
      remoteVideoRef.current &&
      remoteStream &&
      !remoteVideoRef.current.srcObject
    ) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current
        .play()
        .catch((e) => console.log("Student remote video play failed", e));
    }
  }, [remoteStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.off("offer");
        socketRef.current.off("answer");
        socketRef.current.off("ice");
        socketRef.current.off("peer-joined");
        socketRef.current.off("permission-granted");
        socketRef.current.off("change-section");
        socketRef.current.off("change-passage");
        socketRef.current.off("end-exam");
        socketRef.current.off("disconnect");
        socketRef.current.disconnect();
      }
      cleanupWebRTC();
    };
  }, []);

  // --- initialize / validate input and fetch paper ---
  useEffect(() => {
    if (!test) {
      navigate("/dashboard");
      return;
    }

    // Basic exam date/time check (keeps your original logic but concise)
    try {
      const now = new Date();
      const examDate = new Date(test.exam_date);
      const [hours = "0", minutes = "0"] = (test.exam_time || "").split(":");
      examDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

      const hoursDiff = (now - examDate) / (1000 * 60 * 60);
      if (hoursDiff < -24) {
        setError(
          "Exam is not yet available. Please check back closer to the exam time."
        );
        setLoading(false);
        return;
      }
      if (hoursDiff > 24) {
        setError("Exam has expired. Please contact your instructor.");
        setLoading(false);
        return;
      }
    } catch (err) {
      // If date parsing fails just continue to fetch (fallback)
      console.warn("Date parsing failed", err);
    }

    fetchPaper();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test]);

  const fetchPaper = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/speaking/${test.exam_paper}`
      );
      if (!resp.ok) throw new Error("Failed to load paper");
      const data = await resp.json();
      const p = data.paper || {};
      setPaper(p);

      // Organize into 4 units (safe)
      const organized = [
        { unitNumber: 1, title: "Section 1", passages: [] },
        { unitNumber: 2, title: "Section 2", passages: [] },
        { unitNumber: 3, title: "Section 3", passages: [] },
        { unitNumber: 4, title: "Section 4", passages: [] },
      ];

      (p.passages || []).forEach((passage, idx) => {
        const unitNumber = Number(passage.unitNumber) || 1;
        const target = organized[Math.max(0, Math.min(3, unitNumber - 1))];
        target.passages.push({ ...passage, globalIndex: idx });
      });

      setUnits(organized);
      setWaitingForAgent(true);

      // Initialize Socket.IO and WebRTC after paper is loaded
      initializeSocketAndWebRTC();
    } catch (err) {
      console.error(err);
      setError("Error loading speaking exam. Please contact support.");
    } finally {
      setLoading(false);
    }
  };

  const initializeSocketAndWebRTC = () => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Connect to Socket.IO
    const newSocket = io(import.meta.env.VITE_API_BASE_URL);
    setSocket(newSocket);
    socketRef.current = newSocket;

    newSocket.on("connect", () => {
      console.log(
        "Student connected to Socket.IO, assignmentId:",
        test.assignmentId
      );
      newSocket.emit("join", { room: test.assignmentId, role: "student" });
      console.log("Student joining exam room:", test.assignmentId);
      setSocketConnected(true);
    });

    newSocket.on("peer-joined", (data) => {
      if (data.role === "agent") {
        console.log("Student: Agent joined the room");
        setAgentConnected(true);
      }
    });

    newSocket.on("permission-granted", () => {
      console.log(
        "Student: Permission granted - waiting for agent to start video call"
      );
      setPermissionGranted(true);
      // Agent will send offer to start video call
    });

    // WebRTC signaling
    newSocket.on("offer", handleOffer);
    newSocket.on("answer", handleAnswer);
    newSocket.on("ice", handleIceCandidate);

    newSocket.on("change-section", (section) => {
      console.log("Agent changed section to:", section);
      setCurrentSection(section);
      setCurrentPassage(0);
      setAgentSelected(true);
      setAgentConnected(true);
      setWaitingForAgent(false);
      startExam();
      
      // Notify parent component about section change
      if (onSectionChange) {
        onSectionChange(section);
      }
    });

    newSocket.on("change-passage", (direction) => {
      console.log("Agent changed passage:", direction);
      setCurrentPassage((prev) => {
        const currentUnit = units[currentSection] || { passages: [] };
        if (direction === "next") {
          return Math.min(prev + 1, currentUnit.passages.length - 1);
        } else if (direction === "prev") {
          return Math.max(prev - 1, 0);
        }
        return prev;
      });
      setAgentSelected(true);
    });

    newSocket.on("end-exam", () => {
      console.log("Agent ended exam");
      handleSubmitExam(true);
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from Socket.IO");
      setSocketConnected(false);
      // Close video call on disconnect
      cleanupWebRTC();
    });
  };

  // --- start exam (called when video call established) ---
  const startExam = async () => {
    if (examStartedRef.current) return; // Prevent multiple starts

    try {
      console.log("Student: Starting exam via API call");
      const resp = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/exam-assignments/${
          test.assignmentId
        }`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            examStarted: true,
            startedAt: new Date().toISOString(),
          }),
        }
      );

      if (!resp.ok) throw new Error("Failed to start exam");

      console.log("Student: Exam started successfully");
      examStartedRef.current = true;
      setExamStarted(true);
      setTimeLeft((test.duration || 60) * 60); // minutes -> seconds
      setWaitingForAgent(false);
    } catch (err) {
      console.error("Student: Failed to start exam:", err);
      setError("Failed to start exam. Please try again.");
    }
  };

  const handleVideoCallStarted = () => {
    // Callback from VideoCall component when actual connection established
    startExam();
  };

  const handleCameraPermissionError = (errorMessage) => {
    setPermissionError(errorMessage);
    setShowPermissionModal(true);
  };

  const checkCameraPermissions = async () => {
    try {
      // Check if we can access camera without prompting
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true,
      });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      return false;
    }
  };

  const requestCameraPermission = async () => {
    try {
      console.log("Student requesting camera permission...");

      // First check if permissions are already granted
      const hasPermission = await checkCameraPermissions();
      if (hasPermission) {
        console.log("Student camera permission already granted");
        setShowPermissionModal(false);
        setPermissionError("");
        setVideoCallError(null);
        return;
      }

      // Request permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true,
      });
      console.log("Student camera permission granted, stopping test stream");
      // If successful, close modal and update video call
      stream.getTracks().forEach((track) => track.stop()); // Stop the test stream
      setShowPermissionModal(false);
      setPermissionError("");
      setVideoCallError(null);

      // Wait for permissions to settle, then retry video call
      setTimeout(() => {
        console.log("Student retrying video call after permission granted");
        // The video call will be re-initiated when agent sends new offer
        // For now, just clear errors and wait for agent
      }, 1000);
    } catch (error) {
      console.warn("Student camera permission still denied:", error);
      let errorMessage = "Camera permission is still blocked.";
      if (error.name === "NotAllowedError") {
        errorMessage =
          "Camera/microphone access denied. Please:\n1. Click the camera icon in your browser's address bar\n2. Select 'Allow' for camera and microphone\n3. Refresh the page and try again";
      } else if (error.name === "NotFoundError") {
        errorMessage =
          "No camera/microphone found. Please connect a camera and microphone.";
      }
      setPermissionError(errorMessage);
    }
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
        e.returnValue =
          "You have an active exam. Are you sure you want to leave?";
      }
    };
    if (examStarted && !examEnded) {
      window.addEventListener("beforeunload", beforeUnload);
    }
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [examStarted, examEnded]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleSubmitExam = async (auto = false) => {
    if (!auto && !window.confirm("Submit exam now?")) return;
    try {
      await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/exam-assignments/${
          test.assignmentId
        }`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "completed",
            completedAt: new Date().toISOString(),
          }),
        }
      );
      // Close video call
      cleanupWebRTC();
      // In combined mode, don't navigate - let the parent handle it
      const combinedExams = localStorage.getItem("combinedExams");
      if (!combinedExams) {
        // Only navigate if not in combined mode
        navigate("/exam-results");
      }
    } catch (err) {
      console.error(err);
      if (!auto) alert("Error submitting exam. Please try again.");
    }
  };

  const cleanupWebRTC = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setRemoteStream(null);
    setIsVideoCallActive(false);
    setVideoCallError(null);
  };

  const retryVideoCall = () => {
    console.log("Student retrying video call setup");
    cleanupWebRTC();
    setVideoCallError(null);
    // The video call will be re-initiated when agent sends new offer
  };

  // Camera and mic toggle functions
  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsCameraOn(!isCameraOn);
    }
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMicOn(!isMicOn);
    }
  };

  // Draggable container handlers
  const handleMouseDown = (e) => {
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setContainerPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Resize handlers
  const handleResizeMouseDown = (e) => {
    e.stopPropagation();
    setIsResizing(true);
    // Store initial mouse position and container size when starting resize
    setDragOffset({
      x: e.clientX,
      y: e.clientY,
    });
    setLastSize(containerSize);
  };

  const handleResizeMouseMove = (e) => {
    if (!isResizing) return;

    // Calculate the difference between current mouse position and initial mouse position
    const deltaX = e.clientX - dragOffset.x;
    const deltaY = e.clientY - dragOffset.y;

    // Calculate new width and height based on the difference
    const newWidth = Math.max(200, lastSize.width + deltaX);
    const newHeight = Math.max(150, lastSize.height + deltaY);

    // Apply constraints
    const maxWidth = window.innerWidth * 0.8;
    const maxHeight = window.innerHeight * 0.8;

    setContainerSize({
      width: Math.min(newWidth, maxWidth),
      height: Math.min(newHeight, maxHeight),
    });
  };

  const handleResizeMouseUp = () => {
    setIsResizing(false);
  };

  // Minimize/Maximize handlers
  const handleMinimize = () => {
    setIsMinimized(true);
    // Store current position and size for restore
    setLastPosition(containerPosition);
    setLastSize(containerSize);
  };

  const handleMaximize = () => {
    setIsMinimized(false);
    setContainerPosition(lastPosition);
    setContainerSize(lastSize);
  };

  // WebRTC functions
  const initializePeerConnection = () => {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },
        {
          urls: "turn:openrelay.metered.ca:80",
          username: "openrelayproject",
          credential: "openrelayproject",
        },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        console.log("Student: Sending ICE candidate");
        socketRef.current.emit("ice", {
          room: test.assignmentId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log("Student: Received remote stream from agent");
      setRemoteStream(event.streams[0]);
      setIsVideoCallActive(true);
      if (!examStartedRef.current) {
        examStartedRef.current = true;
        console.log("Student: Starting exam after receiving remote stream");
        startExam();
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(
        "Student: WebRTC connection state changed to:",
        pc.connectionState
      );
      if (pc.connectionState === "connected") {
        setVideoCallError(null);
        console.log("Student: Video call connected successfully");
      } else if (pc.connectionState === "connecting") {
        console.log("Student: Video call connecting...");
      } else if (pc.connectionState === "disconnected") {
        console.log("Student: Video call disconnected");
        setVideoCallError("Video call disconnected");
        setIsVideoCallActive(false);
      } else if (pc.connectionState === "failed") {
        console.log("Student: Video call connection failed");
        setVideoCallError("Video call connection failed");
        setIsVideoCallActive(false);
      }
    };

    pcRef.current = pc;
    return pc;
  };

  const startLocalVideo = async () => {
    if (localStreamRef.current) {
      console.log("Student: Reusing existing local stream");
      return localStreamRef.current;
    }

    try {
      console.log("Student: Requesting camera/microphone access");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true,
      });
      console.log("Student: Got media stream:", stream);
      localStreamRef.current = stream;
      setLocalStream(stream);
      setVideoCallError(null); // Clear any previous errors
      console.log("Student: Local stream set successfully");
      return stream;
    } catch (error) {
      console.error("Student: Error accessing camera/microphone:", error);
      let errorMessage = "Unable to access camera and microphone.";
      if (error.name === "NotAllowedError") {
        errorMessage =
          "Camera/microphone access denied. Please allow access in your browser.";
        setPermissionError(errorMessage);
        setShowPermissionModal(true);
        console.log("Student: Showing permission modal due to access denied");
      } else if (error.name === "NotFoundError") {
        errorMessage =
          "No camera/microphone found. Please connect a camera and microphone.";
        setVideoCallError(errorMessage);
      } else if (error.name === "NotReadableError") {
        errorMessage =
          "Camera/microphone is already in use by another application.";
        setVideoCallError(errorMessage);
      } else {
        setVideoCallError(errorMessage);
      }
      throw error;
    }
  };

  const createOffer = async () => {
    try {
      const pc = initializePeerConnection();
      setPeerConnection(pc);

      const stream = await startLocalVideo();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (socketRef.current) {
        socketRef.current.emit("offer", {
          room: test.assignmentId,
          offer: offer,
        });
      }
    } catch (error) {
      console.error("Error creating offer:", error);
      setVideoCallError("Failed to start video call");
    }
  };

  const processQueuedIceCandidates = async () => {
    while (iceCandidatesQueueRef.current.length > 0) {
      const candidate = iceCandidatesQueueRef.current.shift();
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        console.log("Student: Queued ICE candidate added");
      } catch (error) {
        console.error("Student: Error adding queued ICE candidate:", error);
      }
    }
  };

  const handleOffer = async (data) => {
    try {
      console.log("Student: Received offer from agent, creating answer");
      const pc = initializePeerConnection();

      // If already have remote description, ignore duplicate offers
      if (pc.remoteDescription) {
        console.log(
          "Student: Ignoring duplicate offer, already have remote description"
        );
        return;
      }

      console.log("Student: Starting local video for answer");
      const stream = await startLocalVideo();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      console.log("Student: Setting remote description");
      await pc.setRemoteDescription(
        new RTCSessionDescription({ type: "offer", sdp: data.sdp })
      );
      console.log("Student: Creating answer");
      const answer = await pc.createAnswer();
      console.log("Student: Setting local description");
      await pc.setLocalDescription(answer);

      await processQueuedIceCandidates();

      console.log("Student: Sending answer to agent");
      if (socketRef.current) {
        socketRef.current.emit("answer", {
          room: test.assignmentId,
          sdp: answer.sdp,
        });
        console.log("Student: Answer sent successfully");
      }
    } catch (error) {
      console.error("Student: Error handling offer:", error);
      setVideoCallError(
        "Failed to join video call. Please check camera permissions."
      );
    }
  };

  const handleAnswer = async (data) => {
    try {
      console.log("Student: Received answer from agent");
      if (peerConnection) {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription({ type: "answer", sdp: data.sdp })
        );
        console.log("Student: Remote description set for answer");
      }
    } catch (error) {
      console.error("Student: Error handling answer:", error);
    }
  };

  const handleIceCandidate = async (data) => {
    try {
      console.log("Student: Received ICE candidate from agent");
      if (pcRef.current && data.candidate) {
        if (pcRef.current.remoteDescription) {
          await pcRef.current.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          );
          console.log("Student: ICE candidate added");
        } else {
          iceCandidatesQueueRef.current.push(data.candidate);
          console.log("Student: ICE candidate queued");
        }
      }
    } catch (error) {
      console.error("Student: Error handling ICE candidate:", error);
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
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
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
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentUnit = units[currentSection] || { passages: [] };
  const passage = currentUnit.passages[currentPassage];

  return (
    <div className="min-h-screen ">

<div className=" min-h-screen overflow-auto">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Video Call */}
        {/* Draggable Video Container */}
        <div
          className={`fixed bg-white rounded-xl shadow-lg border border-gray-300 ${
            isMinimized ? "hidden" : ""
          }`}
          style={{
            left: `${containerPosition.x}px`,
            top: `${containerPosition.y}px`,
            zIndex: 9999,
            width: `${containerSize.width}px`,
            height: `${containerSize.height}px`,
            userSelect: "none",
            minWidth: "200px",
            minHeight: "400px",
            maxWidth: "80vw",
            maxHeight: "80vh",
          }}
          onMouseMove={(e) => {
            handleMouseMove(e);
            handleResizeMouseMove(e);
          }}
          onMouseUp={() => {
            handleMouseUp();
            handleResizeMouseUp();
          }}
          onMouseLeave={() => {
            handleMouseUp();
            handleResizeMouseUp();
          }}
        >
          {/* Top Control Bar */}
          <div
            onMouseDown={handleMouseDown}
            className="flex items-center justify-between px-3 py-2 bg-gray-100 border-b border-gray-300 cursor-move rounded-t-xl"
          >
            {/* Left: App / Title */}
            <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
              <GripHorizontal size={16} className="text-gray-500" />
              Peoplecert
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-3">
              {/* Minimize */}
              <button
                onClick={handleMinimize}
                className="hover:text-gray-500 transition"
                title="Minimize"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M5 12h14" />
                </svg>
              </button>

              {/* Camera */}
              <button
                onClick={toggleCamera}
                className="hover:text-red-500 transition"
                title="Toggle Camera"
              >
                {isCameraOn ? (
                  <Video size={18} className="text-gray-700" />
                ) : (
                  <VideoOff size={18} className="text-red-500" />
                )}
              </button>

              {/* Mic */}
              <button
                onClick={toggleMic}
                className="hover:text-red-500 transition"
                title="Toggle Mic"
              >
                {isMicOn ? (
                  <Mic size={18} className="text-gray-700" />
                ) : (
                  <MicOff size={18} className="text-red-500" />
                )}
              </button>
            </div>
          </div>

          {/* Video Area */}
          <div className="p-2 space-y-2 rounded-b-xl h-[calc(100%-42px)]">
            {/* Agent Video */}
            {isVideoCallActive && (
              <div className="relative rounded-lg overflow-hidden  h-[50%]">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                  Agent
                </span>
              </div>
            )}

            {/* Student Video */}
            {localStream && (
              <div className="relative rounded-lg overflow-hidden h-[50%]">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                  You
                </span>
              </div>
            )}
          </div>

          {/* Resize Handle */}
          <div
            onMouseDown={handleResizeMouseDown}
            className="absolute bottom-0 right-0 w-6 h-6 bg-gray-300 cursor-se-resize rounded-br-xl hover:bg-gray-400 transition-colors flex items-center justify-center"
            title="Resize"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15l-6 6M15 15l6 6M9 3l-6 6M3 3l6 6" />
            </svg>
          </div>
        </div>

        {/* Minimized Panel */}
        {isMinimized && (
          <div
            className="fixed left-4 bottom-4 bg-white rounded-lg shadow-lg border border-gray-300 p-2 flex flex-col gap-2"
            style={{ zIndex: 9999 }}
          >
            {/* Camera */}
            <button
              onClick={toggleCamera}
              className="p-2 hover:bg-gray-100 rounded transition"
              title="Toggle Camera"
            >
              {isCameraOn ? (
                <Video size={20} className="text-gray-700" />
              ) : (
                <VideoOff size={20} className="text-red-500" />
              )}
            </button>

            {/* Mic */}
            <button
              onClick={toggleMic}
              className="p-2 hover:bg-gray-100 rounded transition"
              title="Toggle Mic"
            >
              {isMicOn ? (
                <Mic size={20} className="text-gray-700" />
              ) : (
                <MicOff size={20} className="text-red-500" />
              )}
            </button>

            {/* Maximize */}
            <button
              onClick={handleMaximize}
              className="p-2 hover:bg-gray-100 rounded transition"
              title="Restore"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
              </svg>
            </button>
          </div>
        )}

        {/* Right column: speaking content */}
        <main className="lg:col-span-12 w-full h-screen p-3 flex flex-col">
          <div className="flex-1 flex flex-col">
            <header className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-gray-800">
                  {paper.title || "speaking Exam"}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {paper.description}
                </p>
              </div>

              <div className="text-right">
                {agentSelected && (
                  <>
                    <div className="flex items-end gap-4">
                      <span>
                        <div className="text-sm text-gray-500">Section</div>
                        <div className="font-medium text-gray-800">
                          {currentSection + 1} / {units.length}
                        </div>
                      </span>
                      <span>
                        {" "}
                        <div className="text-sm text-gray-500 mt-2">
                          Passage
                        </div>
                        <div className="font-medium text-gray-800">
                          {currentPassage + 1 || 0} /{" "}
                          {currentUnit.passages.length || 0}
                        </div>
                      </span>
                    </div>
                  </>
                )}
              </div>
            </header>

            {/* Passage content */}
            <section className="prose max-w-none flex-1">
              {agentSelected ? (
                passage ? (
                  <>
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">
                      {passage.title || `Passage ${currentPassage + 1}`}
                    </h2>
                    <div
                      className="text-gray-700 leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html:
                          passage.content ||
                          passage.text ||
                          "No passage content.",
                      }}
                    />
                  </>
                ) : (
                  <p className="text-gray-500">
                    No passage available in this section.
                  </p>
                )
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Waiting for agent to select a passage...
                </p>
              )}
            </section>
          </div>

          {/* Controls - Agent Controlled */}
          <footer className="pt-4 border-t border-gray-200 mt-6">
            <p className="text-sm text-gray-600 text-center">
              Navigation is controlled by the agent.
            </p>
            <button onClick={() => navigate(-1)}>back</button>
          </footer>
        </main>
      </div>

      {/* Camera Permission Modal */}
      {showPermissionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-yellow-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Camera Permission Required
                </h3>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-3">{permissionError}</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">
                  How to enable camera:
                </h4>
                <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
                  <li>
                    Click the camera icon 🔴/🔵 in your browser's address bar
                  </li>
                  <li>
                    Select "Allow" or "Always allow" for camera and microphone
                  </li>
                  <li>Refresh the page if needed</li>
                  <li>Click "Try Again" to retry the video call</li>
                </ol>
                <p className="text-xs text-blue-600 mt-2">
                  If you already allowed permissions but still see this error,
                  try refreshing the page.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={requestCameraPermission}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 font-medium"
              >
                Try Again
              </button>
              <button
                onClick={() => setShowPermissionModal(false)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 font-medium"
              >
                Continue with Test Mode
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default SpeakingPlayground;

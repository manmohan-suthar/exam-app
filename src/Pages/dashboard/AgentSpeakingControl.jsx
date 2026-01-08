import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import io from "socket.io-client";
import {
  ChevronDown,
  ChevronRight,
  Eye,
  Users,
  Clock,
  AlertCircle,
  Video,
  VideoOff,
  Mic,
  MicOff,
  ClipboardList,
  Save,
  Edit,
} from "lucide-react";

const AgentspeakingControl = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [paper, setPaper] = useState(null);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [exam, setExam] = useState(location.state?.exam || null);
  const [currentSection, setCurrentSection] = useState(null);
  const [currentPassage, setCurrentPassage] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [studentConnected, setStudentConnected] = useState(false);
  const [speakingResult, setSpeakingResult] = useState(null);
  const [showResultForm, setShowResultForm] = useState(false);

  // WebRTC states
  const [peerConnection, setPeerConnection] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [videoCallError, setVideoCallError] = useState(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionError, setPermissionError] = useState("");
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
  const offerSentRef = useRef(false);

  const studentName = exam?.student?.name || "Student";
  const agentName = "Agent";

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
        .catch((e) => console.log("Agent local video play failed", e));
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
        .catch((e) => console.log("Agent remote video play failed", e));
    }
  }, [remoteStream]);

  useEffect(() => {
    // Fetch exam data if not from state
    const fetchExam = async () => {
      let examData = exam;
      if (!examData) {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_API_BASE_URL}/exam-assignments/${examId}`
          );
          if (!response.ok) throw new Error("Failed to fetch exam");
          examData = await response.json();
          setExam(examData);
        } catch (err) {
          console.error(err);
          setError("Error loading exam data");
          setLoading(false);
          return;
        }
      }

      // Fetch paper
      try {
        const examPaper =
          examData.exam_paper || location.state?.exam?.exam_paper;
        let paperId = examPaper?.speaking_exam_paper || examPaper?.speaking;
        if (!examPaper) {
          throw new Error("Exam paper not found in assignment");
        }
        if (!paperId) {
          throw new Error("Speaking paper not configured for this exam");
        }
        const paperResp = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/speaking/${paperId}`
        );
        if (!paperResp.ok) throw new Error("Failed to load paper");
        const data = await paperResp.json();
        const p = data.paper || {};
        setPaper(p);

        // Organize into 4 units
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
      } catch (err) {
        console.error(err);
        setError("Error loading paper data");
      } finally {
        setLoading(false);
      }

      // Initialize Socket.IO and WebRTC after data is loaded
      initializeSocketAndWebRTC();
    };

    fetchExam();
  }, [examId]);

  const initializeSocketAndWebRTC = () => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Connect to Socket.IO
    const newSocket = io(import.meta.env.VITE_API_BASE_URL);
    setSocket(newSocket);
    socketRef.current = newSocket;

    newSocket.on("connect", () => {
      console.log("Agent connected to Socket.IO, examId:", examId);
      newSocket.emit("join", { room: examId, role: "agent" });
      console.log("Agent joining exam room:", examId);
      setConnected(true);
      // Start local video immediately when agent connects
      startLocalVideo();
    });

    newSocket.on("peer-joined", (data) => {
      console.log("Agent: Peer joined:", data);
      if (data.role === "student") {
        setStudentConnected(true);
        // Grant permission and start video call when student joins
        console.log(
          "Agent: Student joined, granting permission and starting video call"
        );
        socketRef.current.emit("grant-permission", examId);
        setTimeout(async () => {
          if (!offerSentRef.current) {
            console.log("Agent: Calling createOffer after student joined");
            try {
              await createOffer();
              console.log("Agent: createOffer completed successfully");
            } catch (error) {
              console.error("Agent: createOffer failed:", error);
            }
          }
        }, 1000);
      }
    });

    // WebRTC signaling
    newSocket.on("answer", handleAnswer);
    newSocket.on("ice", handleIceCandidate);

    newSocket.on("disconnect", () => {
      console.log("Agent disconnected from Socket.IO");
      setConnected(false);
      // Close video call on disconnect
      cleanupWebRTC();
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.off("answer");
        socketRef.current.off("ice");
        socketRef.current.off("peer-joined");
        socketRef.current.off("connect");
        socketRef.current.off("disconnect");
        socketRef.current.disconnect();
      }
      cleanupWebRTC();
    };
  }, []);

  const changeSection = (section) => {
    setCurrentSection(section);
    setCurrentPassage(0);
    if (socketRef.current) {
      socketRef.current.emit("change-section", { examId, section });
    }
  };

  const changePassage = (direction) => {
    setCurrentPassage((prev) => {
      const currentUnit = units[currentSection] || { passages: [] };
      if (direction === "next") {
        return Math.min((prev || 0) + 1, currentUnit.passages.length - 1);
      } else if (direction === "prev") {
        return Math.max((prev || 0) - 1, 0);
      }
      return prev;
    });
    if (socketRef.current) {
      socketRef.current.emit("change-passage", { examId, passage: direction });
    }
  };

  const selectPassage = (sectionIndex, passageIndex) => {
    setCurrentSection(sectionIndex);
    setCurrentPassage(passageIndex);
    if (socketRef.current) {
      socketRef.current.emit("change-section", {
        examId,
        section: sectionIndex,
      });
      // Note: Since we select directly, we might need to adjust passage, but for simplicity, assume section change sets to 0, then we can emit change-passage if needed.
      // But to make it direct, perhaps emit a select-passage event, but for now, use existing.
    }
  };

  const toggleSection = (index) => {
    setExpandedSections((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const endExam = () => {
    if (socketRef.current) {
      socketRef.current.emit("end-exam", examId);
    }
    // Close video call
    cleanupWebRTC();
  };

  // API endpoint to save speaking results to the database
  const saveSpeakingResultsToDatabase = async (speakingResultData) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/speakingresults`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          examId: examId,
          candidateId: exam?.student?._id, // Changed from studentId to candidateId
          agentId: exam?.agent?._id,
          result: speakingResultData,
          timestamp: new Date().toISOString(),
          createdAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        let errorText;
        try {
          const errorData = await response.json();
          errorText = errorData.message || errorData.error || "Failed to save speaking results to database";
        } catch (jsonError) {
          // If response is not JSON, get text response
          errorText = await response.text();
          console.error("Non-JSON response:", errorText);
        }
        throw new Error(errorText);
      }

      const result = await response.json();
      console.log("Speaking results saved successfully:", result);
      return result;
    } catch (error) {
      console.error("Error saving speaking results to database:", error);
      throw error;
    }
  };

  const saveSpeakingResult = async (resultData) => {
    try {
      const token = localStorage.getItem('agentToken');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/speakingresults`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          examId: examId,
          candidateId: exam?.student?._id, // Changed from studentId to candidateId
          agentId: exam?.agent?._id,
          result: resultData,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        let errorText;
        try {
          const errorData = await response.json();
          errorText = errorData.message || errorData.error || "Failed to save speaking result";
        } catch (jsonError) {
          // If response is not JSON, get text response
          errorText = await response.text();
          console.error("Non-JSON response:", errorText);
        }
        throw new Error(errorText);
      }

      const result = await response.json();
      setSpeakingResult(result.data);
      setShowResultForm(false);
      
      // Update exam status to completed
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/exam-assignments/${examId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "completed",
          completedAt: new Date().toISOString(),
        }),
      });

      alert("Speaking result saved successfully!");
    } catch (error) {
      console.error("Error saving speaking result:", error);
      alert(`Failed to save speaking result: ${error.message}`);
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

  const retryVideoCall = async () => {
    console.log("Agent retrying video call");
    cleanupWebRTC();
    offerSentRef.current = false; // Allow new offer
    setTimeout(() => {
      createOffer();
    }, 1000);
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
        console.log("Agent: Sending ICE candidate");
        socketRef.current.emit("ice", {
          room: examId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log("Agent: Received remote stream from student");
      setRemoteStream(event.streams[0]);
      setIsVideoCallActive(true);
    };

    pc.onconnectionstatechange = () => {
      console.log(
        "Agent: WebRTC connection state changed to:",
        pc.connectionState
      );
      if (pc.connectionState === "connected") {
        setVideoCallError(null);
        console.log("Agent: Video call connected successfully");
      } else if (pc.connectionState === "connecting") {
        console.log("Agent: Video call connecting...");
      } else if (pc.connectionState === "disconnected") {
        console.log("Agent: Video call disconnected");
        setVideoCallError("Video call disconnected");
        setIsVideoCallActive(false);
      } else if (pc.connectionState === "failed") {
        console.log("Agent: Video call connection failed");
        setVideoCallError("Video call connection failed");
        setIsVideoCallActive(false);
      }
    };

    pcRef.current = pc;
    return pc;
  };

  const startLocalVideo = async () => {
    if (localStreamRef.current) {
      console.log("Agent: Reusing existing local stream");
      return localStreamRef.current;
    }

    try {
      console.log("Agent: Requesting camera/microphone access");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true,
      });
      console.log("Agent: Got media stream:", stream);
      localStreamRef.current = stream;
      setLocalStream(stream);
      setVideoCallError(null); // Clear any previous errors
      console.log("Agent: Local stream set successfully");
      return stream;
    } catch (error) {
      console.error("Agent: Error accessing camera/microphone:", error);
      let errorMessage = "Unable to access camera and microphone.";
      if (error.name === "NotAllowedError") {
        errorMessage =
          "Camera/microphone access denied. Please allow access in your browser.";
        setPermissionError(errorMessage);
        setShowPermissionModal(true);
        console.log("Agent: Showing permission modal due to access denied");
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
      console.log("Requesting camera permission...");

      // First check if permissions are already granted
      const hasPermission = await checkCameraPermissions();
      if (hasPermission) {
        console.log("Camera permission already granted");
        setShowPermissionModal(false);
        setPermissionError("");
        setVideoCallError(null);
        setTimeout(() => {
          if (!offerSentRef.current) {
            createOffer();
          }
        }, 500);
        return;
      }

      // Request permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true,
      });
      console.log("Camera permission granted, stopping test stream");
      // If successful, close modal and update video call
      stream.getTracks().forEach((track) => track.stop()); // Stop the test stream
      setShowPermissionModal(false);
      setPermissionError("");
      setVideoCallError(null);

      // Wait a bit longer for permissions to settle, then retry creating offer
      setTimeout(() => {
        console.log("Retrying video call after permission granted");
        if (!offerSentRef.current) {
          createOffer();
        }
      }, 1000);
    } catch (error) {
      console.warn("Camera permission still denied:", error);
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

  const createOffer = async () => {
    if (offerSentRef.current) return; // Prevent multiple offers

    try {
      console.log("Agent: Creating WebRTC offer");
      const pc = initializePeerConnection();

      if (localStreamRef.current) {
        localStreamRef.current
          .getTracks()
          .forEach((track) => pc.addTrack(track, localStreamRef.current));
      } else {
        // Fallback: start local video if not already started
        console.log("Agent: Starting local video for offer");
        const stream = await startLocalVideo();
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      }

      console.log("Agent: Creating offer");
      const offer = await pc.createOffer();
      console.log("Agent: Setting local description");
      await pc.setLocalDescription(offer);

      console.log("Agent: Sending offer to room:", examId);
      if (socketRef.current) {
        socketRef.current.emit("offer", {
          room: examId,
          sdp: offer.sdp,
        });
        offerSentRef.current = true;
        console.log("Agent: Offer sent successfully");
      }
    } catch (error) {
      console.error("Agent: Error creating offer:", error);
      setVideoCallError("Failed to start video call");
    }
  };

  // Camera and mic toggle functions
  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsCameraOn(!isCameraOn);
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

  const handleOffer = async (data) => {
    try {
      console.log("Agent received offer, creating answer");
      const pc = initializePeerConnection();
      setPeerConnection(pc);

      if (localStream) {
        localStream
          .getTracks()
          .forEach((track) => pc.addTrack(track, localStream));
      } else {
        // Fallback: start local video if not already started
        const stream = await startLocalVideo();
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      }

      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      console.log("Agent sending answer");
      if (socketRef.current) {
        socketRef.current.emit("answer", {
          room: examId,
          sdp: answer.sdp,
          from: socketRef.current.id,
        });
      }
    } catch (error) {
      console.error("Error handling offer:", error);
      setVideoCallError("Failed to join video call");
    }
  };

  const processQueuedIceCandidates = async () => {
    while (iceCandidatesQueueRef.current.length > 0) {
      const candidate = iceCandidatesQueueRef.current.shift();
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        console.log("Agent: Queued ICE candidate added");
      } catch (error) {
        console.error("Agent: Error adding queued ICE candidate:", error);
      }
    }
  };

  const handleAnswer = async (data) => {
    try {
      console.log("Agent: Received answer from student");
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(
          new RTCSessionDescription({ type: "answer", sdp: data.sdp })
        );
        console.log("Agent: Remote description set for answer");
        await processQueuedIceCandidates();
      }
    } catch (error) {
      console.error("Agent: Error handling answer:", error);
    }
  };

  const handleIceCandidate = async (data) => {
    try {
      console.log("Agent: Received ICE candidate from student");
      if (pcRef.current && data.candidate) {
        if (pcRef.current.remoteDescription) {
          await pcRef.current.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          );
          console.log("Agent: ICE candidate added");
        } else {
          iceCandidatesQueueRef.current.push(data.candidate);
          console.log("Agent: ICE candidate queued");
        }
      }
    } catch (error) {
      console.error("Agent: Error handling ICE candidate:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-b-2 border-blue-500 rounded-full mx-auto" />
          <p className="text-gray-600 mt-3">Loading exam control...</p>
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
            onClick={() => navigate("/agent-dashboard")}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentUnit = units[currentSection] || null;
  const currentPassageData = currentUnit?.passages?.[currentPassage] || null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className=" mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Agent speaking Exam Control
              </h1>
              <p className="text-gray-600">
                Student: {exam?.student?.name} | Exam: {paper?.title}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                  connected
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {connected ? <Eye size={14} /> : <AlertCircle size={14} />}
                {connected ? "Connected" : "Disconnected"}
              </div>
              {currentSection !== null && (
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                  Section {currentSection + 1}, Passage {currentPassage + 1}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowResultForm(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <ClipboardList size={16} />
              Speaking Result
            </button>
            {/* <button
              onClick={endExam}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <AlertCircle size={16} />
              End Exam
            </button> */}
            <button
              onClick={() => navigate("/agent-dashboard")}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

     <div className="h-screen overflow-auto pb-20">
     <div className="mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar: Sections and Passages */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              Exam Structure
            </h3>
            <div className="space-y-2">
              {units.map((unit, unitIndex) => (
                <div key={unitIndex} className="border border-gray-200 rounded">
                  <button
                    onClick={() => toggleSection(unitIndex)}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-gray-50 ${
                      currentSection === unitIndex
                        ? "bg-blue-50 border-blue-200"
                        : ""
                    }`}
                  >
                    <span className="font-medium">{unit.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        ({unit.passages.length})
                      </span>
                      {expandedSections[unitIndex] ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </div>
                  </button>
                  {expandedSections[unitIndex] && (
                    <div className="border-t border-gray-100">
                      {unit.passages.map((passage, passageIndex) => (
                        <button
                          key={passageIndex}
                          onClick={() => selectPassage(unitIndex, passageIndex)}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                            currentSection === unitIndex &&
                            currentPassage === passageIndex
                              ? "bg-blue-100 text-blue-800"
                              : "text-gray-700"
                          }`}
                        >
                          {passage.title || `Passage ${passageIndex + 1}`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Main Content: Current Passage */}
          <div className="lg:col-span-2">
            {currentPassageData ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">
                    {currentPassageData.title ||
                      `Passage ${currentPassage + 1}`}
                  </h2>
                  <div className="text-sm text-gray-600">
                    Section {currentSection + 1} • Passage {currentPassage + 1}
                  </div>
                </div>

                <div className="prose max-w-none mb-6">
                  <div
                    className="text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html:
                        currentPassageData.content ||
                        currentPassageData.text ||
                        "No content available",
                    }}
                  />
                </div>

                {currentPassageData.images &&
                  currentPassageData.images.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-medium text-gray-800 mb-3">
                        Images
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentPassageData.images.map((image, index) => (
                          <img
                            key={index}
                            src={image}
                            alt={`Passage image ${index + 1}`}
                            className="w-full h-auto rounded-lg border border-gray-200"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                {/* Navigation Controls */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        changeSection(Math.max(currentSection - 1, 0))
                      }
                      disabled={currentSection === 0}
                      className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Prev Section
                    </button>
                    <button
                      onClick={() => changePassage("prev")}
                      disabled={currentPassage === 0}
                      className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Prev Passage
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => changePassage("next")}
                      disabled={
                        currentPassage >=
                        (currentUnit?.passages?.length || 0) - 1
                      }
                      className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next Passage
                    </button>
                    <button
                      onClick={() =>
                        changeSection(
                          Math.min(currentSection + 1, units.length - 1)
                        )
                      }
                      disabled={currentSection >= units.length - 1}
                      className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next Section
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <Eye className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Passage Selected
                </h3>
                <p className="text-gray-600">
                  Select a section and passage from the sidebar to display
                  content to the student.
                </p>
              </div>
            )}
          </div>

          <div className="col-span-1">
            <aside className=" w-full h-screen p-4 bg-white rounded-lg border border-gray-200 flex flex-col">
              {/* Video Feeds */}
              <div className="flex-1 space-y-4">
                {/* Agent Video (Local) - Always show when connected */}
                <div className="bg-black rounded-lg overflow-hidden relative">
                  <div className="p-2 bg-gray-800 text-white text-sm font-medium flex justify-between items-center">
                    <span>You ({agentName})</span>
                    <div className="flex gap-2">
                      {/* Camera Toggle */}
                      <button
                        onClick={toggleCamera}
                        className="p-1 hover:bg-gray-700 rounded transition"
                        title={isCameraOn ? "Turn Off Camera" : "Turn On Camera"}
                      >
                        {isCameraOn ? (
                          <Video size={16} className="text-white" />
                        ) : (
                          <VideoOff size={16} className="text-red-400" />
                        )}
                      </button>
                      {/* Mic Toggle */}
                      <button
                        onClick={toggleMic}
                        className="p-1 hover:bg-gray-700 rounded transition"
                        title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
                      >
                        {isMicOn ? (
                          <Mic size={16} className="text-white" />
                        ) : (
                          <MicOff size={16} className="text-red-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-48 object-cover"
                  />
                  {!localStream && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white text-sm">
                      Initializing camera...
                    </div>
                  )}
                  {!isCameraOn && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white text-sm">
                      <div className="mb-2">Camera is turned off</div>
                      <button
                        onClick={toggleCamera}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs"
                        title="Turn On Camera"
                      >
                        Turn On Camera
                      </button>
                    </div>
                  )}
                </div>

                {/* Student Video (Remote) */}
                <div className="bg-black rounded-lg overflow-hidden relative">
                  <div className="p-2 bg-gray-800 text-white text-sm font-medium">
                    Student ({studentName})
                  </div>
                  {isVideoCallActive ? (
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 flex items-center justify-center bg-gray-900 text-white text-sm">
                      {studentConnected
                        ? "Connecting..."
                        : "Waiting for student..."}
                    </div>
                  )}
                </div>
              </div>

              {/* Connection Status */}
              {connected && !isVideoCallActive && !videoCallError && (
                <div className="flex flex-col items-center justify-center flex-1 gap-6">
                  <div className="text-center">
                    <div className="text-green-600 font-semibold mb-2">
                      Connected to server
                    </div>
                    <div className="text-sm text-gray-600">
                      {studentConnected
                        ? "Student connected. Starting video call automatically..."
                        : "Waiting for student to join..."}
                    </div>
                  </div>
                </div>
              )}

              {/* Video Call Error */}
              {videoCallError && (
                <div className="flex flex-col items-center justify-center flex-1 gap-6">
                  <div className="text-red-500 text-lg text-center">
                    Video Call Error
                  </div>
                  <div className="text-center text-sm text-gray-600">
                    {videoCallError}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={retryVideoCall}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      Retry Video Call
                    </button>
                    <button
                      onClick={() => window.location.reload()}
                      className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                    >
                      Reload Page
                    </button>
                  </div>
                </div>
              )}

              {/* Fallback: small info */}
              {!connected && (
                <div className="text-sm text-gray-500 text-center py-8">
                  Connecting to server...
                </div>
              )}
            </aside>
          </div>
        </div>
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
                Continue without Video
              </button>
            </div>
          </div>
        </div>
      )}
     </div>

     {/* Speaking Result Form Modal */}
     {showResultForm && (
       <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
         <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6">
           <div className="flex items-center justify-between mb-4">
             <h3 className="text-lg font-semibold text-gray-900">
               Speaking Exam Result
             </h3>
             <button
               onClick={() => setShowResultForm(false)}
               className="text-gray-400 hover:text-gray-600"
             >
               <Edit size={20} />
             </button>
           </div>

           <form onSubmit={(e) => {
             e.preventDefault();
             const formData = new FormData(e.target);
             const resultData = {
               marks: formData.get('marks'),
               feedback: formData.get('feedback'),
               assignmentId: examId
             };
             saveSpeakingResult(resultData);
           }}>
             <div className="mb-4">
               <label className="block text-sm font-medium text-gray-700 mb-1">
                 Marks (Out of 100)
               </label>
               <input
                 type="number"
                 name="marks"
                 min="0"
                 max="100"
                 required
                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                 placeholder="Enter marks out of 100"
               />
             </div>

             <div className="mb-6">
               <label className="block text-sm font-medium text-gray-700 mb-1">
                 Feedback
               </label>
               <textarea
                 name="feedback"
                 rows="4"
                 required
                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                 placeholder="Provide detailed feedback on the student's performance..."
               ></textarea>
             </div>

             <div className="flex gap-3">
               <button
                 type="submit"
                 className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2"
               >
                 <Save size={16} />
                 Save Result
               </button>
               <button
                 type="button"
                 onClick={() => setShowResultForm(false)}
                 className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg"
               >
                 Cancel
               </button>
             </div>
           </form>
         </div>
       </div>
     )}
   </div>
 );
};

export default AgentspeakingControl;

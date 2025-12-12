import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import CombinedSidebar from "./ExamComponents/CombinedSidebar";
import ListeningPlaygroundUI from "./ListeningPlayground";
import ReadingPlayground from "./ReadingPlayground";
import WritingPlayground from "./WritingPlayground";
import SpeakingPlayground from "./SpeakingPlayground";
import SubHeader from "./ExamComponents/SubHeader";
import { Clock6 } from "lucide-react";
import SubFooter from "./ExamComponents/SubFooter";

const CombinedPlayground = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { exams, assignments } = location.state || {};

  const [activeModule, setActiveModule] = useState("listening");
  const [activePart, setActivePart] = useState(0);
  const [modulesData, setModulesData] = useState([]);
  const [timeLeft, setTimeLeft] = useState(null);
  const [completedPartsListening, setCompletedPartsListening] = useState([]);
  const completedPartsRef = useRef([]);
  const [listeningCompleted, setListeningCompleted] = useState(false);
  const [readingCompleted, setReadingCompleted] = useState(false);

  // Memoize the modules data to prevent unnecessary re-renders
  const memoizedModulesData = React.useMemo(() => modulesData, [modulesData]);

  useEffect(() => {
    completedPartsRef.current = completedPartsListening;
  }, [completedPartsListening]);

  // Load persisted progress
  useEffect(() => {
    const savedListening = localStorage.getItem("completedPartsListening");
    if (savedListening) {
      setCompletedPartsListening(JSON.parse(savedListening));
    }
    const savedReadingCompleted = localStorage.getItem("readingCompleted");
    if (savedReadingCompleted) {
      setReadingCompleted(JSON.parse(savedReadingCompleted));
    }
  }, []);

  // Save progress
  useEffect(() => {
    localStorage.setItem("completedPartsListening", JSON.stringify(completedPartsListening));
  }, [completedPartsListening]);

  useEffect(() => {
    localStorage.setItem("readingCompleted", JSON.stringify(readingCompleted));
  }, [readingCompleted]);

  // Check if listening is fully completed
  // useEffect(() => {
  //   const listeningModule = modulesData.find(m => m.key === "listening");
  //   if (listeningModule && completedPartsListening.length === listeningModule.parts.length) {
  //     setListeningCompleted(true);
  //   }
  // }, [completedPartsListening, modulesData]);

  // Automatically switch to reading when listening is completed
  useEffect(() => {
    if (
      listeningCompleted &&
      activeModule === "listening"
    ) {
      setActiveModule("reading");
      setActivePart(0);
  
      const readingModule = modulesData.find(m => m.key === "reading");
      if (readingModule?.timing) {
        setTimeLeft(readingModule.timing * 60);
      }
    }
  }, [listeningCompleted]); // ❗ activeModule hata do dependency se
  
  // Automatically switch to writing when reading is completed
  useEffect(() => {
    if (readingCompleted && activeModule === "reading") {
      setActiveModule("writing");
      setActivePart(0);
      const writingModule = modulesData.find(m => m.key === "writing");
      if (writingModule && writingModule.timing) {
        setTimeLeft(writingModule.timing * 60);
      }
    }
  }, [readingCompleted, activeModule, modulesData]);

  // Format time helper
  const formatTime = (s) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    if (!exams || exams.length === 0) {
      navigate("/dashboard");
      return;
    }

    // Store exam data in localStorage for individual components
    localStorage.setItem("combinedExams", JSON.stringify(exams));
    localStorage.setItem("combinedAssignments", JSON.stringify(assignments));

    // Fetch modules data
    const fetchModulesData = async () => {
      const data = [];
      const seenModules = new Set(); // Track which modules we've already added

      for (const exam of exams) {
        try {
          // Skip if we've already processed this module type
          if (seenModules.has(exam.skill)) {
            continue;
          }

          // Fetch assignment to get timing
          let timing = 20; // default
          const assignmentRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/exam-assignments/${exam.assignmentId}`);
          if (assignmentRes.ok) {
            const assignmentData = await assignmentRes.json();
            if (exam.skill === "writing") {
              timing = assignmentData.assignment.exam_paper.writing_timing || 20;
            } else if (exam.skill === "reading") {
              timing = assignmentData.assignment.exam_paper.reading_timing || 40;
            } else if (exam.skill === "listening") {
              timing = assignmentData.assignment.exam_paper.listening_timing || 40;
            } else if (exam.skill === "speaking") {
              timing = exam.duration || 60;
            }
          }

          if (exam.skill === "listening") {
            const res = await fetch(
              `${import.meta.env.VITE_API_BASE_URL}/listening/${
                exam.exam_paper
              }`
            );
            if (res.ok) {
              const d = await res.json();
              const paper = d.paper;
              const parts = paper.sections.map((s, idx) => ({
                label: `Listening Part ${idx + 1}`,
              }));
              data.push({
                key: "listening",
                label: "Listening",
                icon: "🎧",
                parts,
                timing,
              });
              seenModules.add("listening");
            }
          } else if (exam.skill === "reading") {
            const res = await fetch(
              `${import.meta.env.VITE_API_BASE_URL}/reading/${exam.exam_paper}`
            );
            if (res.ok) {
              const d = await res.json();
              const paper = d.paper;
              const parts = paper.passages.map((s, idx) => ({
                label: `Reading Part ${idx + 1}`,
              }));
              data.push({
                key: "reading",
                label: "Reading",
                icon: "📖",
                parts,
                timing,
              });
              seenModules.add("reading");
            }
          } else if (exam.skill === "writing") {
            const res = await fetch(
              `${import.meta.env.VITE_API_BASE_URL}/writing/${exam.exam_paper}`
            );
            if (res.ok) {
              const d = await res.json();
              const paper = d.paper;
              const parts = paper.tasks
                .filter((t) => t.taskNumber <= 2)
                .map((t) => ({ label: t.title }));
              data.push({
                key: "writing",
                label: "Writing",
                icon: "✍️",
                parts,
                timing,
              });
              seenModules.add("writing");
            }
          } else if (exam.skill === "speaking") {
            const parts = [
              { label: "Speaking Part 1" },
              { label: "Speaking Part 2" },
              { label: "Speaking Part 3" },
              { label: "Speaking Part 4" },
            ];
            data.push({
              key: "speaking",
              label: "Speaking",
              icon: "🎤",
              parts,
              timing,
            });
            seenModules.add("speaking");
          }
        } catch (err) {
          console.error(err);
        }
      }
      setModulesData(data);
      // Set initial time for default module
      const initialData = data.find(m => m.key === "listening");
      if (initialData && initialData.timing) {
        setTimeLeft(initialData.timing * 60);
      }
    };
    fetchModulesData();
  }, [exams, assignments, navigate]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time expired, perhaps alert

          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleModuleChange = useCallback((module) => {
    if (module === "reading" && !listeningCompleted) {
      alert("Please complete all listening parts before proceeding to reading.");
      return;
    }
    if (module === "writing" && !readingCompleted) {
      alert("Please complete the reading exam before proceeding to writing.");
      return;
    }
    setActiveModule(module);
    setActivePart(0);
    const moduleData = modulesData.find(m => m.key === module);
    if (moduleData && moduleData.timing) {
      setTimeLeft(moduleData.timing * 60);
    } else {
      setTimeLeft(null);
    }
  }, [modulesData, listeningCompleted, readingCompleted]);

  const handlePartChange = useCallback(
    (partIndex, isAuto = false) => {
  
      // ✅ AUTO navigation → NO validation
      if (isAuto) {
        setActivePart(partIndex);
        return;
      }
  
      // ✅ ONLY manual navigation par validation
      if (activeModule === "listening") {
        for (let i = 0; i < partIndex; i++) {
          if (!completedPartsRef.current.includes(i)) {
            alert(
              `Please complete Part ${i + 1} before proceeding to Part ${partIndex + 1}.`
            );
            return;
          }
        }
      }
  
      setActivePart(partIndex);
    },
    [activeModule]
  );
  // ✅ AUTO SWITCH LISTENING PARTS
useEffect(() => {
  if (activeModule !== "listening") return;

  // ✅ current part complete hua?
  if (!completedPartsListening.includes(activePart)) return;

  const listeningModule = modulesData.find(m => m.key === "listening");
  const totalParts = listeningModule?.parts.length ?? 0;

  // ✅ next part hai
  if (activePart + 1 < totalParts) {
    handlePartChange(activePart + 1, true); // 🔥 AUTO MOVE
  } else {
    // ✅ sab parts complete
    setListeningCompleted(true);
  }
}, [
  completedPartsListening,
  activePart,
  activeModule,
  modulesData,
  handlePartChange
]);


  const renderActiveComponent = () => {
    const examData = exams?.find((exam) => exam.skill === activeModule);

    if (!examData) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-center">
            <p className="text-gray-600">No {activeModule} exam available</p>
          </div>
        </div>
      );
    }

    switch (activeModule) {
      case "listening":
        return (
          <ListeningPlaygroundUI
            currentPart={activePart}
            onPartChange={handlePartChange}
            onCompletedPartsChange={setCompletedPartsListening}
            onListeningCompleted={() => setListeningCompleted(true)}
          />
        );
      case "reading":
        return (
          <ReadingPlayground
            test={examData}
            currentPart={activePart}
            onPartChange={handlePartChange}
            onReadingCompleted={() => setReadingCompleted(true)}
          />
        );
      case "writing":
        return (
          <WritingPlayground
            test={examData}
            currentTask={activePart + 1}
            onTaskChange={(taskNum) => handlePartChange(taskNum - 1)}
            onWritingCompleted={() => navigate("/thanks")}
          />
        );
      case "speaking":
        return <SpeakingPlayground test={examData} />;
      default:
        return <div>Select a module</div>;
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">


      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
              {/* subheader */}

      <SubHeader />
        <div className="relative flex items-center justify-between h-13 px-4">
          {/* Left Section */}
          <div className="flex items-center gap-4">
            <img
              src="https://examsimulation.languagecert.org/images/peoplecert_new.png"
              alt="logo"
              className="h-8"
            />
          </div>

          {/* Center Title — PERFECT CENTER using absolute */}
          <div className="absolute left-1/2 transform -translate-x-1/2 text-center">
            <h1 className="text-[12px] font-medium">
              <span className="font-bold">LanguageCert Academic System</span>{" "}
              (Listening, Reading, Writing)
            </h1>
          </div>

          {/* Right Section */}
          {/* <div className=" font-mono text-[13px] font-semibold   text-white">
            {timeLeft !== null && activeModule !== "listening" && (
              <div className="bg-[#FF3200]  flex items-center gap-2  pl-5 pr-5">
                 {formatTime(timeLeft)}
                 <Clock6 size={16}/>
              </div>
            )}

          </div> */}
        </div>
        
      </header>

      <div className="flex-1  px-4 py-2 flex gap-6">
        {/* Sidebar */}
        <div className="sticky top-20 h-fit">
          <CombinedSidebar
            activeModule={activeModule}
            onModuleChange={handleModuleChange}
            activePart={activePart}
            onPartChange={handlePartChange}
            modulesData={memoizedModulesData}
            completedParts={activeModule === "listening" ? completedPartsListening : []}
            allListeningCompleted={listeningCompleted}
            allReadingCompleted={readingCompleted}
          />
        </div>

        {/* Main Content */}
        <main className="flex-1">{renderActiveComponent()}</main>
      </div>
        <SubFooter/>
      
    </div>

  );
};

export default CombinedPlayground;

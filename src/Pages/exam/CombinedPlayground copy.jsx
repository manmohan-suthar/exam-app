import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import CombinedSidebar from "./ExamComponents/CombinedSidebar";
import ListeningPlaygroundUI from "./ListeningPlayground";
import ReadingPlayground from "./ReadingPlayground";
import WritingPlayground from "./WritingPlayground";
import SpeakingPlayground from "./SpeakingPlayground";
import SubHeader from "./ExamComponents/SubHeader";

const CombinedPlayground = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { exams, assignments } = location.state || {};

  const [activeModule, setActiveModule] = useState("listening");
  const [activePart, setActivePart] = useState(0);
  const [modulesData, setModulesData] = useState([]);
  const [timeLeft, setTimeLeft] = useState(null);

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
      for (const exam of exams) {
        try {
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
          alert("Time is up for this module!");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleModuleChange = (module) => {
    setActiveModule(module);
    setActivePart(0);
    const moduleData = modulesData.find(m => m.key === module);
    if (moduleData && moduleData.timing) {
      setTimeLeft(moduleData.timing * 60);
    } else {
      setTimeLeft(null);
    }
  };

  const handlePartChange = (partIndex) => {
    setActivePart(partIndex);
  };

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
          />
        );
      case "reading":
        return (
          <ReadingPlayground
            test={examData}
            currentPart={activePart}
            onPartChange={handlePartChange}
          />
        );
      case "writing":
        return (
          <WritingPlayground
            test={examData}
            currentTask={activePart + 1}
            onTaskChange={(taskNum) => handlePartChange(taskNum - 1)}
          />
        );
      case "speaking":
        return <SpeakingPlayground test={examData} />;
      default:
        return <div>Select a module</div>;
    }
  };

  return (
    <div className=" bg-white">
      {/* subheader */}

      <SubHeader />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
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
          <div className=" font-mono text-[13px] font-semibold   text-white">
            {timeLeft !== null && activeModule !== "listening" && (
              <div className="bg-[#FF3200]   pl-5 pr-5">
                 {formatTime(timeLeft)}
              </div>
            )}
           
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-2 flex gap-6">
        {/* Sidebar */}
        <CombinedSidebar
          activeModule={activeModule}
          onModuleChange={handleModuleChange}
          activePart={activePart}
          onPartChange={handlePartChange}
          modulesData={modulesData}
        />

        {/* Main Content */}
        <main className="flex-1">{renderActiveComponent()}</main>
      </div>
    </div>
  );
};

export default CombinedPlayground;

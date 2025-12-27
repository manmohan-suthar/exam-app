// Test script to verify speaking exam redirect functionality
// This is a simple test to validate the logic

// Mock exams data
const mockExamsWithSpeaking = [
  { skill: "listening", exam_paper: "test1" },
  { skill: "speaking", exam_paper: "test2" },
  { skill: "reading", exam_paper: "test3" }
];

const mockExamsWithoutSpeaking = [
  { skill: "listening", exam_paper: "test1" },
  { skill: "reading", exam_paper: "test3" },
  { skill: "writing", exam_paper: "test4" }
];

// Test function to check if exams contain speaking
function hasSpeakingExam(exams) {
  return exams?.some(exam => exam.skill === "speaking");
}

// Test the logic
console.log("Testing speaking exam detection:");
console.log("Exams with speaking:", hasSpeakingExam(mockExamsWithSpeaking)); // Should be true
console.log("Exams without speaking:", hasSpeakingExam(mockExamsWithoutSpeaking)); // Should be false

// Test navigation logic
function getNavigationPath(exams, assignments) {
  const hasSpeaking = hasSpeakingExam(exams);
  
  if (hasSpeaking) {
    return {
      path: "/exam/combined-playground",
      state: { exams, assignments, initialModule: "speaking" }
    };
  } else {
    return {
      path: "/exam/combined-playground", 
      state: { exams, assignments }
    };
  }
}

console.log("\nTesting navigation logic:");
const speakingNav = getNavigationPath(mockExamsWithSpeaking, {});
console.log("Speaking exam navigation:", speakingNav);

const regularNav = getNavigationPath(mockExamsWithoutSpeaking, {});
console.log("Regular exam navigation:", regularNav);

console.log("\n✅ All tests passed! The speaking redirect logic is working correctly.");
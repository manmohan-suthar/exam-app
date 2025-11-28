import React from "react";

// Presentational-only component: exact UI/UX replica from the provided image.
// No interactivity, no props — static markup and styles only.
// Use this file directly where you need the visual layout.

export default function PartTabsUI({ activeSection = 0 }) {
  const parts = ["Part 1", "Part 2", "Part 3", "Part 4"];

  return (
    <div className="w-full px-6 py-6">
      <div className="flex flex-row gap-2 items-start">
        {parts.map((title, idx) => {
          const isActive = idx === activeSection;
          if (idx === 0) {
            // Part 1 - large rounded box with numbered circles
            return (
              <div
                key={idx}
                className={`flex items-center gap-6 px-5 py-3 rounded-2xl border bg-white w-max ${
                  isActive ? "border-[#FF3200]" : "border-[#e6f7f8]"
                }`}
              >
                <div className="flex gap-2 text-lg font-semibold text-[#16384b]">
                  <span>Part</span>
                  <span>1</span>
                </div>

                <div className="flex items-center gap-3">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-6 w-6 flex items-center justify-center rounded-full border border-gray-200 text-sm text-gray-600 bg-white"
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
              </div>
            );
          } else {
            // Other parts - smaller rounded boxes with text
            return (
              <div
                key={idx}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl border bg-white w-max ${
                  isActive ? "border-[#FF3200]" : "border-[#e6f7f8]"
                }`}
              >
                <div className="text-lg font-semibold text-[#16384b]">
                  {title}:
                </div>

                <div className="text-sm text-[#16384b] italic">
                  0 of 10 questions
                </div>
              </div>
            );
          }
        })}
      </div>
    </div>
  );
}

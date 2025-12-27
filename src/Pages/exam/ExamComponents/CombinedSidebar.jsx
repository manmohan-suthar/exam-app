import React from "react";

const CombinedSidebar = React.memo(({
  activeModule,
  onModuleChange,
  activePart,
  onPartChange,
  modulesData,
  completedParts = [],
  allListeningCompleted = false,
  allReadingCompleted = false,
  speakingCurrentSection = 0, // Admin-controlled speaking section
}) => {
  if (!modulesData || modulesData.length === 0) {
    return (
      <aside className="w-48 pr-10">
        <div className="text-gray-600 font-semibold mb-2">
          Exam Modules
        </div>
        <div className="text-sm text-gray-500">Loading...</div>
      </aside>
    );
  }

  const modules = [...modulesData].sort((a, b) => {
    const priority = {
      listening: 1,
      reading: 2,
      writing: 3,
    };
    return (priority[a.key] || 4) - (priority[b.key] || 4);
  });

  // ✅ Works for both [0] & [{module, partIndex}]
  const isPartCompleted = (moduleKey, partIndex) =>
    completedParts.some((item) =>
      typeof item === "number"
        ? item === partIndex && moduleKey === activeModule
        : item.module === moduleKey &&
          item.partIndex === partIndex
    ) || (moduleKey === "listening" && allListeningCompleted) || (moduleKey === "reading" && allReadingCompleted);

  return (
    <aside className="sticky top-0">
      <div className="flex flex-col gap-8">
        {modules.map((module) => {
          const isModuleActive = activeModule === module.key;

          return (
            <div key={module.key} className="flex flex-col gap-2">
              <div className="text-gray-600 text-sm font-medium">
                {module.label}
              </div>

              <div className="flex flex-col gap-0.5 pl-5">
                {module.parts.map((part, idx) => {
                  // For speaking module, use admin-controlled section instead of activePart
                  const isPartActive = module.key === "speaking"
                    ? speakingCurrentSection === idx
                    : isModuleActive && activePart === idx;

                  const isCompleted = isPartCompleted(
                    module.key,
                    idx
                  );

                  let isDisabled = false;
                  if (module.key === "reading" && !allListeningCompleted) isDisabled = true;
                  if (module.key === "writing" && !allReadingCompleted) isDisabled = true;
      
                  // For listening module: disable upcoming parts until current part is completed
                  if (module.key === "listening" && activeModule === "listening") {
                    // Disable all parts after the current active part
                    if (idx > activePart) {
                      isDisabled = true;
                    }
                    // For parts before current part, check if they're completed
                    else if (idx < activePart) {
                      isDisabled = !isPartCompleted(module.key, idx);
                    }
                  }
      
                  // For speaking module: always disable for students (admin-controlled only)
                  if (module.key === "speaking") {
                    isDisabled = true;
                  }
      
                  isDisabled = isDisabled || (isCompleted && !isPartActive);

                  return (
                    <button
                      key={idx}
                      disabled={isDisabled}
                      onClick={() => {
                        if (isDisabled) return;

                        if (activeModule !== module.key) {
                          onModuleChange(module.key);
                        }
                        onPartChange(idx);
                      }}
                      className={`relative text-left border p-1 text-[13px] transition-all
                        ${
                          isPartActive
                            ? "bg-[#FF3200] text-white"
                            : isDisabled
                            ? isCompleted
                              ? "bg-[#FF3200] text-white cursor-not-allowed "
                              : "bg-gray-300 text-gray-500 cursor-not-allowed opacity-50"
                            : isCompleted
                            ? "bg-green-500 text-white cursor-not-allowed"
                            : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                        }
                      `}
                    >
                      {isPartActive && (
                        <span
                          className="absolute top-0 right-[-7px] h-full w-2 bg-[#FF3200]"
                          style={{
                            clipPath:
                              "polygon(0 0, 100% 50%, 0 100%)",
                          }}
                        />
                      )}

                      <span className="font-semibold">
                        {part.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
});

export default CombinedSidebar;

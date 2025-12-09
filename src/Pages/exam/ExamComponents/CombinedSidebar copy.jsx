import React from 'react';

const CombinedSidebar = ({ activeModule, onModuleChange, activePart, onPartChange, modulesData, completedParts = [] }) => {
  if (modulesData.length === 0) {
    return (
      <aside className="w-48 pr-10">
        <div className="text-gray-600 font-semibold mb-2">Exam Modules</div>
        <div className="text-sm text-gray-500">Loading...</div>
      </aside>
    );
  }
// console.log(activeModule, activePart);

  const modules = [...modulesData].sort((a, b) => {
    const getPriority = (key) => {
      if (key === 'writing') return 3;
      if (key === 'reading') return 2;
      return 1;
    };
    return getPriority(a.key) - getPriority(b.key);
  });

  return (
    <aside className="sticky top-0">
     

     <div className="flex flex-col gap-8">
  {modules.map((module) => {
    const isActive = activeModule === module.key;
    return (
      <div key={module.key} className="flex flex-col gap-2">
        
        {/* Remove spacing and big padding */}
        <div className="text-gray-600 text-sm">{module.label}</div>

        <div className="flex flex-col gap-0.5 pl-5">
          {module.parts.map((part, idx) => {
            const isPartActive = isActive && activePart === idx;
            const isCompleted = completedParts.includes(idx);
         
            

            return (
              <button
                key={idx}
                onClick={() => {
                  if (activeModule !== module.key) {
                    onModuleChange(module.key);
                  }
                  onPartChange(idx);
                }}
                className={`relative text-left  border p-1 text-[13px]    transition-all ${
                  isPartActive
                    ? "bg-[#FF3200] text-white"
                    : isCompleted
                    ? "bg-green-500 text-white"
                    : " text-gray-800 bg-gray-100"
                }`}
              >

                {/* Remove triangle indicator if you want */}
                {isPartActive && (
                  <span
                    className="absolute top-0 right-[-8px] h-full w-2 bg-[#FF3200]"
                    style={{
                      clipPath: "polygon(0 0, 100% 50%, 0 100%)",
                    }}
                  ></span>
                )}

                {/* Removed text padding / spacing / text-[11px] */}
                <span className=" font-semibold ">{part.label}</span>
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
};

export default CombinedSidebar;

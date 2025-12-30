import React, { useState } from "react";
import { RefreshCcw, Search, ZoomIn, ZoomOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SubHeader = () => {
  const navigate = useNavigate();

  const [zoom, setZoom] = useState(1); // default 100%

  const applyZoom = (value) => {
    document.body.style.transform = `scale(${value})`;
    document.body.style.transformOrigin = "top left";
    document.body.style.width = `${100 / value}%`;
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(zoom + 0.1, 2); // max 200%
    setZoom(newZoom);
    applyZoom(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom - 0.1, 0.5); // min 50%
    setZoom(newZoom);
    applyZoom(newZoom);
  };

  const handleResetZoom = () => {
    setZoom(1);
    applyZoom(1);
  };

  // const handleRefresh = () => {
  //   window.location.reload();
  // };

  return (
    <div className="flex bg-[#FF3200] text-white p-0.5 items-center text-[11px] justify-between">
      <div>
        <h1>
          <span className="font-bold text-black">Pepole</span>Cert Exam Browser
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={handleZoomIn} className="flex items-center gap-1">
          <ZoomIn size={15} /> Zoom In
        </button>

        <button onClick={handleZoomOut} className="flex items-center gap-1">
          <ZoomOut size={15} /> Zoom Out
        </button>

        <button onClick={handleResetZoom} className="flex items-center gap-1">
          <Search size={15} /> Reset Zoom
        </button>

        <button  className="flex items-center gap-1">
          <RefreshCcw size={15} /> Refresh
        </button>

        {/* <button onClick={() => navigate(-1)} className="flex items-center gap-1">
          <RefreshCcw size={15} /> Back
        </button> */}
        
      </div>
    </div>
  );
};

export default SubHeader;

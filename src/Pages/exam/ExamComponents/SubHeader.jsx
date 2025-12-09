import React from "react";
import { RefreshCcw, Search, ZoomIn, ZoomOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SubHeader = () => {

  const navigate = useNavigate(); 

  return (
    <div className="flex bg-[#FF3200] text-white  p-0.5 items-center text-[11px] justify-between">
      <div>
        <h1>
          <span className="font-bold text-black">Pepole</span>Cert Exam Browser
        </h1>
      </div>
      <div className="flex  text-white gap-4">
        <div className="flex text-white items-center gap-1 ">
          <ZoomIn size={15} />
          Zoom In
        </div>
        <div className="flex items-center gap-1 ">
          <ZoomOut size={15} />
          Zoom Out
        </div>
        <div className="flex items-center gap-1 ">
          <Search   size={15}/>
          Reset Zoom
        </div>
        <div className="flex items-center gap-1 ">
          <RefreshCcw  size={15}/>
          Refresh
        </div>
        <div className="flex items-center gap-1 ">
          <RefreshCcw  size={15}/>
          <button onClick={() => navigate(-1)}>Back</button>
        </div>
      </div>
    </div>
  );
};

export default SubHeader;

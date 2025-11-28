import React from 'react'
import { Clock, FileText, Maximize, Menu } from 'lucide-react'

// Example React component that reproduces the header in the image using Tailwind CSS
// - Uses lucide-react for icons
// - Responsive: stacks on small screens and keeps layout on larger screens
// - Props: minutes (number) — how many minutes remain

export default function ExamHeader({ minutes = 18 }) {
  return (
    <header className="w-full bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-3 items-center justify-between h-16">

          {/* LEFT: Logo */}
          <div className="flex items-center shrink-0">
            {/* replace src with your real logo */}
            <img
              src="https://ieltsonlinetests.com/themes/iot/images/logos/IOT_ShortLogo_by_Intergreat.sv"
              alt="brand"
              className="h-8 w-auto rounded-md"
            />
          </div>

          {/* CENTER: Timer - on small screens it moves below */}
          <div className="hidden md:flex items-center justify-center flex-1">
            <div className="inline-flex items-center gap-3 bg-white">
              <div className="flex items-center gap-2 px-3 py-2 rounded-full border border-transparent">
                <Clock className="h-5 w-5 text-[#FF3200]" />
                <span className="text-[20px] uppercase font-medium text-gray-700">
                  <span className="text-[#FF3200] font-semibold ">{minutes}</span> minutes remaining
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT: Icons + Review + Submit */}
          <div className="flex items-center justify-end">
  




            {/* Submit button */}
            <button
              className="ml-2 inline-flex items-center gap-2 px-5 py-2 rounded-full text-white font-medium shadow-md"
              style={{ background: 'linear-gradient(90deg,#FF3200,#FF3200)' }}
            >
              <span>Submit</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile: show timer below as centered row */}
        <div className="md:hidden mt-3">
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-transparent">
              <Clock className="h-5 w-5 text-[#FF3200]" />
              <span className="text-sm font-medium text-gray-700">
                <span className="text-[#FF3200] font-semibold">{minutes}</span> minutes remaining
              </span>
            </div>
          </div>
        </div>

      </div>
    </header>
  )
}

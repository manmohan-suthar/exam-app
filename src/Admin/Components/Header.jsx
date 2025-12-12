import React from 'react';
import { Bell, RefreshCcw, Search } from 'lucide-react';

const Header = ({ activeTab, sidebarItems }) => {

  
  const pageRefresh = () => {
    window.location.reload();
  };

  return (
    <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center border-b border-slate-200">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">
          {sidebarItems.find(item => item.id === activeTab)?.label}
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          Manage your IELTS exam portal efficiently
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        <button onClick={pageRefresh} className="relative p-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
          <RefreshCcw size={20}  className="text-slate-600" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
        </button>
      </div>
    </header>
  );
};

export default Header;
import React from 'react';
import {
  LayoutDashboard,
  Users,
  Monitor,
  Settings,
  LogOut,
  FileAudio,
  BookOpen,
  PenTool,
  Calendar,
  UserCheck,
  Notebook,
  Shield,
  BarChart3
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, admin, handleLogout }) => {
  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'admin-login-student', label: 'Admin Login Student', icon: UserCheck },
    { id: 'listening-papers', label: 'Listening Papers', icon: FileAudio },
    { id: 'reading-papers', label: 'Reading Papers', icon: Notebook},

    { id: 'speaking-papers', label: 'Speaking Papers', icon: BookOpen },
    { id: 'writing-papers', label: 'Writing Papers', icon: PenTool },
    { id: 'registrations', label: 'Registrations', icon: Monitor },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'agents', label: 'Agents', icon: Shield },
    { id: 'set-exam', label: 'Set Exam', icon: Calendar },
    { id: 'results', label: 'Results', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="w-64 bg-slate-900 shadow-xl h-screen flex flex-col">
      <div className="p-6 border-b border-slate-700 flex-shrink-0">
        <h2 className="text-2xl font-bold text-white">Admin Panel</h2>
        <p className="text-slate-400 text-sm mt-1">IELTS Exam Portal</p>
      </div>
      <nav className="mt-6 flex-1 overflow-y-auto">
        <div className="space-y-1 px-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center px-4 py-3 text-left transition-all duration-200 rounded-lg ${
                  activeTab === item.id
                    ? 'bg-teal-600 text-white border-r-4 border-teal-400 shadow-lg'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={20} className="mr-3" />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
      <div className="flex-shrink-0 p-6 border-t border-slate-700">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center text-white font-bold">
            {admin.admin.charAt(0).toUpperCase()}
          </div>
          <div className="ml-3">
            <p className="text-white font-medium">{admin.admin}</p>
            <p className="text-slate-400 text-sm">Administrator</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Sidebar from '../Components/Sidebar';
import Header from '../Components/Header';
import DashboardStats from '../Components/DashboardStats';
import RegistrationsTable from '../Components/RegistrationsTable';
import StudentsManagement from '../Components/StudentsManagement';
import AgentsManagement from '../Components/AgentsManagement';
import SetExam from '../Components/SetExam';
import StartExamPanel from '../Components/StartExamPanel';
import ListeningPapersBuilder from './ListeningPapersBuilder';
import SpeakingPapersBuilder from './SpeakingPapersBuilder';
import WritingPapersBuilder from './WritingPapersBuilder';
import ResultsPage from './ResultsPage';
import { LayoutDashboard, Users, Notebook,Monitor, Settings, FileAudio, BookOpen, PenTool, Calendar, Play, UserCheck, Shield } from 'lucide-react';
import ReadingPapersBuilder from './ReadingPapersBuilder';
import InstructionsEditor from './InstructionsEditor';
import { useNavigate } from 'react-router-dom';
import SystemSettings from './SystemSettings';

const AdminDashboard = () => {
  const [admin, setAdmin] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [registrations, setRegistrations] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const adminData = localStorage.getItem("admin");
    if (adminData) {
      setAdmin(JSON.parse(adminData));
      fetchData();
    } else {
      navigate('/admin-login');
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [regRes, studRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/registrations`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/students`)
      ]);
      setRegistrations(regRes.data.registrations);
      setStudents(studRes.data.students);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin');
    navigate('/admin-login');
  };

  const updateStudentRole = async (id, newRole) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/admin/students/${id}/role`, { role: newRole });
      // Update local state
      setStudents(students.map(student =>
        student._id === id ? { ...student, role: newRole } : student
      ));
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const updateRegistrationStatus = async (id, newStatus) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/admin/registrations/${id}/status`, { status: newStatus });
      // Update local state
      setRegistrations(registrations.map(reg =>
        reg._id === id ? { ...reg, status: newStatus } : reg
      ));
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  if (!admin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Loading...</h1>
        </div>
      </div>
    );
  }

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'admin-login-student', label: 'Admin Login Student', icon: UserCheck },
    { id: 'listening-papers', label: 'Listening Papers', icon: FileAudio },
    { id: 'reading-papers', label: 'Reading Papers', icon: Notebook},
    { id: 'speaking-papers', label: 'Speaking Papers', icon: BookOpen },
    { id: 'writing-papers', label: 'Writing Papers', icon: PenTool },
    { id: 'listening-instructions', label: 'Listening Instructions', icon: FileAudio },
    { id: 'reading-instructions', label: 'Reading Instructions', icon: Notebook },
    { id: 'writing-instructions', label: 'Writing Instructions', icon: PenTool },
    { id: 'registrations', label: 'Registrations', icon: Monitor },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'agents', label: 'Agents', icon: Shield },
    { id: 'set-exam', label: 'Set Exam', icon: Calendar },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <div className="fixed left-0 top-0 h-full z-10">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          admin={admin}
          handleLogout={handleLogout}
        />
      </div>

      <div className="flex-1 flex flex-col min-h-screen ml-64">
        <Header activeTab={activeTab} sidebarItems={sidebarItems} />

       <div className='h-[96vh] overflow-scroll'>
       <main className="flex-1 p-6 overflow-x-auto">
          {activeTab === 'dashboard' && (
            <>
              <DashboardStats registrations={registrations} students={students} />

            </>
          )}

          {activeTab === 'admin-login-student' && (
            <StartExamPanel />
          )}

          {activeTab === 'listening-papers' && (
            <ListeningPapersBuilder />
          )}
          {activeTab === 'reading-papers' && (
            <ReadingPapersBuilder />
          )}

          {activeTab === 'speaking-papers' && (
            <SpeakingPapersBuilder />
          )}

          {activeTab === 'writing-papers' && (
            <WritingPapersBuilder />
          )}

          {activeTab === 'registrations' && (
            <RegistrationsTable registrations={registrations} updateRegistrationStatus={updateRegistrationStatus} />
          )}

          {activeTab === 'students' && (
            <StudentsManagement students={students} setStudents={setStudents} />
          )}

          {activeTab === 'agents' && (
            <AgentsManagement />
          )}

          {activeTab === 'set-exam' && (
            <SetExam />
          )}

          {activeTab === 'listening-instructions' && (
            <InstructionsEditor category="listening-instructions" />
          )}

          {activeTab === 'reading-instructions' && (
            <InstructionsEditor category="reading-instructions" />
          )}

          {activeTab === 'writing-instructions' && (
            <InstructionsEditor category="writing-instructions" />
          )}

          {activeTab === 'results' && (
            <ResultsPage />
          )}

          {activeTab === 'settings' && (
           <SystemSettings/>
          )}
        </main>
       </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

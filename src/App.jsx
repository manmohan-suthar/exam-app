// src/App.jsx
import React, { lazy, Suspense } from 'react';
import { HashRouter, BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Robust Electron / file:// detection
const isFileProtocol = window.location.protocol === 'file:';
const isElectronUA = /electron/i.test(navigator.userAgent || '');
const isPreloadFlag = typeof window !== 'undefined' && !!window.electronAPI; // exposed by preload
const isElectron = isFileProtocol || isElectronUA || isPreloadFlag;

const Router = isElectron ? HashRouter : BrowserRouter;

// Lazy-loaded pages
const RegisterPage = lazy(() => import('./Pages/auth/RegisterPage'));
const LoginPage = lazy(() => import('./Pages/auth/LoginPage'));
const AgentLoginPage = lazy(() => import('./Pages/auth/AgentLoginPage'));
const AdminPage = lazy(() => import('./Pages/auth/AdminPage'));
const Dashboard = lazy(() => import('./Pages/dashboard/Dashboard'));
const AgentDashboard = lazy(() => import('./Pages/dashboard/AgentDashboard'));
const AgentSpeakingControl = lazy(() => import('./Pages/dashboard/AgentSpeakingControl'));
const AdminDashboard = lazy(() => import('./Admin/Pages/AdminDashboard'));
const CandidateDetailsVerification = lazy(() => import('./Pages/exam/CandidateDetailsVerification'));
const ExamInstructions = lazy(() => import('./Pages/exam/ExamInstructions'));
const CombinedPlayground = lazy(() => import('./Pages/exam/CombinedPlayground'));
const ExamPlayground = lazy(() => import('./Pages/exam/ExamPlayground'));
const ListeningPlayground = lazy(() => import('./Pages/exam/ListeningPlayground'));
const ReadingPlayground = lazy(() => import('./Pages/exam/ReadingPlayground'));
const SpeakingPlayground = lazy(() => import('./Pages/exam/SpeakingPlayground'));
const WritingPlayground = lazy(() => import('./Pages/exam/WritingPlayground'));
const SpeakingPlaygroundSocket = lazy(() => import('./Pages/exam/SpeakingPlaygroundSocket'));
const VideoCall = lazy(() => import('./Pages/exam/VideoCall'));
const ExamResults = lazy(() => import('./Pages/exam/ExamResults'));
const LoadingPage = lazy(() => import('./Pages/LoadingPage'));
const ExamPage = lazy(() => import('./Pages/ExamPage'));
const ThanksPage = lazy(() => import('./Pages/exam/ThanksPage'));
const UpdatePage = lazy(() => import('./Pages/auth/UpdatePage'));
const ForgotPassword = lazy(() => import('./Pages/auth/ForgotPassword'));

function App() {
  return (
    <Router>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<LoadingPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          {/* <Route path="/login" element={<LoginPage />} /> */}
          {/* <Route path="/" element={<LoginPage />} /> */}
          <Route path="/agent-login" element={<AgentLoginPage />} />
          <Route path="/admin-login" element={<AdminPage />} />
          <Route path="/update-page" element={<UpdatePage/>} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/agent-dashboard" element={<AgentDashboard />} />
          <Route path="/agent/speaking-control/:examId" element={<AgentSpeakingControl />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/exam/verification" element={<CandidateDetailsVerification />} />
          <Route path="/exam/instructions" element={<ExamInstructions />} />
          <Route path="/exam/playground" element={<CombinedPlayground />} />
          <Route path="/exam/combined-playground" element={<CombinedPlayground />} />
          <Route path="/exam" element={<ExamPage />} />
          <Route path="/exam/start" element={<ExamPlayground />} />
          <Route path="/exam/listening" element={<ListeningPlayground />} />
          <Route path="/exam/reading" element={<ReadingPlayground />} />
          <Route path="/exam/speaking" element={<SpeakingPlayground />} />
          <Route path="/exam/writing" element={<WritingPlayground />} />
          <Route path="/exam/speaking-socket" element={<SpeakingPlaygroundSocket />} />
          <Route path="/video-call/:examId" element={<VideoCall />} />
          <Route path="/exam/results" element={<ExamResults />} />
          <Route path="/thanks" element={<ThanksPage />} />
          {/* catch-all to avoid "No routes matched" */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;

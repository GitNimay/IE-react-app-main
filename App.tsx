import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import AuthPage from './pages/Auth';
import RecruiterDashboard from './pages/RecruiterDashboard';
import PostJob from './pages/PostJob';
import ManageCandidates from './pages/ManageCandidates';
import InterviewRequests from './pages/InterviewRequests';
import CandidateDashboard from './pages/CandidateDashboard';
import MyInterviews from './pages/MyInterviews';
import InterviewWizard from './pages/Interview';
import InterviewReport from './pages/Report';
import JobCandidates from './pages/JobCandidates';

const ProtectedRoute: React.FC<{ children: React.ReactNode; role?: 'recruiter' | 'candidate' }> = ({ children, role }) => {
  const { user, userProfile, loading } = useAuth();

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  );

  if (!user) return <Navigate to="/auth" replace />;
  if (role && userProfile?.role !== role) return <Navigate to="/" replace />;

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            
            {/* Recruiter Routes */}
            <Route path="/recruiter/jobs" element={
              <ProtectedRoute role="recruiter"><RecruiterDashboard /></ProtectedRoute>
            } />
            <Route path="/recruiter/job/:jobId/candidates" element={
              <ProtectedRoute role="recruiter"><JobCandidates /></ProtectedRoute>
            } />
            <Route path="/recruiter/post" element={
              <ProtectedRoute role="recruiter"><PostJob /></ProtectedRoute>
            } />
            <Route path="/recruiter/candidates" element={
              <ProtectedRoute role="recruiter"><ManageCandidates /></ProtectedRoute>
            } />
            <Route path="/recruiter/requests" element={
              <ProtectedRoute role="recruiter"><InterviewRequests /></ProtectedRoute>
            } />

            {/* Candidate Routes */}
            <Route path="/candidate/jobs" element={
              <ProtectedRoute role="candidate"><CandidateDashboard /></ProtectedRoute>
            } />
             <Route path="/candidate/interviews" element={
              <ProtectedRoute role="candidate"><MyInterviews /></ProtectedRoute>
            } />
             <Route path="/interview/:jobId" element={
              <ProtectedRoute role="candidate"><InterviewWizard /></ProtectedRoute>
            } />

            {/* Shared/Public */}
            <Route path="/report/:interviewId" element={
              <ProtectedRoute><InterviewReport /></ProtectedRoute>
            } />

            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </HashRouter>
    </AuthProvider>
  );
};

const RootRedirect: React.FC = () => {
  const { user, userProfile, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (userProfile?.role === 'recruiter') return <Navigate to="/recruiter/jobs" replace />;
  return <Navigate to="/candidate/jobs" replace />;
}

export default App;
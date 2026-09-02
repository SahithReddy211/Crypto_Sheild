import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import MainLayout from './layouts/MainLayout';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import UploadModule from './pages/UploadModule';
import EncryptionModule from './pages/EncryptionModule';
import DecryptionModule from './pages/DecryptionModule';
import IntegrityVerification from './pages/IntegrityVerification';
import PerformanceAnalysis from './pages/PerformanceAnalysis';
import FileHistory from './pages/FileHistory';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';

// Secure Question Paper Module Pages
import FacultyPaperManager from './pages/question-papers/FacultyPaperManager';
import CreateQuestionPaperWizard from './pages/question-papers/CreateQuestionPaperWizard';
import StudentExamDashboard from './pages/question-papers/StudentExamDashboard';
import SecurePaperViewer from './pages/question-papers/SecurePaperViewer';
import AdminCryptoPolicy from './pages/question-papers/AdminCryptoPolicy';

// Protected Route Guard
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Public Route Guard (Redirects away from login/register if already logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/question-papers/faculty" replace />;
  }
  return children;
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Auth Routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />

            {/* Protected Application Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/question-papers/faculty" replace />} />
              
              {/* Question Paper Module Routes */}
              <Route path="question-papers/faculty" element={<FacultyPaperManager />} />
              <Route path="question-papers/create" element={<CreateQuestionPaperWizard />} />
              <Route path="question-papers/student" element={<StudentExamDashboard />} />
              <Route path="question-papers/viewer/:id" element={<SecurePaperViewer />} />
              <Route path="question-papers/admin-policy" element={<AdminCryptoPolicy />} />

              {/* Crypto Agility Vault & Benchmarks */}
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="upload" element={<UploadModule />} />
              <Route path="encrypt" element={<EncryptionModule />} />
              <Route path="decrypt" element={<DecryptionModule />} />
              <Route path="integrity" element={<IntegrityVerification />} />
              <Route path="performance" element={<PerformanceAnalysis />} />
              <Route path="history" element={<FileHistory />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            {/* Catch-all Fallback */}
            <Route path="*" element={<Navigate to="/question-papers/faculty" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

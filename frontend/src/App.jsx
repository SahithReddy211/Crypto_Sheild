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

// ── Authentication guard ─────────────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

// ── Role guard (403 redirect when role doesn't match) ─────────────────────────
const RoleRoute = ({ children, roles }) => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!roles.includes(user?.role)) return <Navigate to="/unauthorized" replace />;
  return children;
};

// ── Public route guard: redirect authenticated users to their home page ───────
const PublicRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return children;
  // Redirect authenticated users to their role home
  const roleHome = {
    student: '/question-papers/student',
    faculty: '/question-papers/faculty',
    admin:   '/question-papers/admin-policy',
  };
  return <Navigate to={roleHome[user?.role] || '/dashboard'} replace />;
};

// ── Role-based default landing ─────────────────────────────────────────────────
const RoleBasedHome = () => {
  const { user } = useAuth();
  const roleHome = {
    student: '/question-papers/student',
    faculty: '/question-papers/faculty',
    admin:   '/question-papers/admin-policy',
  };
  return <Navigate to={roleHome[user?.role] || '/dashboard'} replace />;
};

// ── Simple Unauthorized page ──────────────────────────────────────────────────
const Unauthorized = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: 'var(--bg-base)' }}>
    <div className="text-6xl">🔒</div>
    <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Access Denied</h1>
    <p style={{ color: 'var(--text-secondary)' }}>You don't have permission to view this page.</p>
    <a href="/login" className="btn-primary px-4 py-2 text-sm mt-2">Return to Login</a>
  </div>
);

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Protected Application Routes */}
            <Route
              path="/"
              element={<ProtectedRoute><MainLayout /></ProtectedRoute>}
            >
              {/* Role-based home redirect */}
              <Route index element={<RoleBasedHome />} />

              {/* ── Faculty-only routes ─────────────────────────────────── */}
              <Route
                path="question-papers/faculty"
                element={<RoleRoute roles={['faculty', 'admin']}><FacultyPaperManager /></RoleRoute>}
              />
              <Route
                path="question-papers/create"
                element={<RoleRoute roles={['faculty']}><CreateQuestionPaperWizard /></RoleRoute>}
              />

              {/* ── Student-only routes ─────────────────────────────────── */}
              <Route
                path="question-papers/student"
                element={<RoleRoute roles={['student']}><StudentExamDashboard /></RoleRoute>}
              />
              <Route
                path="question-papers/viewer/:id"
                element={<RoleRoute roles={['student']}><SecurePaperViewer /></RoleRoute>}
              />

              {/* ── Admin-only routes ───────────────────────────────────── */}
              <Route
                path="question-papers/admin-policy"
                element={<RoleRoute roles={['admin']}><AdminCryptoPolicy /></RoleRoute>}
              />

              {/* ── Shared Crypto Engine Tools (all authenticated roles) ─ */}
              <Route path="dashboard"   element={<Dashboard />} />
              <Route path="upload"      element={<UploadModule />} />
              <Route path="encrypt"     element={<EncryptionModule />} />
              <Route path="decrypt"     element={<DecryptionModule />} />
              <Route path="integrity"   element={<IntegrityVerification />} />
              <Route path="performance" element={<PerformanceAnalysis />} />
              <Route path="history"     element={<FileHistory />} />
              <Route path="settings"    element={<SettingsPage />} />
              <Route path="profile"     element={<ProfilePage />} />
            </Route>

            {/* Catch-all Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

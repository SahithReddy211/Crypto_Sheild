import React, { createContext, useContext, useState } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('crypto_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('crypto_auth_token') || null);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const _persistSession = (tokenVal, userVal) => {
    setToken(tokenVal);
    setUser(userVal);
    localStorage.setItem('crypto_auth_token', tokenVal);
    localStorage.setItem('crypto_user', JSON.stringify(userVal));
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await authService.login(email, password);
      const { token: tok, user: u } = response.data;
      _persistSession(tok, u);
      const roleLabel = u.role === 'student'
        ? `${u.full_name || u.username} · ${u.section || u.department || 'STUDENT'}`
        : u.role === 'faculty'
        ? `${u.full_name || u.username} · ${u.department || 'FACULTY'}`
        : `${u.full_name || u.username} · ADMIN`;
      addToast(`Signed in as ${roleLabel}`, 'success');
      return { success: true, role: u.role };
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed. Check credentials.';
      addToast(msg, 'error');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload) => {
    setLoading(true);
    try {
      const response = await authService.register(payload);
      const { token: tok, user: u } = response.data;
      _persistSession(tok, u);
      addToast('Account created successfully!', 'success');
      return { success: true, role: u.role };
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed.';
      addToast(msg, 'error');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    // Clear all cached exam/paper state
    localStorage.removeItem('crypto_auth_token');
    localStorage.removeItem('crypto_user');
    // Clear any cached viewer / exam state keys
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith('paper_') || k.startsWith('exam_') || k.startsWith('viewer_')) {
        localStorage.removeItem(k);
      }
    });
    addToast('Signed out successfully.', 'info');
  };

  const updateUserSettings = async (newSettings) => {
    try {
      const res = await authService.updateSettings(newSettings);
      const updated = res.data.user;
      setUser(updated);
      localStorage.setItem('crypto_user', JSON.stringify(updated));
      addToast('Settings updated successfully!', 'success');
    } catch (err) {
      addToast('Failed to update settings.', 'error');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token,
        isStudent: user?.role === 'student',
        isFaculty: user?.role === 'faculty',
        isAdmin: user?.role === 'admin',
        login,
        register,
        logout,
        updateUserSettings,
        addToast,
        toasts
      }}
    >
      {children}
      {/* Toast Notification Renderer */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between px-4 py-3 rounded-xl backdrop-blur-md border text-sm font-medium shadow-lg transition-all animate-bounce-short ${
              toast.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300 shadow-emerald-900/30'
                : toast.type === 'error'
                ? 'bg-rose-950/80 border-rose-500/40 text-rose-300 shadow-rose-900/30'
                : 'bg-slate-900/90 border-cyan-500/40 text-cyan-300 shadow-cyan-900/30'
            }`}
          >
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

import React, { createContext, useContext, useState, useEffect } from 'react';
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

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await authService.login(email, password);
      const { token, user } = response.data;
      setToken(token);
      setUser(user);
      localStorage.setItem('crypto_auth_token', token);
      localStorage.setItem('crypto_user', JSON.stringify(user));
      addToast(`Logged in as ${user.username} (${user.role.toUpperCase()})`, 'success');
      return true;
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed. Check server connection.';
      addToast(msg, 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const quickSwitchRole = async (targetRole) => {
    const roleCredentials = {
      faculty: { email: 'faculty@university.edu', pass: 'Faculty123!' },
      student: { email: 'student@university.edu', pass: 'Student123!' },
      admin: { email: 'admin@cybersecurity.com', pass: 'Admin123!' }
    };
    const creds = roleCredentials[targetRole.toLowerCase()];
    if (creds) {
      return await login(creds.email, creds.pass);
    }
    return false;
  };

  const register = async (username, email, password, role = 'student') => {
    setLoading(true);
    try {
      const response = await authService.register(username, email, password, role);
      const { token, user } = response.data;
      setToken(token);
      setUser(user);
      localStorage.setItem('crypto_auth_token', token);
      localStorage.setItem('crypto_user', JSON.stringify(user));
      addToast('Account created successfully!', 'success');
      return true;
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed.';
      addToast(msg, 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('crypto_auth_token');
    localStorage.removeItem('crypto_user');
    addToast('Logged out successfully.', 'info');
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
        login,
        quickSwitchRole,
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

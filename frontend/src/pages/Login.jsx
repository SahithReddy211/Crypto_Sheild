import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiShield, FiLock, FiMail, FiArrowRight } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('admin@cybersecurity.com');
  const [password, setPassword] = useState('Admin123!');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(email, password);
    if (success) navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 transition-colors" style={{ backgroundColor: 'var(--bg-base)' }}>
      <div className="w-full max-w-md">
        <div className="card p-8 sm:p-9 shadow-lg">
          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mb-4 text-white shadow-xs">
              <FiShield className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Crypto<span className="text-blue-600 dark:text-blue-500">Shield</span>
            </h1>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Intelligent Hybrid File Encryption System
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Email Address
              </label>
              <div className="relative">
                <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass-input glass-input-icon text-sm"
                  placeholder="admin@cybersecurity.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Password
              </label>
              <div className="relative">
                <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-input glass-input-icon text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-sm font-semibold flex items-center justify-center gap-2 mt-4"
            >
              {loading ? 'Authenticating...' : 'Sign In to Vault'}
              <FiArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div 
            className="mt-6 pt-6 border-t text-center space-y-2"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Don't have an account?{' '}
              <Link to="/register" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                Register new officer
              </Link>
            </p>
            <p className="text-[11px] font-mono-code" style={{ color: 'var(--text-muted)' }}>
              Demo: admin@cybersecurity.com &middot; Admin123!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

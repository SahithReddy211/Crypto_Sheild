import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiShield, FiLock, FiMail, FiArrowRight, FiBook, FiCpu } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const DEMO_CREDENTIALS = {
  student:  { email: 'student@university.edu',  password: 'Student123!',  label: 'STU001 · Alex Mercer (CSE-A)' },
  faculty:  { email: 'faculty@university.edu',  password: 'Faculty123!',  label: 'FAC001 · Prof. Alan Turing (CSE)' },
  admin:    { email: 'admin@cybersecurity.com', password: 'Admin123!',    label: 'ADM001 · Admin Security' },
};

const ROLE_META = {
  student: { color: 'bg-emerald-600', ring: 'ring-emerald-500/40', label: 'Student', icon: FiBook },
  faculty: { color: 'bg-violet-600',  ring: 'ring-violet-500/40',  label: 'Faculty', icon: FiShield },
  admin:   { color: 'bg-rose-600',    ring: 'ring-rose-500/40',    label: 'Admin',   icon: FiCpu },
};

export default function Login() {
  const [selectedRole, setSelectedRole] = useState('student');
  const [email, setEmail] = useState(DEMO_CREDENTIALS.student.email);
  const [password, setPassword] = useState(DEMO_CREDENTIALS.student.password);
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setEmail(DEMO_CREDENTIALS[role].email);
    setPassword(DEMO_CREDENTIALS[role].password);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(email, password);
    if (result.success) {
      const roleHome = {
        student: '/question-papers/student',
        faculty: '/question-papers/faculty',
        admin:   '/question-papers/admin-policy',
      };
      navigate(roleHome[result.role] || '/dashboard');
    }
  };

  const meta = ROLE_META[selectedRole];
  const Icon = meta.icon;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-6 transition-colors"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      <div className="w-full max-w-md">
        <div className="card p-8 sm:p-9 shadow-lg">
          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className={`w-12 h-12 rounded-xl ${meta.color} flex items-center justify-center mb-4 text-white shadow-sm transition-colors`}>
              <Icon className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Crypto<span className="text-blue-600 dark:text-blue-500">Agility</span>
            </h1>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Secure Question Paper Distribution System
            </p>
          </div>

          {/* Role Selector Tabs */}
          <div
            className="flex rounded-lg p-1 mb-6 gap-1"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
            role="tablist"
            aria-label="Select login role"
          >
            {Object.entries(ROLE_META).map(([role, m]) => (
              <button
                key={role}
                type="button"
                role="tab"
                aria-selected={selectedRole === role}
                onClick={() => handleRoleSelect(role)}
                className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold uppercase tracking-wide transition-all ${
                  selectedRole === role
                    ? `${m.color} text-white shadow-sm`
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Email Address
              </label>
              <div className="relative">
                <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass-input glass-input-icon text-sm"
                  placeholder="your@email.com"
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
                  id="login-password"
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
              id="login-submit"
              type="submit"
              disabled={loading}
              className={`w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 mt-4 rounded-lg text-white transition-all ${meta.color} hover:opacity-90 disabled:opacity-50`}
            >
              {loading ? 'Authenticating...' : `Sign In as ${meta.label}`}
              <FiArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Demo Credentials */}
          <div
            className="mt-5 p-3 rounded-lg border text-center space-y-1"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Demo Account
            </p>
            <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
              {DEMO_CREDENTIALS[selectedRole].label}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              (credentials pre-filled above)
            </p>
          </div>

          <div className="mt-5 text-center">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              New student or faculty?{' '}
              <Link to="/register" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  FiGrid, 
  FiUploadCloud, 
  FiLock, 
  FiUnlock, 
  FiCheckCircle, 
  FiBarChart2, 
  FiClock, 
  FiSettings, 
  FiUser, 
  FiShield, 
  FiLogOut,
  FiFileText,
  FiPlusCircle,
  FiBookOpen,
  FiCpu,
  FiUsers,
  FiEye
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

// ── Student navigation ────────────────────────────────────────────────────────
const STUDENT_ITEMS = [
  { name: 'My Examinations', path: '/question-papers/student', icon: FiBookOpen },
];

// ── Faculty navigation ────────────────────────────────────────────────────────
const FACULTY_ITEMS = [
  { name: 'Paper Vault', path: '/question-papers/faculty', icon: FiFileText },
  { name: 'Schedule New Paper', path: '/question-papers/create', icon: FiPlusCircle },
];

// ── Admin navigation ──────────────────────────────────────────────────────────
const ADMIN_ITEMS = [
  { name: 'Crypto Policy & Audit', path: '/question-papers/admin-policy', icon: FiCpu },
];

// ── Shared Crypto Engine Tools (available to all roles) ──────────────────────
const CRYPTO_ENGINE_ITEMS = [
  { name: 'Dashboard', path: '/dashboard', icon: FiGrid },
  { name: 'Upload & Recommend', path: '/upload', icon: FiUploadCloud },
  { name: 'File Encryption', path: '/encrypt', icon: FiLock },
  { name: 'File Decryption', path: '/decrypt', icon: FiUnlock },
  { name: 'Integrity Check', path: '/integrity', icon: FiCheckCircle },
  { name: 'Cipher Benchmarks', path: '/performance', icon: FiBarChart2 },
  { name: 'Vault History', path: '/history', icon: FiClock },
];

// ── Preferences (available to all roles) ─────────────────────────────────────
const PREF_ITEMS = [
  { name: 'Settings', path: '/settings', icon: FiSettings },
  { name: 'Profile & Keys', path: '/profile', icon: FiUser },
];

function NavItem({ item, toggleSidebar }) {
  const Icon = item.icon;
  return (
    <NavLink
      key={item.path}
      to={item.path}
      onClick={() => window.innerWidth < 1024 && toggleSidebar()}
      className={({ isActive }) =>
        `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-blue-600/15 text-blue-600 dark:text-blue-400 font-semibold border-l-2 border-blue-600 dark:border-blue-500 rounded-l-none'
            : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 border-l-2 border-transparent'
        }`
      }
      style={({ isActive }) => ({
        color: isActive ? undefined : 'var(--text-secondary)'
      })}
    >
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span>{item.name}</span>
      </div>
    </NavLink>
  );
}

function SectionLabel({ label, accent = false }) {
  return (
    <p
      className={`px-3 mb-2 text-[11px] font-bold uppercase tracking-wider ${
        accent ? 'text-blue-500' : ''
      }`}
      style={accent ? {} : { color: 'var(--text-muted)' }}
    >
      {label}
    </p>
  );
}

export default function Sidebar({ isOpen, toggleSidebar }) {
  const { logout, user, isStudent, isFaculty, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleInitials = (user?.full_name || user?.username || 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const roleBadge = isStudent
    ? { label: user?.section || 'STUDENT', color: 'bg-emerald-600' }
    : isFaculty
    ? { label: user?.department || 'FACULTY', color: 'bg-violet-600' }
    : { label: 'ADMIN', color: 'bg-rose-600' };

  const roleSpecificItems = isStudent
    ? STUDENT_ITEMS
    : isFaculty
    ? FACULTY_ITEMS
    : ADMIN_ITEMS;

  const roleGroupLabel = isStudent
    ? 'My Examinations'
    : isFaculty
    ? 'Question Papers'
    : 'Admin Controls';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 flex flex-col border-r transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
      >
        {/* Brand Header */}
        <div
          className="h-16 px-6 flex items-center gap-3 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 text-white shadow-sm">
            <FiShield className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight leading-none" style={{ color: 'var(--text-primary)' }}>
              Crypto<span className="text-blue-600 dark:text-blue-500">Agility</span>
            </h1>
            <p className="text-[11px] font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Secure Distribution System
            </p>
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 px-3 py-4 overflow-y-auto space-y-6">
          {/* Role-Specific Primary Section */}
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <SectionLabel label={roleGroupLabel} accent />
              <span className={`text-[9px] font-bold py-0.5 px-1.5 rounded text-white ${roleBadge.color}`}>
                {roleBadge.label}
              </span>
            </div>
            <nav className="space-y-1">
              {roleSpecificItems.map((item) => (
                <NavItem key={item.path} item={item} toggleSidebar={toggleSidebar} />
              ))}
            </nav>
          </div>

          {/* Shared Crypto Engine Tools */}
          <div>
            <SectionLabel label="Crypto Engine Tools" />
            <nav className="space-y-1">
              {CRYPTO_ENGINE_ITEMS.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => window.innerWidth < 1024 && toggleSidebar()}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400 font-semibold border-l-2 border-blue-600 dark:border-blue-500 rounded-l-none'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 border-l-2 border-transparent'
                    }`
                  }
                  style={({ isActive }) => ({
                    color: isActive ? undefined : 'var(--text-secondary)'
                  })}
                >
                  {React.createElement(item.icon, { className: 'w-3.5 h-3.5 flex-shrink-0' })}
                  <span>{item.name}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Preferences */}
          <div>
            <SectionLabel label="Preferences" />
            <nav className="space-y-1">
              {PREF_ITEMS.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => window.innerWidth < 1024 && toggleSidebar()}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400 font-semibold border-l-2 border-blue-600 dark:border-blue-500 rounded-l-none'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 border-l-2 border-transparent'
                    }`
                  }
                  style={({ isActive }) => ({
                    color: isActive ? undefined : 'var(--text-secondary)'
                  })}
                >
                  {React.createElement(item.icon, { className: 'w-3.5 h-3.5 flex-shrink-0' })}
                  <span>{item.name}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </div>

        {/* User / Logout Footer */}
        <div
          className="p-4 border-t"
          style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className={`w-8 h-8 rounded-lg ${roleBadge.color} text-white flex items-center justify-center font-bold text-xs flex-shrink-0`}>
                {roleInitials}
              </div>
              <div className="truncate">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {user?.full_name || user?.username || 'User'}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                  {isStudent && user?.student_id
                    ? `${user.student_id} · ${user.section || ''}`
                    : isFaculty && user?.faculty_id
                    ? `${user.faculty_id} · ${user.designation || ''}`
                    : user?.email || 'System Admin'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0"
            >
              <FiLogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

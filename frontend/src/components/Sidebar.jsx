import React from 'react';
import { NavLink } from 'react-router-dom';
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
  FiCpu
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const questionPaperNavItems = [
  { name: 'Faculty Paper Vault', path: '/question-papers/faculty', icon: FiFileText, badge: 'Faculty' },
  { name: 'Schedule New Paper', path: '/question-papers/create', icon: FiPlusCircle },
  { name: 'Student Examinations', path: '/question-papers/student', icon: FiBookOpen, badge: 'Student' },
  { name: 'Crypto Policy & Audit', path: '/question-papers/admin-policy', icon: FiCpu, badge: 'Admin' },
];

const generalCryptoNavItems = [
  { name: 'Dashboard', path: '/dashboard', icon: FiGrid },
  { name: 'Upload & Recommend', path: '/upload', icon: FiUploadCloud },
  { name: 'File Encryption', path: '/encrypt', icon: FiLock },
  { name: 'File Decryption', path: '/decrypt', icon: FiUnlock },
  { name: 'Integrity Check', path: '/integrity', icon: FiCheckCircle },
  { name: 'Cipher Benchmarks', path: '/performance', icon: FiBarChart2 },
  { name: 'Vault History', path: '/history', icon: FiClock },
];

const secondaryNavItems = [
  { name: 'Settings', path: '/settings', icon: FiSettings },
  { name: 'Profile & Keys', path: '/profile', icon: FiUser },
];

export default function Sidebar({ isOpen, toggleSidebar }) {
  const { logout, user } = useAuth();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 flex flex-col border-r transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ 
          backgroundColor: 'var(--bg-elevated)', 
          borderColor: 'var(--border-subtle)' 
        }}
      >
        {/* Brand Header */}
        <div 
          className="h-16 px-6 flex items-center gap-3 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 text-white shadow-xs">
            <FiShield className="w-4.5 h-4.5" />
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
          {/* Question Paper Distribution (Primary Feature Module) */}
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-500">
                Question Papers
              </p>
              <span className="badge badge-blue text-[9px] font-bold py-0">AGILE</span>
            </div>
            <nav className="space-y-1">
              {questionPaperNavItems.map((item) => {
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
                    {item.badge && (
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700/60">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Crypto-Agility Vault & Encryption Tools */}
          <div>
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Crypto Engine Tools
            </p>
            <nav className="space-y-1">
              {generalCryptoNavItems.map((item) => {
                const Icon = item.icon;
                return (
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
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Preferences */}
          <div>
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Preferences
            </p>
            <nav className="space-y-1">
              {secondaryNavItems.map((item) => {
                const Icon = item.icon;
                return (
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
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>

        {/* User / Logout Footer */}
        <div 
          className="p-4 border-t"
          style={{ 
            backgroundColor: 'var(--bg-input)', 
            borderColor: 'var(--border-subtle)' 
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                {user?.username ? user.username[0].toUpperCase() : 'A'}
              </div>
              <div className="truncate">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {user?.username || 'Security Officer'}
                </p>
                <p className="text-xs truncate capitalize" style={{ color: 'var(--text-muted)' }}>
                  Role: {user?.role || 'Admin'}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <FiLogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

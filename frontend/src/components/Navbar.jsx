import React, { useState, useEffect } from 'react';
import { FiMenu, FiSun, FiMoon, FiClock, FiShield } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { systemTimeService } from '../services/api';

const ROLE_COLORS = {
  student:  { bg: 'bg-emerald-600',  text: 'text-emerald-300',  border: 'border-emerald-500/40' },
  faculty:  { bg: 'bg-violet-600',   text: 'text-violet-300',   border: 'border-violet-500/40'  },
  admin:    { bg: 'bg-rose-600',     text: 'text-rose-300',     border: 'border-rose-500/40'    },
};

export default function Navbar({ toggleSidebar, title = 'Dashboard' }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [serverTimeStr, setServerTimeStr] = useState('');

  const role = user?.role || 'student';
  const colors = ROLE_COLORS[role] || ROLE_COLORS.admin;

  // Authoritative server UTC clock — polled every 10s
  useEffect(() => {
    const fetchTime = async () => {
      try {
        const res = await systemTimeService.getSystemTime();
        const d = new Date(res.data.server_time_utc);
        setServerTimeStr(
          d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
        );
      } catch (e) {}
    };
    fetchTime();
    const interval = setInterval(fetchTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Role badge subtitle (e.g. STUDENT · CSE-A or FACULTY · CSE or ADMIN)
  const roleBadgeLabel = () => {
    if (role === 'student') {
      const parts = [user?.section || user?.department].filter(Boolean);
      return `STUDENT${parts.length ? ' · ' + parts.join(' ') : ''}`;
    }
    if (role === 'faculty') {
      return `FACULTY${user?.department ? ' · ' + user.department : ''}`;
    }
    return 'SYSTEM ADMIN';
  };

  const initials = (user?.full_name || user?.username || 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header
      className="sticky top-0 z-30 h-16 px-4 lg:px-8 flex items-center justify-between border-b transition-colors"
      style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
    >
      {/* Left: Mobile Menu Toggle & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg lg:hidden hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <FiMenu className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h1>
      </div>

      {/* Right: Server UTC Clock, Theme Toggle, Role Badge, User */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Authoritative Server Clock */}
        {serverTimeStr && (
          <div
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono border"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
            title="Authoritative Server UTC Time (used for exam release decisions)"
          >
            <FiClock className="w-3.5 h-3.5 text-emerald-500" />
            <span>{serverTimeStr} UTC</span>
          </div>
        )}

        {/* Role Badge (read-only — never clickable to switch) */}
        <div
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold uppercase tracking-wider ${colors.text} ${colors.border}`}
          style={{ backgroundColor: 'var(--bg-surface)' }}
          title={`Authenticated as ${role}`}
        >
          <FiShield className="w-3 h-3" />
          <span>{roleBadgeLabel()}</span>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          className="p-2 rounded-lg transition-colors border"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
        >
          {theme === 'dark' ? (
            <FiSun className="w-4 h-4 text-amber-400" />
          ) : (
            <FiMoon className="w-4 h-4 text-slate-700" />
          )}
        </button>

        {/* User Info */}
        <div
          className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center text-white text-xs font-bold shadow-sm`}>
            {initials}
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
              {user?.full_name || user?.username || 'User'}
            </span>
            <span className="text-xs leading-tight" style={{ color: 'var(--text-muted)' }}>
              {user?.email || ''}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

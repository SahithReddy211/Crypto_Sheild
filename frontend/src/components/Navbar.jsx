import React, { useState, useEffect } from 'react';
import { FiMenu, FiBell, FiSun, FiMoon, FiUserCheck, FiClock } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { systemTimeService } from '../services/api';

export default function Navbar({ toggleSidebar, title = 'Dashboard' }) {
  const { user, quickSwitchRole, addToast } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const securityLevel = user?.default_security_level || 'High';
  const currentRole = user?.role || 'admin';

  const [serverTimeStr, setServerTimeStr] = useState('');

  useEffect(() => {
    const fetchTime = async () => {
      try {
        const res = await systemTimeService.getSystemTime();
        const d = new Date(res.data.server_time_utc);
        setServerTimeStr(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
      } catch (e) {}
    };
    fetchTime();
    const interval = setInterval(fetchTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRoleChange = async (newRole) => {
    if (newRole === currentRole) return;
    const success = await quickSwitchRole(newRole);
    if (success) {
      addToast(`Switched active profile to ${newRole.toUpperCase()}`, 'success');
    }
  };

  return (
    <header 
      className="sticky top-0 z-30 h-16 px-4 lg:px-8 flex items-center justify-between border-b transition-colors"
      style={{ 
        backgroundColor: 'var(--bg-elevated)', 
        borderColor: 'var(--border-subtle)' 
      }}
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

      {/* Right: Role Switcher, Server UTC Clock, Theme Toggle, User */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Interactive Demo Role Switcher */}
        <div 
          className="hidden sm:flex items-center gap-1.5 p-1 rounded-lg border"
          style={{ 
            backgroundColor: 'var(--bg-surface)', 
            borderColor: 'var(--border-subtle)' 
          }}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 flex items-center gap-1">
            <FiUserCheck className="w-3 h-3 text-blue-500" />
            <span>Role:</span>
          </span>
          {['faculty', 'student', 'admin'].map((r) => {
            const isActive = currentRole === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => handleRoleChange(r)}
                className={`px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>

        {/* Server Clock Badge */}
        {serverTimeStr && (
          <div 
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono-code border"
            style={{ 
              backgroundColor: 'var(--bg-surface)', 
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)' 
            }}
            title="Authoritative Server UTC Timestamp"
          >
            <FiClock className="w-3.5 h-3.5 text-emerald-500" />
            <span>{serverTimeStr} UTC</span>
          </div>
        )}

        {/* Quick Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          className="p-2 rounded-lg transition-colors border"
          style={{ 
            backgroundColor: 'var(--bg-surface)', 
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)' 
          }}
        >
          {theme === 'dark' ? (
            <FiSun className="w-4.5 h-4.5 text-amber-400 hover:text-amber-300" />
          ) : (
            <FiMoon className="w-4.5 h-4.5 text-slate-700 hover:text-slate-900" />
          )}
        </button>

        {/* User Info */}
        <div 
          className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
            {user?.username ? user.username[0].toUpperCase() : 'A'}
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-sm font-semibold leading-tight flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
              {user?.username || 'Security Officer'}
              <span className="badge badge-neutral text-[9px] uppercase px-1.5 py-0">
                {currentRole}
              </span>
            </span>
            <span className="text-xs leading-tight" style={{ color: 'var(--text-muted)' }}>
              {user?.email || 'officer@university.edu'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

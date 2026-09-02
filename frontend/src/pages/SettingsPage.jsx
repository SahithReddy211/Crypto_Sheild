import React, { useState, useEffect } from 'react';
import { 
  FiSettings, 
  FiShield, 
  FiTrash2, 
  FiMoon, 
  FiSun,
  FiDownload, 
  FiSave,
  FiCheckCircle
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function SettingsPage() {
  const { user, updateUserSettings, addToast } = useAuth();
  const { theme, setTheme } = useTheme();

  const [securityLevel, setSecurityLevel] = useState(user?.default_security_level || 'High');
  const [autoDelete, setAutoDelete] = useState(user?.auto_delete_files || false);
  const [selectedTheme, setSelectedTheme] = useState(theme || user?.theme_preference || 'dark');

  useEffect(() => {
    if (theme) {
      setSelectedTheme(theme);
    }
  }, [theme]);

  const handleThemeChange = (newTheme) => {
    setSelectedTheme(newTheme);
    setTheme(newTheme);
  };

  const handleSave = () => {
    updateUserSettings({
      default_security_level: securityLevel,
      auto_delete_files: autoDelete,
      theme_preference: selectedTheme
    });
    setTheme(selectedTheme);
    addToast('Security & theme preferences saved successfully.', 'success');
  };

  const exportHistoryJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      system: "CryptoShield Intelligent Hybrid File Encryption System",
      export_date: new Date().toISOString(),
      user: user?.username,
      settings: { securityLevel, autoDelete, theme: selectedTheme }
    }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `cryptoshield_settings_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addToast('Settings configuration exported.', 'success');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          System Settings & Preferences
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Configure theme preferences, baseline cryptographic constraints, ephemeral storage policies, and audit exports.
        </p>
      </div>

      <div className="card divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
        {/* Appearance / Theme Mode Selector */}
        <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              {selectedTheme === 'dark' ? (
                <FiMoon className="w-4.5 h-4.5 text-blue-500" />
              ) : (
                <FiSun className="w-4.5 h-4.5 text-amber-500" />
              )}
              Appearance & Theme Mode
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Choose between dark enterprise charcoal or clean light dashboard mode.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleThemeChange('dark')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all border ${
                selectedTheme === 'dark'
                  ? 'bg-blue-600/15 border-blue-500 text-blue-400'
                  : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              style={{ backgroundColor: selectedTheme === 'dark' ? 'rgba(37, 99, 235, 0.15)' : 'var(--bg-input)' }}
            >
              <FiMoon className="w-3.5 h-3.5" />
              <span>Dark Mode</span>
            </button>

            <button
              type="button"
              onClick={() => handleThemeChange('light')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all border ${
                selectedTheme === 'light'
                  ? 'bg-blue-600/15 border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              style={{ backgroundColor: selectedTheme === 'light' ? 'rgba(37, 99, 235, 0.15)' : 'var(--bg-input)' }}
            >
              <FiSun className="w-3.5 h-3.5" />
              <span>Light Mode</span>
            </button>
          </div>
        </div>

        {/* Default Security Level */}
        <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <FiShield className="w-4 h-4 text-blue-500" />
              Default Recommendation Security Level
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Baseline constraint fed into the recommendation engine for incoming file uploads.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {['Low', 'Medium', 'High'].map((level) => {
              const isActive = securityLevel === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSecurityLevel(level)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all border ${
                    isActive
                      ? 'bg-blue-600/15 border-blue-500 text-blue-500'
                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                  style={{ backgroundColor: isActive ? 'rgba(37, 99, 235, 0.15)' : 'var(--bg-input)' }}
                >
                  {level}
                </button>
              );
            })}
          </div>
        </div>

        {/* Ephemeral Auto Delete */}
        <div className="p-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <FiTrash2 className="w-4 h-4 text-red-500" />
              Auto-Purge Ephemeral Plaintext Files
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Automatically delete plaintext temporary scratch files from vault disk after successful decryption.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setAutoDelete(!autoDelete)}
            className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors duration-200 ${
              autoDelete ? 'bg-blue-600' : 'bg-slate-400 dark:bg-[#223049]'
            }`}
            role="switch"
            aria-checked={autoDelete}
          >
            <div
              className="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-sm"
              style={{ left: autoDelete ? '28px' : '4px' }}
            />
          </button>
        </div>

        {/* Backup Export */}
        <div className="p-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <FiDownload className="w-4 h-4 text-emerald-500" />
              Export System Configuration
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Download a cryptographically structured JSON backup of your current policies and theme settings.
            </p>
          </div>

          <button
            type="button"
            onClick={exportHistoryJSON}
            className="btn-secondary text-xs px-4 py-2 flex items-center gap-2"
          >
            <FiDownload className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>

        {/* Save Footer */}
        <div className="p-6 flex justify-end" style={{ backgroundColor: 'var(--bg-input)' }}>
          <button
            type="button"
            onClick={handleSave}
            className="btn-primary px-6 py-2.5 flex items-center gap-2 text-sm"
          >
            <FiSave className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </div>
    </div>
  );
}

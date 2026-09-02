import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/upload': 'Upload File',
  '/encrypt': 'Encrypt',
  '/decrypt': 'Decrypt',
  '/integrity': 'Integrity Verification',
  '/performance': 'Performance Analysis',
  '/history': 'File History',
  '/settings': 'Settings',
  '/profile': 'Profile',
};

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const title = pageTitles[location.pathname] || 'CryptoShield';

  return (
    <div className="min-h-screen flex flex-col transition-colors" style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="lg:pl-64 flex flex-col flex-1">
        <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} title={title} />
        
        <main className="flex-1 p-5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        <footer 
          className="py-4 px-6 text-xs flex flex-col sm:flex-row items-center justify-between gap-2 border-t transition-colors"
          style={{ 
            backgroundColor: 'var(--footer-bg)', 
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-muted)' 
          }}
        >
          <span>CryptoShield — Intelligent Hybrid File Encryption System</span>
          <span className="font-medium" style={{ color: 'var(--text-muted)' }}>
            AES-256 · RSA-2048 · Triple DES · SHA-512
          </span>
        </footer>
      </div>
    </div>
  );
}

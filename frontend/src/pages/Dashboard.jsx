import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiFileText, 
  FiLock, 
  FiUnlock, 
  FiCheckCircle, 
  FiHardDrive, 
  FiActivity,
  FiUploadCloud,
  FiArrowRight,
  FiShield,
  FiBarChart2,
  FiClock
} from 'react-icons/fi';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import StatCard from '../components/StatCard';
import { statsService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Dashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await statsService.getStatistics();
      setStats(response.data);
    } catch (err) {
      console.error("Failed to load statistics:", err);
    } finally {
      setLoading(false);
    }
  };

  // Restrained professional palette
  const defaultAlgoData = [
    { name: 'AES-256-GCM', value: 18, fill: '#2563eb' }, // Primary Blue
    { name: 'RSA-2048 Hybrid', value: 10, fill: '#6366f1' }, // Muted Indigo
    { name: 'Triple DES', value: 6, fill: '#64748b' }, // Muted Slate
    { name: 'SHA-512 Integrity', value: 14, fill: '#10b981' }, // Emerald Green
  ];

  const algoData = stats?.algorithm_usage || defaultAlgoData;

  const quickActions = [
    { label: 'Upload File', desc: 'Register payload in vault', path: '/upload', icon: FiUploadCloud },
    { label: 'Encrypt', desc: 'Ciphers with session keys', path: '/encrypt', icon: FiLock },
    { label: 'Decrypt', desc: 'Restore original format', path: '/decrypt', icon: FiUnlock },
    { label: 'Verify Integrity', desc: 'SHA-512 checksum validation', path: '/integrity', icon: FiCheckCircle },
    { label: 'Performance', desc: 'Algorithm benchmarks', path: '/performance', icon: FiBarChart2 },
    { label: 'Audit Logs', desc: 'System history records', path: '/history', icon: FiClock },
  ];

  return (
    <div className="space-y-8">
      {/* Top Welcome / Security Overview Banner */}
      <div className="card p-6 sm:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            <FiShield className="w-4 h-4" />
            <span>Security Management Overview</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Welcome back, {user?.username || 'Security Admin'}
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Automated cryptographic algorithm recommendation and key lifecycle management for enterprise and academic assets.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/upload"
            className="btn-primary py-2.5 px-5 flex items-center gap-2 whitespace-nowrap shadow-xs"
          >
            <FiUploadCloud className="w-4 h-4" />
            <span>Upload & Analyze</span>
          </Link>
        </div>
      </div>

      {/* 5 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Files"
          value={loading ? '—' : (stats?.total_files ?? 12)}
          subtitle="Registered in vault"
          icon={FiFileText}
          trend="+12%"
        />
        <StatCard
          title="Encrypted"
          value={loading ? '—' : (stats?.total_encrypted ?? 8)}
          subtitle="AES & RSA protected"
          icon={FiLock}
          trend="+8%"
        />
        <StatCard
          title="Decrypted"
          value={loading ? '—' : (stats?.total_decrypted ?? 5)}
          subtitle="Clean file restores"
          icon={FiUnlock}
        />
        <StatCard
          title="Integrity Checks"
          value={loading ? '—' : (stats?.total_integrity_checks ?? 14)}
          subtitle="SHA-512 verifications"
          icon={FiCheckCircle}
          trend="+18%"
        />
        <StatCard
          title="Vault Storage"
          value={loading ? '—' : `${stats?.storage_mb ?? 48.6} MB`}
          subtitle="Active storage volume"
          icon={FiHardDrive}
        />
      </div>

      {/* Charts & Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Algorithm Usage Chart */}
        <div className="lg:col-span-6 card p-6 flex flex-col justify-between">
          <div className="card-header -mx-6 -mt-6 mb-4">
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              Algorithm Distribution
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Distribution of cryptographic ciphers across operations
            </p>
          </div>

          <div className="h-68 w-full py-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={algoData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {algoData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.fill} 
                      stroke={theme === 'dark' ? '#161f30' : '#ffffff'} 
                      strokeWidth={2} 
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#111827' : '#ffffff',
                    borderColor: theme === 'dark' ? '#223049' : '#e2e8f0',
                    borderRadius: '8px',
                    color: theme === 'dark' ? '#f8fafc' : '#0f172a',
                    fontSize: '13px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={40}
                  wrapperStyle={{ 
                    fontSize: '13px', 
                    color: theme === 'dark' ? '#94a3b8' : '#475569', 
                    paddingTop: '10px' 
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-6 card p-6 flex flex-col">
          <div className="card-header -mx-6 -mt-6 mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <FiActivity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Recent Operations
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Live execution and integrity audit feed
              </p>
            </div>
            <Link 
              to="/history" 
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 transition-colors"
            >
              View all <FiArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3 overflow-y-auto flex-1 max-h-72 pr-1">
            {stats?.recent_activity?.length > 0 ? (
              stats.recent_activity.map((act, i) => {
                const isEncrypt = act.operation_type === 'Encrypt';
                const isDecrypt = act.operation_type === 'Decrypt';
                return (
                  <div
                    key={act.id || i}
                    className="flex items-center justify-between p-3.5 rounded-lg border transition-colors"
                    style={{ 
                      backgroundColor: 'var(--bg-input)', 
                      borderColor: 'var(--border-subtle)' 
                    }}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isEncrypt ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                        isDecrypt ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' :
                        'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {isEncrypt ? <FiLock className="w-4 h-4" /> :
                         isDecrypt ? <FiUnlock className="w-4 h-4" /> :
                         <FiCheckCircle className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
                          {act.file_name}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {act.operation_type} &middot; <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{act.algorithm_used}</span> &middot; {act.execution_time_ms} ms
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                      {act.timestamp ? new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>
                <FiActivity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No recent activity. Upload a file to start operations.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="card p-6">
        <div className="card-header -mx-6 -mt-6 mb-5">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            System Actions
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Standard workflows and cryptographic tools
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.path}
                to={action.path}
                className="flex flex-col items-center text-center p-4 rounded-xl border hover:border-blue-500/50 transition-all group"
                style={{ 
                  backgroundColor: 'var(--bg-input)', 
                  borderColor: 'var(--border-subtle)' 
                }}
              >
                <div 
                  className="w-10 h-10 rounded-lg text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors border"
                  style={{ 
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)'
                  }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold leading-tight mb-1" style={{ color: 'var(--text-primary)' }}>
                  {action.label}
                </h3>
                <p className="text-xs leading-snug" style={{ color: 'var(--text-muted)' }}>
                  {action.desc}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

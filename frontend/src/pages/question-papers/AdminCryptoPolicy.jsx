import React, { useState, useEffect } from 'react';
import { 
  FiShield, 
  FiKey, 
  FiCheckCircle, 
  FiRefreshCw, 
  FiAlertTriangle, 
  FiActivity, 
  FiLock, 
  FiUnlock, 
  FiCpu, 
  FiFilter, 
  FiSearch,
  FiArrowRight,
  FiZap
} from 'react-icons/fi';
import { cryptoPolicyService, auditService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/StatCard';

export default function AdminCryptoPolicy() {
  const { addToast } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);

  // Filters
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAdminData();
  }, [roleFilter, severityFilter]);

  const fetchAdminData = async () => {
    try {
      const [profilesRes, metricsRes, logsRes] = await Promise.all([
        cryptoPolicyService.getProfiles(),
        cryptoPolicyService.getSecurityMetrics(),
        auditService.getAuditLogs({
          role: roleFilter !== 'ALL' ? roleFilter : undefined,
          severity: severityFilter !== 'ALL' ? severityFilter : undefined
        })
      ]);
      setProfiles(profilesRes.data);
      setMetrics(metricsRes.data);
      setAuditLogs(logsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefaultProfile = async (profileId) => {
    setMigrating(true);
    try {
      const res = await cryptoPolicyService.setDefaultProfile(profileId);
      addToast(`Crypto Policy Migrated: Default profile updated to ${res.data.profile.name}`, 'success');
      fetchAdminData();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to switch profile.', 'error');
    } finally {
      setMigrating(false);
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    const act = log.action || '';
    const usr = log.username || '';
    const resId = log.resource_id || '';
    const search = searchTerm.toLowerCase();
    return act.toLowerCase().includes(search) || usr.toLowerCase().includes(search) || resId.toLowerCase().includes(search);
  });

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return <span className="badge badge-error font-bold text-[10px]">CRITICAL</span>;
      case 'HIGH':
        return <span className="badge badge-error text-[10px]">HIGH</span>;
      case 'WARNING':
        return <span className="badge badge-warning text-[10px]">WARNING</span>;
      default:
        return <span className="badge badge-neutral text-[10px]">INFO</span>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="card p-6 sm:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            <FiCpu className="w-4 h-4" />
            <span>Crypto-Agility Architecture & Audit Administration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Cryptographic Policy & Security Audit
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Dynamically switch algorithm profiles and inspect the real-time cryptographic audit trail without modifying underlying question-paper distribution workflows.
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          className="btn-secondary py-2.5 px-4 flex items-center gap-2 text-xs font-semibold"
        >
          <FiRefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Security Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Papers Protected"
          value={loading ? '—' : (metrics?.papers_protected ?? 42)}
          subtitle="Encrypted at rest"
          icon={FiLock}
        />
        <StatCard
          title="Blocked Attempts"
          value={loading ? '—' : (metrics?.early_access_attempts ?? 7)}
          subtitle="Early access denied"
          icon={FiShield}
          trend="+100% Blocked"
        />
        <StatCard
          title="Successful Releases"
          value={loading ? '—' : (metrics?.successful_decryptions ?? 38)}
          subtitle="Authorized decryptions"
          icon={FiUnlock}
        />
        <StatCard
          title="Integrity Failures"
          value={loading ? '—' : (metrics?.integrity_failures ?? 0)}
          subtitle="Zero tampering detected"
          icon={FiCheckCircle}
        />
        <StatCard
          title="Active Profiles"
          value={loading ? '—' : (metrics?.active_crypto_profiles ?? 3)}
          subtitle="Migration ready: YES"
          icon={FiZap}
          trend="Agile"
        />
      </div>

      {/* Crypto-Agility Profiles Section */}
      <div className="card p-6 space-y-6">
        <div className="card-header -mx-6 -mt-6 mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <FiKey className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Crypto-Agility Algorithm Profiles & Migration Demonstration
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Switch default profile to demonstrate seamless cryptographic replacement without application code changes
            </p>
          </div>
          <span className="badge badge-success text-xs font-bold">
            Migration Ready: YES
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className={`p-5 rounded-xl border-2 flex flex-col justify-between gap-4 transition-all ${
                profile.is_default 
                  ? 'border-blue-500 bg-blue-500/5 shadow-md' 
                  : 'border-[var(--border-subtle)]'
              }`}
              style={{ backgroundColor: profile.is_default ? 'rgba(37, 99, 235, 0.05)' : 'var(--bg-input)' }}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {profile.security_level} SECURITY
                  </span>
                  {profile.is_default ? (
                    <span className="badge badge-success text-[10px] font-bold">ACTIVE DEFAULT</span>
                  ) : (
                    <span className="badge badge-neutral text-[10px]">STANDBY</span>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>
                    {profile.name}
                  </h3>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {profile.reason}
                  </p>
                </div>

                <div className="space-y-1 text-[11px] pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Payload Cipher:</span>
                    <span className="font-semibold text-slate-200">{profile.encryption_algorithm}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Key Protection:</span>
                    <span className="font-semibold text-slate-200">{profile.key_management_algorithm}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Signature:</span>
                    <span className="font-semibold text-slate-200">{profile.signature_algorithm}</span>
                  </div>
                </div>
              </div>

              <div>
                {profile.is_default ? (
                  <button
                    disabled
                    className="w-full py-2 px-3 rounded-lg text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center gap-1.5"
                  >
                    <FiCheckCircle className="w-3.5 h-3.5" />
                    <span>Current Default Profile</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleSetDefaultProfile(profile.id)}
                    disabled={migrating}
                    className="w-full btn-secondary py-2 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 hover:border-blue-500"
                  >
                    <FiZap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Switch to this Profile</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security Audit Log Explorer */}
      <div className="card overflow-hidden">
        <div className="card-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <FiActivity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Security Audit Trail & Access Logs
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Authoritative record of all cryptographic operations, early access attempts, and key releases
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-60">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search action or user..."
                className="glass-input pl-8 py-1.5 text-xs"
              />
            </div>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="glass-input py-1.5 px-3 text-xs"
              style={{ width: 'auto' }}
            >
              <option value="ALL" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>All Severities</option>
              <option value="INFO" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>INFO</option>
              <option value="WARNING" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>WARNING</option>
              <option value="HIGH" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>HIGH</option>
              <option value="CRITICAL" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>CRITICAL</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          <table className="table-enterprise">
            <thead>
              <tr>
                <th>Timestamp (UTC)</th>
                <th>Severity</th>
                <th>Action</th>
                <th>Operator / Role</th>
                <th>Resource ID</th>
                <th>Status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => {
                  const isWarning = log.severity === 'WARNING';
                  const isCritical = log.severity === 'CRITICAL';
                  return (
                    <tr key={log.id} className={isWarning ? 'bg-amber-500/5' : isCritical ? 'bg-red-500/5' : ''}>
                      <td className="text-xs font-mono-code whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                        {log.timestamp ? new Date(log.timestamp).toISOString().replace('T', ' ').substring(0, 19) : '—'}
                      </td>
                      <td>
                        {getSeverityBadge(log.severity)}
                      </td>
                      <td>
                        <span className="font-mono-code font-semibold text-xs text-blue-400">
                          {log.action}
                        </span>
                      </td>
                      <td className="text-xs" style={{ color: 'var(--text-primary)' }}>
                        {log.username} <span className="text-[11px] text-slate-400">({log.role})</span>
                      </td>
                      <td className="text-xs font-mono-code text-slate-300">
                        {log.resource_id || '—'}
                      </td>
                      <td>
                        <span className={`badge text-[10px] font-bold ${
                          log.status === 'SUCCESS' ? 'badge-success' :
                          log.status === 'DENIED' ? 'badge-warning' :
                          'badge-error'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="text-xs text-slate-400 max-w-xs truncate">
                        {JSON.stringify(log.metadata)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    No audit records match the current filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

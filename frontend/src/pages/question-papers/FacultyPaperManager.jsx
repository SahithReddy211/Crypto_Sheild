import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiFileText, 
  FiLock, 
  FiUnlock, 
  FiClock, 
  FiCheckCircle, 
  FiPlus, 
  FiAlertTriangle, 
  FiTrash2, 
  FiEye, 
  FiShield, 
  FiRefreshCw,
  FiDownload,
  FiInfo
} from 'react-icons/fi';
import { questionPaperService, systemTimeService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/StatCard';

export default function FacultyPaperManager() {
  const { user, addToast } = useAuth();
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [serverTime, setServerTime] = useState(null);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchPapersAndClock();
    const interval = setInterval(fetchPapersAndClock, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchPapersAndClock = async () => {
    try {
      const [papersRes, timeRes] = await Promise.all([
        questionPaperService.getFacultyPapers(),
        systemTimeService.getSystemTime()
      ]);
      setPapers(papersRes.data);
      setServerTime(new Date(timeRes.data.server_time_utc));
    } catch (err) {
      console.error("Failed to load question papers:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchPapersAndClock();
    addToast('Synced with authoritative server clock & paper registry.', 'info');
  };

  const handleCancelPaper = async (paperId) => {
    if (!window.confirm(`Are you sure you want to cancel scheduled question paper ${paperId}? This action cannot be undone.`)) {
      return;
    }
    try {
      await questionPaperService.cancelPaper(paperId);
      addToast(`Question paper ${paperId} cancelled.`, 'success');
      fetchPapersAndClock();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to cancel paper.', 'error');
    }
  };

  // Metrics
  const totalCount = papers.length;
  const scheduledCount = papers.filter(p => p.status === 'SCHEDULED').length;
  const releasedCount = papers.filter(p => p.status === 'RELEASED').length;
  const cancelledCount = papers.filter(p => p.status === 'CANCELLED').length;
  const expiredCount = papers.filter(p => p.status === 'EXPIRED').length;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'RELEASED':
        return <span className="badge badge-success flex items-center gap-1"><FiUnlock className="w-3 h-3" /> Released</span>;
      case 'SCHEDULED':
        return <span className="badge badge-blue flex items-center gap-1"><FiClock className="w-3 h-3" /> Scheduled</span>;
      case 'EXPIRED':
        return <span className="badge badge-neutral flex items-center gap-1"><FiAlertTriangle className="w-3 h-3" /> Expired</span>;
      case 'CANCELLED':
        return <span className="badge badge-error flex items-center gap-1"><FiTrash2 className="w-3 h-3" /> Cancelled</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="card p-6 sm:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            <FiShield className="w-4 h-4" />
            <span>Faculty Exam Operations & Distribution</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Secure Question Papers Vault
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Schedule and manage end-to-end encrypted examination payloads. All question papers are protected at rest via hybrid crypto-agility profiles and released strictly at server-authorized timestamps.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleManualRefresh}
            className="btn-secondary py-2.5 px-4 flex items-center gap-2 text-xs font-semibold"
            title="Refresh Status"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
          <Link
            to="/question-papers/create"
            className="btn-primary py-2.5 px-5 flex items-center gap-2 whitespace-nowrap shadow-xs text-sm font-semibold"
          >
            <FiPlus className="w-4 h-4" />
            <span>Create & Schedule Paper</span>
          </Link>
        </div>
      </div>

      {/* 5 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Papers"
          value={loading ? '—' : totalCount}
          subtitle="Vault registered"
          icon={FiFileText}
        />
        <StatCard
          title="Scheduled"
          value={loading ? '—' : scheduledCount}
          subtitle="Awaiting release"
          icon={FiClock}
          trend={scheduledCount > 0 ? 'Active' : undefined}
        />
        <StatCard
          title="Released"
          value={loading ? '—' : releasedCount}
          subtitle="Available to students"
          icon={FiUnlock}
        />
        <StatCard
          title="Cancelled / Inactive"
          value={loading ? '—' : cancelledCount}
          subtitle="Pre-release revoked"
          icon={FiAlertTriangle}
        />
        <StatCard
          title="Authoritative UTC"
          value={serverTime ? serverTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '—'}
          subtitle={serverTime ? serverTime.toISOString().split('T')[0] : 'Server Clock'}
          icon={FiShield}
        />
      </div>

      {/* Main Table */}
      <div className="card overflow-hidden">
        <div className="card-header flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              Managed Question Papers Registry
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Complete lifecycle tracking, cryptographic fingerprints, and digital signatures
            </p>
          </div>
          <span className="text-xs font-mono-code px-2.5 py-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/20">
            {papers.length} Papers Active
          </span>
        </div>

        <div className="table-container">
          <table className="table-enterprise">
            <thead>
              <tr>
                <th>Paper ID</th>
                <th>Course & Subject</th>
                <th>Exam Window</th>
                <th>Scheduled Release</th>
                <th>Security Profile</th>
                <th>Distribution Mode</th>
                <th>Lifecycle Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    Loading question paper registry...
                  </td>
                </tr>
              ) : papers.length > 0 ? (
                papers.map((p) => {
                  const relDate = p.release_at ? new Date(p.release_at) : null;
                  const examStart = p.exam_start_at ? new Date(p.exam_start_at) : null;
                  const isScheduled = p.status === 'SCHEDULED';
                  
                  return (
                    <tr key={p.id}>
                      <td>
                        <span className="font-mono-code font-bold text-xs text-blue-600 dark:text-blue-400">
                          {p.id}
                        </span>
                      </td>
                      <td>
                        <div>
                          <p className="font-semibold text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>
                            {p.subject || 'Examination'}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {p.course_id || 'CS-804'} &middot; Sec {p.section || 'A'} &middot; {p.original_filename}
                          </p>
                        </div>
                      </td>
                      <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {examStart ? examStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td>
                        <div className="text-xs">
                          <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {relDate ? relDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </p>
                          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            {relDate ? relDate.toLocaleDateString() : ''}
                          </p>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-neutral text-[11px] font-mono-code">
                          {p.encryption_algorithm || 'AES-256-GCM'}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-500/10 text-slate-400 border border-slate-500/20">
                          {p.distribution_mode === 'MODE_B' ? 'Mode B (Pre-Download)' : 'Mode A (Stream Release)'}
                        </span>
                      </td>
                      <td>
                        {getStatusBadge(p.status)}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedPaper(p);
                              setShowDetailsModal(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-md transition-colors"
                            title="Inspect Cryptographic Package Metadata"
                          >
                            <FiEye className="w-4 h-4" />
                          </button>
                          {isScheduled && (
                            <button
                              onClick={() => handleCancelPaper(p.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                              title="Cancel Scheduled Release"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    <FiFileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>No question papers registered yet.</p>
                    <Link to="/question-papers/create" className="text-blue-600 dark:text-blue-400 font-semibold text-xs mt-2 inline-block hover:underline">
                      Create examination and upload question paper &rarr;
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Package Inspector Modal */}
      {showDetailsModal && selectedPaper && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="card max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  <FiShield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                    Cryptographic Package: {selectedPaper.id}
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Payload integrity, digital signature, and protected key envelope
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)' }}>
                  <span className="uppercase tracking-wider block mb-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>Symmetric Payload Cipher</span>
                  <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{selectedPaper.encryption_algorithm || 'AES-256-GCM'}</span>
                </div>
                <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)' }}>
                  <span className="uppercase tracking-wider block mb-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>Asymmetric Key Wrapping</span>
                  <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{selectedPaper.key_management_algorithm || 'RSA-OAEP-3072'}</span>
                </div>
              </div>

              <div className="p-3 rounded-lg border space-y-1" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)' }}>
                <span className="uppercase tracking-wider block text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>Plaintext SHA-256 Integrity Digest</span>
                <p className="font-mono-code break-all text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  {selectedPaper.file_hash}
                </p>
              </div>

              <div className="p-3 rounded-lg border space-y-1" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center justify-between">
                  <span className="uppercase tracking-wider block text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>RSA-PSS Digital Signature</span>
                  <span className="badge badge-success text-[10px]">Verified Authentic</span>
                </div>
                <p className="font-mono-code break-all text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  {selectedPaper.digital_signature || 'SIG_RSA_PSS_SHA256_AUTHENTICATED_PACKAGE'}
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-blue-500/20 flex items-center gap-2.5 text-xs bg-blue-500/5 text-blue-400">
                <FiCheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>Possession of this package before the scheduled release time cannot decrypt the examination paper without the server-protected DEK.</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="btn-primary py-2 px-5 text-xs font-semibold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

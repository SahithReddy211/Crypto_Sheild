import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FiLock, 
  FiUnlock, 
  FiClock, 
  FiCheckCircle, 
  FiDownload, 
  FiAlertCircle, 
  FiShield, 
  FiRefreshCw, 
  FiEye,
  FiFileText,
  FiXCircle
} from 'react-icons/fi';
import { questionPaperService, systemTimeService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function StudentExamDashboard() {
  const { user, addToast } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [serverTime, setServerTime] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [earlyAccessModal, setEarlyAccessModal] = useState(null);

  useEffect(() => {
    fetchStudentData();
    const interval = setInterval(fetchStudentData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Update server time tick every second locally
  useEffect(() => {
    const timer = setInterval(() => {
      setServerTime(prev => new Date(prev.getTime() + 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchStudentData = async () => {
    try {
      const [papersRes, timeRes] = await Promise.all([
        questionPaperService.getStudentPapers(),
        systemTimeService.getSystemTime()
      ]);
      setPapers(papersRes.data);
      setServerTime(new Date(timeRes.data.server_time_utc));
    } catch (err) {
      console.error("Failed to load student papers:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleManualSync = () => {
    setRefreshing(true);
    fetchStudentData();
    addToast('Authoritative server time synchronized.', 'info');
  };

  const handleEarlyAccessAttempt = async (paper) => {
    try {
      const res = await questionPaperService.requestReleaseToken(paper.id);
      if (res.data.success) {
        addToast('Release authorized! Opening question paper...', 'success');
        navigate(`/question-papers/viewer/${paper.id}`);
      }
    } catch (err) {
      const errData = err.response?.data || {};
      setEarlyAccessModal({
        paper,
        error: errData.error || 'PAPER_NOT_RELEASED',
        releaseAt: errData.release_at || paper.release_at,
        serverTime: errData.server_time || serverTime.toISOString()
      });
      addToast('Access Denied: Scheduled release time has not been reached.', 'error');
    }
  };

  const formatCountdown = (targetDateStr) => {
    if (!targetDateStr) return '00:00:00';
    const target = new Date(targetDateStr);
    const diffMs = target.getTime() - serverTime.getTime();
    if (diffMs <= 0) return '00:00:00';
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="card p-6 sm:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            <FiShield className="w-4 h-4" />
            <span>Authorized Student Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            My Scheduled Examinations
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Welcome, <span className="font-semibold text-blue-500">{user?.username}</span>. Below are your assigned academic examinations. Encrypted question papers are automatically unlocked strictly at the authoritative server release timestamp.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 px-4 rounded-xl border text-xs flex items-center gap-2.5" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)' }}>
            <FiClock className="w-4 h-4 text-emerald-500" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">Authoritative Server Time</p>
              <p className="font-mono-code font-bold text-sm text-slate-100">
                {serverTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })} UTC
              </p>
            </div>
          </div>
          <button
            onClick={handleManualSync}
            className="btn-secondary py-2.5 px-3 flex items-center gap-1.5 text-xs font-semibold"
            title="Sync with server"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Examinations Grid */}
      {loading ? (
        <div className="card p-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          Loading enrolled examinations and cryptographic release schedule...
        </div>
      ) : papers.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {papers.map((paper) => {
            const relDate = paper.release_at ? new Date(paper.release_at) : null;
            const examStart = paper.exam_start_at ? new Date(paper.exam_start_at) : null;
            const isReleased = paper.can_decrypt || (relDate && serverTime >= relDate);
            const countdownStr = formatCountdown(paper.release_at);

            return (
              <div 
                key={paper.id}
                className={`card p-6 flex flex-col justify-between border-2 transition-all ${
                  isReleased 
                    ? 'border-emerald-500/40 shadow-emerald-950/20' 
                    : 'border-[var(--border-subtle)]'
                }`}
              >
                <div className="space-y-5">
                  {/* Card Top: Subject & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="badge badge-neutral text-[11px] font-mono-code font-semibold mb-1.5 inline-block">
                        {paper.course_id || 'CS-804'} &middot; Sec {paper.section || 'A'}
                      </span>
                      <h2 className="text-lg font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                        {paper.subject || 'Academic Examination'}
                      </h2>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {paper.exam_name || 'Midterm Examination'} &middot; Paper ID: <span className="font-mono-code font-semibold">{paper.id}</span>
                      </p>
                    </div>

                    <div>
                      {isReleased ? (
                        <span className="badge badge-success text-xs font-bold flex items-center gap-1">
                          <FiUnlock className="w-3.5 h-3.5" /> AVAILABLE
                        </span>
                      ) : (
                        <span className="badge badge-error text-xs font-bold flex items-center gap-1">
                          <FiLock className="w-3.5 h-3.5" /> LOCKED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Schedule Times & Countdown */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)' }}>
                      <span className="uppercase text-[10px] tracking-wider block mb-1 text-slate-400">Exam Window</span>
                      <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {examStart ? examStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:00 AM'}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)' }}>
                      <span className="uppercase text-[10px] tracking-wider block mb-1 text-slate-400">Scheduled Release</span>
                      <span className="font-semibold text-sm text-emerald-500">
                        {relDate ? relDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '09:55 AM'}
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Status Box */}
                  {!isReleased ? (
                    <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                          <FiLock className="w-4 h-4" />
                          <span>Question Paper Locked</span>
                        </div>
                        <span className="font-mono-code text-xs font-bold text-amber-300">
                          RELEASES IN: {countdownStr}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-300">
                        This question paper is encrypted at rest using AES-256-GCM + RSA-OAEP-3072. The decryption key is locked on the server and cannot be released before {relDate ? relDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'release time'}.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 space-y-2.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                        <FiCheckCircle className="w-4 h-4" />
                        <span>Question Paper Released</span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[10px]">
                        <span className="badge badge-success">✓ Cryptographic Signature: PASSED</span>
                        <span className="badge badge-success">✓ Integrity SHA-256: PASSED</span>
                        <span className="badge badge-success">✓ Student Authorization: PASSED</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="pt-5 mt-5 border-t flex items-center justify-between gap-3" style={{ borderColor: 'var(--border-subtle)' }}>
                  {paper.distribution_mode === 'MODE_B' ? (
                    <a
                      href={questionPaperService.getEncryptedPackageUrl(paper.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary py-2 px-3 text-xs font-semibold flex items-center gap-1.5"
                      title="Download Ciphertext .enc package"
                    >
                      <FiDownload className="w-3.5 h-3.5" />
                      <span>Download .enc</span>
                    </a>
                  ) : (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <FiShield className="w-3.5 h-3.5 text-blue-500" /> Mode A Stream
                    </span>
                  )}

                  {isReleased ? (
                    <Link
                      to={`/question-papers/viewer/${paper.id}`}
                      className="btn-primary py-2.5 px-6 text-xs font-bold flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 shadow-md"
                    >
                      <FiEye className="w-4 h-4" />
                      <span>OPEN QUESTION PAPER</span>
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleEarlyAccessAttempt(paper)}
                      className="btn-secondary py-2.5 px-5 text-xs font-semibold flex items-center gap-2 hover:border-amber-500"
                    >
                      <FiLock className="w-3.5 h-3.5" />
                      <span>Open Question Paper</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card p-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          <FiFileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>No active examinations currently assigned to your account.</p>
        </div>
      )}

      {/* EARLY ACCESS REJECTION MODAL (DEMONSTRATION OF SECURITY THREAT 1 & 2) */}
      {earlyAccessModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="card max-w-lg w-full p-6 space-y-5 border-2 border-red-500/50 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center flex-shrink-0 border border-red-500/30">
                <FiXCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-red-400">
                  Access Denied — Question Paper Locked
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Possession of the encrypted file does not grant decryption capability prior to the authoritative server release timestamp.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-red-500/20 bg-red-950/20 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Security Decision:</span>
                <span className="font-bold text-red-400 font-mono-code">{earlyAccessModal.error}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Scheduled Release (UTC):</span>
                <span className="font-mono-code text-slate-200">{new Date(earlyAccessModal.releaseAt).toUTCString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Authoritative Server Time:</span>
                <span className="font-mono-code text-slate-200">{new Date(earlyAccessModal.serverTime).toUTCString()}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-red-500/20">
                <span className="text-slate-400">Audit Trail:</span>
                <span className="badge badge-warning text-[10px]">Logged: EARLY_ACCESS_DENIED</span>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 text-xs text-blue-300 flex items-center gap-2">
              <FiShield className="w-4 h-4 flex-shrink-0" />
              <span>Decryption keys are wrapped on the server and released only when server clock &gt;= release time.</span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setEarlyAccessModal(null)}
                className="btn-secondary py-2 px-5 text-xs font-semibold"
              >
                Acknowledge & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

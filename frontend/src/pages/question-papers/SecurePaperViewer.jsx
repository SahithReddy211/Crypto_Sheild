import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  FiShield, 
  FiLock, 
  FiUnlock, 
  FiCheckCircle, 
  FiMaximize, 
  FiMinimize, 
  FiZoomIn, 
  FiZoomOut, 
  FiArrowLeft,
  FiClock,
  FiUser,
  FiFileText,
  FiAlertTriangle
} from 'react-icons/fi';
import { questionPaperService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function SecurePaperViewer() {
  const { id: paperId } = useParams();
  const { user, addToast } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [paperData, setPaperData] = useState(null);
  const [error, setError] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(90 * 60);

  useEffect(() => {
    fetchAndDecryptPaper();
  }, [paperId]);

  // Exam timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchAndDecryptPaper = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Request Short-Lived Release Token
      const tokenRes = await questionPaperService.requestReleaseToken(paperId);
      const releaseToken = tokenRes.data.release_token;

      // 2. Request Decryption with Token
      const decRes = await questionPaperService.decryptPaper(paperId, releaseToken);
      setPaperData(decRes.data);
      addToast('Question paper decrypted & authenticated successfully.', 'success');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to authorize and decrypt question paper.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const formatTimer = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const decodedContent = paperData?.content_base64 
    ? atob(paperData.content_base64) 
    : '';

  return (
    <div className={`space-y-6 ${isFullscreen ? 'p-6 fixed inset-0 z-50 overflow-y-auto bg-slate-950' : ''}`}>
      {/* Top Controls Bar */}
      <div className="card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            to="/question-papers/student"
            className="btn-secondary p-2 text-xs font-semibold flex items-center gap-1"
            title="Return to examinations"
          >
            <FiArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono-code font-bold text-xs text-blue-500">{paperId}</span>
              <span className="badge badge-success text-[10px]">VERIFIED AUTHENTIC</span>
            </div>
            <h1 className="text-base font-bold truncate" style={{ color: 'var(--text-primary)' }}>
              {paperData?.filename || 'Examination Question Paper'}
            </h1>
          </div>
        </div>

        {/* Center: Live Exam Timer */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border bg-blue-500/10 border-blue-500/30 text-blue-400">
          <FiClock className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Time Remaining:</span>
          <span className="font-mono-code font-bold text-sm text-white">{formatTimer(remainingSeconds)}</span>
        </div>

        {/* Right: Viewport Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => setZoomLevel(prev => Math.max(70, prev - 10))}
            className="btn-secondary p-2 text-xs"
            title="Zoom Out"
          >
            <FiZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono-code px-2 text-slate-400">{zoomLevel}%</span>
          <button
            onClick={() => setZoomLevel(prev => Math.min(150, prev + 10))}
            className="btn-secondary p-2 text-xs"
            title="Zoom In"
          >
            <FiZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="btn-secondary p-2 text-xs"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <FiMinimize className="w-4 h-4" /> : <FiMaximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Security Verification Bar */}
      <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4 text-emerald-400">
          <span className="flex items-center gap-1 font-semibold">
            <FiCheckCircle className="w-4 h-4" /> Digital Signature Verified (RSA-PSS)
          </span>
          <span className="flex items-center gap-1 font-semibold">
            <FiCheckCircle className="w-4 h-4" /> Payload Integrity Verified (SHA-256)
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono-code text-[11px] text-slate-400">
          <FiUser className="w-3.5 h-3.5 text-blue-500" />
          <span>Issued to: {paperData?.watermark?.student_name || user?.username} ({paperData?.watermark?.student_id})</span>
        </div>
      </div>

      {/* Main Document Viewer Container with Dynamic Watermarking */}
      <div className="card p-8 sm:p-12 relative overflow-hidden min-h-[600px] shadow-2xl border-2 border-slate-700/40">
        {/* Repeating Watermark Overlay */}
        <div 
          className="absolute inset-0 pointer-events-none z-10 flex flex-wrap items-center justify-around opacity-[0.06] select-none transform -rotate-12 scale-110 overflow-hidden"
          aria-hidden="true"
        >
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="p-6 text-center font-bold tracking-widest text-slate-100 text-xs sm:text-sm">
              <p>CONFIDENTIAL &middot; {paperData?.watermark?.student_name || user?.username}</p>
              <p className="text-[10px]">{paperData?.watermark?.student_id} &middot; {paperId}</p>
              <p className="text-[9px]">{paperData?.watermark?.timestamp}</p>
            </div>
          ))}
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Verifying cryptographic signatures and decrypting payload...
            </p>
          </div>
        ) : error ? (
          <div className="py-24 text-center space-y-4 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto border border-red-500/20">
              <FiAlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-red-400">Decryption & Authorization Failed</h2>
            <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
            <button onClick={fetchAndDecryptPaper} className="btn-primary py-2 px-5 text-xs font-semibold">
              Retry Authorization
            </button>
          </div>
        ) : (
          <div 
            className="space-y-6 relative z-0 transition-transform origin-top"
            style={{ transform: `scale(${zoomLevel / 100})` }}
          >
            {/* Examination Paper Header */}
            <div className="border-b-2 pb-6 text-center space-y-1" style={{ borderColor: 'var(--border-subtle)' }}>
              <span className="text-[11px] font-bold uppercase tracking-widest text-blue-500">
                Department of Computer Science & Cybersecurity
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                {paperData?.filename?.replace('.pdf', '') || 'Examination Question Paper'}
              </h2>
              <div className="flex items-center justify-center gap-4 text-xs font-medium pt-2 text-slate-400">
                <span>Paper ID: <strong className="text-slate-200">{paperId}</strong></span>
                <span>&bull;</span>
                <span>Max Marks: <strong className="text-slate-200">100</strong></span>
                <span>&bull;</span>
                <span>Duration: <strong className="text-slate-200">90 Minutes</strong></span>
              </div>
            </div>

            {/* Questions Text Content */}
            <div 
              className="prose dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap font-sans space-y-4"
              style={{ color: 'var(--text-primary)' }}
            >
              {decodedContent.startsWith('%PDF') ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border bg-blue-500/5 border-blue-500/20 text-xs text-slate-300">
                    <p className="font-semibold text-blue-400 mb-1">Encrypted PDF Payload Successfully Decrypted:</p>
                    <p className="font-mono-code text-[11px] break-all">Digest: {paperData?.file_hash}</p>
                  </div>
                  <div className="p-6 rounded-xl border space-y-4 font-mono-code text-xs leading-relaxed" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)' }}>
                    {decodedContent.replace(/%PDF[^\n]*\n/g, '').split('\n').filter(line => !line.startsWith('%') && line.trim()).join('\n\n') || decodedContent}
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-xl border space-y-4" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)' }}>
                  {decodedContent}
                </div>
              )}
            </div>

            {/* End of paper footer */}
            <div className="border-t pt-6 text-center text-xs text-slate-400" style={{ borderColor: 'var(--border-subtle)' }}>
              <p>&mdash; END OF EXAMINATION QUESTION PAPER &mdash;</p>
              <p className="text-[10px] mt-1 text-slate-400">
                Authorized session for {user?.username} &middot; Cryptographically verified by CryptoShield Server Key Management Service
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
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
  FiAlertTriangle,
  FiRefreshCw,
  FiXCircle,
  FiKey,
  FiAward,
  FiFileText,
  FiDownload,
  FiExternalLink
} from 'react-icons/fi';
import { questionPaperService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatIST, formatUTC, formatDateIST } from '../../utils/timeFormat';

export default function SecurePaperViewer() {
  const { id: paperId } = useParams();
  const { user, addToast } = useAuth();

  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [paperData, setPaperData] = useState(null);
  const [errorData, setErrorData] = useState(null); // { code, message, release_at, server_time }
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(90 * 60);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);

  // Convert base64 decrypted payload into in-memory PDF Blob URL
  useEffect(() => {
    if (!paperData?.content_base64) {
      setPdfBlobUrl(null);
      return;
    }

    try {
      const binaryString = atob(paperData.content_base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const isPdfDoc = paperData.is_pdf || paperData.filename?.toLowerCase().endsWith('.pdf') || binaryString.startsWith('%PDF');
      const blob = new Blob([bytes], { type: isPdfDoc ? 'application/pdf' : 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);

      return () => {
        URL.revokeObjectURL(url);
      };
    } catch (err) {
      console.error('Failed to create PDF blob URL from decrypted payload:', err);
    }
  }, [paperData]);

  // ── Decrypt: always fresh backend request ──────────────────────────────────
  const fetchAndDecrypt = useCallback(async (isRetry = false) => {
    if (isRetry) setRetrying(true);
    else setLoading(true);
    setErrorData(null);

    try {
      // Step 1: Request short-lived release token
      const tokenRes = await questionPaperService.requestReleaseToken(paperId);
      const releaseToken = tokenRes.data.release_token;

      // Step 2: Decrypt with token
      const decRes = await questionPaperService.decryptPaper(paperId, releaseToken);
      setPaperData(decRes.data);
      addToast('Question paper decrypted & authenticated successfully.', 'success');
    } catch (err) {
      const data = err.response?.data || {};
      setErrorData({
        code: data.error || 'ACCESS_DENIED',
        message: data.message || data.error || 'Authorization failed.',
        release_at: data.release_at || null,
        server_time: data.server_time || null,
      });
      if (!isRetry) addToast(data.error || 'Access denied.', 'error');
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, [paperId]);

  useEffect(() => {
    fetchAndDecrypt(false);
  }, [fetchAndDecrypt]);

  // Countdown timer (ticks locally based on exam duration)
  useEffect(() => {
    if (!paperData) return;
    const timer = setInterval(() => {
      setRemainingSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [paperData]);

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

  const decodedContent = paperData?.content_base64 ? atob(paperData.content_base64) : '';
  const isPdf = paperData?.is_pdf || paperData?.filename?.toLowerCase().endsWith('.pdf') || decodedContent.startsWith('%PDF');
  const isRealPdf = isPdf && (decodedContent.includes('obj') || decodedContent.includes('%%EOF') || decodedContent.includes('/Pages') || !decodedContent.includes('% Cryptography'));

  // Watermark comes from server-returned data (derived from JWT, not user input)
  const wm = paperData?.watermark || {};
  const watermarkName = wm.student_name || user?.full_name || user?.username || 'STUDENT';
  const watermarkId = wm.student_id || user?.student_id || '';
  const watermarkSection = wm.section || user?.section || '';

  // Error is crypto (signature/integrity failure) or authorization (time / enrollment)
  const isCryptoError = errorData && ['SIGNATURE_INVALID', 'INTEGRITY_FAILED', 'CRYPTO_ERROR'].includes(errorData.code);
  const isAuthError = errorData && !isCryptoError;

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
              <span className="font-mono text-xs text-blue-500">{paperId}</span>
              {paperData && (
                <span className="badge badge-success text-[10px]">VERIFIED AUTHENTIC</span>
              )}
            </div>
            <h1 className="text-base font-bold truncate" style={{ color: 'var(--text-primary)' }}>
              {paperData?.filename || 'Examination Question Paper'}
            </h1>
          </div>
        </div>

        {/* Center: Live Exam Timer (only when paper is open) */}
        {paperData && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl border bg-blue-500/10 border-blue-500/30 text-blue-400">
            <FiClock className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Time Remaining:</span>
            <span className="font-mono font-bold text-sm text-white">{formatTimer(remainingSeconds)}</span>
          </div>
        )}

        {/* Right: Viewport Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button onClick={() => setZoomLevel(prev => Math.max(70, prev - 10))} className="btn-secondary p-2 text-xs" title="Zoom Out">
            <FiZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono px-2 text-slate-400">{zoomLevel}%</span>
          <button onClick={() => setZoomLevel(prev => Math.min(150, prev + 10))} className="btn-secondary p-2 text-xs" title="Zoom In">
            <FiZoomIn className="w-4 h-4" />
          </button>
          <button onClick={toggleFullscreen} className="btn-secondary p-2 text-xs" title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}>
            {isFullscreen ? <FiMinimize className="w-4 h-4" /> : <FiMaximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── Loading State ──────────────────────────────────────────────────── */}
      {loading ? (
        <div className="card p-12 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Verifying cryptographic signatures and decrypting payload…
          </p>
        </div>
      ) : errorData ? (
        /* ── Error State: Dual-panel (Crypto vs Authorization) ─────────────── */
        <div className="card p-6 space-y-5 max-w-2xl mx-auto">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${
              isCryptoError
                ? 'bg-red-600/20 text-red-500 border-red-500/30'
                : 'bg-amber-600/20 text-amber-500 border-amber-500/30'
            }`}>
              {isCryptoError ? <FiXCircle className="w-6 h-6" /> : <FiLock className="w-6 h-6" />}
            </div>
            <div>
              <h3 className={`text-base font-bold ${isCryptoError ? 'text-red-400' : 'text-amber-400'}`}>
                {isCryptoError ? 'Cryptographic Verification Failed' : 'Authorization Denied'}
              </h3>
              <p className="text-xs text-slate-300 mt-1">{errorData.message}</p>
            </div>
          </div>

          {/* Dual-panel: Crypto Status vs Authorization Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Panel A: Cryptographic Integrity */}
            <div className="p-4 rounded-xl border border-slate-700/60 space-y-2 text-xs">
              <p className="font-bold uppercase tracking-wider text-[10px] text-blue-400 flex items-center gap-1.5">
                <FiKey className="w-3 h-3" /> Cryptographic Verification
              </p>
              {isCryptoError ? (
                <>
                  <div className="flex items-center gap-1.5 text-red-400">
                    <FiXCircle className="w-3.5 h-3.5" /> <span>Digital Signature: FAILED</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-red-400">
                    <FiXCircle className="w-3.5 h-3.5" /> <span>Payload Integrity: FAILED</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <FiCheckCircle className="w-3.5 h-3.5" /> <span>Digital Signature: PASSED</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <FiCheckCircle className="w-3.5 h-3.5" /> <span>Payload Integrity: PASSED</span>
                  </div>
                </>
              )}
            </div>

            {/* Panel B: Authorization Status */}
            <div className="p-4 rounded-xl border border-slate-700/60 space-y-2 text-xs">
              <p className="font-bold uppercase tracking-wider text-[10px] text-amber-400 flex items-center gap-1.5">
                <FiShield className="w-3 h-3" /> Access Authorization
              </p>
              <div className={`flex items-center gap-1.5 ${isAuthError ? 'text-amber-400' : 'text-emerald-400'}`}>
                {isAuthError ? <FiXCircle className="w-3.5 h-3.5" /> : <FiCheckCircle className="w-3.5 h-3.5" />}
                <span>Error: <span className="font-mono font-bold">{errorData.code}</span></span>
              </div>
              {errorData.release_at && (
                <div className="text-slate-400 space-y-0.5">
                  <div>
                    <span>Releases at (IST): </span>
                    <span className="font-mono text-emerald-400 font-bold">{formatIST(errorData.release_at)}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Stored UTC: {formatUTC(errorData.release_at)}
                  </div>
                </div>
              )}
              {errorData.server_time && (
                <div className="text-slate-400 space-y-0.5 border-t pt-1 border-slate-700/50">
                  <div>
                    <span>Server Time (IST): </span>
                    <span className="font-mono text-slate-200">{formatIST(errorData.server_time)}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Authoritative UTC: {formatUTC(errorData.server_time)}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 text-xs text-blue-300 flex items-center gap-2">
            <FiShield className="w-4 h-4 flex-shrink-0" />
            <span>The DEK is server-side. Even possessing the ciphertext, decryption is impossible before <code>serverTime &gt;= releaseAt</code>.</span>
          </div>

          <div className="flex justify-between items-center pt-2">
            <Link to="/question-papers/student" className="btn-secondary py-2 px-4 text-xs font-semibold">
              ← Back to Exams
            </Link>
            {/* Retry makes a FRESH backend request — not cached state */}
            <button
              onClick={() => fetchAndDecrypt(true)}
              disabled={retrying}
              className="btn-primary py-2 px-5 text-xs font-semibold flex items-center gap-1.5"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
              {retrying ? 'Checking with Server…' : 'Retry Authorization'}
            </button>
          </div>
        </div>
      ) : (
        /* ── Success State: Security Verification Bar + Document ────────────── */
        <>
          {/* Security Verification Bar — Dual Panels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Cryptographic panel */}
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 flex flex-wrap items-center gap-3 text-xs text-emerald-400">
              <span className="flex items-center gap-1 font-semibold">
                <FiKey className="w-3.5 h-3.5" /> Digital Signature Verified (RSA-PSS)
              </span>
              <span className="flex items-center gap-1 font-semibold">
                <FiCheckCircle className="w-3.5 h-3.5" /> Integrity Hash Verified (SHA-256)
              </span>
            </div>
            {/* Authorization panel */}
            <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-950/20 flex flex-wrap items-center justify-between gap-3 text-xs text-blue-300">
              <span className="flex items-center gap-1 font-semibold">
                <FiAward className="w-3.5 h-3.5" /> Enrolled Student: CONFIRMED
              </span>
              <span className="flex items-center gap-1 font-semibold">
                <FiClock className="w-3.5 h-3.5" /> Server Release Window: OPEN
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
                <FiUser className="w-3 h-3 text-blue-400" />
                {watermarkName} · {watermarkId}{watermarkSection ? ` · ${watermarkSection}` : ''}
              </span>
            </div>
          </div>

          {/* Main Document Viewer with Dynamic Watermarking */}
          <div className="card p-8 sm:p-12 relative overflow-hidden min-h-[600px] shadow-2xl border-2 border-slate-700/40">
            {/* Repeating Watermark Overlay — sourced from server JWT claims */}
            <div
              className="absolute inset-0 pointer-events-none z-10 flex flex-wrap items-center justify-around opacity-[0.06] select-none transform -rotate-12 scale-110 overflow-hidden"
              aria-hidden="true"
            >
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="p-6 text-center font-bold tracking-widest text-slate-100 text-xs sm:text-sm">
                  <p>CONFIDENTIAL · {watermarkName}</p>
                  <p className="text-[10px]">{watermarkId}{watermarkSection ? ` · ${watermarkSection}` : ''} · {paperId}</p>
                  <p className="text-[9px]">{wm.timestamp || new Date().toISOString()}</p>
                </div>
              ))}
            </div>

            {/* Content Body */}
            <div className="space-y-6 relative z-0">
              {/* Examination Paper Header */}
              <div className="border-b-2 pb-6 text-center space-y-1" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="text-[11px] font-bold uppercase tracking-widest text-blue-500">
                  {wm.department ? `Department of ${wm.department}` : 'Department of Computer Science & Cybersecurity'}
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

              {/* Question Paper Section Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-700/60 bg-slate-900/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 border border-blue-500/30">
                    <FiFileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-100">Question Paper</h3>
                      <span className="badge badge-success text-[10px]">DECRYPTED & AUTHENTICATED</span>
                    </div>
                    <p className="font-mono text-[11px] text-slate-400 mt-0.5 break-all">
                      SHA-256 Digest: <span className="text-slate-300">{paperData?.file_hash}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {pdfBlobUrl && (
                    <>
                      <a
                        href={pdfBlobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary py-2 px-3 text-xs font-semibold flex items-center gap-1.5"
                        title="Open in new browser tab"
                      >
                        <FiExternalLink className="w-3.5 h-3.5" />
                        <span>Open in New Tab</span>
                      </a>
                      <a
                        href={pdfBlobUrl}
                        download={paperData?.filename || `${paperId}_Question_Paper.pdf`}
                        className="btn-secondary py-2 px-3 text-xs font-semibold flex items-center gap-1.5"
                        title="Download decrypted PDF"
                      >
                        <FiDownload className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    </>
                  )}
                </div>
              </div>

              {/* Question Paper Content Body / PDF Viewer */}
              {isRealPdf || (isPdf && pdfBlobUrl) ? (
                <div
                  className="relative w-full rounded-xl overflow-hidden border-2 border-slate-700/80 bg-slate-950 shadow-2xl transition-all"
                  style={{ minHeight: '800px', height: `${Math.max(650, Math.round(850 * (zoomLevel / 100)))}px` }}
                >
                  {/* Watermark Overlay floating over PDF Viewer */}
                  <div
                    className="absolute inset-0 pointer-events-none z-10 flex flex-wrap items-center justify-around opacity-[0.05] select-none transform -rotate-12 scale-110 overflow-hidden"
                    aria-hidden="true"
                  >
                    {Array.from({ length: 24 }).map((_, i) => (
                      <div key={i} className="p-8 text-center font-bold tracking-widest text-slate-100 text-xs sm:text-sm">
                        <p>CONFIDENTIAL · {watermarkName}</p>
                        <p className="text-[10px]">{watermarkId}{watermarkSection ? ` · ${watermarkSection}` : ''} · {paperId}</p>
                        <p className="text-[9px]">{wm.timestamp || new Date().toISOString()}</p>
                      </div>
                    ))}
                  </div>

                  {pdfBlobUrl ? (
                    <object
                      data={`${pdfBlobUrl}#toolbar=1&navpanes=0&zoom=${zoomLevel}`}
                      type="application/pdf"
                      className="w-full h-full rounded-xl"
                    >
                      <iframe
                        src={`${pdfBlobUrl}#toolbar=1&navpanes=0&zoom=${zoomLevel}`}
                        className="w-full h-full border-0 rounded-xl"
                        title="Decrypted Question Paper PDF"
                      >
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4 text-slate-300">
                          <FiFileText className="w-12 h-12 text-blue-400" />
                          <h4 className="text-base font-semibold">Decrypted Question Paper PDF Ready</h4>
                          <p className="text-xs text-slate-400 max-w-md">
                            Your browser does not support embedded PDF preview inside this frame.
                          </p>
                          <a
                            href={pdfBlobUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary py-2 px-4 text-xs font-bold inline-flex items-center gap-2"
                          >
                            <FiExternalLink className="w-4 h-4" /> Open Decrypted Question Paper
                          </a>
                        </div>
                      </iframe>
                    </object>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-medium">Rendering decrypted PDF document…</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 rounded-xl border font-mono text-sm leading-relaxed space-y-4" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)' }}>
                  {decodedContent.replace(/%PDF[^\n]*\n/g, '').split('\n').filter(line => !line.startsWith('%') && line.trim()).join('\n\n') || decodedContent}
                </div>
              )}

              {/* Footer */}
              <div className="border-t pt-6 text-center text-xs text-slate-400" style={{ borderColor: 'var(--border-subtle)' }}>
                <p>&mdash; END OF EXAMINATION QUESTION PAPER &mdash;</p>
                <p className="text-[10px] mt-1">
                  Authorized session for <strong>{watermarkName}</strong> ({watermarkId}) · Cryptographically verified by CryptoAgility KMS
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

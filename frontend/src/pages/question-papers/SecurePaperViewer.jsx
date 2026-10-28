import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  FiShield, 
  FiLock, 
  FiClock, 
  FiCheckCircle, 
  FiMaximize, 
  FiMinimize, 
  FiZoomIn, 
  FiZoomOut, 
  FiArrowLeft,
  FiUser,
  FiRefreshCw, 
  FiXCircle, 
  FiChevronLeft,
  FiChevronRight,
  FiMaximize2,
  FiFileText,
  FiAward
} from 'react-icons/fi';
import { questionPaperService, systemTimeService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatIST, formatUTC } from '../../utils/timeFormat';

export default function SecurePaperViewer() {
  const { id: paperId } = useParams();
  const { user, addToast } = useAuth();

  // Status & Metadata state
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [paperStatus, setPaperStatus] = useState(null);
  const [errorData, setErrorData] = useState(null); // { code, message, release_at, server_time }

  // Viewer controls state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [fitToWidth, setFitToWidth] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(90 * 60);
  const [pageImageUrl, setPageImageUrl] = useState(null);
  const [securityNotice, setSecurityNotice] = useState(null);

  // References
  const viewerContainerRef = useRef(null);
  const currentBlobUrlRef = useRef(null);

  // ── Clean up Blob URLs on change and unmount ───────────────────────────────
  const revokeCurrentBlob = useCallback(() => {
    if (currentBlobUrlRef.current) {
      URL.revokeObjectURL(currentBlobUrlRef.current);
      currentBlobUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      revokeCurrentBlob();
    };
  }, [revokeCurrentBlob]);

  // ── Fetch Paper Status & Authorization ────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setErrorData(null);

    try {
      // Check status strictly on the server
      const statusRes = await questionPaperService.getPaperStatus(paperId);
      const data = statusRes.data;
      setPaperStatus(data);
      setTotalPages(data.total_pages || 1);

      if (!data.is_released) {
        setErrorData({
          code: 'PAPER_NOT_RELEASED',
          message: 'Question paper will be available at the scheduled release time.',
          release_at: data.release_at,
          server_time: data.server_time_utc
        });
      }
    } catch (err) {
      const errRes = err.response?.data || {};
      setErrorData({
        code: errRes.error || 'AUTHORIZATION_DENIED',
        message: errRes.message || errRes.error || 'Failed to authenticate question paper.',
        release_at: errRes.release_at || null,
        server_time: errRes.server_time || null
      });
      addToast(errRes.message || errRes.error || 'Access denied.', 'error');
    } finally {
      setLoading(false);
    }
  }, [paperId, addToast]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // ── Fetch Server-Rendered Page Image ──────────────────────────────────────
  const fetchPageImage = useCallback(async (pageNum) => {
    if (!paperStatus?.is_released) return;

    setPageLoading(true);
    try {
      const res = await questionPaperService.getPaperPageImage(paperId, pageNum);
      const blob = res.data;
      
      // Read total pages from response headers if available
      const totalFromHeader = res.headers['x-total-pages'];
      if (totalFromHeader) {
        setTotalPages(parseInt(totalFromHeader, 10));
      }

      revokeCurrentBlob();
      const objectUrl = URL.createObjectURL(blob);
      currentBlobUrlRef.current = objectUrl;
      setPageImageUrl(objectUrl);
    } catch (err) {
      const errRes = err.response?.data;
      let msg = 'Failed to load page image.';
      if (errRes instanceof Blob) {
        try {
          const text = await errRes.text();
          const parsed = JSON.parse(text);
          msg = parsed.message || parsed.error || msg;
        } catch {
          // ignore
        }
      } else if (errRes && typeof errRes === 'object') {
        msg = errRes.message || errRes.error || msg;
      }
      addToast(msg, 'error');
    } finally {
      setPageLoading(false);
    }
  }, [paperId, paperStatus?.is_released, revokeCurrentBlob, addToast]);

  // Fetch page image when released status is ready or page changes
  useEffect(() => {
    if (paperStatus?.is_released) {
      fetchPageImage(currentPage);
    }
  }, [paperStatus?.is_released, currentPage, fetchPageImage]);

  // ── Live Countdown Timer & Auto-Release ───────────────────────────────────
  useEffect(() => {
    if (!paperStatus) return;

    if (!paperStatus.is_released && paperStatus.release_at) {
      const targetTime = new Date(paperStatus.release_at).getTime();
      const checkRelease = () => {
        const now = new Date().getTime();
        if (now >= targetTime) {
          addToast('Scheduled release reached! Unlocking question paper...', 'success');
          fetchStatus();
        }
      };
      const interval = setInterval(checkRelease, 1000);
      return () => clearInterval(interval);
    }

    if (paperStatus.is_released) {
      const examTimer = setInterval(() => {
        setRemainingSeconds(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(examTimer);
    }
  }, [paperStatus, fetchStatus, addToast]);

  // ── Security Controls: Intercept Save/Print shortcuts & Right-Click ───────
  const showSecurityNotice = useCallback((action) => {
    setSecurityNotice(action);
    setTimeout(() => setSecurityNotice(null), 3500);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Prevent Ctrl+S, Ctrl+P, Cmd+S, Cmd+P
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p' || e.key === 'S' || e.key === 'P')) {
        e.preventDefault();
        showSecurityNotice('Printing and local saving are disabled for examination integrity.');
        return false;
      }

      // Left/Right arrow navigation
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        setCurrentPage(prev => Math.min(totalPages, prev + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setCurrentPage(prev => Math.max(1, prev - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalPages, showSecurityNotice]);

  const handleContextMenu = (e) => {
    e.preventDefault();
    showSecurityNotice('Context menu and saving are disabled on examination documents.');
    return false;
  };

  const handleDragStart = (e) => {
    e.preventDefault();
    return false;
  };

  // ── Fullscreen Toggle ─────────────────────────────────────────────────────
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      viewerContainerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const formatTimer = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const studentName = paperStatus?.student?.name || user?.full_name || user?.username || 'STUDENT';
  const studentId = paperStatus?.student?.id || user?.student_id || 'STU-AUTH';
  const examName = paperStatus?.exam_name || paperStatus?.subject || 'Examination';

  return (
    <div 
      ref={viewerContainerRef}
      onContextMenu={handleContextMenu}
      className={`space-y-4 select-none ${isFullscreen ? 'p-4 fixed inset-0 z-50 overflow-y-auto bg-slate-950 text-slate-100' : ''}`}
      style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
    >
      {/* ── Security Alert Toast Banner ──────────────────────────────────── */}
      {securityNotice && (
        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-red-600/90 text-white text-xs font-semibold shadow-xl border border-red-400 backdrop-blur-md flex items-center gap-2 animate-bounce">
          <FiShield className="w-4 h-4" />
          <span>{securityNotice}</span>
        </div>
      )}

      {/* ── Top Header Controls Bar ───────────────────────────────────────── */}
      <div className="card p-3 sm:p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-md border" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Link
            to="/question-papers/student"
            className="btn-secondary p-2 text-xs font-semibold flex items-center gap-1 rounded-lg"
            title="Return to Student Portal"
          >
            <FiArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold text-blue-500 uppercase">{paperId}</span>
              {paperStatus?.is_released ? (
                <span className="badge badge-success text-[10px] uppercase font-bold tracking-wider">
                  AUTHENTICATED • LIVE
                </span>
              ) : (
                <span className="badge badge-warning text-[10px] uppercase font-bold tracking-wider">
                  SCHEDULED • LOCKED
                </span>
              )}
            </div>
            <h1 className="text-base sm:text-lg font-bold truncate tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {examName}
            </h1>
          </div>
        </div>

        {/* Center: Authoritative Exam Remaining Timer */}
        {paperStatus?.is_released && (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-sm">
            <FiClock className="w-4 h-4 animate-pulse text-blue-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">Remaining:</span>
            <span className="font-mono font-bold text-sm text-white">{formatTimer(remainingSeconds)}</span>
          </div>
        )}

        {/* Right: Security & Session Status Badge */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px]">
            <FiCheckCircle className="w-3.5 h-3.5" />
            <span>Zero Local PDF Footprint</span>
          </div>
        </div>
      </div>

      {/* ── Main View Area ────────────────────────────────────────────────── */}
      {loading ? (
        <div className="card p-16 text-center space-y-4 shadow-xl">
          <div className="w-9 h-9 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-200">
            Validating student session and cryptographic key schedule…
          </p>
          <p className="text-xs text-slate-400">
            The original PDF is held strictly server-side. Preparing secure rasterizer.
          </p>
        </div>
      ) : errorData ? (
        /* ── Pre-Release or Authorization Denied State ─────────────────────── */
        <div className="card p-8 max-w-xl mx-auto space-y-6 text-center shadow-2xl border" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center border bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-inner">
            <FiLock className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-amber-400">
              {errorData.code === 'PAPER_NOT_RELEASED' 
                ? 'Question Paper Scheduled' 
                : 'Examination Access Denied'}
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              {errorData.message}
            </p>
          </div>

          {errorData.release_at && (
            <div className="p-4 rounded-xl border border-slate-700/60 bg-slate-900/40 text-xs space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span>Scheduled Release Time (IST):</span>
                <span className="font-mono text-emerald-400 font-bold">{formatIST(errorData.release_at)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Authoritative UTC:</span>
                <span className="font-mono text-slate-300">{formatUTC(errorData.release_at)}</span>
              </div>
              {errorData.server_time && (
                <div className="flex justify-between items-center text-slate-400 border-t border-slate-700/50 pt-2">
                  <span>Current Server Time:</span>
                  <span className="font-mono text-blue-400">{formatIST(errorData.server_time)}</span>
                </div>
              )}
            </div>
          )}

          <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5 text-xs text-blue-300 flex items-center gap-2.5 text-left">
            <FiShield className="w-5 h-5 flex-shrink-0 text-blue-400" />
            <span>
              Server-side access control active: Question papers cannot be viewed, rendered, or decrypted until the authoritative backend timestamp is reached.
            </span>
          </div>

          <div className="flex justify-between items-center pt-2">
            <Link to="/question-papers/student" className="btn-secondary py-2 px-4 text-xs font-semibold">
              ← Back to Examinations
            </Link>
            <button
              onClick={fetchStatus}
              className="btn-primary py-2 px-5 text-xs font-semibold flex items-center gap-1.5"
            >
              <FiRefreshCw className="w-3.5 h-3.5" />
              <span>Check Server Release</span>
            </button>
          </div>
        </div>
      ) : (
        /* ── Released Examination Viewer ───────────────────────────────────── */
        <div className="space-y-3">
          {/* Custom Viewer Toolbar (Page Navigation + Zoom + Fit) */}
          <div className="card p-2 sm:p-2.5 flex flex-wrap items-center justify-between gap-2 border bg-slate-900/80 shadow-md">
            {/* Page Navigation Controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage <= 1 || pageLoading}
                className="btn-secondary p-1.5 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed rounded-lg"
                title="Previous Page (Left Arrow)"
              >
                <FiChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs font-mono font-bold text-slate-200">
                <span>Page</span>
                <span className="text-blue-400 font-extrabold">{currentPage}</span>
                <span className="text-slate-500">/</span>
                <span>{totalPages}</span>
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages || pageLoading}
                className="btn-secondary p-1.5 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed rounded-lg"
                title="Next Page (Right Arrow)"
              >
                <FiChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Page Jump Buttons (if multi-page) */}
            {totalPages > 1 && totalPages <= 8 && (
              <div className="hidden sm:flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all ${
                      currentPage === p 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'btn-secondary text-slate-400 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {/* Zoom, Fit-to-Width & Fullscreen Controls */}
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                onClick={() => { setFitToWidth(false); setZoomLevel(prev => Math.max(60, prev - 15)); }}
                className="btn-secondary p-1.5 text-xs rounded-lg"
                title="Zoom Out"
              >
                <FiZoomOut className="w-4 h-4" />
              </button>

              <span className="text-xs font-mono font-bold px-1.5 text-slate-300 min-w-[45px] text-center">
                {fitToWidth ? 'Auto' : `${zoomLevel}%`}
              </span>

              <button
                onClick={() => { setFitToWidth(false); setZoomLevel(prev => Math.min(180, prev + 15)); }}
                className="btn-secondary p-1.5 text-xs rounded-lg"
                title="Zoom In"
              >
                <FiZoomIn className="w-4 h-4" />
              </button>

              <button
                onClick={() => setFitToWidth(prev => !prev)}
                className={`btn-secondary p-1.5 text-xs rounded-lg ${fitToWidth ? 'bg-blue-600 text-white' : ''}`}
                title="Fit to Width"
              >
                <FiMaximize2 className="w-4 h-4" />
              </button>

              <button
                onClick={toggleFullscreen}
                className="btn-secondary p-1.5 text-xs rounded-lg"
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              >
                {isFullscreen ? <FiMinimize className="w-4 h-4" /> : <FiMaximize className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* ── Document Page Display Canvas ──────────────────────────────── */}
          <div 
            className="card p-4 sm:p-8 flex flex-col items-center justify-center min-h-[750px] relative overflow-auto border-2 rounded-2xl bg-slate-950 shadow-2xl"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            {pageLoading ? (
              <div className="flex flex-col items-center justify-center p-16 space-y-3">
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-medium text-slate-400">
                  Rasterizing and watermarking Page {currentPage} server-side…
                </span>
              </div>
            ) : pageImageUrl ? (
              <div 
                className="relative transition-all duration-150 ease-out select-none shadow-2xl rounded-lg overflow-hidden border border-slate-700/60 bg-white"
                style={{
                  width: fitToWidth ? '100%' : `${Math.round(zoomLevel * 8.5)}px`,
                  maxWidth: fitToWidth ? '100%' : '1400px',
                }}
              >
                {/* Server-Rendered Rasterized Page Image */}
                <img
                  src={pageImageUrl}
                  alt={`Question Paper Page ${currentPage}`}
                  draggable={false}
                  onDragStart={handleDragStart}
                  className="w-full h-auto block select-none pointer-events-none"
                  style={{
                    imageRendering: 'auto',
                    WebkitTouchCallout: 'none',
                  }}
                />

                {/* Subtile Client Floating Security Watermark Layer */}
                <div 
                  className="absolute inset-0 pointer-events-none z-10 flex flex-wrap items-center justify-around opacity-[0.035] select-none transform -rotate-12 scale-110 overflow-hidden"
                  aria-hidden="true"
                >
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div key={i} className="p-8 text-center font-extrabold tracking-widest text-slate-900 text-xs">
                      <p>CONFIDENTIAL • {studentName}</p>
                      <p className="text-[10px]">{studentId} • {paperId}</p>
                      <p className="text-[9px]">{paperStatus?.server_time_ist || ''}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center p-12 space-y-2 text-slate-400">
                <FiFileText className="w-10 h-10 mx-auto text-slate-600" />
                <p className="text-sm">Unable to render page image.</p>
                <button onClick={() => fetchPageImage(currentPage)} className="btn-secondary text-xs px-3 py-1.5">
                  Retry Loading Page
                </button>
              </div>
            )}
          </div>

          {/* ── Document Footer & Security Stamp ──────────────────────────── */}
          <div className="card p-3 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2 border">
            <div className="flex items-center gap-2">
              <FiAward className="w-4 h-4 text-blue-400" />
              <span>Authorized Candidate: <strong className="text-slate-200">{studentName}</strong> ({studentId})</span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
              <span>SHA-256: {paperStatus?.file_hash?.substring(0, 16)}…</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold">Protected Session</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

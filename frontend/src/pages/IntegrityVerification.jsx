import React, { useState } from 'react';
import { 
  FiCheckCircle, 
  FiHash, 
  FiCopy, 
  FiShield, 
  FiRefreshCw, 
  FiFileText, 
  FiXCircle
} from 'react-icons/fi';
import { cryptoService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function IntegrityVerification() {
  const { addToast } = useAuth();
  const [textContent, setTextContent] = useState('CYBERSHIELD_INTEGRITY_VERIFICATION_PAYLOAD_2026');
  const [expectedHash, setExpectedHash] = useState('');
  
  const [verifying, setVerifying] = useState(false);
  const [hashResult, setHashResult] = useState(null);

  const handleRunHashCheck = async () => {
    setVerifying(true);
    setHashResult(null);
    try {
      const response = await cryptoService.generateOrVerifyHash({
        text_content: textContent,
        expected_hash: expectedHash || undefined
      });
      setHashResult(response.data);
      addToast('SHA-512 cryptographic hash generated.', 'success');
    } catch (err) {
      addToast('Hash computation failed.', 'error');
    } finally {
      setVerifying(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    addToast('SHA-512 hash copied to clipboard.', 'info');
  };

  const isVerified = hashResult?.verification_status?.toLowerCase().includes('verified') ||
                     hashResult?.verification_status?.toLowerCase().includes('match');

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Integrity Verification
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Compute deterministic 512-bit SHA-512 cryptographic digests and verify payload authenticity against expected hashes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input Payload */}
        <div className="lg:col-span-6 card p-6 flex flex-col justify-between gap-6">
          <div className="space-y-5">
            <div className="card-header -mx-6 -mt-6 mb-5">
              <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <FiFileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                1. Input Payload & Expected Hash
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Provide text content or data strings for digest calculation
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Payload Content
              </label>
              <textarea
                rows={5}
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                className="glass-input resize-none"
                placeholder="Enter string or payload text to compute SHA-512 hash..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Expected Hash (Optional Verification)
              </label>
              <input
                type="text"
                value={expectedHash}
                onChange={(e) => setExpectedHash(e.target.value)}
                className="glass-input font-mono-code text-xs"
                placeholder="Paste 128-char hex SHA-512 hash to check match..."
              />
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                Leave empty to compute digest only without checksum comparison.
              </p>
            </div>
          </div>

          <div>
            <button
              onClick={handleRunHashCheck}
              disabled={verifying || !textContent}
              className="w-full btn-primary py-3 flex items-center justify-center gap-2"
            >
              <FiRefreshCw className={`w-4 h-4 ${verifying ? 'animate-spin' : ''}`} />
              <span>{verifying ? 'Calculating SHA-512 Digest...' : 'Compute SHA-512 Digest'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Digest Output */}
        <div className="lg:col-span-6 card p-6 flex flex-col justify-between gap-6">
          <div className="space-y-5">
            <div className="card-header -mx-6 -mt-6 mb-5">
              <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <FiHash className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                2. SHA-512 Checksum Result
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Cryptographic 512-bit hash digest and match verification
              </p>
            </div>

            {hashResult ? (
              <div 
                className="p-5 rounded-xl border space-y-4"
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)' }}
              >
                {/* Large Status Card */}
                {expectedHash ? (
                  <div className={`flex items-center gap-3 p-3.5 rounded-lg border ${
                    isVerified 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                  }`}>
                    {isVerified ? (
                      <FiCheckCircle className="w-5 h-5 flex-shrink-0" />
                    ) : (
                      <FiXCircle className="w-5 h-5 flex-shrink-0" />
                    )}
                    <div>
                      <h3 className="text-sm font-semibold leading-tight">
                        {isVerified ? 'Integrity Verified — Checksum Match' : 'Integrity Check Failed — Hash Mismatch'}
                      </h3>
                      <p className="text-xs opacity-80 mt-0.5">
                        {isVerified ? 'The computed digest matches the expected hash precisely.' : 'The computed digest does not match the provided reference hash.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                    <FiCheckCircle className="w-4 h-4" />
                    <span>SHA-512 Digest Computed</span>
                  </div>
                )}

                {/* Generated Hash Box */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 text-xs">
                    <span className="font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Computed SHA-512 Hex Digest</span>
                    <button
                      onClick={() => copyToClipboard(hashResult.hash)}
                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <FiCopy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </button>
                  </div>
                  <div 
                    className="p-3 rounded-lg border text-xs leading-relaxed break-all font-mono-code"
                    style={{ 
                      backgroundColor: 'var(--bg-surface)', 
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-secondary)' 
                    }}
                  >
                    {hashResult.hash}
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div 
                    className="p-3 rounded-lg border"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
                  >
                    <span className="uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>Algorithm</span>
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{hashResult.algorithm || 'SHA-512'}</span>
                  </div>
                  <div 
                    className="p-3 rounded-lg border"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
                  >
                    <span className="uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>Execution Time</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm">{hashResult.execution_time_ms} ms</span>
                  </div>
                </div>
              </div>
            ) : (
              <div 
                className="p-10 rounded-xl border border-dashed text-center text-sm"
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
              >
                <FiHash className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Enter payload string and click <strong>Compute SHA-512 Digest</strong>.</p>
              </div>
            )}
          </div>

          <div 
            className="p-3.5 rounded-lg border text-xs flex items-center gap-2"
            style={{ 
              backgroundColor: 'var(--bg-input)', 
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-muted)' 
            }}
          >
            <FiShield className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>SHA-512 produces unique 64-byte hashes resistant to collision attacks.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

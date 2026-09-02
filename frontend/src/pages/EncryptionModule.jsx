import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  FiLock, 
  FiDownload, 
  FiCheckCircle, 
  FiFileText,
  FiShield,
  FiKey,
  FiInfo,
  FiArrowRight,
  FiCopy
} from 'react-icons/fi';
import { cryptoService, fileService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function EncryptionModule() {
  const { addToast } = useAuth();
  const location = useLocation();

  const [files, setFiles] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState('');
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('AES-256');
  const [passkey, setPasskey] = useState('');
  
  const [encrypting, setEncrypting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [encryptionResult, setEncryptionResult] = useState(null);

  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  const fetchUploadedFiles = async () => {
    try {
      const res = await fileService.getFiles();
      setFiles(res.data);
      if (location.state?.file) {
        setSelectedFileId(location.state.file.id);
      } else if (res.data.length > 0) {
        setSelectedFileId(res.data[0].id);
      }
      if (location.state?.recommendedAlgo) {
        const algo = location.state.recommendedAlgo;
        setSelectedAlgorithm(
          algo.includes('AES') ? 'AES-256' : 
          algo.includes('DES') ? 'Triple DES' : 
          algo.includes('RSA') ? 'RSA-2048' : 'AES-256'
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectedFile = files.find((f) => String(f.id) === String(selectedFileId));

  const handleStartEncryption = async () => {
    if (!passkey || !passkey.trim()) {
      addToast('Please enter an encryption key or passphrase.', 'error');
      return;
    }

    setEncrypting(true);
    setProgress(0);
    setEncryptionResult(null);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) { clearInterval(interval); return 90; }
        return prev + 15;
      });
    }, 100);

    try {
      const response = await cryptoService.encrypt(selectedFileId, selectedAlgorithm, passkey.trim());
      clearInterval(interval);
      setProgress(100);
      setEncryptionResult(response.data);
      addToast(`Encryption complete: ${response.data.algorithm}`, 'success');
    } catch (err) {
      clearInterval(interval);
      addToast(err.response?.data?.error || 'Encryption failed.', 'error');
    } finally {
      setEncrypting(false);
    }
  };

  const copyHash = (hash) => {
    navigator.clipboard.writeText(hash);
    addToast('SHA-512 hash copied to clipboard.', 'info');
  };

  const algorithms = [
    { 
      name: 'AES-256', 
      keySize: '256-bit Key', 
      desc: 'Galois/Counter Mode (GCM) AEAD high-throughput cipher.', 
      tag: 'Recommended' 
    },
    { 
      name: 'RSA-2048', 
      keySize: '2048-bit Hybrid', 
      desc: 'Asymmetric envelope wrapping AES symmetric session key.', 
      tag: 'High Security' 
    },
    { 
      name: 'Triple DES', 
      keySize: '168-bit Key', 
      desc: '3DES legacy cipher provided for benchmark comparisons.', 
      tag: 'Legacy' 
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Encrypt Payload
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Perform authenticated hybrid encryption, compute SHA-512 integrity digests, and package cryptographic assets.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Configuration Form */}
        <div className="lg:col-span-6 card p-6 flex flex-col justify-between gap-6">
          <div className="space-y-5">
            <div className="card-header -mx-6 -mt-6 mb-5">
              <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <FiFileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                1. Select File & Encryption Cipher
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Choose target payload and cryptographic cipher
              </p>
            </div>

            {/* Target File */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Target File
              </label>
              {files.length > 0 ? (
                <select
                  value={selectedFileId}
                  onChange={(e) => setSelectedFileId(e.target.value)}
                  className="glass-input"
                >
                  {files.map((f) => (
                    <option key={f.id} value={f.id} style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
                      #{f.id} — {f.original_name} ({(f.file_size / (1024 * 1024)).toFixed(2)} MB)
                    </option>
                  ))}
                </select>
              ) : (
                <div 
                  className="p-4 rounded-lg border flex items-center justify-between text-sm"
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)' }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>No vault files available.</span>
                  <Link to="/upload" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold text-xs">
                    Upload File
                  </Link>
                </div>
              )}
            </div>

            {/* Algorithm Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-muted)' }}>
                Cipher Algorithm
              </label>
              <div className="space-y-2">
                {algorithms.map((algo) => {
                  const isActive = selectedAlgorithm === algo.name;
                  return (
                    <button
                      key={algo.name}
                      type="button"
                      onClick={() => setSelectedAlgorithm(algo.name)}
                      className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-start justify-between ${
                        isActive
                          ? 'bg-blue-600/10 border-blue-500'
                          : 'border-[var(--border-subtle)] hover:border-blue-500'
                      }`}
                      style={{ backgroundColor: isActive ? 'rgba(37, 99, 235, 0.1)' : 'var(--bg-input)' }}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{algo.name}</span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>({algo.keySize})</span>
                        </div>
                        <p className="text-xs leading-snug" style={{ color: 'var(--text-muted)' }}>{algo.desc}</p>
                      </div>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                        algo.tag === 'Recommended' ? 'badge-success' :
                        algo.tag === 'High Security' ? 'badge-blue' :
                        'badge-neutral'
                      }`}>
                        {algo.tag}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Passphrase Input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Encryption Passphrase / Secret Key
              </label>
              <div className="relative">
                <FiKey className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="password"
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  placeholder="Enter secret passphrase (e.g. MasterPass@2026)"
                  className="glass-input glass-input-icon"
                />
              </div>
              <p className="text-xs text-amber-500 mt-1.5 flex items-center gap-1">
                <FiInfo className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Save this passphrase &mdash; it will be required to decrypt the binary payload.</span>
              </p>
            </div>
          </div>

          <div>
            <button
              onClick={handleStartEncryption}
              disabled={encrypting || !selectedFileId}
              className="w-full btn-primary py-3 flex items-center justify-center gap-2"
            >
              <FiLock className="w-4 h-4" />
              <span>{encrypting ? 'Encrypting & Generating Hashes...' : 'Encrypt File'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Execution Status & Outputs */}
        <div className="lg:col-span-6 card p-6 flex flex-col justify-between gap-6">
          <div className="space-y-5">
            <div className="card-header -mx-6 -mt-6 mb-5">
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                2. Encryption Status & Result
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Execution latency, integrity fingerprints, and asset downloads
              </p>
            </div>

            {/* Progress Bar */}
            <div 
              className="p-4 rounded-xl border space-y-2"
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)' }}
            >
              <div className="flex justify-between text-xs font-semibold">
                <span style={{ color: 'var(--text-muted)' }}>Operation Status</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">{encrypting ? `${progress}%` : encryptionResult ? '100% Complete' : 'Idle'}</span>
              </div>
              <div 
                className="w-full h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--border-subtle)' }}
              >
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Result Container */}
            {encryptionResult ? (
              <div 
                className="p-5 rounded-xl border border-emerald-500/30 space-y-4"
                style={{ backgroundColor: 'var(--bg-input)' }}
              >
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                  <FiCheckCircle className="w-4.5 h-4.5" />
                  <span>Encryption & Hashing Completed Successfully</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div 
                    className="p-3 rounded-lg border"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
                  >
                    <span className="uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>Algorithm</span>
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{encryptionResult.algorithm}</span>
                  </div>
                  <div 
                    className="p-3 rounded-lg border"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
                  >
                    <span className="uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>Execution Time</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm">{encryptionResult.execution_time_ms} ms</span>
                  </div>
                </div>

                {encryptionResult.sha512 && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5 text-xs">
                      <span className="font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Original File SHA-512 Digest</span>
                      <button
                        onClick={() => copyHash(encryptionResult.sha512)}
                        className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <FiCopy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </button>
                    </div>
                    <div 
                      className="p-2.5 rounded-lg border text-xs break-all font-mono-code"
                      style={{ 
                        backgroundColor: 'var(--bg-surface)', 
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-secondary)' 
                      }}
                    >
                      {encryptionResult.sha512}
                    </div>
                  </div>
                )}

                <a
                  href={`http://localhost:5000${encryptionResult.encrypted_file_url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full btn-primary py-2.5 flex items-center justify-center gap-2 text-sm"
                >
                  <FiDownload className="w-4 h-4" />
                  <span>Download Encrypted .bin File</span>
                </a>
              </div>
            ) : (
              <div 
                className="p-10 rounded-xl border border-dashed text-center text-sm"
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
              >
                <FiShield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Configure parameters and click <strong>Encrypt File</strong> to generate ciphertext.</p>
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
            <FiCheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span>Encrypted files are saved to the backend storage volume with cryptographic headers.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

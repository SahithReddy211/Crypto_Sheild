import React, { useState, useEffect } from 'react';
import { 
  FiUnlock, 
  FiDownload, 
  FiCheckCircle, 
  FiKey, 
  FiFileText, 
  FiShield, 
  FiUploadCloud, 
  FiTrash2, 
  FiXCircle,
  FiCopy
} from 'react-icons/fi';
import { cryptoService, fileService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function DecryptionModule() {
  const { addToast } = useAuth();
  const [files, setFiles] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState('');
  const [algorithm, setAlgorithm] = useState('AES-256');
  const [passkey, setPasskey] = useState('');
  
  const [dragActive, setDragActive] = useState(false);
  const [uploadedBinFile, setUploadedBinFile] = useState(null);

  const [decrypting, setDecrypting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const res = await fileService.getFiles();
      setFiles(res.data);
      if (res.data.length > 0) setSelectedFileId(res.data[0].id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFileSelected(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) handleFileSelected(e.target.files[0]);
  };

  const handleFileSelected = (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'bin') {
      addToast('Please select a valid encrypted .bin file.', 'error');
      return;
    }
    setUploadedBinFile(file);
    setSelectedFileId('');
    setResult(null);
  };

  const handleStartDecryption = async () => {
    if (!passkey || !passkey.trim()) {
      addToast('Please enter the decryption passphrase.', 'error');
      return;
    }
    setDecrypting(true);
    setResult(null);
    try {
      let response;
      if (uploadedBinFile) {
        const formData = new FormData();
        formData.append('file', uploadedBinFile);
        formData.append('algorithm', algorithm);
        formData.append('passkey', passkey.trim());
        response = await cryptoService.decryptFile(formData);
      } else {
        response = await cryptoService.decrypt(selectedFileId, algorithm, passkey.trim());
      }
      setResult(response.data);
      addToast('Decryption and integrity check successful!', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Decryption failed. Check key or ciphertext integrity.', 'error');
    } finally {
      setDecrypting(false);
    }
  };

  const copyHash = (hash) => {
    navigator.clipboard.writeText(hash);
    addToast('SHA-512 digest copied to clipboard.', 'info');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Decrypt & Verify Payload
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Decrypt encrypted binary payloads, verify AEAD MAC authentication tags, and confirm SHA-512 integrity.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Card */}
        <div className="lg:col-span-6 card p-6 flex flex-col justify-between gap-6">
          <div className="space-y-5">
            <div className="card-header -mx-6 -mt-6 mb-5">
              <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <FiFileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                1. Select Encrypted File & Credentials
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Upload a raw .bin payload or select an existing vault file
              </p>
            </div>

            {/* Upload .bin zone */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Option A: Upload Encrypted .bin File
              </label>
              {!uploadedBinFile ? (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-5 text-center flex flex-col items-center justify-center cursor-pointer transition-colors ${
                    dragActive ? 'border-blue-500 bg-blue-500/5' : 'hover:border-blue-500'
                  }`}
                  style={{ 
                    backgroundColor: 'var(--bg-input)', 
                    borderColor: dragActive ? '#3b82f6' : 'var(--border-subtle)' 
                  }}
                >
                  <input type="file" id="bin-upload" onChange={handleFileChange} className="hidden" accept=".bin" />
                  <label htmlFor="bin-upload" className="cursor-pointer flex flex-col items-center gap-2 w-full">
                    <FiUploadCloud className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    <p className="text-xs sm:text-sm" style={{ color: 'var(--text-primary)' }}>
                      Drag & drop .bin file or <span className="text-blue-600 dark:text-blue-400 underline">browse</span>
                    </p>
                  </label>
                </div>
              ) : (
                <div 
                  className="p-3.5 rounded-lg border flex items-center justify-between"
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)' }}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div 
                      className="w-8 h-8 rounded text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold uppercase flex-shrink-0 border"
                      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
                    >
                      BIN
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {uploadedBinFile.name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {(uploadedBinFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setUploadedBinFile(null);
                      if (files.length > 0) setSelectedFileId(files[0].id);
                    }}
                    title="Remove file"
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }}></div>
              <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>OR</span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }}></div>
            </div>

            {/* Existing File Select */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Option B: Select Existing Encrypted File from Vault
              </label>
              {files.length > 0 ? (
                <select
                  value={selectedFileId}
                  onChange={(e) => { setSelectedFileId(e.target.value); setUploadedBinFile(null); }}
                  disabled={!!uploadedBinFile}
                  className="glass-input"
                >
                  <option value="" disabled style={{ color: 'var(--text-muted)' }}>
                    — Choose file from vault —
                  </option>
                  {files.map((f) => (
                    <option key={f.id} value={f.id} style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
                      #{f.id} — {f.original_name} ({f.status})
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No vault files available.</p>
              )}
            </div>

            {/* Algorithm Select */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Cipher Algorithm
              </label>
              <select
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value)}
                className="glass-input"
              >
                <option value="AES-256" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>AES-256-GCM (Symmetric)</option>
                <option value="RSA-2048" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>RSA-2048 Hybrid (Asymmetric)</option>
                <option value="Triple DES" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>Triple DES (3DES Legacy)</option>
              </select>
            </div>

            {/* Passphrase Input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Decryption Passphrase
              </label>
              <div className="relative">
                <FiKey className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="password"
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  placeholder="Enter the passphrase used during encryption"
                  className="glass-input glass-input-icon"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              onClick={handleStartDecryption}
              disabled={decrypting || (!selectedFileId && !uploadedBinFile)}
              className="w-full btn-primary py-3 flex items-center justify-center gap-2"
            >
              <FiUnlock className="w-4 h-4" />
              <span>{decrypting ? 'Decrypting & Verifying SHA-512...' : 'Decrypt File'}</span>
            </button>
          </div>
        </div>

        {/* Result Card */}
        <div className="lg:col-span-6 card p-6 flex flex-col justify-between gap-6">
          <div className="space-y-5">
            <div className="card-header -mx-6 -mt-6 mb-5">
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                2. Decryption & Integrity Verification
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Payload restoration and cryptographic checksum audit
              </p>
            </div>

            {result ? (
              <div 
                className="p-5 rounded-xl border border-emerald-500/30 space-y-4"
                style={{ backgroundColor: 'var(--bg-input)' }}
              >
                {/* Header Status */}
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                  <FiCheckCircle className="w-5 h-5" />
                  <span>Decryption Successful</span>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div 
                    className="p-3 rounded-lg border"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
                  >
                    <span className="uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>Restored File</span>
                    <span className="font-semibold text-sm truncate block" style={{ color: 'var(--text-primary)' }}>{result.file_name}</span>
                  </div>
                  <div 
                    className="p-3 rounded-lg border"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
                  >
                    <span className="uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>Integrity Status</span>
                    {result.integrity_verified ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm flex items-center gap-1">
                        <FiCheckCircle className="w-3.5 h-3.5" /> Verified
                      </span>
                    ) : (
                      <span className="text-red-600 dark:text-red-400 font-semibold text-sm flex items-center gap-1">
                        <FiXCircle className="w-3.5 h-3.5" /> Failed
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div 
                    className="p-3 rounded-lg border"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
                  >
                    <span className="uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>Algorithm</span>
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{result.algorithm}</span>
                  </div>
                  <div 
                    className="p-3 rounded-lg border"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
                  >
                    <span className="uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>Processing Time</span>
                    <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">{result.execution_time_ms} ms</span>
                  </div>
                </div>

                {/* SHA-512 Hash */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 text-xs">
                    <span className="font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Restored Payload SHA-512 Hash</span>
                    <button
                      onClick={() => copyHash(result.sha512)}
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
                    {result.sha512}
                  </div>
                </div>

                {/* Download Button */}
                <a
                  href={`http://localhost:5000${result.decrypted_file_url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full btn-primary py-2.5 flex items-center justify-center gap-2 text-sm"
                >
                  <FiDownload className="w-4 h-4" />
                  <span>Download Decrypted File</span>
                </a>
              </div>
            ) : (
              <div 
                className="p-10 rounded-xl border border-dashed text-center text-sm"
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
              >
                <FiShield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Select an encrypted file and enter passphrase to restore the original asset.</p>
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
            <FiCheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>Decryption recalculates SHA-512 hashes in 64KB streams to guarantee zero byte corruption.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

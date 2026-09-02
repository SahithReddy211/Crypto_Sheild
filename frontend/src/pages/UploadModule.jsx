import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiUploadCloud, 
  FiFileText, 
  FiShield, 
  FiCheckCircle, 
  FiInfo, 
  FiArrowRight,
  FiTrash2
} from 'react-icons/fi';
import { fileService, cryptoService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function UploadModule() {
  const { addToast } = useAuth();
  const navigate = useNavigate();

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedRecord, setUploadedRecord] = useState(null);

  // Recommendation engine state
  const [securityLevel, setSecurityLevel] = useState('High');
  const [analyzing, setAnalyzing] = useState(false);
  const [recommendation, setRecommendation] = useState(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    const allowed = ['pdf', 'docx', 'txt', 'png', 'jpg', 'jpeg', 'zip', 'mp4', 'csv'];
    if (!allowed.includes(ext)) {
      addToast(`Unsupported format .${ext}. Allowed formats: ${allowed.join(', ')}`, 'error');
      return;
    }
    setSelectedFile(file);
    setUploadedRecord(null);
    setRecommendation(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fileService.upload(formData);
      const fileData = response.data.file;
      setUploadedRecord(fileData);
      addToast('File uploaded and registered in vault.', 'success');
      triggerRecommendation(fileData.file_type, fileData.file_size, securityLevel);
    } catch (err) {
      addToast(err.response?.data?.error || 'Upload failed.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const triggerRecommendation = async (fileType, fileSize, secLevel) => {
    setAnalyzing(true);
    try {
      const res = await cryptoService.recommend(
        fileType || selectedFile?.type || 'Document',
        fileSize || selectedFile?.size || 1048576,
        secLevel
      );
      setRecommendation(res.data);
    } catch (err) {
      addToast('Recommendation engine offline.', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSecurityLevelChange = (level) => {
    setSecurityLevel(level);
    if (uploadedRecord || selectedFile) {
      triggerRecommendation(
        uploadedRecord?.file_type || selectedFile?.type || 'Document',
        uploadedRecord?.file_size || selectedFile?.size || 1048576,
        level
      );
    }
  };

  const proceedToEncryption = () => {
    if (!uploadedRecord) {
      addToast('Please upload and register the file before proceeding.', 'info');
      return;
    }
    navigate('/encrypt', {
      state: {
        file: uploadedRecord,
        recommendedAlgo: recommendation?.recommended_algorithm || 'AES-256'
      }
    });
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Upload & Algorithm Recommendation
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Upload raw files for automated cryptographic suitability analysis based on size, payload type, and security parameters.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: File Dropzone & Selection */}
        <div className="lg:col-span-6 card p-6 flex flex-col justify-between gap-6">
          <div>
            <div className="card-header -mx-6 -mt-6 mb-5">
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                1. Select Payload
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Drag and drop or browse supported file types
              </p>
            </div>

            {/* Drop Area */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center transition-colors cursor-pointer ${
                dragActive ? 'border-blue-500 bg-blue-500/5' : 'hover:border-blue-500'
              }`}
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: dragActive ? '#3b82f6' : 'var(--border-subtle)',
              }}
            >
              <input
                type="file"
                id="file-upload"
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.zip,.mp4,.csv"
              />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-3 w-full">
                <div 
                  className="w-12 h-12 rounded-xl text-blue-600 dark:text-blue-400 flex items-center justify-center border"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
                >
                  <FiUploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Drag and drop your file here, or <span className="text-blue-600 dark:text-blue-400 underline">browse</span>
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    PDF, DOCX, TXT, PNG, JPG, ZIP, MP4, CSV (Max 100 MB)
                  </p>
                </div>
              </label>
            </div>

            {/* Selected File Details */}
            {selectedFile && (
              <div 
                className="mt-5 p-4 rounded-xl border space-y-3"
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div 
                      className="w-10 h-10 rounded-lg text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0 border"
                      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
                    >
                      {selectedFile.name.split('.').pop()}
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {selectedFile.name}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {formatSize(selectedFile.size)} &middot; {selectedFile.type || 'Binary Data'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setUploadedRecord(null);
                      setRecommendation(null);
                    }}
                    title="Remove file"
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>

                {uploadedRecord && (
                  <div className="badge badge-success text-xs font-medium w-full py-2">
                    <FiCheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span>Registered in vault (ID: #{uploadedRecord.id})</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <button
              onClick={handleUpload}
              disabled={uploading || !selectedFile || !!uploadedRecord}
              className="w-full btn-primary py-3 flex items-center justify-center gap-2"
            >
              <FiUploadCloud className="w-4 h-4" />
              <span>{uploading ? 'Registering File...' : uploadedRecord ? 'File Registered in Vault' : 'Upload & Analyze File'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Security Level & Recommendation */}
        <div className="lg:col-span-6 card p-6 flex flex-col justify-between gap-6">
          <div className="space-y-5">
            <div className="card-header -mx-6 -mt-6 mb-5">
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                2. Security Level & Recommendation
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Select target security constraint to trigger analysis
              </p>
            </div>

            {/* Security Level Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-muted)' }}>
                Security Constraint
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {['Low', 'Medium', 'High'].map((lvl) => {
                  const isActive = securityLevel === lvl;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => handleSecurityLevelChange(lvl)}
                      className={`py-2.5 px-3 rounded-lg text-sm font-semibold transition-all border ${
                        isActive
                          ? 'bg-blue-600/15 border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                      style={{ backgroundColor: isActive ? 'rgba(37, 99, 235, 0.15)' : 'var(--bg-input)' }}
                    >
                      {lvl}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recommendation Result Card */}
            <div className="min-h-[170px] flex flex-col justify-center">
              {analyzing ? (
                <div className="flex flex-col items-center justify-center p-8 text-sm" style={{ color: 'var(--text-muted)' }}>
                  <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                  <span>Evaluating payload characteristics...</span>
                </div>
              ) : recommendation ? (
                <div 
                  className="p-5 rounded-xl border space-y-4"
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      Recommended Cipher
                    </span>
                    <span className="badge badge-success text-xs font-semibold">
                      {recommendation.confidence} Confidence
                    </span>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div 
                      className="w-10 h-10 rounded-lg text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5 border"
                      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
                    >
                      <FiShield className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                        {recommendation.recommended_algorithm}
                      </h3>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        Key Size: <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{recommendation.key_size}</span> &middot; Latency: <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{recommendation.estimated_performance}</span>
                      </p>
                    </div>
                  </div>

                  <div 
                    className="p-3 rounded-lg border text-xs leading-relaxed"
                    style={{ 
                      backgroundColor: 'var(--bg-surface)', 
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-secondary)' 
                    }}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400 mb-1">
                      <FiInfo className="w-3.5 h-3.5" />
                      <span>Analysis Rationale</span>
                    </div>
                    {recommendation.reason}
                  </div>
                </div>
              ) : (
                <div 
                  className="p-8 rounded-xl border border-dashed text-center text-sm"
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
                >
                  <FiShield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Upload a file to generate algorithm recommendation.</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <button
              onClick={proceedToEncryption}
              disabled={!uploadedRecord}
              className="w-full btn-secondary py-3 flex items-center justify-center gap-2"
            >
              <span>Proceed to Encryption</span>
              <FiArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

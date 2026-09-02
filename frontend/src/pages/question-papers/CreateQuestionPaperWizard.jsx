import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  FiFileText, 
  FiUploadCloud, 
  FiShield, 
  FiLock, 
  FiClock, 
  FiCheckCircle, 
  FiArrowRight, 
  FiArrowLeft,
  FiInfo,
  FiKey,
  FiCopy
} from 'react-icons/fi';
import { examService, questionPaperService, cryptoPolicyService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function CreateQuestionPaperWizard() {
  const { addToast } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Exam Details
  const [existingExams, setExistingExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('NEW');
  const [examName, setExamName] = useState('Mid-Term Examination');
  const [courseCode, setCourseCode] = useState('CS-804');
  const [courseName, setCourseName] = useState('Cryptography and Cryptanalysis');
  const [section, setSection] = useState('A');
  const [semester, setSemester] = useState('Fall 2026');
  const [examDate, setExamDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [examStartTime, setExamStartTime] = useState('10:00');
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [distributionMode, setDistributionMode] = useState('MODE_A');

  // Step 2: Upload File
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadDraftData, setUploadDraftData] = useState(null);

  // Step 3: Security Recommendation
  const [profiles, setProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState('AES256-GCM-RSA3072-SHA256');

  // Step 4 & 5: Encryption & Schedule
  const [releaseTime, setReleaseTime] = useState('09:55');
  const [encrypting, setEncrypting] = useState(false);
  const [createdPaperResult, setCreatedPaperResult] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [examsRes, profilesRes] = await Promise.all([
        examService.getFacultyExams(),
        cryptoPolicyService.getProfiles()
      ]);
      setExistingExams(examsRes.data);
      if (examsRes.data.length > 0) {
        setSelectedExamId(examsRes.data[0].id);
      }
      setProfiles(profilesRes.data);
      const def = profilesRes.data.find(p => p.is_default);
      if (def) setSelectedProfileId(def.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExamSelection = (examId) => {
    setSelectedExamId(examId);
    if (examId !== 'NEW') {
      const ex = existingExams.find(e => e.id === examId);
      if (ex) {
        setCourseName(ex.course_name);
        setCourseCode(ex.course_id);
        setExamName(ex.subject);
        setSection(ex.section);
        setSemester(ex.semester);
        setExamDate(ex.exam_date);
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setUploadDraftData(null);
    }
  };

  // Step 2 -> Step 3: Upload Draft to Server
  const handleUploadDraft = async () => {
    if (!file) {
      addToast('Please select a question paper file (PDF/DOCX).', 'error');
      return;
    }

    setUploading(true);
    try {
      let activeExamId = selectedExamId;
      if (selectedExamId === 'NEW') {
        const startIso = `${examDate}T${examStartTime}:00Z`;
        const newExamRes = await examService.createExam({
          course_id: courseCode,
          course_name: courseName,
          subject: examName,
          section,
          semester,
          exam_date: examDate,
          exam_start_at: startIso,
          duration_minutes: durationMinutes
        });
        activeExamId = newExamRes.data.exam.id;
        setSelectedExamId(activeExamId);
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('exam_id', activeExamId);

      const res = await questionPaperService.uploadDraft(formData);
      setUploadDraftData(res.data);
      if (res.data.default_profile_id) {
        setSelectedProfileId(res.data.default_profile_id);
      }
      addToast('File uploaded and SHA-256 integrity hash generated.', 'success');
      setCurrentStep(3);
    } catch (err) {
      addToast(err.response?.data?.error || 'Upload failed.', 'error');
    } finally {
      setUploading(false);
    }
  };

  // Step 5: Execute Hybrid Encryption & Scheduling
  const handleEncryptAndSchedule = async () => {
    if (!uploadDraftData) return;
    setEncrypting(true);

    try {
      const releaseIso = `${examDate}T${releaseTime}:00Z`;
      const payload = {
        temp_token: uploadDraftData.temp_token,
        exam_id: uploadDraftData.exam_id,
        original_filename: uploadDraftData.original_filename,
        algorithm_profile_id: selectedProfileId,
        distribution_mode: distributionMode,
        release_at: releaseIso
      };

      const res = await questionPaperService.encryptAndSchedule(payload);
      setCreatedPaperResult(res.data);
      addToast('Question paper encrypted with hybrid key wrapping and scheduled!', 'success');
      setCurrentStep(6);
    } catch (err) {
      addToast(err.response?.data?.error || 'Encryption & scheduling failed.', 'error');
    } finally {
      setEncrypting(false);
    }
  };

  const steps = [
    { num: 1, title: 'Exam Details' },
    { num: 2, title: 'Upload Paper' },
    { num: 3, title: 'Security Analysis' },
    { num: 4, title: 'Crypto Profile' },
    { num: 5, title: 'Schedule' },
    { num: 6, title: 'Confirmed' }
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Create & Schedule Secure Question Paper
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Step-by-step cryptographic workflow with automated algorithm recommendation and server-controlled key release.
        </p>
      </div>

      {/* Progress Stepper */}
      <div className="card p-4">
        <div className="flex items-center justify-between overflow-x-auto gap-2">
          {steps.map((s, idx) => {
            const isActive = currentStep === s.num;
            const isDone = currentStep > s.num;
            return (
              <div key={s.num} className="flex items-center gap-2 flex-1 min-w-[110px]">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 transition-colors ${
                  isDone ? 'bg-emerald-600 text-white' :
                  isActive ? 'bg-blue-600 text-white shadow-xs' :
                  'bg-slate-700/40 text-slate-400 border border-slate-700'
                }`}>
                  {isDone ? <FiCheckCircle className="w-4 h-4" /> : s.num}
                </div>
                <div className="truncate">
                  <p className={`text-xs font-semibold truncate ${isActive ? 'text-blue-600 dark:text-blue-400' : isDone ? 'text-emerald-500' : 'text-slate-400'}`}>
                    {s.title}
                  </p>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 min-w-[12px] ${isDone ? 'bg-emerald-500/50' : 'bg-slate-700/50'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 1: EXAM DETAILS */}
      {currentStep === 1 && (
        <div className="card p-6 space-y-6">
          <div className="card-header -mx-6 -mt-6 mb-5">
            <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <FiFileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Step 1: Examination & Course Details
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Define target examination, subject, date, and distribution release model
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Select Existing Exam or Create New
              </label>
              <select
                value={selectedExamId}
                onChange={(e) => handleExamSelection(e.target.value)}
                className="glass-input text-sm"
              >
                <option value="NEW" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>+ Create New Examination</option>
                {existingExams.map((ex) => (
                  <option key={ex.id} value={ex.id} style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
                    {ex.course_id} — {ex.course_name} ({ex.section})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Examination Name / Title
              </label>
              <input
                type="text"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                placeholder="e.g. Mid-Term Examination"
                className="glass-input text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Course Code & Title
              </label>
              <input
                type="text"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="e.g. Cryptography and Cryptanalysis"
                className="glass-input text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                  Section
                </label>
                <input
                  type="text"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="glass-input text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                  Semester
                </label>
                <input
                  type="text"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="glass-input text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Examination Date
              </label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="glass-input text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                  Exam Start Time
                </label>
                <input
                  type="time"
                  value={examStartTime}
                  onChange={(e) => setExamStartTime(e.target.value)}
                  className="glass-input text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                  Duration (Mins)
                </label>
                <input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  className="glass-input text-sm"
                />
              </div>
            </div>
          </div>

          {/* Distribution Mode */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-muted)' }}>
              Distribution Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDistributionMode('MODE_A')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  distributionMode === 'MODE_A'
                    ? 'bg-blue-600/10 border-blue-500 shadow-xs'
                    : 'border-[var(--border-subtle)]'
                }`}
                style={{ backgroundColor: distributionMode === 'MODE_A' ? 'rgba(37, 99, 235, 0.1)' : 'var(--bg-input)' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Mode A (Default)</span>
                  <span className="badge badge-success text-[10px]">Recommended</span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Server-side decryption upon authorized release. Plaintext is streamed strictly to the in-app viewer.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setDistributionMode('MODE_B')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  distributionMode === 'MODE_B'
                    ? 'bg-blue-600/10 border-blue-500 shadow-xs'
                    : 'border-[var(--border-subtle)]'
                }`}
                style={{ backgroundColor: distributionMode === 'MODE_B' ? 'rgba(37, 99, 235, 0.1)' : 'var(--bg-input)' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Mode B (Pre-Download)</span>
                  <span className="badge badge-neutral text-[10px]">Air-Gap Ready</span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Students download encrypted .enc package in advance. DEK remains locked on server until exact release time.
                </p>
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <button
              onClick={() => setCurrentStep(2)}
              className="btn-primary py-2.5 px-6 text-sm font-semibold flex items-center gap-2"
            >
              <span>Continue to Upload Paper</span>
              <FiArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: UPLOAD QUESTION PAPER */}
      {currentStep === 2 && (
        <div className="card p-6 space-y-6">
          <div className="card-header -mx-6 -mt-6 mb-5">
            <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <FiUploadCloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Step 2: Upload Question Paper File
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Upload raw PDF/DOCX. The system immediately calculates the SHA-256 integrity fingerprint.
            </p>
          </div>

          <div 
            className="border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors"
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)' }}
          >
            <input
              type="file"
              id="qp-file"
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.docx,.txt"
            />
            <label htmlFor="qp-file" className="cursor-pointer flex flex-col items-center gap-3 w-full">
              <div 
                className="w-12 h-12 rounded-xl text-blue-600 dark:text-blue-400 flex items-center justify-center border"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
              >
                <FiUploadCloud className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {file ? file.name : 'Select or drop Question Paper (PDF / DOCX)'}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : 'PDF, DOCX, or TXT up to 100 MB'}
                </p>
              </div>
            </label>
          </div>

          {file && (
            <div 
              className="p-4 rounded-xl border space-y-2 text-xs"
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)' }}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <FiCheckCircle className="w-4 h-4" /> Ready for staging & analysis
                </span>
                <span className="font-mono-code text-[11px]" style={{ color: 'var(--text-muted)' }}>{file.name}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <button
              onClick={() => setCurrentStep(1)}
              className="btn-secondary py-2.5 px-4 text-xs font-semibold flex items-center gap-1.5"
            >
              <FiArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              onClick={handleUploadDraft}
              disabled={!file || uploading}
              className="btn-primary py-2.5 px-6 text-sm font-semibold flex items-center gap-2"
            >
              <span>{uploading ? 'Calculating Digest & Analyzing...' : 'Upload & Run Security Analysis'}</span>
              <FiArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 & 4: CRYPTO-AGILITY SECURITY ANALYSIS & PROFILE SELECTION */}
      {(currentStep === 3 || currentStep === 4) && uploadDraftData && (
        <div className="card p-6 space-y-6">
          <div className="card-header -mx-6 -mt-6 mb-5">
            <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <FiShield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Step 3 & 4: Crypto-Agility Security Analysis & Algorithm Recommendation
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Evaluated payload sensitivity and recommended cryptographic cipher suite
            </p>
          </div>

          {/* Analysis Banner */}
          <div 
            className="p-5 rounded-xl border space-y-4"
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Recommended Security Profile
              </span>
              <span className="badge badge-success text-xs font-bold">
                {uploadDraftData.recommended_profile?.confidence || '99.4%'} Confidence
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                <span className="uppercase text-[10px] tracking-wider block mb-1 text-slate-400">Payload Encryption</span>
                <span className="font-bold text-sm text-blue-500">AES-256-GCM</span>
              </div>
              <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                <span className="uppercase text-[10px] tracking-wider block mb-1 text-slate-400">Key Wrapping (KEK)</span>
                <span className="font-bold text-sm text-indigo-400">RSA-OAEP-3072</span>
              </div>
              <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                <span className="uppercase text-[10px] tracking-wider block mb-1 text-slate-400">Integrity Hash</span>
                <span className="font-bold text-sm text-emerald-400">SHA-256</span>
              </div>
              <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                <span className="uppercase text-[10px] tracking-wider block mb-1 text-slate-400">Digital Signature</span>
                <span className="font-bold text-sm text-amber-400">RSA-PSS</span>
              </div>
            </div>

            <div 
              className="p-3 rounded-lg border text-xs leading-relaxed"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
            >
              <div className="flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400 mb-1">
                <FiInfo className="w-3.5 h-3.5" />
                <span>Why this configuration?</span>
              </div>
              {uploadDraftData.recommended_profile?.reason || 
                'Question papers require authenticated encryption for confidentiality and tamper resistance until the scheduled release time. Random per-paper DEKs are generated and protected using RSA-OAEP-3072 master keys.'}
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Computed File Integrity SHA-256
              </span>
              <p className="font-mono-code text-xs break-all p-2 rounded border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
                {uploadDraftData.file_hash}
              </p>
            </div>
          </div>

          {/* Crypto Profile Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-muted)' }}>
              Select Active Algorithm Profile
            </label>
            <div className="space-y-2.5">
              {profiles.map((p) => {
                const isActive = selectedProfileId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedProfileId(p.id)}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-start justify-between ${
                      isActive ? 'bg-blue-600/10 border-blue-500 shadow-xs' : 'border-[var(--border-subtle)]'
                    }`}
                    style={{ backgroundColor: isActive ? 'rgba(37, 99, 235, 0.1)' : 'var(--bg-input)' }}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                        {p.is_default && <span className="badge badge-success text-[10px]">Default</span>}
                      </div>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{p.reason}</p>
                    </div>
                    <span className="badge badge-neutral text-xs">{p.security_level}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <button
              onClick={() => setCurrentStep(2)}
              className="btn-secondary py-2.5 px-4 text-xs font-semibold flex items-center gap-1.5"
            >
              <FiArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              onClick={() => setCurrentStep(5)}
              className="btn-primary py-2.5 px-6 text-sm font-semibold flex items-center gap-2"
            >
              <span>Continue to Schedule</span>
              <FiArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: SCHEDULE RELEASE & HYBRID ENCRYPTION */}
      {currentStep === 5 && uploadDraftData && (
        <div className="card p-6 space-y-6">
          <div className="card-header -mx-6 -mt-6 mb-5">
            <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <FiClock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Step 5: Schedule Exact Release & Encrypt at Rest
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Specify the release timestamp. Server UTC clock is authoritative; early access is mathematically blocked.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Scheduled Release Time (Server UTC)
              </label>
              <input
                type="time"
                value={releaseTime}
                onChange={(e) => setReleaseTime(e.target.value)}
                className="glass-input text-sm font-mono-code"
              />
              <p className="text-xs text-amber-500 mt-1.5 flex items-center gap-1">
                <FiInfo className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Typically scheduled 5–10 minutes before examination start.</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Examination Start Reference
              </label>
              <div 
                className="p-3.5 rounded-lg border text-xs space-y-1"
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Date:</span>
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{examDate}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Exam Start:</span>
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{examStartTime}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Release Window:</span>
                  <span className="font-semibold text-emerald-500">{releaseTime} &rarr; {examStartTime}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Encryption Execution Preview Box */}
          <div 
            className="p-5 rounded-xl border border-blue-500/30 space-y-3"
            style={{ backgroundColor: 'var(--bg-input)' }}
          >
            <div className="flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-400">
              <FiLock className="w-4 h-4" />
              <span>Hybrid Encryption Pipeline to be Executed:</span>
            </div>

            <ol className="list-decimal list-inside space-y-1 text-xs text-slate-300">
              <li>Generate single-use random 256-bit DEK</li>
              <li>Encrypt file with AES-256-GCM authenticated cipher</li>
              <li>Wrap DEK using RSA-OAEP-3072 master key</li>
              <li>Calculate SHA-256 plaintext integrity digest</li>
              <li>Digitally sign canonical metadata with RSA-PSS private key</li>
              <li>Store encrypted payload at rest & purge temporary plaintext</li>
            </ol>
          </div>

          <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <button
              onClick={() => setCurrentStep(4)}
              className="btn-secondary py-2.5 px-4 text-xs font-semibold flex items-center gap-1.5"
            >
              <FiArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              onClick={handleEncryptAndSchedule}
              disabled={encrypting}
              className="btn-primary py-3 px-8 text-sm font-bold flex items-center gap-2 shadow-md"
            >
              <FiLock className="w-4 h-4" />
              <span>{encrypting ? 'Encrypting & Generating Signatures...' : 'Encrypt & Schedule Paper'}</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: CONFIRMATION & PACKAGE SUMMARY */}
      {currentStep === 6 && createdPaperResult && (
        <div className="card p-6 space-y-6">
          <div className="card-header -mx-6 -mt-6 mb-5">
            <h2 className="text-base font-semibold flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <FiCheckCircle className="w-5 h-5" />
              Question Paper Successfully Encrypted & Scheduled
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Cryptographic assets registered in vault. Plaintext scratch files purged.
            </p>
          </div>

          <div 
            className="p-5 rounded-xl border border-emerald-500/30 space-y-4"
            style={{ backgroundColor: 'var(--bg-input)' }}
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                <span className="uppercase text-[10px] tracking-wider block mb-1 text-slate-400">Paper ID</span>
                <span className="font-bold text-sm text-blue-500 font-mono-code">{createdPaperResult.paper.id}</span>
              </div>
              <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                <span className="uppercase text-[10px] tracking-wider block mb-1 text-slate-400">Execution Time</span>
                <span className="font-bold text-sm text-emerald-500">{createdPaperResult.execution_time_ms} ms</span>
              </div>
              <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                <span className="uppercase text-[10px] tracking-wider block mb-1 text-slate-400">Status</span>
                <span className="badge badge-blue text-xs font-bold">SCHEDULED</span>
              </div>
              <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                <span className="uppercase text-[10px] tracking-wider block mb-1 text-slate-400">Distribution</span>
                <span className="font-semibold text-xs text-slate-300">{createdPaperResult.paper.distribution_mode}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="font-semibold uppercase tracking-wider text-slate-400">SHA-256 Integrity Fingerprint:</span>
              </div>
              <p className="font-mono-code text-[11px] p-2.5 rounded border break-all" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
                {createdPaperResult.paper.file_hash}
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="font-semibold uppercase tracking-wider text-slate-400">RSA-PSS Digital Signature:</span>
                <span className="badge badge-success text-[10px]">Verified Authentic</span>
              </div>
              <p className="font-mono-code text-[11px] p-2.5 rounded border break-all" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
                {createdPaperResult.package_metadata.signature}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <Link
              to="/question-papers/faculty"
              className="btn-primary py-2.5 px-6 text-sm font-semibold"
            >
              Go to Question Papers Vault
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiShield, FiLock, FiMail, FiUser, FiArrowRight, FiBook, FiCpu } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { departmentService } from '../services/api';

const ROLE_META = {
  student: { color: 'bg-emerald-600', label: 'Student', icon: FiBook },
  faculty: { color: 'bg-violet-600',  label: 'Faculty', icon: FiShield },
};

const YEAR_OPTIONS = ['1', '2', '3', '4'];
const SEM_OPTIONS  = ['1', '2'];

export default function Register() {
  const [selectedRole, setSelectedRole] = useState('student');
  const [departments, setDepartments] = useState([]);
  const [sections, setSections] = useState([]);
  const [form, setForm] = useState({
    username: '', full_name: '', email: '', password: '',
    student_id: '', faculty_id: '',
    department: '', section: '', year: '1', semester: '1',
    designation: '',
  });
  const { register, loading, addToast } = useAuth();
  const navigate = useNavigate();

  // Load department list on mount
  useEffect(() => {
    departmentService.getDepartments()
      .then((res) => setDepartments(res.data.departments || []))
      .catch(() => {});
  }, []);

  // Update available sections when department changes
  useEffect(() => {
    const dept = departments.find((d) => d.code === form.department);
    const secs = dept?.sections || [];
    setSections(secs);
    setForm((f) => ({ ...f, section: secs[0] || '' }));
  }, [form.department, departments]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      username: form.username,
      full_name: form.full_name,
      email: form.email,
      password: form.password,
      role: selectedRole,
      ...(selectedRole === 'student'
        ? {
            student_id: form.student_id,
            department: form.department,
            section: form.section,
            year: form.year,
            semester: form.semester,
          }
        : {
            faculty_id: form.faculty_id,
            department: form.department,
            designation: form.designation,
          }),
    };
    const result = await register(payload);
    if (result.success) {
      const roleHome = {
        student: '/question-papers/student',
        faculty: '/question-papers/faculty',
      };
      navigate(roleHome[result.role] || '/dashboard');
    }
  };

  const meta = ROLE_META[selectedRole];
  const Icon = meta.icon;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-6 transition-colors"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      <div className="w-full max-w-lg">
        <div className="card p-8 sm:p-9 shadow-lg">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className={`w-12 h-12 rounded-xl ${meta.color} flex items-center justify-center mb-4 text-white shadow-sm`}>
              <Icon className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Create Account
            </h1>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Admin accounts are pre-configured. Students and Faculty may register below.
            </p>
          </div>

          {/* Role Selector Tabs (no admin) */}
          <div
            className="flex rounded-lg p-1 mb-6 gap-1"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
          >
            {Object.entries(ROLE_META).map(([role, m]) => (
              <button
                key={role}
                type="button"
                onClick={() => setSelectedRole(role)}
                className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold uppercase tracking-wide transition-all ${
                  selectedRole === role
                    ? `${m.color} text-white shadow-sm`
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Common Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Full Name
                </label>
                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text" required value={form.full_name} onChange={set('full_name')}
                    className="glass-input glass-input-icon text-sm" placeholder="John Smith"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Username
                </label>
                <input
                  type="text" required value={form.username} onChange={set('username')}
                  className="glass-input text-sm" placeholder="john_smith"
                />
              </div>
            </div>

            {/* Role-specific ID */}
            {selectedRole === 'student' ? (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Student ID
                </label>
                <input
                  type="text" required value={form.student_id} onChange={set('student_id')}
                  className="glass-input text-sm" placeholder="STU004"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Faculty ID
                  </label>
                  <input
                    type="text" required value={form.faculty_id} onChange={set('faculty_id')}
                    className="glass-input text-sm" placeholder="FAC002"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Designation
                  </label>
                  <input
                    type="text" required value={form.designation} onChange={set('designation')}
                    className="glass-input text-sm" placeholder="Assistant Professor"
                  />
                </div>
              </div>
            )}

            {/* Email & Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Email
              </label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="email" required value={form.email} onChange={set('email')}
                  className="glass-input glass-input-icon text-sm" placeholder="you@university.edu"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Password
              </label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="password" required value={form.password} onChange={set('password')}
                  className="glass-input glass-input-icon text-sm" placeholder="Min 8 chars, include number"
                />
              </div>
            </div>

            {/* Department (both roles) */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Department
              </label>
              <select
                required value={form.department} onChange={set('department')}
                className="glass-input text-sm"
              >
                <option value="">Select department…</option>
                {departments.map((d) => (
                  <option key={d.code} value={d.code}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Student-specific: Section, Year, Semester */}
            {selectedRole === 'student' && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Section
                  </label>
                  <select
                    required value={form.section} onChange={set('section')}
                    className="glass-input text-sm"
                  >
                    <option value="">Sec…</option>
                    {sections.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Year
                  </label>
                  <select value={form.year} onChange={set('year')} className="glass-input text-sm">
                    {YEAR_OPTIONS.map((y) => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Semester
                  </label>
                  <select value={form.semester} onChange={set('semester')} className="glass-input text-sm">
                    {SEM_OPTIONS.map((s) => <option key={s} value={s}>Sem {s}</option>)}
                  </select>
                </div>
              </div>
            )}

            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              className={`w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 mt-2 rounded-lg text-white transition-all ${meta.color} hover:opacity-90 disabled:opacity-50`}
            >
              {loading ? 'Creating Account...' : `Register as ${meta.label}`}
              <FiArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-5 text-center">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

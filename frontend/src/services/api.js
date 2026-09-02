import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject JWT Bearer Token into requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('crypto_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to clear invalid auth state on 401 response
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('crypto_auth_token');
      localStorage.removeItem('crypto_user');
    }
    return Promise.reject(error);
  }
);

// Auth Services
export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (username, email, password, role = 'student') => api.post('/auth/register', { username, email, password, role }),
  getProfile: () => api.get('/profile'),
  updateSettings: (settings) => api.put('/settings', settings),
};

// File Services
export const fileService = {
  upload: (formData) => api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getFiles: () => api.get('/files'),
  deleteFile: (id) => api.delete(`/files/${id}`),
};

// Crypto Services
export const cryptoService = {
  recommend: (fileType, fileSize, securityLevel) => api.post('/recommend', { fileType, fileSize, securityLevel }),
  encrypt: (file_id, algorithm, passkey) => api.post('/encrypt', { file_id, algorithm, passkey }),
  decrypt: (file_id, algorithm, passkey) => api.post('/decrypt', { file_id, algorithm, passkey }),
  decryptFile: (formData) => api.post('/decrypt', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  generateOrVerifyHash: (payload) => api.post('/hash', payload),
};

// Stats & Performance Services
export const statsService = {
  getStatistics: () => api.get('/statistics'),
  getHistory: () => api.get('/history'),
  getPerformanceMetrics: () => api.get('/performance'),
};

// Examination Services
export const examService = {
  getFacultyExams: () => api.get('/faculty/exams'),
  createExam: (examData) => api.post('/exams', examData),
};

// Secure Question Paper Distribution Services
export const questionPaperService = {
  uploadDraft: (formData) => api.post('/question-papers', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  encryptAndSchedule: (payload) => api.post('/question-papers/encrypt-and-schedule', payload),
  getFacultyPapers: () => api.get('/faculty/question-papers'),
  cancelPaper: (id) => api.delete(`/question-papers/${id}`),
  
  // Student endpoints
  getStudentExams: () => api.get('/student/exams'),
  getStudentPapers: () => api.get('/student/question-papers'),
  getPaperStatus: (id) => api.get(`/student/question-papers/${id}`),
  getEncryptedPackageUrl: (id) => `${API_BASE_URL}/student/question-papers/${id}/encrypted-package`,
  requestReleaseToken: (id) => api.post(`/student/question-papers/${id}/release-request`),
  decryptPaper: (id, releaseToken) => api.post(`/student/question-papers/${id}/decrypt`, { release_token: releaseToken }),
};

// Crypto Policy & Migration Services
export const cryptoPolicyService = {
  getProfiles: () => api.get('/admin/crypto-profiles'),
  setDefaultProfile: (profileId) => api.put('/admin/crypto-profiles/default', { profile_id: profileId }),
  getSecurityMetrics: () => api.get('/admin/security-metrics'),
};

// Audit Log Services
export const auditService = {
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
};

// Authoritative System Time Service
export const systemTimeService = {
  getSystemTime: () => api.get('/system/time'),
};

export default api;

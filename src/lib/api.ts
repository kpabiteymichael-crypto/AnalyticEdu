import axios, { AxiosError } from 'axios';
import { captureException } from './sentry';

const BASE_URL = '/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('edu_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err: AxiosError<{ error?: string; message?: string }>) => {
    const url = err.config?.url || '';
    const isAuthEndpoint = /\/(login|register|forgot-password|reset-password)/.test(url);

    if (err.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('edu_token');
      localStorage.removeItem('edu_user');
      window.location.href = '/login';
      return Promise.reject(err);
    }

    if (err.response && err.response.status >= 500) {
      captureException(err, {
        url: err.config?.url,
        method: err.config?.method,
        status: err.response.status,
      });
    }

    const message =
      err.response?.data?.error ||
      err.response?.data?.message ||
      (err.code === 'ECONNABORTED' ? 'Request timed out. Please try again.' : null) ||
      (!err.response ? 'Network error. Check your connection.' : null) ||
      'An unexpected error occurred.';

    return Promise.reject(new Error(message));
  }
);

// ─── Auth ─────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then(r => r.data),
  register: (data: { name: string; email: string; password: string; role?: string; grade?: number }) =>
    api.post('/auth/register', data).then(r => r.data),
  me: () => api.get('/auth/me').then(r => r.data),
  classes: () => api.get('/auth/classes').then(r => r.data),
  updateProfile: (data: { name?: string; email?: string; currentPassword?: string; newPassword?: string }) =>
    api.put('/auth/profile', data).then(r => r.data),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }).then(r => r.data),
  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }).then(r => r.data),
};

// ─── Students ─────────────────────────────────────────────
export const studentsApi = {
  list: () => api.get('/students').then(r => r.data),
  me: () => api.get('/students/me').then(r => r.data),
  get: (id: number) => api.get(`/students/${id}`).then(r => r.data),
  create: (data: { name: string; email: string; password: string; grade: number; classId?: number }) =>
    api.post('/students', data).then(r => r.data),
  update: (id: number, data: { name?: string; grade?: number; classId?: number | null; xp?: number; streakDays?: number }) =>
    api.put(`/students/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/students/${id}`).then(r => r.data),
  activity: (id: number) => api.get(`/students/${id}/activity`).then(r => r.data),
  overview: () => api.get('/students/summary/overview').then(r => r.data),
  bulkImport: (rows: any[]) => api.post('/students/bulk-import', rows).then(r => r.data),
};

// ─── Scores ───────────────────────────────────────────────
export const scoresApi = {
  create: (data: object) => api.post('/scores', data).then(r => r.data),
  delete: (id: number) => api.delete(`/scores/${id}`).then(r => r.data),
  byStudent: (id: number) => api.get(`/scores/student/${id}`).then(r => r.data),
  trends: (id: number) => api.get(`/scores/student/${id}/trends`).then(r => r.data),
  subjectBreakdown: () => api.get('/scores/analytics/subject-breakdown').then(r => r.data),
  monthlyTrend: () => api.get('/scores/analytics/monthly-trend').then(r => r.data),
  resetStudent: (studentId: number) => api.post(`/scores/reset/student/${studentId}`).then(r => r.data),
  resetSubject: (subject: string) => api.post(`/scores/reset/subject/${subject}`).then(r => r.data),
  resetClass: (classId: number) => api.post(`/scores/reset/class/${classId}`).then(r => r.data),
};

// ─── Rankings ─────────────────────────────────────────────
export const rankingsApi = {
  leaderboard: () => api.get('/rankings/leaderboard').then(r => r.data),
  subjectLeaderboard: (subject: string) => api.get(`/rankings/leaderboard/subject/${subject}`).then(r => r.data),
  byStudent: (id: number) => api.get(`/rankings/student/${id}`).then(r => r.data),
};

// ─── Gamification ─────────────────────────────────────────
export const gamificationApi = {
  badges: () => api.get('/gamification/badges').then(r => r.data),
  studentBadges: (id: number) => api.get(`/gamification/badges/student/${id}`).then(r => r.data),
  awardBadge: (studentId: number, badgeId: number) =>
    api.post('/gamification/badges/award', { studentId, badgeId }).then(r => r.data),
  activity: (id: number) => api.get(`/gamification/activity/${id}`).then(r => r.data),
  updateBadgeXpBulk: (updates: { id: number; xpReward: number }[]) =>
    api.put('/gamification/badges/xp/bulk', { updates }).then(r => r.data),
};

// ─── Analytics ────────────────────────────────────────────
export const analyticsApi = {
  overview: () => api.get('/analytics/overview').then(r => r.data),
  distribution: () => api.get('/analytics/performance-distribution').then(r => r.data),
};

// ─── Predictions ──────────────────────────────────────────
export const predictionsApi = {
  generate: (studentId: number) => api.post(`/predictions/generate/${studentId}`).then(r => r.data),
  byStudent: (studentId: number) => api.get(`/predictions/student/${studentId}`).then(r => r.data),
  atRisk: () => api.get('/predictions/at-risk').then(r => r.data),
};

// ─── Parents ──────────────────────────────────────────────
export const parentsApi = {
  link: (studentCode: string, relationship?: string) =>
    api.post('/parents/link', { studentCode, relationship }).then(r => r.data),
  myChildren: () => api.get('/parents/my-children').then(r => r.data),
  childReport: (studentId: number) => api.get(`/parents/child/${studentId}/report`).then(r => r.data),
};

// ─── Reports ──────────────────────────────────────────────
export const reportsApi = {
  classPerformance: () => api.get('/reports/class-performance').then(r => r.data),
  studentFull: (id: number) => api.get(`/reports/student/${id}/full`).then(r => r.data),
  exportCSV: () => window.open('/api/reports/export-summary', '_blank'),
};

// ─── Notifications ────────────────────────────────────────
export const notificationsApi = {
  list: () => api.get('/notifications').then(r => r.data),
  markRead: (id: number) => api.patch(`/notifications/${id}/read`).then(r => r.data),
  markAllRead: () => api.patch('/notifications/read-all').then(r => r.data),
};

// ─── Teams / Classes ──────────────────────────────────────
export const teamsApi = {
  list: () => api.get('/classes').then(r => r.data),
  unassigned: () => api.get('/classes/unassigned').then(r => r.data),
  students: (id: number) => api.get(`/classes/${id}/students`).then(r => r.data),
  create: (data: { name: string; grade: number; teacherId?: number; subjects?: string[] }) =>
    api.post('/classes', data).then(r => r.data),
  update: (id: number, data: { name?: string; grade?: number; teacherId?: number }) =>
    api.put(`/classes/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/classes/${id}`).then(r => r.data),
  assignStudent: (id: number, studentId: number) =>
    api.post(`/classes/${id}/assign`, { studentId }).then(r => r.data),
  removeStudent: (id: number, studentId: number) =>
    api.delete(`/classes/${id}/students/${studentId}`).then(r => r.data),
  getSubjects: (id: number) => api.get(`/classes/${id}/subjects`).then(r => r.data),
  updateSubjects: (id: number, subjects: string[]) =>
    api.put(`/classes/${id}/subjects`, { subjects }).then(r => r.data),
};

// ─── Settings ─────────────────────────────────────────────
export const settingsApi = {
  get: () => api.get('/settings').then(r => r.data),
  updateLevelThresholds: (thresholds: number[]) =>
    api.put('/settings/level-thresholds', { thresholds }).then(r => r.data),
  updateSubjectMaxMarks: (marks: Record<string, number>) =>
    api.put('/settings/subject-max-marks', { marks }).then(r => r.data),
  getDemoAccounts: () => api.get('/settings/demo-accounts').then(r => r.data),
  updateDemoAccounts: (accounts: any[]) =>
    api.put('/settings/demo-accounts', { accounts }).then(r => r.data),
  updateXpRewards: (rewards: { minPct: number; xp: number }[]) =>
    api.put('/settings/xp-rewards', { rewards }).then(r => r.data),
  updateSubjectLabels: (labels: Record<string, string>) =>
    api.put('/settings/subject-labels', { labels }).then(r => r.data),
};

// ─── Assessments ──────────────────────────────────────────
export const assessmentsApi = {
  list: () => api.get('/assessments').then(r => r.data),
  get: (id: number) => api.get(`/assessments/${id}`).then(r => r.data),
  create: (data: object) => api.post('/assessments', data).then(r => r.data),
  update: (id: number, data: object) => api.put(`/assessments/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/assessments/${id}`).then(r => r.data),
  setStatus: (id: number, status: string) => api.patch(`/assessments/${id}/status`, { status }).then(r => r.data),
  addQuestion: (id: number, data: object) => api.post(`/assessments/${id}/questions`, data).then(r => r.data),
  updateQuestion: (id: number, qid: number, data: object) => api.put(`/assessments/${id}/questions/${qid}`, data).then(r => r.data),
  deleteQuestion: (id: number, qid: number) => api.delete(`/assessments/${id}/questions/${qid}`).then(r => r.data),
  start: (id: number) => api.post(`/assessments/${id}/start`).then(r => r.data),
  saveProgress: (id: number, data: object) => api.patch(`/assessments/${id}/save-progress`, data).then(r => r.data),
  submit: (id: number, data: object) => api.post(`/assessments/${id}/submit`, data).then(r => r.data),
  myResult: (id: number) => api.get(`/assessments/${id}/my-result`).then(r => r.data),
  results: (id: number) => api.get(`/assessments/${id}/results`).then(r => r.data),
};

export default api;

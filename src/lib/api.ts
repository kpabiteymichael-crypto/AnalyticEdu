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
  updateMentorRatingXp: (xp: Record<string, number>) =>
    api.put('/settings/mentor-rating-xp', { xp }).then(r => r.data),
  listSubjects: () =>
    api.get('/settings/subjects').then(r => r.data) as Promise<{ key: string; label: string }[]>,
  addSubject: (key: string, label: string, maxMarks: number) =>
    api.post('/settings/subjects', { key, label, maxMarks }).then(r => r.data),
  removeSubject: (key: string) =>
    api.delete(`/settings/subjects/${key}`).then(r => r.data),
};

// ─── Assessments ──────────────────────────────────────────
export const assessmentsApi = {
  list: () => api.get('/assessments').then(r => r.data),
  get: (id: number) => api.get(`/assessments/${id}`).then(r => r.data),
  create: (data: object) => api.post('/assessments', data).then(r => r.data),
  update: (id: number, data: object) => api.put(`/assessments/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/assessments/${id}`).then(r => r.data),
  setStatus: (id: number, status: string) => api.patch(`/assessments/${id}/status`, { status }).then(r => r.data),
  makePublic: (id: number) => api.patch(`/assessments/${id}/make-public`).then(r => r.data),
  addQuestion: (id: number, data: object) => api.post(`/assessments/${id}/questions`, data).then(r => r.data),
  updateQuestion: (id: number, qid: number, data: object) => api.put(`/assessments/${id}/questions/${qid}`, data).then(r => r.data),
  deleteQuestion: (id: number, qid: number) => api.delete(`/assessments/${id}/questions/${qid}`).then(r => r.data),
  start: (id: number) => api.post(`/assessments/${id}/start`).then(r => r.data),
  saveProgress: (id: number, data: object) => api.patch(`/assessments/${id}/save-progress`, data).then(r => r.data),
  submit: (id: number, data: object) => api.post(`/assessments/${id}/submit`, data).then(r => r.data),
  myResult: (id: number) => api.get(`/assessments/${id}/my-result`).then(r => r.data),
  results: (id: number) => api.get(`/assessments/${id}/results`).then(r => r.data),
};

// ─── Question Bank ────────────────────────────────────────
export const questionBankApi = {
  list:              (params?: Record<string, string>) =>
    api.get('/question-bank', { params }).then(r => r.data),
  create:            (data: object) =>
    api.post('/question-bank', data).then(r => r.data),
  bulk:              (data: object) =>
    api.post('/question-bank/bulk', data).then(r => r.data),
  importAssessment:  (assessmentId: number, subject: string) =>
    api.post(`/question-bank/import-assessment/${assessmentId}`, { subject }).then(r => r.data),
  remove:            (id: number) =>
    api.delete(`/question-bank/${id}`).then(r => r.data),
  generateQuestions: (data: object) =>
    api.post('/assessments/generate-questions', data).then(r => r.data),
};

// ─── Public (no auth) ─────────────────────────────────────
export const publicAssessmentApi = {
  get:          (token: string) =>
    api.get(`/public/assessment/${token}`).then(r => r.data),
  start:        (token: string, data: { participantName: string }) =>
    api.post(`/public/assessment/${token}/start`, data).then(r => r.data),
  saveProgress: (token: string, data: object) =>
    api.patch(`/public/assessment/${token}/save-progress`, data).then(r => r.data),
  submit:       (token: string, data: object) =>
    api.post(`/public/assessment/${token}/submit`, data).then(r => r.data),
  result:       (token: string, subId: number) =>
    api.get(`/public/assessment/${token}/result/${subId}`).then(r => r.data),
};

// ─── LMS ──────────────────────────────────────────────────
export const lmsApi = {
  getTopics:      (subject?: string) =>
    api.get('/lms/topics', { params: subject ? { subject } : {} }).then(r => r.data),
  createTopic:    (data: { subject: string; name: string; description?: string; orderIndex?: number }) =>
    api.post('/lms/topics', data).then(r => r.data),
  updateTopic:    (id: number, data: object) =>
    api.put(`/lms/topics/${id}`, data).then(r => r.data),
  deleteTopic:    (id: number) =>
    api.delete(`/lms/topics/${id}`).then(r => r.data),
  getMaterials:   (params?: { topicId?: number; subject?: string }) =>
    api.get('/lms/materials', { params }).then(r => r.data),
  createMaterial: (data: object) =>
    api.post('/lms/materials', data).then(r => r.data),
  updateMaterial: (id: number, data: object) =>
    api.put(`/lms/materials/${id}`, data).then(r => r.data),
  deleteMaterial: (id: number) =>
    api.delete(`/lms/materials/${id}`).then(r => r.data),
  myProgress:     () =>
    api.get('/lms/my-progress').then(r => r.data),
  markProgress:   (materialId: number, action: 'complete' | 'bookmark' | 'unbookmark', timeSpentMins?: number) =>
    api.post(`/lms/progress/${materialId}`, { action, timeSpentMins }).then(r => r.data),
};

// ─── Announcements ────────────────────────────────────────
export const announcementsApi = {
  list:   (classId?: number) =>
    api.get('/announcements', { params: classId ? { classId } : {} }).then(r => r.data),
  create: (data: { classId?: number; title: string; body: string; isPinned?: boolean }) =>
    api.post('/announcements', data).then(r => r.data),
  update: (id: number, data: { title?: string; body?: string; isPinned?: boolean }) =>
    api.put(`/announcements/${id}`, data).then(r => r.data),
  delete: (id: number) =>
    api.delete(`/announcements/${id}`).then(r => r.data),
};

// ─── Study Plan ───────────────────────────────────────────
export const studyPlanApi = {
  get: (studentId: number) =>
    api.get(`/predictions/study-plan/${studentId}`).then(r => r.data),
};

// ─── Mentors ──────────────────────────────────────────────
export const mentorsApi = {
  requests:        () =>
    api.get('/mentors/requests').then(r => r.data),
  myRequests:      () =>
    api.get('/mentors/requests').then(r => r.data),
  request:         (data: { subject: string; message?: string }) =>
    api.post('/mentors/request', data).then(r => r.data),
  accept:          (id: number, data: { scheduledAt?: string; notes?: string }) =>
    api.put(`/mentors/requests/${id}/accept`, data).then(r => r.data),
  decline:         (id: number) =>
    api.put(`/mentors/requests/${id}/decline`).then(r => r.data),
  completeSession: (sessionId: number) =>
    api.put(`/mentors/sessions/${sessionId}/complete`).then(r => r.data),
  rate:            (sessionId: number, data: { rating: number; comment?: string }) =>
    api.post(`/mentors/sessions/${sessionId}/rate`, data).then(r => r.data),
  stats:           () =>
    api.get('/mentors/stats').then(r => r.data),
};

// ─── Subject Assignments ──────────────────────────────────
export const subjectAssignmentsApi = {
  mySubjects:         () => api.get('/subject-assignments/my-subjects').then(r => r.data),
  getStudents:        () => api.get('/subject-assignments/students').then(r => r.data),
  getTeachers:        () => api.get('/subject-assignments/teachers').then(r => r.data),
  addStudentSubject:  (studentId: number, subject: string) =>
    api.post(`/subject-assignments/student/${studentId}/add`, { subject }).then(r => r.data),
  dropStudentSubject: (studentId: number, subject: string) =>
    api.delete(`/subject-assignments/student/${studentId}/${subject}`).then(r => r.data),
  addTeacherSubject:  (userId: number, subject: string) =>
    api.post(`/subject-assignments/teacher/${userId}/add`, { subject }).then(r => r.data),
  dropTeacherSubject: (userId: number, subject: string) =>
    api.delete(`/subject-assignments/teacher/${userId}/${subject}`).then(r => r.data),
};

export default api;

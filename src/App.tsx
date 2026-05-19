import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ClassProvider } from './context/ClassContext';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';

// ── Eagerly loaded (on the critical path) ────────────────────────────────────
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// ── Lazily loaded (code-split per route) ─────────────────────────────────────
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const AdminDashboard   = lazy(() => import('./pages/AdminDashboard'));
const Leaderboard      = lazy(() => import('./pages/Leaderboard'));
const Analytics        = lazy(() => import('./pages/Analytics'));
const Students         = lazy(() => import('./pages/Students'));
const ScoreEntry       = lazy(() => import('./pages/ScoreEntry'));
const Reports          = lazy(() => import('./pages/Reports'));
const Predictions      = lazy(() => import('./pages/Predictions'));
const ParentPortal     = lazy(() => import('./pages/ParentPortal'));
const StudentDetail    = lazy(() => import('./pages/StudentDetail'));
const Badges           = lazy(() => import('./pages/Badges'));
const Settings         = lazy(() => import('./pages/Settings'));
const Teams            = lazy(() => import('./pages/Teams'));
const Assessments       = lazy(() => import('./pages/Assessments'));
const AssessmentBuilder = lazy(() => import('./pages/AssessmentBuilder'));
const TakeAssessment    = lazy(() => import('./pages/TakeAssessment'));
const AssessmentResults = lazy(() => import('./pages/AssessmentResults'));
const PublicAssessment  = lazy(() => import('./pages/PublicAssessment'));
const QuestionBank      = lazy(() => import('./pages/QuestionBank'));
const LearningHub       = lazy(() => import('./pages/LearningHub'));
const ContentManager    = lazy(() => import('./pages/ContentManager'));
const Announcements     = lazy(() => import('./pages/Announcements'));
const StudyPlan         = lazy(() => import('./pages/StudyPlan'));
const SubjectHub        = lazy(() => import('./pages/SubjectHub'));
const SubjectDetail     = lazy(() => import('./pages/SubjectDetail'));
const MentorRequests    = lazy(() => import('./pages/MentorRequests'));

// ── Shared page-level loading fallback ───────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-96">
      <LoadingSpinner />
    </div>
  );
}

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 font-medium">Loading EduAnalytics...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'student') return <Navigate to="/dashboard" replace />;
  if (user.role === 'parent') return <Navigate to="/parent-portal" replace />;
  return <Navigate to="/admin" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <ClassProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login"           element={<Login />} />
              <Route path="/register"       element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password"  element={<ResetPassword />} />

              <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<HomeRedirect />} />

                <Route path="dashboard" element={
                  <ProtectedRoute roles={['student']}>
                    <Suspense fallback={<PageLoader />}><StudentDashboard /></Suspense>
                  </ProtectedRoute>
                } />

                <Route path="admin" element={
                  <ProtectedRoute roles={['admin', 'teacher']}>
                    <Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense>
                  </ProtectedRoute>
                } />

                <Route path="students" element={
                  <ProtectedRoute roles={['admin', 'teacher']}>
                    <Suspense fallback={<PageLoader />}><Students /></Suspense>
                  </ProtectedRoute>
                } />

                <Route path="students/:id" element={
                  <ProtectedRoute roles={['admin', 'teacher']}>
                    <Suspense fallback={<PageLoader />}><StudentDetail /></Suspense>
                  </ProtectedRoute>
                } />

                <Route path="scores/entry" element={
                  <ProtectedRoute roles={['admin', 'teacher']}>
                    <Suspense fallback={<PageLoader />}><ScoreEntry /></Suspense>
                  </ProtectedRoute>
                } />

                <Route path="analytics" element={
                  <ProtectedRoute roles={['admin', 'teacher']}>
                    <Suspense fallback={<PageLoader />}><Analytics /></Suspense>
                  </ProtectedRoute>
                } />

                <Route path="predictions" element={
                  <ProtectedRoute roles={['admin', 'teacher']}>
                    <Suspense fallback={<PageLoader />}><Predictions /></Suspense>
                  </ProtectedRoute>
                } />

                <Route path="reports" element={
                  <ProtectedRoute roles={['admin', 'teacher']}>
                    <Suspense fallback={<PageLoader />}><Reports /></Suspense>
                  </ProtectedRoute>
                } />

                <Route path="settings" element={
                  <ProtectedRoute roles={['admin', 'teacher']}>
                    <Suspense fallback={<PageLoader />}><Settings /></Suspense>
                  </ProtectedRoute>
                } />

                <Route path="teams" element={
                  <ProtectedRoute roles={['admin', 'teacher']}>
                    <Suspense fallback={<PageLoader />}><Teams /></Suspense>
                  </ProtectedRoute>
                } />

                <Route path="assessments" element={
                  <ProtectedRoute roles={['admin', 'teacher', 'student']}>
                    <Suspense fallback={<PageLoader />}><Assessments /></Suspense>
                  </ProtectedRoute>
                } />
                <Route path="assessments/new" element={
                  <ProtectedRoute roles={['admin', 'teacher']}>
                    <Suspense fallback={<PageLoader />}><AssessmentBuilder /></Suspense>
                  </ProtectedRoute>
                } />
                <Route path="assessments/:id/edit" element={
                  <ProtectedRoute roles={['admin', 'teacher']}>
                    <Suspense fallback={<PageLoader />}><AssessmentBuilder /></Suspense>
                  </ProtectedRoute>
                } />
                <Route path="assessments/:id/take" element={
                  <ProtectedRoute roles={['student']}>
                    <Suspense fallback={<PageLoader />}><TakeAssessment /></Suspense>
                  </ProtectedRoute>
                } />
                <Route path="assessments/:id/results" element={
                  <ProtectedRoute roles={['admin', 'teacher', 'student']}>
                    <Suspense fallback={<PageLoader />}><AssessmentResults /></Suspense>
                  </ProtectedRoute>
                } />
                <Route path="question-bank" element={
                  <ProtectedRoute roles={['admin', 'teacher']}>
                    <Suspense fallback={<PageLoader />}><QuestionBank /></Suspense>
                  </ProtectedRoute>
                } />
                <Route path="subjects" element={
                  <ProtectedRoute roles={['student']}>
                    <Suspense fallback={<PageLoader />}><SubjectHub /></Suspense>
                  </ProtectedRoute>
                } />
                <Route path="subjects/:subject" element={
                  <ProtectedRoute roles={['student']}>
                    <Suspense fallback={<PageLoader />}><SubjectDetail /></Suspense>
                  </ProtectedRoute>
                } />
                <Route path="mentor-requests" element={
                  <Suspense fallback={<PageLoader />}><MentorRequests /></Suspense>
                } />
                <Route path="learning" element={
                  <ProtectedRoute roles={['student']}>
                    <Suspense fallback={<PageLoader />}><LearningHub /></Suspense>
                  </ProtectedRoute>
                } />
                <Route path="study-plan" element={
                  <ProtectedRoute roles={['student']}>
                    <Suspense fallback={<PageLoader />}><StudyPlan /></Suspense>
                  </ProtectedRoute>
                } />
                <Route path="content" element={
                  <ProtectedRoute roles={['admin', 'teacher']}>
                    <Suspense fallback={<PageLoader />}><ContentManager /></Suspense>
                  </ProtectedRoute>
                } />
                <Route path="announcements" element={
                  <Suspense fallback={<PageLoader />}><Announcements /></Suspense>
                } />

                <Route path="leaderboard" element={
                  <Suspense fallback={<PageLoader />}><Leaderboard /></Suspense>
                } />

                <Route path="badges" element={
                  <Suspense fallback={<PageLoader />}><Badges /></Suspense>
                } />

                <Route path="parent-portal" element={
                  <ProtectedRoute roles={['parent', 'admin']}>
                    <Suspense fallback={<PageLoader />}><ParentPortal /></Suspense>
                  </ProtectedRoute>
                } />
              </Route>

              <Route path="public/assessment/:token" element={
                <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><LoadingSpinner /></div>}>
                  <PublicAssessment />
                </Suspense>
              } />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ClassProvider>
    </AuthProvider>
  );
}

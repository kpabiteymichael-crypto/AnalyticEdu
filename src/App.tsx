import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Leaderboard from './pages/Leaderboard';
import Analytics from './pages/Analytics';
import Students from './pages/Students';
import ScoreEntry from './pages/ScoreEntry';
import Reports from './pages/Reports';
import Predictions from './pages/Predictions';
import ParentPortal from './pages/ParentPortal';
import StudentDetail from './pages/StudentDetail';
import Badges from './pages/Badges';
import Settings from './pages/Settings';
import Teams from './pages/Teams';

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
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<HomeRedirect />} />
            <Route path="dashboard" element={
              <ProtectedRoute roles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            } />
            <Route path="admin" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="students" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <Students />
              </ProtectedRoute>
            } />
            <Route path="students/:id" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <StudentDetail />
              </ProtectedRoute>
            } />
            <Route path="scores/entry" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <ScoreEntry />
              </ProtectedRoute>
            } />
            <Route path="analytics" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <Analytics />
              </ProtectedRoute>
            } />
            <Route path="predictions" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <Predictions />
              </ProtectedRoute>
            } />
            <Route path="reports" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <Reports />
              </ProtectedRoute>
            } />
            <Route path="settings" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="teams" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <Teams />
              </ProtectedRoute>
            } />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="badges" element={<Badges />} />
            <Route path="parent-portal" element={
              <ProtectedRoute roles={['parent', 'admin']}>
                <ParentPortal />
              </ProtectedRoute>
            } />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

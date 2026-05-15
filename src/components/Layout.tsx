import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useClass } from '../context/ClassContext';
import { useState, useEffect } from 'react';
import { notificationsApi, authApi } from '../lib/api';
import {
  LayoutDashboard, Users, BarChart3, Trophy, Brain,
  FileText, LogOut, Bell, GraduationCap, Star, Menu, X,
  ClipboardList, Users2, ChevronRight, Settings, ChevronDown,
  UserCog, Eye, EyeOff, CheckCircle, AlertCircle
} from 'lucide-react';
import clsx from 'clsx';

interface NavItem { label: string; to: string; icon: React.ReactNode; roles: string[] }

const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: <LayoutDashboard size={18} />, roles: ['student'] },
  { label: 'Overview', to: '/admin', icon: <LayoutDashboard size={18} />, roles: ['admin', 'teacher'] },
  { label: 'Students', to: '/students', icon: <Users size={18} />, roles: ['admin', 'teacher'] },
  { label: 'Score Entry', to: '/scores/entry', icon: <ClipboardList size={18} />, roles: ['admin', 'teacher'] },
  { label: 'Analytics', to: '/analytics', icon: <BarChart3 size={18} />, roles: ['admin', 'teacher'] },
  { label: 'AI Predictions', to: '/predictions', icon: <Brain size={18} />, roles: ['admin', 'teacher'] },
  { label: 'Reports', to: '/reports', icon: <FileText size={18} />, roles: ['admin', 'teacher'] },
  { label: 'Leaderboard', to: '/leaderboard', icon: <Trophy size={18} />, roles: ['admin', 'teacher', 'student'] },
  { label: 'Badges', to: '/badges', icon: <Star size={18} />, roles: ['admin', 'teacher', 'student'] },
  { label: 'Parent Portal', to: '/parent-portal', icon: <Users2 size={18} />, roles: ['parent', 'admin'] },
  { label: 'Teams', to: '/teams', icon: <Users size={18} />, roles: ['admin', 'teacher'] },
  { label: 'Settings', to: '/settings', icon: <Settings size={18} />, roles: ['admin', 'teacher'] },
];

// Bottom navigation items per role (most important 4-5 for thumb reach)
const bottomNavItems: Record<string, { label: string; to: string; icon: React.ReactNode }[]> = {
  student: [
    { label: 'Dashboard', to: '/dashboard',   icon: <LayoutDashboard size={20} /> },
    { label: 'Leaderboard', to: '/leaderboard', icon: <Trophy size={20} /> },
    { label: 'Badges',     to: '/badges',      icon: <Star size={20} /> },
  ],
  teacher: [
    { label: 'Overview',   to: '/admin',         icon: <LayoutDashboard size={20} /> },
    { label: 'Students',   to: '/students',      icon: <Users size={20} /> },
    { label: 'Scores',     to: '/scores/entry',  icon: <ClipboardList size={20} /> },
    { label: 'Analytics',  to: '/analytics',     icon: <BarChart3 size={20} /> },
    { label: 'Leaderboard',to: '/leaderboard',   icon: <Trophy size={20} /> },
  ],
  admin: [
    { label: 'Overview',   to: '/admin',         icon: <LayoutDashboard size={20} /> },
    { label: 'Students',   to: '/students',      icon: <Users size={20} /> },
    { label: 'Scores',     to: '/scores/entry',  icon: <ClipboardList size={20} /> },
    { label: 'Analytics',  to: '/analytics',     icon: <BarChart3 size={20} /> },
    { label: 'Leaderboard',to: '/leaderboard',   icon: <Trophy size={20} /> },
  ],
  parent: [
    { label: 'Portal',     to: '/parent-portal', icon: <Users2 size={20} /> },
    { label: 'Leaderboard',to: '/leaderboard',   icon: <Trophy size={20} /> },
    { label: 'Badges',     to: '/badges',        icon: <Star size={20} /> },
  ],
};

export default function Layout() {
  const { user, logout, updateUser } = useAuth();
  const { activeClass, classes: teacherClasses, setActiveClassId } = useClass();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', email: '', currentPassword: '', newPassword: '', confirmPassword: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileToast, setProfileToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showPw, setShowPw] = useState(false);

  const openProfile = () => {
    setProfileForm({ name: user?.name ?? '', email: user?.email ?? '', currentPassword: '', newPassword: '', confirmPassword: '' });
    setProfileToast(null);
    setShowProfile(true);
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profileForm.newPassword && profileForm.newPassword !== profileForm.confirmPassword) {
      setProfileToast({ type: 'error', message: 'New passwords do not match' });
      return;
    }
    setProfileSaving(true);
    setProfileToast(null);
    try {
      const payload: any = {};
      if (profileForm.name.trim() !== user?.name) payload.name = profileForm.name.trim();
      if (profileForm.email.trim() !== user?.email) payload.email = profileForm.email.trim();
      if (profileForm.newPassword) {
        payload.currentPassword = profileForm.currentPassword;
        payload.newPassword = profileForm.newPassword;
      } else if (payload.email) {
        payload.currentPassword = profileForm.currentPassword;
      }
      if (Object.keys(payload).length === 0) {
        setProfileToast({ type: 'error', message: 'No changes to save' });
        return;
      }
      const result = await authApi.updateProfile(payload);
      updateUser(result.user, result.token);
      setProfileToast({ type: 'success', message: 'Profile updated successfully' });
      setProfileForm(p => ({ ...p, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } catch (err: any) {
      setProfileToast({ type: 'error', message: err.response?.data?.error ?? 'Failed to update profile' });
    } finally {
      setProfileSaving(false);
    }
  };

  useEffect(() => {
    notificationsApi.list().then(setNotifications).catch(() => {});
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const userNav = navItems.filter(n => user && n.roles.includes(user.role));
  const mobileNav = user ? (bottomNavItems[user.role] ?? []) : [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const Sidebar = ({ mobile = false }) => (
    <div className={clsx(
      'flex flex-col h-full',
      mobile ? 'w-72' : 'w-64'
    )}>
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 grad-primary rounded-xl flex items-center justify-center shadow-md shadow-primary-200">
            <GraduationCap size={20} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm">EduAnalytics</div>
            <div className="text-xs text-slate-500">Learning Dashboard</div>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
          <div className="w-9 h-9 grad-primary rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-900 truncate">{user?.name}</div>
            <div className="text-xs text-slate-500 capitalize">{user?.role}</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-3">Navigation</div>
        {userNav.filter(item => item.to !== '/settings').map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group',
              isActive
                ? 'bg-primary-600 text-white shadow-md shadow-primary-200'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            )}
          >
            {item.icon}
            <span>{item.label}</span>
            <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-50 transition-opacity" />
          </NavLink>
        ))}

        {/* Settings at the bottom of nav, separated */}
        {userNav.find(item => item.to === '/settings') && (
          <>
            <div className="border-t border-slate-100 my-3" />
            <NavLink
              to="/settings"
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group',
                isActive
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-200'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <Settings size={18} />
              <span>Settings</span>
              <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-50 transition-opacity" />
            </NavLink>
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all duration-150"
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-100 shadow-sm flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 bg-white shadow-2xl animate-slide-in">
            <div className="flex justify-end p-4">
              <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-100 px-4 lg:px-6 py-4 flex items-center gap-4 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <Menu size={20} />
          </button>

          <div className="flex-1" />

          {/* Teacher class selector */}
          {user?.role === 'teacher' && teacherClasses.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowClassPicker(p => !p)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 transition-all shadow-sm"
              >
                <GraduationCap size={15} className="text-primary-600" />
                <span className="hidden sm:inline max-w-32 truncate">{activeClass?.name ?? 'Select Class'}</span>
                <ChevronDown size={13} className="text-slate-400" />
              </button>
              {showClassPicker && (
                <div className="absolute right-0 top-10 z-50 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 min-w-48 animate-fade-in">
                  <div className="px-3 pb-2 pt-1 text-xs font-bold text-slate-400 uppercase tracking-wider">Your Classes</div>
                  {teacherClasses.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setActiveClassId(c.id); setShowClassPicker(false); }}
                      className={clsx(
                        'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors',
                        activeClass?.id === c.id ? 'text-primary-700 font-semibold bg-primary-50' : 'text-slate-700'
                      )}
                    >
                      <div className="w-6 h-6 grad-primary rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        {c.name?.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold">{c.name}</div>
                        <div className="text-xs text-slate-400">Grade {c.grade} · {c.studentCount} students</div>
                      </div>
                      {activeClass?.id === c.id && <span className="ml-auto text-primary-500 text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-fade-in">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <span className="font-semibold text-slate-900">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => {
                        notificationsApi.markAllRead();
                        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                        setShowNotifs(false);
                      }}
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-sm">No notifications</div>
                  ) : notifications.map(n => (
                    <div
                      key={n.id}
                      className={clsx('px-4 py-3 border-b border-slate-50 last:border-0', !n.isRead && 'bg-primary-50')}
                      onClick={() => {
                        notificationsApi.markRead(n.id);
                        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x));
                      }}
                    >
                      <div className="text-sm font-semibold text-slate-900">{n.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{n.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User avatar + profile + logout */}
          <div className="flex items-center gap-2">
            <button onClick={openProfile} className="flex items-center gap-2 hover:opacity-80 transition-opacity" title="Edit profile">
              <div className="w-8 h-8 grad-primary rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-sm font-semibold text-slate-900 leading-none">{user?.name}</div>
                <div className="text-xs text-slate-400 mt-0.5 capitalize">{user?.role}</div>
              </div>
            </button>
            <button
              onClick={handleLogout}
              className="ml-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 border border-slate-200 hover:border-red-200 transition-all"
              title="Sign out"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>

          {/* Profile Modal */}
          {showProfile && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowProfile(false)} />
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 grad-primary rounded-xl flex items-center justify-center shadow-md">
                      <UserCog size={18} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Edit Profile</h3>
                      <p className="text-xs text-slate-400 capitalize">{user?.role} account</p>
                    </div>
                  </div>
                  <button onClick={() => setShowProfile(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                    <X size={18} />
                  </button>
                </div>
                <form onSubmit={handleProfileSave} className="p-6 space-y-4">
                  {profileToast && (
                    <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium ${profileToast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                      {profileToast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                      {profileToast.message}
                    </div>
                  )}
                  <div>
                    <label className="label">Display Name</label>
                    <input type="text" value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                      className="input" required minLength={2} />
                  </div>
                  <div>
                    <label className="label">Email Address</label>
                    <input type="email" value={profileForm.email} onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))}
                      className="input" required />
                  </div>
                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Change Password</p>
                    <div className="space-y-3">
                      <div>
                        <label className="label">Current Password <span className="text-slate-400 font-normal">(required to change email or password)</span></label>
                        <div className="relative">
                          <input type={showPw ? 'text' : 'password'} value={profileForm.currentPassword}
                            onChange={e => setProfileForm(p => ({ ...p, currentPassword: e.target.value }))}
                            className="input pr-10" placeholder="Enter current password" autoComplete="current-password" />
                          <button type="button" onClick={() => setShowPw(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="label">New Password</label>
                        <input type={showPw ? 'text' : 'password'} value={profileForm.newPassword}
                          onChange={e => setProfileForm(p => ({ ...p, newPassword: e.target.value }))}
                          className="input" placeholder="Leave blank to keep current" minLength={6} autoComplete="new-password" />
                      </div>
                      {profileForm.newPassword && (
                        <div>
                          <label className="label">Confirm New Password</label>
                          <input type={showPw ? 'text' : 'password'} value={profileForm.confirmPassword}
                            onChange={e => setProfileForm(p => ({ ...p, confirmPassword: e.target.value }))}
                            className="input" placeholder="Repeat new password" autoComplete="new-password" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowProfile(false)} className="flex-1 btn-secondary">Cancel</button>
                    <button type="submit" disabled={profileSaving} className="flex-1 btn-primary">
                      {profileSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </header>

        {/* Page Content — extra bottom padding on mobile for the bottom nav */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 mobile-main-padding lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* ── Mobile Bottom Navigation ─────────────────────────────────────── */}
      {mobileNav.length > 0 && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 shadow-2xl bottom-nav-safe">
          <div className={`grid h-16`} style={{ gridTemplateColumns: `repeat(${mobileNav.length}, 1fr)` }}>
            {mobileNav.map(item => {
              const isActive = location.pathname === item.to ||
                (item.to !== '/' && location.pathname.startsWith(item.to));
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="flex flex-col items-center justify-center gap-0.5 py-2 transition-all duration-150 relative"
                >
                  <span className={clsx(
                    'flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-150',
                    isActive ? 'bg-primary-600 text-white shadow-md shadow-primary-200' : 'text-slate-400'
                  )}>
                    {item.icon}
                  </span>
                  <span className={clsx(
                    'text-[10px] font-semibold leading-none',
                    isActive ? 'text-primary-600' : 'text-slate-400'
                  )}>
                    {item.label}
                  </span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

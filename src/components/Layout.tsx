import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useClass } from '../context/ClassContext';
import { useState, useEffect } from 'react';
import { notificationsApi } from '../lib/api';
import {
  LayoutDashboard, Users, BarChart3, Trophy, Brain,
  FileText, LogOut, Bell, GraduationCap, Star, Menu, X,
  ClipboardList, Users2, ChevronRight, Settings, ChevronDown
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

export default function Layout() {
  const { user, logout } = useAuth();
  const { activeClass, classes: teacherClasses, setActiveClassId } = useClass();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showClassPicker, setShowClassPicker] = useState(false);

  useEffect(() => {
    notificationsApi.list().then(setNotifications).catch(() => {});
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const userNav = navItems.filter(n => user && n.roles.includes(user.role));

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

          {/* User avatar + logout */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 grad-primary rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-semibold text-slate-900">{user?.name}</div>
            </div>
            <button
              onClick={handleLogout}
              className="ml-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 border border-slate-200 hover:border-red-200 transition-all"
              title="Sign out"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

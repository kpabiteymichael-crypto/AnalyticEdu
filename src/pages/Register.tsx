import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../lib/api';
import { GraduationCap, Eye, EyeOff, ArrowRight, Shield, BookOpen, Users, GraduationCap as ParentIcon } from 'lucide-react';

const ROLES = [
  {
    value: 'admin',
    label: 'Administrator',
    icon: Shield,
    description: 'Manage the whole school, all classes and data',
    color: 'border-purple-300 bg-purple-50 text-purple-700',
    selectedColor: 'border-purple-500 bg-purple-100 ring-2 ring-purple-400',
  },
  {
    value: 'teacher',
    label: 'Teacher',
    icon: BookOpen,
    description: 'Enter scores, view analytics, manage classes',
    color: 'border-blue-300 bg-blue-50 text-blue-700',
    selectedColor: 'border-blue-500 bg-blue-100 ring-2 ring-blue-400',
  },
  {
    value: 'student',
    label: 'Student',
    icon: GraduationCap,
    description: 'View your grades, XP, badges and leaderboard',
    color: 'border-emerald-300 bg-emerald-50 text-emerald-700',
    selectedColor: 'border-emerald-500 bg-emerald-100 ring-2 ring-emerald-400',
  },
  {
    value: 'parent',
    label: 'Parent',
    icon: Users,
    description: 'Monitor your child\'s academic progress',
    color: 'border-amber-300 bg-amber-50 text-amber-700',
    selectedColor: 'border-amber-500 bg-amber-100 ring-2 ring-amber-400',
  },
];

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const defaultRole = searchParams.get('role') || 'student';

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: defaultRole,
    grade: '10',
  });
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await authApi.register({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role as any,
        grade: form.role === 'student' ? parseInt(form.grade) : undefined,
      });
      await login(form.email, form.password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = ROLES.find(r => r.value === form.role)!;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
            <GraduationCap size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Join EduAnalytics</h1>
          <p className="text-primary-200 mt-2">Create your account to get started</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl shadow-primary-900/30 p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Create Account</h2>
          <p className="text-sm text-slate-500 mb-6">Choose your role and fill in your details below.</p>

          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role selector */}
            <div>
              <label className="label mb-2">I am a...</label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map(role => {
                  const Icon = role.icon;
                  const isSelected = form.role === role.value;
                  return (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, role: role.value }))}
                      className={`flex items-start gap-2 p-3 rounded-xl border-2 text-left transition-all ${isSelected ? role.selectedColor : role.color} hover:opacity-90`}
                    >
                      <Icon size={16} className="mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs font-bold leading-tight">{role.label}</div>
                        <div className="text-xs opacity-70 leading-snug mt-0.5 hidden sm:block">{role.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Full name */}
            <div>
              <label className="label">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="input"
                placeholder="Your full name"
                required
                autoComplete="name"
              />
            </div>

            {/* Email */}
            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="input"
                placeholder="your@email.com"
                required
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="input pr-9"
                    placeholder="Min 6 chars"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    className={`input pr-9 ${form.confirmPassword && form.confirmPassword !== form.password ? 'border-red-400 focus:ring-red-300' : ''}`}
                    placeholder="Repeat password"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {form.confirmPassword && form.confirmPassword !== form.password && (
                  <p className="text-red-500 text-xs mt-1">Passwords don't match</p>
                )}
              </div>
            </div>

            {/* Grade — only for students */}
            {form.role === 'student' && (
              <div>
                <label className="label">Grade Level</label>
                <select
                  value={form.grade}
                  onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}
                  className="input"
                >
                  {[7, 8, 9, 10, 11, 12].map(g => (
                    <option key={g} value={g}>Grade {g}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (!!form.confirmPassword && form.confirmPassword !== form.password)}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base mt-1 disabled:opacity-60"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Create {selectedRole?.label} Account <ArrowRight size={18} /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

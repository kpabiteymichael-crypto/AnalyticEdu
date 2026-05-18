import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, ArrowLeft, Mail, ExternalLink } from 'lucide-react';
import { authApi } from '../lib/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [demoLink, setDemoLink] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authApi.forgotPassword(email);
      setSubmitted(true);
      if (data.resetLink) setDemoLink(data.resetLink);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
            <GraduationCap size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">EduAnalytics</h1>
          <p className="text-primary-200 mt-2">Password Recovery</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl shadow-primary-900/30 p-8">
          {submitted ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail size={26} className="text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Check your email</h2>
              <p className="text-slate-500 text-sm mb-6">
                If an account with <strong>{email}</strong> exists, a reset link has been sent. Check your inbox and spam folder.
              </p>

              {demoLink && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-left">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">
                    Demo Mode — No email configured
                  </p>
                  <p className="text-xs text-amber-600 mb-3">
                    In production, set SMTP environment variables to send real emails. For now, use this link:
                  </p>
                  <a
                    href={demoLink}
                    className="flex items-center gap-2 text-xs font-medium text-primary-600 hover:text-primary-700 break-all"
                  >
                    <ExternalLink size={14} className="shrink-0" />
                    {demoLink}
                  </a>
                </div>
              )}

              <Link
                to="/login"
                className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold"
              >
                <ArrowLeft size={16} /> Back to Login
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <Link to="/login" className="text-slate-400 hover:text-slate-600 transition-colors">
                  <ArrowLeft size={20} />
                </Link>
                <h2 className="text-xl font-bold text-slate-900">Forgot password?</h2>
              </div>

              <p className="text-slate-500 text-sm mb-6">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input"
                    placeholder="your@email.com"
                    required
                    autoFocus
                    autoComplete="email"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <><Mail size={18} /> Send Reset Link</>
                  )}
                </button>
              </form>

              <p className="text-center text-sm text-slate-500 mt-6">
                Remembered your password?{' '}
                <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-700">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GraduationCap, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { authApi } from '../lib/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) setError('No reset token found. Please request a new password reset link.');
  }, [token]);

  const passwordsMatch = password && confirm && password === confirm;
  const passwordTooShort = password && password.length < 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setError('');
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
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
          <p className="text-primary-200 mt-2">Set New Password</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl shadow-primary-900/30 p-8">
          {success ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={26} className="text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Password updated!</h2>
              <p className="text-slate-500 text-sm mb-6">
                Your password has been reset successfully. Redirecting you to login…
              </p>
              <Link to="/login" className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold">
                Go to Login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Create new password</h2>
              <p className="text-slate-500 text-sm mb-6">
                Choose a strong password of at least 6 characters.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {!token ? (
                <div className="text-center mt-4">
                  <Link to="/forgot-password" className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold">
                    Request New Reset Link
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="label">New Password</label>
                    <div className="relative">
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className={`input pr-10 ${passwordTooShort ? 'border-red-300' : ''}`}
                        placeholder="••••••••"
                        required
                        autoFocus
                        autoComplete="new-password"
                      />
                      <button type="button" onClick={() => setShowPw(!showPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {passwordTooShort && (
                      <p className="text-red-500 text-xs mt-1">Must be at least 6 characters</p>
                    )}
                  </div>

                  <div>
                    <label className="label">Confirm Password</label>
                    <div className="relative">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)}
                        className={`input pr-10 ${confirm && !passwordsMatch ? 'border-red-300' : passwordsMatch ? 'border-emerald-400' : ''}`}
                        placeholder="••••••••"
                        required
                        autoComplete="new-password"
                      />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {confirm && !passwordsMatch && (
                      <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
                    )}
                    {passwordsMatch && (
                      <p className="text-emerald-600 text-xs mt-1 flex items-center gap-1">
                        <CheckCircle size={12} /> Passwords match
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !password || !confirm}
                    className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : 'Update Password'}
                  </button>
                </form>
              )}

              <p className="text-center text-sm text-slate-500 mt-6">
                <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-700">
                  Back to Login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

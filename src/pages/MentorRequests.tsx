import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { mentorsApi } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Users, CheckCircle, XCircle, Clock, Star, MessageCircle,
  X, CalendarClock, Save, AlertCircle, ClipboardCheck,
  ChevronDown, ChevronRight, Award,
} from 'lucide-react';
import clsx from 'clsx';
import { formatDistanceToNow, format } from 'date-fns';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending:   { label: 'Pending',   color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',    icon: Clock },
  accepted:  { label: 'Accepted',  color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200',      icon: CheckCircle },
  declined:  { label: 'Declined',  color: 'text-red-700',     bg: 'bg-red-50 border-red-200',        icon: XCircle },
  completed: { label: 'Completed', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200',icon: ClipboardCheck },
};

function StarRating({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          disabled={readonly}
          onMouseEnter={() => !readonly && setHover(i)}
          onMouseLeave={() => !readonly && setHover(0)}
          onClick={() => !readonly && onChange?.(i)}
          className={clsx('transition-transform', !readonly && 'hover:scale-110 cursor-pointer', readonly && 'cursor-default')}
        >
          <Star
            size={readonly ? 14 : 24}
            className={clsx(
              'transition-colors',
              (hover || value) >= i ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-100'
            )}
          />
        </button>
      ))}
    </div>
  );
}

export default function MentorRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any[]>([]);

  // Accept modal (teacher/admin)
  const [acceptModal, setAcceptModal] = useState<any>(null);
  const [acceptForm, setAcceptForm] = useState({ scheduledAt: '', notes: '' });
  const [acceptLoading, setAcceptLoading] = useState(false);

  // Rating modal (student)
  const [ratingModal, setRatingModal] = useState<any>(null);
  const [ratingForm, setRatingForm] = useState({ rating: 0, comment: '' });
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingError, setRatingError] = useState('');

  const isStaff = user?.role === 'admin' || user?.role === 'teacher';

  async function load() {
    try {
      const [reqs, st] = await Promise.all([
        mentorsApi.requests(),
        isStaff ? mentorsApi.stats() : Promise.resolve([]),
      ]);
      setRequests(reqs as any[]);
      setStats(st as any[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptModal) return;
    setAcceptLoading(true);
    try {
      await mentorsApi.accept(acceptModal.id, acceptForm);
      await load();
      setAcceptModal(null);
    } catch (err) {
      console.error(err);
    } finally {
      setAcceptLoading(false);
    }
  };

  const handleDecline = async (id: number) => {
    if (!confirm('Decline this mentor request?')) return;
    await mentorsApi.decline(id);
    await load();
  };

  const handleComplete = async (sessionId: number) => {
    if (!confirm('Mark this session as completed?')) return;
    await mentorsApi.completeSession(sessionId);
    await load();
  };

  const handleRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ratingModal || ratingForm.rating === 0) {
      setRatingError('Please select a star rating');
      return;
    }
    setRatingLoading(true);
    setRatingError('');
    try {
      await mentorsApi.rate(ratingModal.session_id, ratingForm);
      await load();
      setRatingModal(null);
    } catch (err: any) {
      setRatingError(err.response?.data?.error ?? 'Failed to submit rating');
    } finally {
      setRatingLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading mentor requests..." />;

  // Student view
  if (!isStaff) {
    const pending   = requests.filter(r => r.status === 'pending');
    const accepted  = requests.filter(r => r.status === 'accepted');
    const completed = requests.filter(r => r.status === 'completed');
    const declined  = requests.filter(r => r.status === 'declined');

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Mentor Requests</h1>
          <p className="text-slate-500 text-sm mt-1">Track your help requests and rate your mentors</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Pending',   value: pending.length,   color: 'text-amber-600' },
            { label: 'Accepted',  value: accepted.length,  color: 'text-blue-600' },
            { label: 'Completed', value: completed.length, color: 'text-emerald-600' },
            { label: 'Declined',  value: declined.length,  color: 'text-red-500' },
          ].map(s => (
            <div key={s.label} className="card p-3 text-center">
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-400">{s.label}</div>
            </div>
          ))}
        </div>

        {requests.length === 0 ? (
          <div className="empty-state">
            <Users size={40} className="mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-bold text-slate-700">No mentor requests yet</h3>
            <p className="text-slate-400 mt-2 text-sm">Go to a subject and click "Request Mentor" to get help.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(r => {
              const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.pending;
              const StatusIcon = cfg.icon;
              const canRate = r.status === 'completed' && r.session_id && !r.rating;
              const isRated = r.status === 'completed' && r.rating;

              return (
                <div key={r.id} className={clsx('card p-5 border', cfg.bg)}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3">
                      <StatusIcon size={18} className={clsx(cfg.color, 'mt-0.5 flex-shrink-0')} />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 capitalize">{r.subject}</span>
                          <span className={clsx('text-xs px-2 py-0.5 rounded-full font-semibold border', cfg.bg, cfg.color)}>
                            {cfg.label}
                          </span>
                        </div>
                        {r.message && (
                          <p className="text-sm text-slate-600 mt-1 italic">"{r.message}"</p>
                        )}
                        <div className="text-xs text-slate-400 mt-1">
                          Requested {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                        </div>

                        {/* Accepted: show mentor + schedule */}
                        {(r.status === 'accepted' || r.status === 'completed') && r.mentor_name && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="w-6 h-6 grad-primary rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {r.mentor_name.charAt(0)}
                            </div>
                            <span className="text-sm font-medium text-slate-700">{r.mentor_name}</span>
                            {r.scheduled_at && (
                              <span className="flex items-center gap-1 text-xs text-slate-500 ml-1">
                                <CalendarClock size={11} />
                                {format(new Date(r.scheduled_at), 'MMM d, h:mm a')}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Notes */}
                        {r.notes && (
                          <div className="mt-2 text-xs bg-white rounded-lg p-2 border border-slate-200 text-slate-600">
                            <span className="font-semibold">Mentor note:</span> {r.notes}
                          </div>
                        )}

                        {/* Rated */}
                        {isRated && (
                          <div className="mt-2 flex items-center gap-2">
                            <StarRating value={parseInt(r.rating)} readonly />
                            {r.rating_comment && <span className="text-xs text-slate-500">"{r.rating_comment}"</span>}
                          </div>
                        )}
                      </div>
                    </div>

                    {canRate && (
                      <button
                        onClick={() => { setRatingModal(r); setRatingForm({ rating: 0, comment: '' }); setRatingError(''); }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 font-semibold text-sm hover:bg-amber-100 transition-all"
                      >
                        <Star size={14} /> Rate Mentor
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Rating modal */}
        {ratingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setRatingModal(null)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 grad-primary rounded-xl flex items-center justify-center">
                    <Award size={16} className="text-white" />
                  </div>
                  <h3 className="font-bold text-slate-900">Rate Your Mentor</h3>
                </div>
                <button onClick={() => setRatingModal(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={16} /></button>
              </div>
              <form onSubmit={handleRate} className="p-6 space-y-5">
                <div className="text-center">
                  <p className="text-slate-600 text-sm mb-1">How was your session with</p>
                  <p className="font-bold text-slate-900 text-lg">{ratingModal.mentor_name}?</p>
                  <p className="text-xs text-slate-400 capitalize mt-0.5">{ratingModal.subject}</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <StarRating value={ratingForm.rating} onChange={v => setRatingForm(p => ({ ...p, rating: v }))} />
                  <span className="text-sm text-slate-500">
                    {ratingForm.rating === 0 ? 'Select a rating' : ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][ratingForm.rating]}
                  </span>
                </div>
                <div>
                  <label className="label">Comment <span className="text-slate-400 font-normal">(optional)</span></label>
                  <textarea
                    value={ratingForm.comment}
                    onChange={e => setRatingForm(p => ({ ...p, comment: e.target.value }))}
                    className="input resize-none"
                    rows={3}
                    placeholder="Share your experience..."
                  />
                </div>
                {ratingError && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-xl p-3">
                    <AlertCircle size={14} /> {ratingError}
                  </div>
                )}
                <div className="flex gap-3">
                  <button type="button" onClick={() => setRatingModal(null)} className="flex-1 btn-secondary">Cancel</button>
                  <button type="submit" disabled={ratingLoading} className="flex-1 btn-primary flex items-center justify-center gap-2">
                    <Save size={14} /> {ratingLoading ? 'Submitting...' : 'Submit Rating'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Teacher / Admin view ──────────────────────────────────
  const pending   = requests.filter(r => r.status === 'pending');
  const active    = requests.filter(r => r.status === 'accepted' && !r.is_completed);
  const completed = requests.filter(r => r.status === 'completed' || r.is_completed);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mentor Requests</h1>
          <p className="text-slate-500 text-sm mt-1">Review and manage student help requests</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending',   value: pending.length,   color: 'text-amber-600' },
          { label: 'Active',    value: active.length,    color: 'text-blue-600' },
          { label: 'Completed', value: completed.length, color: 'text-emerald-600' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Mentor performance (if any ratings) */}
      {stats.length > 0 && (
        <div className="card p-4">
          <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Award size={16} className="text-amber-500" /> Mentor Performance</h3>
          <div className="space-y-2">
            {stats.map((s: any) => (
              <div key={s.mentor_id} className="flex items-center gap-3">
                <div className="w-8 h-8 grad-primary rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {s.mentor_name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-slate-800 text-sm">{s.mentor_name}</span>
                  <div className="text-xs text-slate-400">{s.completed_sessions} sessions completed</div>
                </div>
                <div className="flex items-center gap-1">
                  <Star size={13} className="text-amber-400 fill-amber-400" />
                  <span className="text-sm font-bold text-slate-700">{s.avg_rating ?? '—'}</span>
                  {s.total_ratings > 0 && <span className="text-xs text-slate-400">({s.total_ratings})</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending requests */}
      <section className="space-y-3">
        <h2 className="font-bold text-slate-700 flex items-center gap-2">
          <Clock size={16} className="text-amber-500" />
          Pending Requests
          {pending.length > 0 && (
            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{pending.length}</span>
          )}
        </h2>
        {pending.length === 0 ? (
          <div className="card p-6 text-center text-slate-400 text-sm">No pending requests</div>
        ) : pending.map(r => (
          <div key={r.id} className="card p-4 border border-amber-100 bg-amber-50/30">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 grad-primary rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {r.student_name?.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{r.student_name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium capitalize">{r.subject}</span>
                    <span className="text-xs text-slate-400">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                  </div>
                  {r.message && (
                    <p className="text-sm text-slate-600 mt-1.5 flex items-start gap-1.5">
                      <MessageCircle size={13} className="text-slate-400 mt-0.5 flex-shrink-0" />
                      <span>"{r.message}"</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDecline(r.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold bg-white border border-red-200 text-red-600 hover:bg-red-50 transition-all"
                >
                  <XCircle size={14} /> Decline
                </button>
                <button
                  onClick={() => { setAcceptModal(r); setAcceptForm({ scheduledAt: '', notes: '' }); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold bg-primary-600 text-white hover:bg-primary-700 transition-all"
                >
                  <CheckCircle size={14} /> Accept
                </button>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Active sessions */}
      <section className="space-y-3">
        <h2 className="font-bold text-slate-700 flex items-center gap-2">
          <CalendarClock size={16} className="text-blue-500" />
          Active Sessions
        </h2>
        {active.length === 0 ? (
          <div className="card p-6 text-center text-slate-400 text-sm">No active sessions</div>
        ) : active.map(r => (
          <div key={r.id} className="card p-4 border border-blue-100 bg-blue-50/30">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-900">{r.student_name}</span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium capitalize">{r.subject}</span>
                </div>
                {r.scheduled_at && (
                  <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                    <CalendarClock size={11} /> {format(new Date(r.scheduled_at), 'MMM d, yyyy · h:mm a')}
                  </div>
                )}
                {r.notes && <p className="text-xs text-slate-500 mt-1">Note: {r.notes}</p>}
              </div>
              <button
                onClick={() => handleComplete(r.session_id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all"
              >
                <ClipboardCheck size={14} /> Mark Complete
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* Completed sessions */}
      {completed.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-bold text-slate-700 flex items-center gap-2">
            <CheckCircle size={16} className="text-emerald-500" /> Completed ({completed.length})
          </h2>
          {completed.map(r => (
            <div key={r.id} className="card p-4 opacity-75">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                    <CheckCircle size={15} className="text-emerald-600" />
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">{r.student_name}</span>
                    <span className="text-xs text-slate-400 ml-2 capitalize">{r.subject}</span>
                  </div>
                </div>
                {r.rating && (
                  <div className="flex items-center gap-1">
                    <StarRating value={parseInt(r.rating)} readonly />
                    {r.rating_comment && <span className="text-xs text-slate-400 ml-1">"{r.rating_comment}"</span>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Accept modal */}
      {acceptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setAcceptModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Accept Mentor Request</h3>
              <button onClick={() => setAcceptModal(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={16} /></button>
            </div>
            <form onSubmit={handleAccept} className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-sm text-slate-600">
                  <span className="font-semibold">{acceptModal.student_name}</span> needs help with{' '}
                  <span className="font-semibold capitalize">{acceptModal.subject}</span>.
                </p>
                {acceptModal.message && (
                  <p className="text-xs text-slate-500 mt-1 italic">"{acceptModal.message}"</p>
                )}
              </div>
              <div>
                <label className="label">Schedule Date & Time <span className="text-slate-400 font-normal">(optional)</span></label>
                <input
                  type="datetime-local"
                  value={acceptForm.scheduledAt}
                  onChange={e => setAcceptForm(p => ({ ...p, scheduledAt: e.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Message to Student <span className="text-slate-400 font-normal">(optional)</span></label>
                <textarea
                  value={acceptForm.notes}
                  onChange={e => setAcceptForm(p => ({ ...p, notes: e.target.value }))}
                  className="input resize-none"
                  rows={3}
                  placeholder="e.g. We'll cover quadratic equations step by step..."
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setAcceptModal(null)} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" disabled={acceptLoading} className="flex-1 btn-primary flex items-center justify-center gap-2">
                  <CheckCircle size={14} /> {acceptLoading ? 'Accepting...' : 'Accept Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

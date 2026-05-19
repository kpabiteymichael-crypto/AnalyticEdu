import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { lmsApi, assessmentsApi, mentorsApi } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Calculator, FlaskConical, BookOpen, Landmark, Palette,
  Activity, Monitor, Music, ArrowLeft, CheckCircle, Bookmark,
  BookmarkCheck, ExternalLink, Clock, ChevronDown, ChevronRight,
  ClipboardList, Play, FileText, Link2, Video, Users, Star, X, Save,
  AlertCircle, MessageCircle,
} from 'lucide-react';
import clsx from 'clsx';

const SUBJECT_META: Record<string, { label: string; icon: any; color: string; gradient: string }> = {
  math:    { label: 'Mathematics',  icon: Calculator,   color: 'text-blue-600',    gradient: 'from-blue-500 to-indigo-600' },
  science: { label: 'Science',      icon: FlaskConical, color: 'text-emerald-600', gradient: 'from-emerald-500 to-teal-600' },
  english: { label: 'English',      icon: BookOpen,     color: 'text-violet-600',  gradient: 'from-violet-500 to-purple-600' },
  history: { label: 'History',      icon: Landmark,     color: 'text-amber-600',   gradient: 'from-amber-500 to-orange-600' },
  art:     { label: 'Art',          icon: Palette,      color: 'text-pink-600',    gradient: 'from-pink-500 to-rose-600' },
  pe:      { label: 'Physical Ed',  icon: Activity,     color: 'text-cyan-600',    gradient: 'from-cyan-500 to-sky-600' },
  ict:     { label: 'ICT',          icon: Monitor,      color: 'text-slate-600',   gradient: 'from-slate-500 to-gray-700' },
  music:   { label: 'Music',        icon: Music,        color: 'text-fuchsia-600', gradient: 'from-fuchsia-500 to-pink-600' },
};

const TYPE_META: Record<string, { icon: any; label: string; color: string }> = {
  note:   { icon: FileText,  label: 'Note',   color: 'bg-slate-100 text-slate-600' },
  pdf:    { icon: FileText,  label: 'PDF',    color: 'bg-red-100 text-red-600' },
  video:  { icon: Video,     label: 'Video',  color: 'bg-purple-100 text-purple-600' },
  link:   { icon: Link2,     label: 'Link',   color: 'bg-blue-100 text-blue-600' },
  slides: { icon: Play,      label: 'Slides', color: 'bg-amber-100 text-amber-600' },
};

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
          className="transition-transform hover:scale-110"
        >
          <Star
            size={28}
            className={clsx(
              'transition-colors',
              (hover || value) >= i ? 'text-amber-400 fill-amber-400' : 'text-slate-200'
            )}
          />
        </button>
      ))}
    </div>
  );
}

export default function SubjectDetail() {
  const { subject } = useParams<{ subject: string }>();
  const navigate = useNavigate();
  const meta = SUBJECT_META[subject ?? ''] ?? { label: subject, icon: BookOpen, color: 'text-primary-600', gradient: 'from-primary-500 to-indigo-600' };
  const Icon = meta.icon;

  const [tab, setTab] = useState<'materials' | 'assessments'>('materials');
  const [topics, setTopics] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTopics, setExpandedTopics] = useState<Set<number>>(new Set());
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Mentor request modal
  const [showMentorModal, setShowMentorModal] = useState(false);
  const [mentorMessage, setMentorMessage] = useState('');
  const [mentorLoading, setMentorLoading] = useState(false);
  const [mentorSuccess, setMentorSuccess] = useState(false);
  const [mentorError, setMentorError] = useState('');
  const [myRequests, setMyRequests] = useState<any[]>([]);

  useEffect(() => {
    if (!subject) return;
    async function load() {
      try {
        const [t, m, a, p, reqs] = await Promise.all([
          lmsApi.getTopics(subject),
          lmsApi.getMaterials({ subject }),
          assessmentsApi.list(),
          lmsApi.myProgress(),
          mentorsApi.myRequests(),
        ]);
        setTopics(t);
        setMaterials(m);
        setAssessments((a as any[]).filter((x: any) => x.subject === subject && x.status === 'published'));
        setProgress(p);
        setMyRequests((reqs as any[]).filter((r: any) => r.subject === subject));
        if (t.length > 0) setExpandedTopics(new Set([t[0].id]));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [subject]);

  const progressMap = new Map(progress.map((p: any) => [p.materialId, p]));
  const completed = materials.filter(m => progressMap.get(m.id)?.completedAt).length;
  const pct = materials.length ? Math.round((completed / materials.length) * 100) : 0;

  const hasPendingRequest = myRequests.some(r => r.status === 'pending' || r.status === 'accepted');

  const getMaterialsForTopic = (topicId: number) =>
    materials.filter(m => m.topicId === topicId);

  const toggleTopic = (id: number) => {
    setExpandedTopics(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAction = async (materialId: number, action: 'complete' | 'bookmark' | 'unbookmark') => {
    setActionLoading(materialId);
    try {
      await lmsApi.markProgress(materialId, action);
      const updated = await lmsApi.myProgress();
      setProgress(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMentorRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setMentorLoading(true);
    setMentorError('');
    try {
      await mentorsApi.request({ subject: subject!, message: mentorMessage });
      setMentorSuccess(true);
      const reqs = await mentorsApi.myRequests();
      setMyRequests((reqs as any[]).filter((r: any) => r.subject === subject));
    } catch (err: any) {
      setMentorError(err.response?.data?.error ?? 'Failed to send request');
    } finally {
      setMentorLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text={`Loading ${meta.label}...`} />;

  return (
    <div className="space-y-5">
      {/* Back + Header */}
      <div>
        <button
          onClick={() => navigate('/subjects')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3 transition-colors"
        >
          <ArrowLeft size={15} /> Back to Subjects
        </button>

        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className={clsx('w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-sm', meta.gradient)}>
              <Icon size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{meta.label}</h1>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                <span>{materials.length} material{materials.length !== 1 ? 's' : ''}</span>
                <span>{assessments.length} assessment{assessments.length !== 1 ? 's' : ''}</span>
                {materials.length > 0 && <span className="font-semibold text-primary-600">{pct}% complete</span>}
              </div>
            </div>
          </div>

          <button
            onClick={() => { setShowMentorModal(true); setMentorSuccess(false); setMentorError(''); setMentorMessage(''); }}
            disabled={hasPendingRequest}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all',
              hasPendingRequest
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-primary-600 to-indigo-600 text-white hover:shadow-md hover:-translate-y-0.5 shadow-primary-200 shadow-sm'
            )}
          >
            <Users size={15} />
            {hasPendingRequest ? 'Request Pending' : 'Request Mentor'}
          </button>
        </div>

        {/* Progress bar */}
        {materials.length > 0 && (
          <div className="mt-4 card p-3 flex items-center gap-3">
            <div className="flex-1 bg-slate-100 rounded-full h-2">
              <div
                className={clsx('h-2 rounded-full bg-gradient-to-r transition-all', meta.gradient)}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-bold text-slate-600 w-20 text-right">{completed}/{materials.length} lessons</span>
          </div>
        )}
      </div>

      {/* Active mentor request banner */}
      {hasPendingRequest && (
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-3 flex items-center gap-3">
          <MessageCircle size={16} className="text-primary-600 flex-shrink-0" />
          <p className="text-sm text-primary-700">
            You have an active mentor request for {meta.label}.
            <Link to="/mentor-requests" className="ml-1 font-semibold underline">View status →</Link>
          </p>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-100 pb-0">
        {(['materials', 'assessments'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'px-4 py-2 text-sm font-semibold capitalize rounded-t-lg border-b-2 transition-all',
              tab === t
                ? 'border-primary-500 text-primary-600 bg-primary-50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            )}
          >
            {t === 'materials' ? `Materials (${materials.length})` : `Assessments (${assessments.length})`}
          </button>
        ))}
      </div>

      {/* Materials tab */}
      {tab === 'materials' && (
        <div className="space-y-3">
          {topics.length === 0 ? (
            <div className="empty-state">
              <BookOpen size={36} className="mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500">No materials published for {meta.label} yet.</p>
            </div>
          ) : topics.map(topic => {
            const topicMaterials = getMaterialsForTopic(topic.id);
            if (topicMaterials.length === 0) return null;
            const isExpanded = expandedTopics.has(topic.id);
            const topicCompleted = topicMaterials.filter(m => progressMap.get(m.id)?.completedAt).length;
            const topicPct = Math.round((topicCompleted / topicMaterials.length) * 100);

            return (
              <div key={topic.id} className="card overflow-hidden">
                <button
                  onClick={() => toggleTopic(topic.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 text-left transition-colors"
                >
                  <div className={clsx('w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0', meta.gradient)}>
                    <BookOpen size={13} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 text-sm">{topic.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{topicCompleted}/{topicMaterials.length} completed</div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 mr-2">
                    <div className="w-20 bg-slate-100 rounded-full h-1.5">
                      <div className={clsx('h-1.5 rounded-full bg-gradient-to-r', meta.gradient)} style={{ width: `${topicPct}%` }} />
                    </div>
                    <span className="text-xs font-bold text-slate-500">{topicPct}%</span>
                  </div>
                  {isExpanded ? <ChevronDown size={15} className="text-slate-400" /> : <ChevronRight size={15} className="text-slate-400" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 divide-y divide-slate-50">
                    {topicMaterials.map(m => {
                      const prog = progressMap.get(m.id);
                      const isDone = !!prog?.completedAt;
                      const isBookmarked = !!prog?.isBookmarked;
                      const typeMeta = TYPE_META[m.type] ?? TYPE_META.note;
                      const TypeIcon = typeMeta.icon;
                      const isLoading = actionLoading === m.id;

                      return (
                        <div key={m.id} className={clsx('px-4 py-3 flex items-start gap-3 group transition-colors', isDone ? 'bg-emerald-50/30' : 'hover:bg-slate-50')}>
                          <div className="mt-0.5 flex-shrink-0">
                            {isDone
                              ? <CheckCircle size={17} className="text-emerald-500" />
                              : <div className="w-[17px] h-[17px] rounded-full border-2 border-slate-200" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={clsx('flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', typeMeta.color)}>
                                <TypeIcon size={11} /> {typeMeta.label}
                              </span>
                              <span className="text-sm font-semibold text-slate-800">{m.title}</span>
                            </div>
                            {m.description && <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>}
                            {m.content && m.type === 'note' && (
                              <p className="text-xs text-slate-600 mt-1.5 bg-slate-50 rounded-lg p-2 line-clamp-3 font-mono">{m.content}</p>
                            )}
                            {m.estimatedMins && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                                <Clock size={11} /> {m.estimatedMins} min
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            {m.url && (
                              <button onClick={() => window.open(m.url, '_blank')} className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-all">
                                <ExternalLink size={13} />
                              </button>
                            )}
                            <button
                              onClick={() => handleAction(m.id, isBookmarked ? 'unbookmark' : 'bookmark')}
                              disabled={isLoading}
                              className={clsx('p-1.5 rounded-lg transition-all', isBookmarked ? 'text-amber-500 bg-amber-50' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50')}
                            >
                              {isBookmarked ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
                            </button>
                            {!isDone && (
                              <button
                                onClick={() => handleAction(m.id, 'complete')}
                                disabled={isLoading}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all disabled:opacity-50"
                              >
                                {isLoading ? '...' : 'Done'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Assessments tab */}
      {tab === 'assessments' && (
        <div className="space-y-3">
          {assessments.length === 0 ? (
            <div className="empty-state">
              <ClipboardList size={36} className="mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500">No assessments published for {meta.label} yet.</p>
            </div>
          ) : assessments.map((a: any) => (
            <div key={a.id} className="card p-4 flex items-center gap-4">
              <div className={clsx('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0', meta.gradient)}>
                <ClipboardList size={17} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 text-sm">{a.title}</div>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                  {a.durationMins && <span className="flex items-center gap-1"><Clock size={11} /> {a.durationMins} min</span>}
                  {a.totalPoints && <span>{a.totalPoints} pts</span>}
                  {a.questionCount != null && <span>{a.questionCount} questions</span>}
                </div>
              </div>
              <Link
                to={`/assessments/${a.id}/take`}
                className={clsx('px-3 py-1.5 rounded-xl text-sm font-semibold transition-all', 'bg-gradient-to-r from-primary-600 to-indigo-600 text-white hover:shadow-md')}
              >
                Start
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Mentor Request Modal */}
      {showMentorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowMentorModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className={clsx('w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center', meta.gradient)}>
                  <Users size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Request a Mentor</h3>
                  <p className="text-xs text-slate-400">{meta.label}</p>
                </div>
              </div>
              <button onClick={() => setShowMentorModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>

            {mentorSuccess ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={28} className="text-emerald-600" />
                </div>
                <h4 className="font-bold text-slate-900 text-lg">Request Sent!</h4>
                <p className="text-slate-500 text-sm mt-2">A teacher will review your request and get back to you shortly.</p>
                <button onClick={() => setShowMentorModal(false)} className="mt-6 btn-primary w-full">Got it</button>
              </div>
            ) : (
              <form onSubmit={handleMentorRequest} className="p-6 space-y-4">
                <div>
                  <label className="label">Subject</label>
                  <input value={meta.label} readOnly className="input bg-slate-50 text-slate-500" />
                </div>
                <div>
                  <label className="label">What do you need help with? <span className="text-slate-400 font-normal">(optional)</span></label>
                  <textarea
                    value={mentorMessage}
                    onChange={e => setMentorMessage(e.target.value)}
                    className="input resize-none"
                    rows={4}
                    placeholder={`e.g. "I'm struggling with quadratic equations and need extra practice..."`}
                  />
                </div>
                {mentorError && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-xl p-3">
                    <AlertCircle size={14} /> {mentorError}
                  </div>
                )}
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowMentorModal(false)} className="flex-1 btn-secondary">Cancel</button>
                  <button type="submit" disabled={mentorLoading} className="flex-1 btn-primary flex items-center justify-center gap-2">
                    <Save size={14} /> {mentorLoading ? 'Sending...' : 'Send Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

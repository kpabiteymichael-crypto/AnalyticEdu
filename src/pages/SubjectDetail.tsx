import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { lmsApi, assessmentsApi, mentorsApi } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Calculator, FlaskConical, BookOpen, Landmark, Palette,
  Activity, Monitor, Music, ArrowLeft, CheckCircle, Bookmark,
  BookmarkCheck, ExternalLink, Clock, ChevronDown, ChevronRight,
  ClipboardList, Play, FileText, Link2, Video, Users, Star, X, Save,
  AlertCircle, MessageCircle, GraduationCap,
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
        <button key={i} type="button" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)} onClick={() => onChange(i)} className="transition-transform hover:scale-110">
          <Star size={28} className={clsx('transition-colors', (hover || value) >= i ? 'text-amber-400 fill-amber-400' : 'text-slate-200')} />
        </button>
      ))}
    </div>
  );
}

function getEmbedUrl(material: any): string {
  const url = material.url ?? '';
  if (!url) return '';
  if (material.type === 'slides') {
    if (url.includes('docs.google.com/presentation')) {
      return url.replace(/\/(edit|view|present)(\?.*)?$/, '') + '/embed?start=false&loop=false&delayms=3000';
    }
    if (url.match(/\.(pptx|ppt|key|odp)$/i) || url.startsWith('/uploads/')) {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(window.location.origin + url)}&embedded=true`;
    }
  }
  if (material.type === 'video') {
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0`;
  }
  return url;
}

function MaterialViewer({ material, isDone, onClose, onComplete, completing }: {
  material: any;
  isDone: boolean;
  onClose: () => void;
  onComplete: () => void;
  completing: boolean;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [sentinelVisible, setSentinelVisible] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  const isNote = material.type === 'note';

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) setSentinelVisible(true); },
      { threshold: 0.5 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (sentinelVisible && isNote && !isDone && !justCompleted) {
      setJustCompleted(true);
      onComplete();
    }
  }, [sentinelVisible, isNote, isDone, justCompleted, onComplete]);

  const embedUrl = getEmbedUrl(material);
  const canComplete = !isDone && !justCompleted;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col animate-fade-in" style={{ maxHeight: '92vh' }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <span className={clsx('px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0', TYPE_META[material.type]?.color ?? 'bg-slate-100 text-slate-600')}>
            {TYPE_META[material.type]?.label ?? material.type}
          </span>
          <h2 className="font-bold text-slate-900 flex-1 min-w-0 truncate">{material.title}</h2>
          {(isDone || justCompleted) && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold flex-shrink-0">
              <CheckCircle size={14} /> Completed
            </span>
          )}
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-4">
            {material.description && (
              <p className="text-sm text-slate-500 pb-4 border-b border-slate-100">{material.description}</p>
            )}

            {/* Note */}
            {material.type === 'note' && (
              <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-4">
                {material.content || <span className="text-slate-400 italic">No content</span>}
              </pre>
            )}

            {/* PDF */}
            {material.type === 'pdf' && material.url && (
              <iframe
                src={material.url}
                title={material.title}
                className="w-full rounded-xl border border-slate-200 bg-slate-50"
                style={{ height: '65vh' }}
              />
            )}

            {/* Slides */}
            {material.type === 'slides' && material.url && (
              <iframe
                src={embedUrl}
                title={material.title}
                className="w-full rounded-xl border border-slate-200"
                style={{ height: '55vh' }}
                allowFullScreen
              />
            )}

            {/* Video */}
            {material.type === 'video' && material.url && (
              embedUrl.includes('youtube.com/embed') ? (
                <div className="relative w-full rounded-xl overflow-hidden" style={{ paddingBottom: '56.25%' }}>
                  <iframe
                    src={embedUrl}
                    title={material.title}
                    className="absolute inset-0 w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              ) : (
                <video controls className="w-full rounded-xl bg-black" src={material.url}>
                  Your browser does not support this video.
                </video>
              )
            )}

            {/* Link */}
            {material.type === 'link' && material.url && (
              <div className="text-center py-8">
                <Link2 size={36} className="mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500 text-sm mb-4">This material is an external link.</p>
                <a href={material.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 btn-primary"
                  onClick={() => { if (canComplete) { setJustCompleted(true); onComplete(); } }}
                >
                  <ExternalLink size={14} /> Open Link
                </a>
              </div>
            )}

            {/* PDF with no URL */}
            {material.type === 'pdf' && !material.url && (
              <div className="text-center py-10 text-slate-400">
                <FileText size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No file attached to this material.</p>
              </div>
            )}

            {/* Completion sentinel */}
            <div ref={sentinelRef} className="pt-6 border-t border-slate-100 text-center space-y-3">
              {isDone || justCompleted ? (
                <div className="flex items-center justify-center gap-2 text-emerald-600 font-semibold py-2">
                  <CheckCircle size={20} />
                  <span>You've completed this material!</span>
                </div>
              ) : isNote ? (
                <p className="text-xs text-slate-400 italic py-2">
                  {sentinelVisible ? '✓ Marking as completed…' : 'Scroll to the bottom to mark as completed'}
                </p>
              ) : (
                <>
                  <p className="text-xs text-slate-400">
                    {sentinelVisible ? 'Ready to mark as completed!' : 'Scroll down after reviewing to mark as completed'}
                  </p>
                  <button
                    onClick={() => { setJustCompleted(true); onComplete(); }}
                    disabled={completing || !sentinelVisible}
                    className={clsx(
                      'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all',
                      sentinelVisible
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm hover:shadow-md'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    )}
                  >
                    <CheckCircle size={16} />
                    {completing ? 'Saving…' : 'Mark as Completed'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function SubjectDetail() {
  const { subject } = useParams<{ subject: string }>();
  const navigate = useNavigate();
  const meta = SUBJECT_META[subject ?? ''] ?? { label: subject ?? '', icon: GraduationCap, color: 'text-primary-600', gradient: 'from-primary-500 to-indigo-600' };
  const Icon = meta.icon;

  const [tab, setTab] = useState<'materials' | 'assessments'>('materials');
  const [topics, setTopics] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTopics, setExpandedTopics] = useState<Set<number>>(new Set());
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const [viewingMaterial, setViewingMaterial] = useState<any>(null);

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
  const getMaterialsForTopic = (topicId: number) => materials.filter(m => m.topicId === topicId);

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

  const openMaterial = (m: any) => {
    if (m.type === 'link' && m.url) {
      window.open(m.url, '_blank', 'noopener,noreferrer');
      if (!progressMap.get(m.id)?.completedAt) handleAction(m.id, 'complete');
      return;
    }
    setViewingMaterial(m);
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
        <button onClick={() => navigate('/subjects')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3 transition-colors">
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

        {materials.length > 0 && (
          <div className="mt-4 card p-3 flex items-center gap-3">
            <div className="flex-1 bg-slate-100 rounded-full h-2">
              <div className={clsx('h-2 rounded-full bg-gradient-to-r transition-all', meta.gradient)} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-bold text-slate-600 w-20 text-right">{completed}/{materials.length} lessons</span>
          </div>
        )}
      </div>

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
      <div className="flex gap-1 border-b border-slate-100">
        {(['materials', 'assessments'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'px-4 py-2 text-sm font-semibold capitalize rounded-t-lg border-b-2 transition-all',
              tab === t ? 'border-primary-500 text-primary-600 bg-primary-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
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
                      const isLoadingAction = actionLoading === m.id;
                      const hasContent = m.url || m.content;

                      return (
                        <div
                          key={m.id}
                          className={clsx(
                            'px-4 py-3 flex items-start gap-3 transition-colors',
                            isDone ? 'bg-emerald-50/30' : 'hover:bg-slate-50',
                            hasContent && 'cursor-pointer'
                          )}
                          onClick={(e) => { e.stopPropagation(); if (hasContent) openMaterial(m); }}
                        >
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
                              {hasContent && (
                                <span className="text-xs text-primary-500 font-medium">Tap to open →</span>
                              )}
                            </div>
                            {m.description && <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>}
                            {m.estimatedMins && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                                <Clock size={11} /> {m.estimatedMins} min
                              </div>
                            )}
                          </div>

                          <div
                            className="flex items-center gap-1 flex-shrink-0"
                            onClick={e => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleAction(m.id, isBookmarked ? 'unbookmark' : 'bookmark')}
                              disabled={isLoadingAction}
                              className={clsx('p-1.5 rounded-lg transition-all', isBookmarked ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:text-amber-500 hover:bg-amber-50')}
                              title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                            >
                              {isBookmarked ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
                            </button>
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
                className="px-3 py-1.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-primary-600 to-indigo-600 text-white hover:shadow-md transition-all"
              >
                Start
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Material Viewer */}
      {viewingMaterial && (
        <MaterialViewer
          material={viewingMaterial}
          isDone={!!progressMap.get(viewingMaterial.id)?.completedAt}
          completing={actionLoading === viewingMaterial.id}
          onClose={() => setViewingMaterial(null)}
          onComplete={() => handleAction(viewingMaterial.id, 'complete')}
        />
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
              <button onClick={() => setShowMentorModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={16} /></button>
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
                  <textarea value={mentorMessage} onChange={e => setMentorMessage(e.target.value)} className="input resize-none" rows={4} placeholder={`e.g. "I'm struggling with quadratic equations..."`} />
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

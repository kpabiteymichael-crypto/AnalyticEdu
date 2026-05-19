import { useEffect, useState } from 'react';
import { lmsApi } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  BookOpen, CheckCircle, Bookmark, BookmarkCheck, ExternalLink,
  Video, FileText, Link2, Play, Clock, ChevronDown, ChevronRight, Filter,
} from 'lucide-react';
import clsx from 'clsx';

const SUBJECTS = ['math', 'science', 'english', 'history', 'art', 'pe', 'ict', 'music'];

const TYPE_META: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  note:   { icon: <FileText size={14} />,   label: 'Note',   color: 'bg-slate-100 text-slate-600' },
  pdf:    { icon: <FileText size={14} />,   label: 'PDF',    color: 'bg-red-100 text-red-600' },
  video:  { icon: <Video size={14} />,      label: 'Video',  color: 'bg-purple-100 text-purple-600' },
  link:   { icon: <Link2 size={14} />,      label: 'Link',   color: 'bg-blue-100 text-blue-600' },
  slides: { icon: <Play size={14} />,       label: 'Slides', color: 'bg-amber-100 text-amber-600' },
};

const RISK_COLORS: Record<string, string> = {
  critical: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-yellow-500', low: 'bg-emerald-500',
};

export default function LearningHub() {
  const [topics, setTopics] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [expandedTopics, setExpandedTopics] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [t, m, p] = await Promise.all([
          lmsApi.getTopics(),
          lmsApi.getMaterials(),
          lmsApi.myProgress(),
        ]);
        setTopics(t);
        setMaterials(m);
        setProgress(p);
        if (t.length > 0) {
          setExpandedTopics(new Set([t[0].id]));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const progressMap = new Map(progress.map((p: any) => [p.materialId, p]));

  const filteredTopics = selectedSubject
    ? topics.filter(t => t.subject === selectedSubject)
    : topics;

  const getMaterialsForTopic = (topicId: number) =>
    materials.filter(m => m.topicId === topicId && (!selectedSubject || m.topicSubject === selectedSubject));

  const completedCount = progress.filter((p: any) => p.completedAt).length;
  const bookmarkedCount = progress.filter((p: any) => p.isBookmarked).length;
  const totalPublished = materials.length;

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
    if (m.url) window.open(m.url, '_blank');
  };

  if (loading) return <LoadingSpinner text="Loading your learning hub..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Learning Hub</h1>
          <p className="text-slate-500 text-sm mt-1">Browse your study materials and track your progress</p>
        </div>
        <div className="flex gap-3">
          <div className="card px-4 py-2 text-center">
            <div className="text-xl font-bold text-primary-600">{completedCount}</div>
            <div className="text-xs text-slate-500">Completed</div>
          </div>
          <div className="card px-4 py-2 text-center">
            <div className="text-xl font-bold text-amber-600">{bookmarkedCount}</div>
            <div className="text-xs text-slate-500">Bookmarked</div>
          </div>
          <div className="card px-4 py-2 text-center">
            <div className="text-xl font-bold text-slate-700">{totalPublished}</div>
            <div className="text-xs text-slate-500">Materials</div>
          </div>
        </div>
      </div>

      {/* Subject filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter size={15} className="text-slate-400 flex-shrink-0" />
        <button
          onClick={() => setSelectedSubject('')}
          className={clsx(
            'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
            !selectedSubject ? 'bg-primary-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          )}
        >
          All Subjects
        </button>
        {SUBJECTS.map(s => (
          <button
            key={s}
            onClick={() => setSelectedSubject(s === selectedSubject ? '' : s)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap capitalize transition-all',
              selectedSubject === s ? 'bg-primary-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Topics + Materials */}
      {filteredTopics.length === 0 ? (
        <div className="empty-state">
          <BookOpen size={40} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-bold text-slate-700">No materials yet</h3>
          <p className="text-slate-400 mt-2 text-sm">Your teacher hasn't published any materials for this subject yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTopics.map(topic => {
            const topicMaterials = getMaterialsForTopic(topic.id);
            const completed = topicMaterials.filter(m => progressMap.get(m.id)?.completedAt).length;
            const isExpanded = expandedTopics.has(topic.id);
            const pct = topicMaterials.length ? Math.round((completed / topicMaterials.length) * 100) : 0;

            return (
              <div key={topic.id} className="card overflow-hidden">
                {/* Topic header */}
                <button
                  onClick={() => toggleTopic(topic.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="w-8 h-8 grad-primary rounded-lg flex items-center justify-center flex-shrink-0">
                    <BookOpen size={15} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 text-sm">{topic.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs capitalize text-primary-600 font-medium bg-primary-50 px-2 py-0.5 rounded-full">
                        {topic.subject}
                      </span>
                      <span className="text-xs text-slate-400">{topicMaterials.length} material{topicMaterials.length !== 1 ? 's' : ''}</span>
                      {topicMaterials.length > 0 && (
                        <span className="text-xs text-slate-400">{completed}/{topicMaterials.length} done</span>
                      )}
                    </div>
                  </div>
                  {topicMaterials.length > 0 && (
                    <div className="flex items-center gap-3 mr-2">
                      <div className="hidden sm:block w-24 bg-slate-100 rounded-full h-1.5">
                        <div
                          className="bg-primary-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-500 w-8 text-right">{pct}%</span>
                    </div>
                  )}
                  {isExpanded ? <ChevronDown size={16} className="text-slate-400 flex-shrink-0" /> : <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />}
                </button>

                {/* Materials list */}
                {isExpanded && (
                  <div className="border-t border-slate-100 divide-y divide-slate-50">
                    {topicMaterials.length === 0 ? (
                      <div className="px-4 py-6 text-center text-slate-400 text-sm">
                        No published materials in this topic yet.
                      </div>
                    ) : topicMaterials.map(m => {
                      const prog = progressMap.get(m.id);
                      const isDone = !!prog?.completedAt;
                      const isBookmarked = !!prog?.isBookmarked;
                      const meta = TYPE_META[m.type] ?? TYPE_META.note;
                      const isLoading = actionLoading === m.id;

                      return (
                        <div key={m.id} className={clsx('px-4 py-3 flex items-start gap-3 group transition-colors', isDone ? 'bg-emerald-50/30' : 'hover:bg-slate-50')}>
                          <div className="mt-0.5 flex-shrink-0">
                            {isDone
                              ? <CheckCircle size={18} className="text-emerald-500" />
                              : <div className="w-[18px] h-[18px] rounded-full border-2 border-slate-200" />
                            }
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2 flex-wrap">
                              <span className={clsx('flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0', meta.color)}>
                                {meta.icon} {meta.label}
                              </span>
                              <span className="text-sm font-semibold text-slate-800">{m.title}</span>
                            </div>
                            {m.description && (
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{m.description}</p>
                            )}
                            {m.content && m.type === 'note' && (
                              <p className="text-xs text-slate-600 mt-1.5 bg-slate-50 rounded-lg p-2 line-clamp-3 font-mono">{m.content}</p>
                            )}
                            <div className="flex items-center gap-3 mt-1.5">
                              {m.estimatedMins && (
                                <span className="flex items-center gap-1 text-xs text-slate-400">
                                  <Clock size={11} /> {m.estimatedMins} min
                                </span>
                              )}
                              {isDone && (
                                <span className="text-xs text-emerald-600 font-medium">Completed</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            {m.url && (
                              <button
                                onClick={() => openMaterial(m)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-all"
                                title="Open material"
                              >
                                <ExternalLink size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => handleAction(m.id, isBookmarked ? 'unbookmark' : 'bookmark')}
                              disabled={isLoading}
                              className={clsx(
                                'p-1.5 rounded-lg transition-all',
                                isBookmarked ? 'text-amber-500 hover:text-amber-600 bg-amber-50' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'
                              )}
                              title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                            >
                              {isBookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                            </button>
                            {!isDone && (
                              <button
                                onClick={() => handleAction(m.id, 'complete')}
                                disabled={isLoading}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all disabled:opacity-50"
                              >
                                {isLoading ? '...' : 'Mark done'}
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
    </div>
  );
}

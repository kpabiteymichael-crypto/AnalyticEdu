import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { assessmentsApi } from '../lib/api';
import {
  ClipboardList, Plus, Clock, Users, BookOpen, ChevronRight,
  CheckCircle2, AlertCircle, Lock, Play, Eye, Trash2, Edit3,
  BarChart2, Send
} from 'lucide-react';
import clsx from 'clsx';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  published: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-red-100 text-red-600',
};

const TYPE_LABELS: Record<string, string> = {
  quiz: 'Quiz', exam: 'Exam', homework: 'Homework', practice: 'Practice', wassce: 'WASSCE',
};

export default function Assessments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [deleting, setDeleting] = useState<number | null>(null);
  const [publishing, setPublishing] = useState<number | null>(null);

  const isTeacher = user?.role === 'admin' || user?.role === 'teacher';

  useEffect(() => {
    assessmentsApi.list().then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handlePublish = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'published' ? 'closed' : 'published';
    setPublishing(id);
    try {
      const updated = await assessmentsApi.setStatus(id, newStatus);
      setItems(prev => prev.map(a => a.id === id ? { ...a, status: updated.status } : a));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPublishing(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this assessment and all its questions? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await assessmentsApi.delete(id);
      setItems(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const filtered = filterStatus === 'all' ? items : items.filter(a => a.status === filterStatus);

  if (loading) return (
    <div className="flex items-center justify-center min-h-96">
      <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Assessments</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isTeacher ? 'Create and manage quizzes, exams, and practice tests' : 'View and take your assigned assessments'}
          </p>
        </div>
        {isTeacher && (
          <button onClick={() => navigate('/assessments/new')} className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            New Assessment
          </button>
        )}
      </div>

      {/* Stats row — teacher only */}
      {isTeacher && items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: items.length, color: 'text-slate-700' },
            { label: 'Published', value: items.filter(a => a.status === 'published').length, color: 'text-emerald-600' },
            { label: 'Drafts', value: items.filter(a => a.status === 'draft').length, color: 'text-slate-500' },
            { label: 'Submissions', value: items.reduce((s, a) => s + (a.submission_count ?? 0), 0), color: 'text-primary-600' },
          ].map(stat => (
            <div key={stat.label} className="card p-4">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs — teacher only */}
      {isTeacher && (
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          {['all', 'published', 'draft', 'closed'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all',
                filterStatus === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="card p-12 text-center">
          <ClipboardList size={40} className="mx-auto text-slate-300 mb-4" />
          <h3 className="font-semibold text-slate-700 mb-1">
            {isTeacher ? 'No assessments yet' : 'No assessments available'}
          </h3>
          <p className="text-sm text-slate-400 mb-4">
            {isTeacher ? 'Create your first assessment to get started.' : 'Your teacher hasn\'t published any assessments yet.'}
          </p>
          {isTeacher && (
            <button onClick={() => navigate('/assessments/new')} className="btn-primary inline-flex items-center gap-2">
              <Plus size={15} /> Create Assessment
            </button>
          )}
        </div>
      )}

      {/* Teacher view: table */}
      {isTeacher && filtered.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Assessment</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden sm:table-cell">Subject</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Questions</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Submissions</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{a.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{TYPE_LABELS[a.type] ?? a.type} · {a.time_limit_mins ? `${a.time_limit_mins} min` : 'No limit'}</div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="capitalize text-slate-600">{a.subject}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-slate-600">
                      {a.question_count ?? 0} Q
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-slate-600">
                      {a.submission_count ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('px-2 py-0.5 rounded-full text-xs font-semibold capitalize', STATUS_COLORS[a.status])}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/assessments/${a.id}/edit`)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          title="Edit"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => navigate(`/assessments/${a.id}/results`)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="View Results"
                          disabled={!a.submission_count}
                        >
                          <BarChart2 size={15} />
                        </button>
                        <button
                          onClick={() => handlePublish(a.id, a.status)}
                          disabled={publishing === a.id}
                          className={clsx(
                            'p-1.5 rounded-lg transition-colors',
                            a.status === 'published'
                              ? 'text-orange-400 hover:text-orange-600 hover:bg-orange-50'
                              : 'text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50'
                          )}
                          title={a.status === 'published' ? 'Close' : 'Publish'}
                        >
                          {a.status === 'published' ? <Lock size={15} /> : <Send size={15} />}
                        </button>
                        <button
                          onClick={() => handleDelete(a.id)}
                          disabled={deleting === a.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Student view: cards */}
      {!isTeacher && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(a => {
            const status = a.my_status as string | null;
            const pct = a.my_score != null && a.my_max_score ? Math.round(a.my_score / a.my_max_score * 100) : null;
            const canTake = !status || status === 'in_progress';

            return (
              <div key={a.id} className="card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-900 leading-tight">{a.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 capitalize">{a.subject} · {TYPE_LABELS[a.type] ?? a.type}</p>
                  </div>
                  {status === 'submitted' || status === 'graded' ? (
                    <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" />
                  ) : status === 'in_progress' ? (
                    <AlertCircle size={20} className="text-amber-500 flex-shrink-0" />
                  ) : (
                    <Play size={20} className="text-primary-500 flex-shrink-0" />
                  )}
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><BookOpen size={12} />{a.question_count ?? 0} questions</span>
                  {a.time_limit_mins && <span className="flex items-center gap-1"><Clock size={12} />{a.time_limit_mins} min</span>}
                  {a.passing_score && <span className="flex items-center gap-1"><CheckCircle2 size={12} />Pass: {a.passing_score}%</span>}
                </div>

                {pct !== null && (
                  <div className="mt-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">Your score</span>
                      <span className={clsx('font-bold', pct >= (a.passing_score ?? 50) ? 'text-emerald-600' : 'text-red-500')}>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={clsx('h-full rounded-full', pct >= (a.passing_score ?? 50) ? 'bg-emerald-500' : 'bg-red-400')} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}

                <div className="mt-auto pt-2 flex gap-2">
                  {canTake ? (
                    <button
                      onClick={() => navigate(`/assessments/${a.id}/take`)}
                      className="flex-1 btn-primary text-sm py-2 flex items-center justify-center gap-1.5"
                    >
                      {status === 'in_progress' ? <><AlertCircle size={14} /> Continue</> : <><Play size={14} /> Start</>}
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate(`/assessments/${a.id}/results`)}
                      className="flex-1 btn-secondary text-sm py-2 flex items-center justify-center gap-1.5"
                    >
                      <Eye size={14} /> View Result
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
}

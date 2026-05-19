import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { lmsApi, assessmentsApi } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Calculator, FlaskConical, BookOpen, Landmark, Palette,
  Activity, Monitor, Music, ChevronRight, BookMarked,
  ClipboardList, CheckCircle, GraduationCap,
} from 'lucide-react';
import clsx from 'clsx';

const SUBJECTS = [
  { key: 'math',    label: 'Mathematics', icon: Calculator,   color: 'from-blue-500 to-indigo-600',   light: 'bg-blue-50 text-blue-700 border-blue-100' },
  { key: 'science', label: 'Science',     icon: FlaskConical, color: 'from-emerald-500 to-teal-600',  light: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  { key: 'english', label: 'English',     icon: BookOpen,     color: 'from-violet-500 to-purple-600', light: 'bg-violet-50 text-violet-700 border-violet-100' },
  { key: 'history', label: 'History',     icon: Landmark,     color: 'from-amber-500 to-orange-600',  light: 'bg-amber-50 text-amber-700 border-amber-100' },
  { key: 'art',     label: 'Art',         icon: Palette,      color: 'from-pink-500 to-rose-600',     light: 'bg-pink-50 text-pink-700 border-pink-100' },
  { key: 'pe',      label: 'Physical Ed', icon: Activity,     color: 'from-cyan-500 to-sky-600',      light: 'bg-cyan-50 text-cyan-700 border-cyan-100' },
  { key: 'ict',     label: 'ICT',         icon: Monitor,      color: 'from-slate-500 to-gray-700',    light: 'bg-slate-50 text-slate-700 border-slate-100' },
  { key: 'music',   label: 'Music',       icon: Music,        color: 'from-fuchsia-500 to-pink-600',  light: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100' },
];

export default function SubjectHub() {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [m, a, p] = await Promise.all([
          lmsApi.getMaterials(),
          assessmentsApi.list(),
          lmsApi.myProgress(),
        ]);
        setMaterials(m);
        setAssessments(a);
        setProgress(p);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const progressMap = new Map(progress.map((p: any) => [p.materialId, p]));

  const getSubjectStats = (key: string) => {
    const subjectMaterials = materials.filter(m => m.topicSubject === key);
    const completed = subjectMaterials.filter(m => progressMap.get(m.id)?.completedAt).length;
    const subjectAssessments = assessments.filter((a: any) =>
      a.subject === key && a.status === 'published'
    );
    const pct = subjectMaterials.length
      ? Math.round((completed / subjectMaterials.length) * 100)
      : 0;
    return { materials: subjectMaterials.length, assessments: subjectAssessments.length, completed, pct };
  };

  const totalMaterials = materials.length;
  const totalCompleted = progress.filter((p: any) => p.completedAt).length;
  const overallPct = totalMaterials ? Math.round((totalCompleted / totalMaterials) * 100) : 0;

  if (loading) return <LoadingSpinner text="Loading your subjects..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Subjects</h1>
          <p className="text-slate-500 text-sm mt-1">Select a subject to access materials and assessments</p>
        </div>
        <div className="flex gap-3">
          <div className="card px-4 py-2 text-center">
            <div className="text-xl font-bold text-primary-600">{overallPct}%</div>
            <div className="text-xs text-slate-400">Overall Progress</div>
          </div>
          <div className="card px-4 py-2 text-center">
            <div className="text-xl font-bold text-emerald-600">{totalCompleted}</div>
            <div className="text-xs text-slate-400">Lessons Done</div>
          </div>
          <div className="card px-4 py-2 text-center">
            <div className="text-xl font-bold text-slate-700">{totalMaterials}</div>
            <div className="text-xs text-slate-400">Total Materials</div>
          </div>
        </div>
      </div>

      {/* Overall progress bar */}
      {totalMaterials > 0 && (
        <div className="card p-4 flex items-center gap-4">
          <GraduationCap size={20} className="text-primary-500 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold text-slate-700">Overall Learning Progress</span>
              <span className="text-sm font-bold text-primary-600">{totalCompleted} / {totalMaterials} lessons</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5">
              <div
                className="grad-primary h-2.5 rounded-full transition-all"
                style={{ width: `${overallPct}%` }}
              />
            </div>
          </div>
          <span className="text-lg font-bold text-slate-700 w-12 text-right">{overallPct}%</span>
        </div>
      )}

      {/* Subject grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {SUBJECTS.map(subject => {
          const stats = getSubjectStats(subject.key);
          const Icon = subject.icon;
          const hasContent = stats.materials > 0 || stats.assessments > 0;

          return (
            <button
              key={subject.key}
              onClick={() => navigate(`/subjects/${subject.key}`)}
              className={clsx(
                'card p-5 text-left flex flex-col gap-3 transition-all duration-200 group',
                'hover:shadow-lg hover:-translate-y-0.5',
                !hasContent && 'opacity-60'
              )}
            >
              {/* Icon + subject name */}
              <div className="flex items-start justify-between">
                <div className={clsx('w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-sm', subject.color)}>
                  <Icon size={22} className="text-white" />
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-primary-500 transition-colors mt-1" />
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base">{subject.label}</h3>
                {!hasContent && (
                  <p className="text-xs text-slate-400 mt-0.5">No content yet</p>
                )}
              </div>

              {/* Stats */}
              <div className="flex gap-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <BookMarked size={12} className="text-slate-400" />
                  <span>{stats.materials} material{stats.materials !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <ClipboardList size={12} className="text-slate-400" />
                  <span>{stats.assessments} quiz{stats.assessments !== 1 ? 'zes' : ''}</span>
                </div>
              </div>

              {/* Progress bar */}
              {stats.materials > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <CheckCircle size={11} />
                      <span>{stats.completed}/{stats.materials} done</span>
                    </div>
                    <span className="text-xs font-bold text-slate-600">{stats.pct}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div
                      className={clsx('h-1.5 rounded-full bg-gradient-to-r transition-all', subject.color)}
                      style={{ width: `${stats.pct}%` }}
                    />
                  </div>
                </div>
              )}

              {stats.materials === 0 && (
                <div className="text-xs text-slate-400 italic">Check back later for content</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

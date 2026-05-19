import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { lmsApi, assessmentsApi, subjectAssignmentsApi, settingsApi } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Calculator, FlaskConical, BookOpen, Landmark, Palette,
  Activity, Monitor, Music, ChevronRight, BookMarked,
  ClipboardList, CheckCircle, GraduationCap,
} from 'lucide-react';
import clsx from 'clsx';

type SubjectEntry = { key: string; label: string };

const BUILTIN_SUBJECT_DATA: Record<string, { icon: any; color: string; light: string }> = {
  math:    { icon: Calculator,   color: 'from-blue-500 to-indigo-600',    light: 'bg-blue-50 text-blue-700 border-blue-100' },
  science: { icon: FlaskConical, color: 'from-emerald-500 to-teal-600',   light: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  english: { icon: BookOpen,     color: 'from-violet-500 to-purple-600',  light: 'bg-violet-50 text-violet-700 border-violet-100' },
  history: { icon: Landmark,     color: 'from-amber-500 to-orange-600',   light: 'bg-amber-50 text-amber-700 border-amber-100' },
  art:     { icon: Palette,      color: 'from-pink-500 to-rose-600',      light: 'bg-pink-50 text-pink-700 border-pink-100' },
  pe:      { icon: Activity,     color: 'from-cyan-500 to-sky-600',       light: 'bg-cyan-50 text-cyan-700 border-cyan-100' },
  ict:     { icon: Monitor,      color: 'from-slate-500 to-gray-700',     light: 'bg-slate-50 text-slate-700 border-slate-100' },
  music:   { icon: Music,        color: 'from-fuchsia-500 to-pink-600',   light: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100' },
};

const EXTRA_COLORS = [
  { color: 'from-red-500 to-rose-600',     light: 'bg-red-50 text-red-700 border-red-100' },
  { color: 'from-teal-500 to-green-600',   light: 'bg-teal-50 text-teal-700 border-teal-100' },
  { color: 'from-orange-500 to-amber-600', light: 'bg-orange-50 text-orange-700 border-orange-100' },
  { color: 'from-lime-500 to-green-600',   light: 'bg-lime-50 text-lime-700 border-lime-100' },
  { color: 'from-indigo-500 to-blue-600',  light: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
];

export default function SubjectHub() {
  const navigate = useNavigate();
  const [allSubjects, setAllSubjects] = useState<SubjectEntry[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [enrolledSubjects, setEnrolledSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [m, a, p, mySubjects, subs] = await Promise.all([
          lmsApi.getMaterials(),
          assessmentsApi.list(),
          lmsApi.myProgress(),
          subjectAssignmentsApi.mySubjects().catch(() => []),
          settingsApi.listSubjects().catch(() => [] as SubjectEntry[]),
        ]);
        setMaterials(m);
        setAssessments(a);
        setProgress(p);
        setEnrolledSubjects(mySubjects);
        setAllSubjects(subs.length ? subs : Object.entries(BUILTIN_SUBJECT_DATA).map(([key]) => ({ key, label: key })));
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
    const subMaterials = materials.filter((m: any) => m.subject === key);
    const subAssessments = assessments.filter((a: any) => a.subject === key && a.status === 'published');
    const done = subMaterials.filter((m: any) => progressMap.get(m.id)?.isCompleted).length;
    return {
      materials: subMaterials.length,
      assessments: subAssessments.length,
      completed: done,
      total: subMaterials.length,
      pct: subMaterials.length ? Math.round((done / subMaterials.length) * 100) : 0,
    };
  };

  const visibleSubjects = (enrolledSubjects.length > 0
    ? allSubjects.filter(s => enrolledSubjects.includes(s.key))
    : allSubjects
  ).map((s, i) => {
    const builtin = BUILTIN_SUBJECT_DATA[s.key];
    const extra = EXTRA_COLORS[i % EXTRA_COLORS.length];
    return {
      key: s.key,
      label: s.label,
      icon: builtin?.icon ?? GraduationCap,
      color: builtin?.color ?? extra.color,
      light: builtin?.light ?? extra.light,
    };
  });

  const totalMaterials = visibleSubjects.reduce((sum, s) => sum + getSubjectStats(s.key).materials, 0);
  const totalCompleted = visibleSubjects.reduce((sum, s) => sum + getSubjectStats(s.key).completed, 0);
  const overallPct = totalMaterials > 0 ? Math.round((totalCompleted / totalMaterials) * 100) : 0;

  if (loading) return <LoadingSpinner text="Loading your subjects..." />;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 grad-primary rounded-xl flex items-center justify-center shadow-md">
            <BookMarked size={20} className="text-white" />
          </div>
          <div>
            <h1 className="page-title">My Subjects</h1>
            <p className="page-subtitle">Browse your subjects, materials and quizzes</p>
          </div>
        </div>
      </div>

      {/* Overall progress banner */}
      {totalMaterials > 0 && (
        <div className="card mb-6 flex items-center gap-4">
          <CheckCircle size={22} className="text-emerald-500 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-sm font-semibold text-slate-700">Overall Progress</span>
              <span className="text-xs text-slate-500">{totalCompleted} / {totalMaterials} lessons</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${overallPct}%` }}
              />
            </div>
          </div>
          <span className="text-lg font-bold text-slate-700 w-12 text-right">{overallPct}%</span>
        </div>
      )}

      {/* Subject grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {visibleSubjects.map(subject => {
          const stats = getSubjectStats(subject.key);
          const Icon = subject.icon;
          const hasContent = stats.materials > 0 || stats.assessments > 0;

          return (
            <button
              key={subject.key}
              onClick={() => navigate(`/subjects/${subject.key}`)}
              className={clsx(
                'card text-left group hover:-translate-y-1 transition-all duration-200 hover:shadow-md cursor-pointer',
                !hasContent && 'opacity-75'
              )}
            >
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${subject.color} flex items-center justify-center mb-3 shadow-sm group-hover:shadow-md transition-shadow`}>
                <Icon size={22} className="text-white" />
              </div>
              <div className="flex items-start justify-between mb-1">
                <h3 className="font-bold text-slate-900 text-base leading-tight">{subject.label}</h3>
                <ChevronRight size={16} className="text-slate-400 group-hover:text-primary-600 mt-0.5 transition-colors" />
              </div>
              <div className="flex items-center gap-3 mb-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><BookOpen size={11} />{stats.materials} materials</span>
                <span className="flex items-center gap-1"><ClipboardList size={11} />{stats.assessments} quizzes</span>
              </div>
              {stats.total > 0 ? (
                <>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1">
                    <div
                      className={`h-full bg-gradient-to-r ${subject.color} rounded-full transition-all duration-500`}
                      style={{ width: `${stats.pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${subject.light}`}>
                      {stats.pct}% done
                    </span>
                    <span className="text-xs text-slate-400">{stats.completed}/{stats.total}</span>
                  </div>
                </>
              ) : (
                <span className="text-xs text-slate-400 italic">No materials yet</span>
              )}
            </button>
          );
        })}
      </div>

      {visibleSubjects.length === 0 && (
        <div className="text-center py-20 text-slate-400">
          <GraduationCap size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No subjects assigned yet</p>
          <p className="text-sm mt-1">Ask your administrator to assign subjects to your account</p>
        </div>
      )}
    </div>
  );
}

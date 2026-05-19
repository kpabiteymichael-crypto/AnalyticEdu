import { useEffect, useState } from 'react';
import { studentsApi, predictionsApi, studyPlanApi } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { MapPin, Clock, AlertTriangle, TrendingUp, Zap, RefreshCw, BookOpen } from 'lucide-react';
import clsx from 'clsx';

const RISK_CONFIG: Record<string, { color: string; bg: string; label: string; border: string }> = {
  critical: { color: 'text-red-700',    bg: 'bg-red-50',     label: 'Critical',  border: 'border-red-200' },
  high:     { color: 'text-orange-700', bg: 'bg-orange-50',  label: 'High Risk', border: 'border-orange-200' },
  medium:   { color: 'text-yellow-700', bg: 'bg-yellow-50',  label: 'Medium',    border: 'border-yellow-200' },
  low:      { color: 'text-emerald-700',bg: 'bg-emerald-50', label: 'Low Risk',  border: 'border-emerald-200' },
};

const DAY_COLORS = [
  'bg-indigo-500', 'bg-violet-500', 'bg-blue-500', 'bg-cyan-500',
  'bg-teal-500', 'bg-emerald-500', 'bg-amber-500',
];

export default function StudyPlan() {
  const [profile, setProfile] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  async function load(studentId?: number) {
    try {
      let sid = studentId;
      if (!sid) {
        const p = await studentsApi.me();
        setProfile(p);
        sid = p.id;
      }
      const sp = await studyPlanApi.get(sid);
      setPlan(sp);
    } catch (e: any) {
      if (e.message?.includes('No predictions')) {
        setError('no_predictions');
      } else {
        setError('load_failed');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const handleGeneratePredictions = async () => {
    if (!profile) return;
    setGenerating(true);
    try {
      await predictionsApi.generate(profile.id);
      setError('');
      setLoading(true);
      await load(profile.id);
    } catch (e: any) {
      setError('generate_failed');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <LoadingSpinner text="Building your study plan..." />;

  if (error === 'no_predictions' || (plan && plan.weekPlan?.length === 0)) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Study Plan</h1>
          <p className="text-slate-500 text-sm mt-1">AI-generated weekly study schedule based on your performance</p>
        </div>
        <div className="empty-state">
          <MapPin size={40} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-bold text-slate-700">No study plan yet</h3>
          <p className="text-slate-400 mt-2 text-sm max-w-sm mx-auto">
            Your teacher needs to generate AI predictions for your account first. Ask your teacher to run the AI analysis on your profile.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">My Study Plan</h1>
        <div className="empty-state">
          <AlertTriangle size={40} className="mx-auto mb-4 text-red-300" />
          <h3 className="text-lg font-bold text-slate-700">Could not load study plan</h3>
          <button onClick={() => { setLoading(true); setError(''); load(); }} className="mt-4 btn-primary">Try Again</button>
        </div>
      </div>
    );
  }

  const summary = plan?.summary ?? {};
  const weekPlan = plan?.weekPlan ?? [];
  const breakdown = plan?.subjectBreakdown ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Study Plan</h1>
          <p className="text-slate-500 text-sm mt-1">
            AI-generated weekly schedule · Last updated {plan?.generatedAt ? new Date(plan.generatedAt).toLocaleDateString() : 'today'}
          </p>
        </div>
        <button
          onClick={handleGeneratePredictions}
          disabled={generating}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <RefreshCw size={14} className={generating ? 'animate-spin' : ''} />
          {generating ? 'Updating...' : 'Refresh Plan'}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Study Time', value: `${Math.round(summary.totalStudyMinutes / 60 * 10) / 10}h`, icon: <Clock size={16} />, color: 'text-primary-600 bg-primary-50' },
          { label: 'Subjects Tracked', value: summary.totalSubjects, icon: <BookOpen size={16} />, color: 'text-slate-700 bg-slate-50' },
          { label: 'Critical Subjects', value: summary.criticalSubjects, icon: <AlertTriangle size={16} />, color: 'text-red-600 bg-red-50' },
          { label: 'Top Priority', value: summary.topPriority ? summary.topPriority.charAt(0).toUpperCase() + summary.topPriority.slice(1) : '—', icon: <Zap size={16} />, color: 'text-amber-600 bg-amber-50' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center mb-2', s.color.split(' ')[1])}>
              <span className={s.color.split(' ')[0]}>{s.icon}</span>
            </div>
            <div className="text-xl font-bold text-slate-900">{s.value}</div>
            <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Weekly schedule */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="font-bold text-slate-900">This Week's Schedule</h2>
          {weekPlan.map((slot: any, i: number) => {
            const risk = RISK_CONFIG[slot.riskLevel] ?? RISK_CONFIG.low;
            return (
              <div key={i} className={clsx('card p-4 flex items-start gap-4 border', risk.border)}>
                <div className={clsx('w-10 h-10 rounded-xl flex flex-col items-center justify-center text-white flex-shrink-0', DAY_COLORS[i % DAY_COLORS.length])}>
                  <span className="text-xs font-bold leading-none">{slot.day.slice(0, 3).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 capitalize">{slot.subject}</span>
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full font-semibold', risk.bg, risk.color)}>
                      {risk.label}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{slot.focusArea}</p>
                  <div className="flex items-center gap-1 mt-1.5 text-xs text-slate-400">
                    <Clock size={11} /> {slot.durationMins} min session
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Subject breakdown */}
        <div className="space-y-3">
          <h2 className="font-bold text-slate-900">Subject Analysis</h2>
          {breakdown.map((s: any) => {
            const risk = RISK_CONFIG[s.riskLevel] ?? RISK_CONFIG.low;
            return (
              <div key={s.subject} className={clsx('card p-4 border', risk.border)}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-900 capitalize text-sm">{s.subject}</span>
                  <span className={clsx('text-xs px-2 py-0.5 rounded-full font-semibold', risk.bg, risk.color)}>
                    {risk.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                    <div
                      className={clsx('h-1.5 rounded-full', s.predictedScore >= 70 ? 'bg-emerald-500' : s.predictedScore >= 50 ? 'bg-amber-400' : 'bg-red-400')}
                      style={{ width: `${Math.min(100, s.predictedScore)}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-700 w-10 text-right">{Math.round(s.predictedScore)}%</span>
                </div>
                {s.recommendations?.slice(0, 2).map((rec: string, i: number) => (
                  <div key={i} className="flex items-start gap-1.5 mt-1">
                    <TrendingUp size={11} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-slate-600">{rec}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

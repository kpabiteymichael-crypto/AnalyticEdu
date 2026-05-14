import { useEffect, useState } from 'react';
import { analyticsApi, scoresApi } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { BarChart3, TrendingUp, PieChart as PieIcon, Target } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Legend, AreaChart, Area
} from 'recharts';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function Analytics() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [distribution, setDistribution] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([analyticsApi.overview(), analyticsApi.distribution()])
      .then(([a, d]) => { setAnalytics(a); setDistribution(d); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading analytics..." />;
  if (!analytics) return <div className="empty-state"><p>Failed to load analytics data</p></div>;

  const { subjectBreakdown, monthlyTrend, scores } = analytics;

  const radarData = subjectBreakdown.map((s: any) => ({
    subject: s.subject.charAt(0).toUpperCase() + s.subject.slice(1),
    score: Math.round(s.avgScore),
  }));

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-3">
          <BarChart3 size={28} className="text-primary-600" />
          Deep Analytics
        </h1>
        <p className="page-subtitle">Comprehensive academic performance insights across all subjects and time periods.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card text-center">
          <div className="text-3xl font-black text-primary-600">{scores?.avgScore ?? 0}%</div>
          <div className="text-sm text-slate-500 mt-1">Overall Average</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-black text-emerald-600">{scores?.passingRate ?? 0}%</div>
          <div className="text-sm text-slate-500 mt-1">Passing Rate</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-black text-amber-600">{scores?.totalAssessments ?? 0}</div>
          <div className="text-sm text-slate-500 mt-1">Total Assessments</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        {/* Subject Radar */}
        <div className="card">
          <h3 className="section-title flex items-center gap-2">
            <Target size={18} className="text-primary-600" />
            Subject Competency Radar
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#64748b' }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Radar dataKey="score" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.2} strokeWidth={2} />
              <Tooltip formatter={(v: number) => [`${v}%`, 'Avg Score']} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Subject Bar Chart */}
        <div className="card">
          <h3 className="section-title flex items-center gap-2">
            <BarChart3 size={18} className="text-primary-600" />
            Subject Performance Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={subjectBreakdown} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="subject" axisLine={false} tickLine={false}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickFormatter={v => v.charAt(0).toUpperCase() + v.slice(1, 3)} />
              <YAxis axisLine={false} tickLine={false} domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip formatter={(v: number) => [`${v}%`, 'Avg Score']}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="avgScore" radius={[6, 6, 0, 0]}>
                {subjectBreakdown.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-3">
            {subjectBreakdown.map((s: any, i: number) => (
              <div key={s.subject} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-xs text-slate-600 capitalize">{s.subject}</span>
                <span className="text-xs font-bold text-slate-700">{s.avgScore}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        {/* Monthly Area Chart */}
        <div className="card">
          <h3 className="section-title flex items-center gap-2">
            <TrendingUp size={18} className="text-primary-600" />
            Monthly Score Trend
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthlyTrend}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} domain={[40, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                formatter={(v: number) => [`${v}%`, 'Avg Score']} />
              <Area type="monotone" dataKey="avgScore" stroke="#4f46e5" strokeWidth={2.5}
                fill="url(#scoreGrad)" dot={{ r: 4, fill: '#4f46e5', strokeWidth: 0 }} activeDot={{ r: 6 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Grade Distribution Pie */}
        <div className="card">
          <h3 className="section-title flex items-center gap-2">
            <PieIcon size={18} className="text-primary-600" />
            Score Grade Distribution
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={distribution} dataKey="count" nameKey="bucket" cx="50%" cy="50%"
                outerRadius={100} innerRadius={50}
                paddingAngle={3}>
                {distribution.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number, name: string) => [v, name]} />
              <Legend iconType="circle" iconSize={10} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Assessment Count by Subject */}
      <div className="card">
        <h3 className="section-title">Assessment Volume by Subject</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {subjectBreakdown.map((s: any, i: number) => (
            <div key={s.subject} className="text-center p-4 rounded-2xl bg-slate-50">
              <div className="text-2xl font-black" style={{ color: COLORS[i % COLORS.length] }}>
                {s.assessmentCount}
              </div>
              <div className="text-sm font-semibold text-slate-700 capitalize mt-1">{s.subject}</div>
              <div className="text-xs text-slate-400">{s.avgScore}% avg</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

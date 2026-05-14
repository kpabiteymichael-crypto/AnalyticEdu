import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { analyticsApi, studentsApi } from '../lib/api';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { Users, BarChart3, AlertTriangle, TrendingUp, Award, Target, ChevronRight, BookOpen } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';

const GRADE_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9', '#8b5cf6'];

export default function AdminDashboard() {
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
  if (!analytics) return <div className="empty-state"><p>Failed to load analytics</p></div>;

  const { students, scores, subjectBreakdown, gradeDistribution, monthlyTrend, topBadges } = analytics;

  const PIE_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9'];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Analytics Overview</h1>
        <p className="page-subtitle">Platform-wide performance metrics and insights.</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Students"
          value={students?.total ?? 0}
          subtitle="Enrolled on platform"
          icon={<Users size={20} className="text-primary-600" />}
          iconBg="bg-primary-100"
        />
        <StatCard
          title="Avg Score"
          value={`${students ? scores?.avgScore : 0}%`}
          subtitle="Across all subjects"
          icon={<Target size={20} className="text-emerald-600" />}
          iconBg="bg-emerald-100"
          trend={{ value: `${scores?.passingRate ?? 0}% passing rate`, positive: true }}
        />
        <StatCard
          title="High Achievers"
          value={students?.highAchievers ?? 0}
          subtitle="Students above 2000 XP"
          icon={<Award size={20} className="text-amber-600" />}
          iconBg="bg-amber-100"
        />
        <StatCard
          title="At-Risk Students"
          value={students?.atRisk ?? 0}
          subtitle="Need attention"
          icon={<AlertTriangle size={20} className="text-red-500" />}
          iconBg="bg-red-100"
          trend={{ value: 'Requires intervention', positive: false }}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        {/* Subject Performance */}
        <div className="card">
          <h3 className="section-title flex items-center gap-2">
            <BarChart3 size={18} className="text-primary-600" />
            Average Score by Subject
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={subjectBreakdown} barSize={32} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }}
                tickFormatter={v => v.charAt(0).toUpperCase() + v.slice(1)} />
              <YAxis axisLine={false} tickLine={false} domain={[0, 100]} tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }}
                formatter={(v: number) => [`${v}%`, 'Avg Score']}
              />
              <Bar dataKey="avgScore" fill="#4f46e5" radius={[6, 6, 0, 0]}
                label={{ position: 'top', fontSize: 11, fill: '#64748b', formatter: (v: number) => `${v}%` }} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Trend */}
        <div className="card">
          <h3 className="section-title flex items-center gap-2">
            <TrendingUp size={18} className="text-primary-600" />
            Monthly Performance Trend
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} domain={[40, 100]} tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }}
                formatter={(v: number) => [`${v}%`, 'Avg Score']}
              />
              <Line type="monotone" dataKey="avgScore" stroke="#4f46e5" strokeWidth={3}
                dot={{ r: 4, fill: '#4f46e5', strokeWidth: 0 }} activeDot={{ r: 6 }} name="Avg Score" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {/* Grade Distribution */}
        <div className="card">
          <h3 className="section-title">Students by Grade</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={gradeDistribution} dataKey="count" nameKey="grade" cx="50%" cy="50%" outerRadius={80}
                label={({ grade, percent }) => `G${grade}: ${(percent * 100).toFixed(0)}%`}
                labelLine={false}>
                {gradeDistribution.map((_: any, i: number) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => [v, 'Students']} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Grade Performance Table */}
        <div className="card">
          <h3 className="section-title">Grade Performance</h3>
          <div className="space-y-3">
            {gradeDistribution.map((g: any, i: number) => (
              <div key={g.grade} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs"
                  style={{ background: GRADE_COLORS[i % GRADE_COLORS.length] }}>
                  {g.grade}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-slate-700">Grade {g.grade}</span>
                    <span className="text-xs text-slate-500">{g.count} students</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{
                      width: `${Math.min(100, (g.avgXp / 5000) * 100)}%`,
                      background: GRADE_COLORS[i % GRADE_COLORS.length]
                    }} />
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{Math.round(g.avgXp).toLocaleString()} avg XP</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Distribution */}
        <div className="card">
          <h3 className="section-title">Grade Distribution</h3>
          <div className="space-y-3">
            {distribution.map((d: any, i: number) => (
              <div key={d.bucket} className="flex items-center gap-3">
                <div className="text-sm font-bold text-slate-700 w-20">{d.bucket.split(' ')[0]}</div>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-slate-500">{d.bucket}</span>
                    <span className="text-xs font-semibold text-slate-700">{d.count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, (d.count / (distribution.reduce((a: number, x: any) => a + x.count, 0) || 1)) * 100)}%`, background: PIE_COLORS[i] }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Badges + Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="section-title flex items-center gap-2">
            <Award size={18} className="text-primary-600" />
            Most Awarded Badges
          </h3>
          <div className="space-y-3">
            {topBadges.map((b: any, i: number) => (
              <div key={b.badgeName} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg" style={{ background: `${b.badgeColor}20` }}>
                  {b.badgeIcon}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-700">{b.badgeName}</span>
                    <span className="text-xs text-slate-500">{b.count} awarded</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="section-title">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { to: '/students', label: 'Manage Students', icon: <Users size={18} />, color: 'bg-primary-50 text-primary-700 hover:bg-primary-100' },
              { to: '/scores/entry', label: 'Enter Scores', icon: <BookOpen size={18} />, color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
              { to: '/predictions', label: 'AI Predictions', icon: <Target size={18} />, color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
              { to: '/reports', label: 'View Reports', icon: <BarChart3 size={18} />, color: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
            ].map(item => (
              <Link key={item.to} to={item.to}
                className={`flex items-center gap-3 p-4 rounded-xl font-medium text-sm transition-colors ${item.color}`}>
                {item.icon}
                <span>{item.label}</span>
                <ChevronRight size={14} className="ml-auto" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

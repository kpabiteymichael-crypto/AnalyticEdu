import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { studentsApi, scoresApi, rankingsApi } from '../lib/api';
import XpProgressBar from '../components/XpProgressBar';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { Trophy, Star, TrendingUp, BookOpen, Target, Flame, Award, Clock } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import clsx from 'clsx';

const SUBJECT_COLORS: Record<string, string> = {
  math: '#4f46e5', science: '#10b981', english: '#f59e0b',
  history: '#0ea5e9', art: '#ec4899', pe: '#f43f5e', ict: '#8b5cf6', music: '#06b6d4',
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [scores, setScores] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [ranking, setRanking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const p = await studentsApi.me();
        setProfile(p);
        const [s, t, r] = await Promise.all([
          scoresApi.byStudent(p.id),
          scoresApi.trends(p.id),
          rankingsApi.byStudent(p.id),
        ]);
        setScores(s);
        setTrends(t);
        setRanking(r);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <LoadingSpinner text="Loading your dashboard..." />;
  if (!profile) return (
    <div className="empty-state">
      <div className="text-4xl mb-4">👤</div>
      <h3 className="text-lg font-bold text-slate-700">No student profile found</h3>
      <p className="text-slate-400 mt-2">Your student profile hasn't been set up yet.</p>
    </div>
  );

  const xp = profile.xpProgress;

  // Build chart data from trends
  const months = Array.from(new Set(trends.map((t: any) => t.month)));
  const chartData = months.map(month => {
    const row: any = { month };
    trends.filter((t: any) => t.month === month).forEach((t: any) => {
      row[t.subject] = Math.round(t.avgScore);
    });
    return row;
  });

  // Build radar chart data from subject averages
  const subjectAvgs = profile.subjectAverages ?? [];
  const radarData = subjectAvgs.map((s: any) => ({
    subject: s.subject.charAt(0).toUpperCase() + s.subject.slice(1),
    score: Math.round(s.avgScore),
    fullMark: 100,
  }));

  const avgScore = scores.length
    ? Math.round(scores.reduce((a: number, s: any) => a + (s.score / s.maxScore) * 100, 0) / scores.length)
    : 0;

  const recentBadges = profile.recentBadges ?? [];
  const recentActivity = profile.recentActivity ?? [];

  const subjects = Array.from(new Set(scores.map((s: any) => s.subject))) as string[];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Welcome back, <span className="text-primary-600">{user?.name?.split(' ')[0]}</span>!
          </h1>
          <p className="text-slate-500 mt-1">Here's your academic performance overview.</p>
        </div>
        {profile.streakDays > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
            <Flame size={20} className="text-amber-500" />
            <div>
              <div className="text-sm font-bold text-amber-700">{profile.streakDays} Day Streak!</div>
              <div className="text-xs text-amber-600">Keep it up</div>
            </div>
          </div>
        )}
      </div>

      {/* XP Progress */}
      <div className="card mb-6 bg-gradient-to-r from-primary-600 to-primary-700 text-white border-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-2xl font-black">
              {xp?.level}
            </div>
            <div>
              <div className="text-white/70 text-sm">Current Level</div>
              <div className="text-xl font-bold">Level {xp?.level} Scholar</div>
            </div>
          </div>
          <div className="sm:ml-auto text-right">
            <div className="text-2xl font-black">{profile.xp?.toLocaleString()}</div>
            <div className="text-white/70 text-sm">Total XP Earned</div>
          </div>
        </div>
        <div className="h-3 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full progress-animate"
            style={{ '--progress-width': `${xp?.progress ?? 0}%` } as any}
          />
        </div>
        <div className="flex justify-between mt-2 text-white/70 text-xs">
          <span>{xp?.currentXp} XP in this level</span>
          <span>{(xp?.nextLevelXp ?? 0) - (xp?.currentXp ?? 0)} XP to Level {(xp?.level ?? 1) + 1}</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Average Score"
          value={`${avgScore}%`}
          subtitle="All subjects"
          icon={<Target size={20} className="text-primary-600" />}
          iconBg="bg-primary-100"
          trend={avgScore >= 75 ? { value: 'Good standing', positive: true } : { value: 'Needs improvement', positive: false }}
        />
        <StatCard
          title="Class Rank"
          value={ranking ? `#${ranking.overallRank}` : 'N/A'}
          subtitle="Overall ranking"
          icon={<Trophy size={20} className="text-amber-600" />}
          iconBg="bg-amber-100"
        />
        <StatCard
          title="Badges Earned"
          value={recentBadges.length}
          subtitle="Achievements unlocked"
          icon={<Award size={20} className="text-emerald-600" />}
          iconBg="bg-emerald-100"
        />
        <StatCard
          title="Assessments"
          value={scores.length}
          subtitle="Total completed"
          icon={<BookOpen size={20} className="text-sky-600" />}
          iconBg="bg-sky-100"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {/* Performance Trend Chart */}
        <div className="card xl:col-span-2">
          <h3 className="section-title flex items-center gap-2">
            <TrendingUp size={18} className="text-primary-600" />
            Subject Performance Over Time
          </h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} domain={[0, 100]} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }}
                  formatter={(val: number) => [`${Math.round(val)}%`]}
                />
                {subjects.slice(0, 4).map(subject => (
                  <Line
                    key={subject}
                    type="monotone"
                    dataKey={subject}
                    stroke={SUBJECT_COLORS[subject] ?? '#6366f1'}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: SUBJECT_COLORS[subject] }}
                    activeDot={{ r: 5 }}
                    name={subject.charAt(0).toUpperCase() + subject.slice(1)}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state h-48">
              <BookOpen size={32} className="text-slate-300 mb-2" />
              <p className="text-slate-400 text-sm">No score data yet</p>
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            {subjects.slice(0, 4).map(subject => (
              <div key={subject} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: SUBJECT_COLORS[subject] }} />
                <span className="text-xs text-slate-600 capitalize">{subject}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Radar Chart */}
        <div className="card">
          <h3 className="section-title flex items-center gap-2">
            <Star size={18} className="text-primary-600" />
            Subject Strengths
          </h3>
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#64748b' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="score" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state h-48">
              <Star size={32} className="text-slate-300 mb-2" />
              <p className="text-slate-400 text-sm">Complete assessments to see your strengths</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Badges */}
        <div className="card">
          <h3 className="section-title flex items-center gap-2">
            <Award size={18} className="text-primary-600" />
            Recent Badges
          </h3>
          {recentBadges.length === 0 ? (
            <div className="empty-state py-10">
              <Award size={28} className="text-slate-300 mb-2" />
              <p className="text-slate-400 text-sm">No badges earned yet — keep going!</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {recentBadges.map(({ badge, earnedAt }: any) => (
                <div key={badge.id} className="flex flex-col items-center p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors text-center group">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-2 shadow-sm transition-transform group-hover:scale-110 animate-badge-pop"
                    style={{ background: `${badge.color}20`, border: `2px solid ${badge.color}40` }}
                  >
                    {badge.icon}
                  </div>
                  <div className="text-xs font-semibold text-slate-700 leading-tight">{badge.name}</div>
                  <div className="text-xs text-primary-600 font-bold mt-1">+{badge.xpReward} XP</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h3 className="section-title flex items-center gap-2">
            <Clock size={18} className="text-primary-600" />
            Recent Activity
          </h3>
          {recentActivity.length === 0 ? (
            <div className="empty-state py-10">
              <Clock size={28} className="text-slate-300 mb-2" />
              <p className="text-slate-400 text-sm">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.slice(0, 6).map((act: any) => (
                <div key={act.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 grad-primary rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Star size={14} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 font-medium">{act.description}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(act.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {act.xpEarned > 0 && (
                    <div className="text-xs font-bold text-primary-600 bg-primary-50 rounded-full px-2 py-0.5">
                      +{act.xpEarned} XP
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

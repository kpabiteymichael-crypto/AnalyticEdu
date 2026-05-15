import { useEffect, useState } from 'react';
import { rankingsApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { Trophy, Star, Flame, ChevronDown, ChevronUp, Users, BarChart3, Award } from 'lucide-react';
import clsx from 'clsx';

// Achievement badge tiers (from Excel template)
const getBadge = (pct: number) => {
  if (pct >= 95) return { label: 'Diamond Gem', icon: '💎', color: '#06b6d4', bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700' };
  if (pct >= 85) return { label: 'Golden Ticket', icon: '🥇', color: '#f59e0b', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' };
  if (pct >= 70) return { label: 'Ticket', icon: '🎫', color: '#8b5cf6', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' };
  if (pct >= 50) return { label: 'Star', icon: '⭐', color: '#10b981', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' };
  return { label: '—', icon: '✕', color: '#94a3b8', bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-400' };
};

const getRankStyle = (rank: number) => {
  if (rank === 1) return 'from-amber-400 to-yellow-500 text-white';
  if (rank === 2) return 'from-slate-400 to-slate-300 text-white';
  if (rank === 3) return 'from-amber-700 to-amber-500 text-white';
  return '';
};

function ProgressBar({ pct }: { pct: number }) {
  const color =
    pct >= 95 ? '#06b6d4' :
    pct >= 85 ? '#f59e0b' :
    pct >= 70 ? '#8b5cf6' :
    pct >= 50 ? '#10b981' : '#94a3b8';
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(100, pct)}%`, background: color }}
        />
      </div>
      <span className="text-xs font-bold w-10 text-right" style={{ color }}>{Math.round(pct)}%</span>
    </div>
  );
}

function StudentRow({ student, showOverallRank }: { student: any; showOverallRank: boolean }) {
  const pct = student.averageScore ?? 0;
  const badge = getBadge(pct);
  const rank = showOverallRank ? student.rank : student.classRank;
  const top3 = rank <= 3;

  return (
    <div className={clsx(
      'grid items-center gap-2 px-4 py-3 rounded-xl transition-all hover:shadow-sm',
      'grid-cols-[2.5rem_1fr_2fr_4rem_4rem_5rem]',
      top3 ? 'bg-gradient-to-r from-amber-50/80 to-transparent border border-amber-100/80' : 'hover:bg-slate-50'
    )}>
      {/* Rank */}
      <div className={clsx(
        'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0',
        top3 ? `bg-gradient-to-br ${getRankStyle(rank)} shadow-md` : 'bg-slate-100 text-slate-600'
      )}>
        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
      </div>

      {/* Name + meta */}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 grad-primary rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            {student.name?.charAt(0)}
          </div>
          <span className="font-semibold text-slate-900 text-sm truncate">{student.name}</span>
          {student.streakDays > 2 && (
            <span className="flex items-center gap-0.5 text-amber-500 text-xs flex-shrink-0">
              <Flame size={11} />{student.streakDays}
            </span>
          )}
        </div>
        <div className="text-xs text-slate-400 pl-7.5 truncate">Lv.{student.level} · {student.studentCode}</div>
      </div>

      {/* Progress bar */}
      <ProgressBar pct={pct} />

      {/* Mark obtained */}
      <div className="text-center">
        <div className="text-sm font-bold text-slate-900">{Math.round(student.totalScore ?? 0)}</div>
        <div className="text-xs text-slate-400">obtained</div>
      </div>

      {/* Mark to get */}
      <div className="text-center">
        <div className="text-sm font-bold text-slate-500">{Math.round(student.totalMaxScore ?? 0)}</div>
        <div className="text-xs text-slate-400">max</div>
      </div>

      {/* Badge */}
      <div className={clsx('flex items-center justify-center gap-1 px-2 py-1 rounded-lg border text-xs font-semibold', badge.bg, badge.border, badge.text)}>
        <span>{badge.icon}</span>
        <span className="hidden sm:inline truncate">{badge.label}</span>
      </div>
    </div>
  );
}

function TeamSection({ teamName, students, defaultOpen }: { teamName: string; students: any[]; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const avgPct = students.reduce((s, x) => s + (x.averageScore ?? 0), 0) / (students.length || 1);
  const badge = getBadge(avgPct);
  const topStudent = students[0];

  return (
    <div className="card mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 text-left"
      >
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 border', badge.bg, badge.border)}>
          {badge.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-slate-900 text-sm">{teamName}</div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-slate-500">{students.length} member{students.length !== 1 ? 's' : ''}</span>
            <span className={clsx('text-xs font-semibold', badge.text)}>{Math.round(avgPct)}% avg</span>
            {topStudent && <span className="text-xs text-slate-400">Top: {topStudent.name}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="hidden sm:block">
            <ProgressBar pct={avgPct} />
          </div>
          {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>

      {open && (
        <div className="mt-4 space-y-1 border-t border-slate-100 pt-4">
          {/* Column headers */}
          <div className="grid grid-cols-[2.5rem_1fr_2fr_4rem_4rem_5rem] gap-2 px-4 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <div>Rank</div>
            <div>Name</div>
            <div>Progress</div>
            <div className="text-center">Obtained</div>
            <div className="text-center">Max</div>
            <div className="text-center">Badge</div>
          </div>
          {students.map(s => <StudentRow key={s.studentId} student={s} showOverallRank={false} />)}
        </div>
      )}
    </div>
  );
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'overall' | 'teams'>('overall');
  const [search, setSearch] = useState('');

  useEffect(() => {
    rankingsApi.leaderboard().then(setLeaderboard).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Calculating rankings..." />;

  const filtered = search
    ? leaderboard.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()))
    : leaderboard;

  // Group into teams
  const teams: Record<string, any[]> = {};
  filtered.forEach(s => {
    const key = s.className ?? 'Unassigned';
    if (!teams[key]) teams[key] = [];
    teams[key].push(s);
  });
  // Sort each team by classRank
  Object.values(teams).forEach(arr => arr.sort((a, b) => (a.classRank ?? 999) - (b.classRank ?? 999)));
  const teamList = Object.entries(teams).sort((a, b) => {
    const avgA = a[1].reduce((s, x) => s + (x.averageScore ?? 0), 0) / a[1].length;
    const avgB = b[1].reduce((s, x) => s + (x.averageScore ?? 0), 0) / b[1].length;
    return avgB - avgA;
  });

  const top3 = leaderboard.slice(0, 3);

  // Badge tier legend
  const tiers = [
    getBadge(95), getBadge(85), getBadge(70), getBadge(50), getBadge(0)
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 grad-gold rounded-xl flex items-center justify-center shadow-md shadow-amber-200 flex-shrink-0">
              <Trophy size={20} className="text-white" />
            </div>
            <div>
              <h1 className="page-title">Progress Dashboard</h1>
              <p className="page-subtitle">Live leaderboard · {leaderboard.length} students ranked</p>
            </div>
          </div>

          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            <button onClick={() => setView('overall')}
              className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                view === 'overall' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-900')}>
              <BarChart3 size={15} /> Overall
            </button>
            <button onClick={() => setView('teams')}
              className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                view === 'teams' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-900')}>
              <Users size={15} /> By Team
            </button>
          </div>
        </div>
      </div>

      {/* Badge legend */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tiers.map((t, i) => (
          <div key={i} className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium', t.bg, t.border, t.text)}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
            {i === 0 && <span className="opacity-60">≥95%</span>}
            {i === 1 && <span className="opacity-60">≥85%</span>}
            {i === 2 && <span className="opacity-60">≥70%</span>}
            {i === 3 && <span className="opacity-60">≥50%</span>}
            {i === 4 && <span className="opacity-60">&lt;50%</span>}
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search students..."
          className="input max-w-sm"
        />
      </div>

      {/* === OVERALL VIEW === */}
      {view === 'overall' && (
        <>
          {/* Podium */}
          {!search && top3.length >= 3 && (
            <div className="card mb-6">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-5 text-center">Top Performers</h3>
              <div className="flex items-end justify-center gap-4">
                {[top3[1], top3[0], top3[2]].map((s, i) => {
                  const rank = i === 1 ? 1 : i === 0 ? 2 : 3;
                  const heights = ['h-24', 'h-36', 'h-20'];
                  const pct = s.averageScore ?? 0;
                  const badge = getBadge(pct);
                  return (
                    <div key={s.studentId} className="flex flex-col items-center flex-1 max-w-[160px]">
                      <span className="text-2xl mb-1">{badge.icon}</span>
                      <div className="w-12 h-12 grad-primary rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg mb-1">
                        {s.name?.charAt(0)}
                      </div>
                      <div className="text-xs font-bold text-slate-800 text-center truncate w-full px-1">{s.name}</div>
                      <div className="text-xs text-slate-500 mb-1">{s.className ?? 'No team'}</div>
                      <div className="flex items-center gap-1 text-primary-600 text-xs font-bold mb-2">
                        <Star size={10} /> {s.xp?.toLocaleString()} XP
                      </div>
                      <div className={clsx(
                        'w-full rounded-t-2xl flex items-end justify-center pb-3 shadow-md',
                        heights[i],
                        rank === 1 ? 'grad-gold' : rank === 2 ? 'bg-gradient-to-t from-slate-400 to-slate-300' : 'bg-gradient-to-t from-amber-700 to-amber-500'
                      )}>
                        <span className="text-white font-black text-xl">#{rank}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Full Rankings Table */}
          <div className="card">
            {/* Table header */}
            <div className="grid grid-cols-[2.5rem_1fr_2fr_4rem_4rem_5rem] gap-2 px-4 py-3 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <div>Rank</div>
              <div>Name</div>
              <div>Progress</div>
              <div className="text-center">Obtained</div>
              <div className="text-center">Max</div>
              <div className="text-center">Badge</div>
            </div>
            <div className="divide-y divide-slate-50 mt-1">
              {filtered.map(s => <StudentRow key={s.studentId} student={s} showOverallRank={true} />)}
            </div>
            {filtered.length === 0 && (
              <div className="py-16 text-center">
                <Trophy size={32} className="text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400">No results found</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* === TEAMS VIEW === */}
      {view === 'teams' && (
        <div>
          {teamList.length === 0 && (
            <div className="card py-16 text-center">
              <Users size={32} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400">No team data found</p>
            </div>
          )}
          {teamList.map(([teamName, members], idx) => (
            <TeamSection key={teamName} teamName={teamName} students={members} defaultOpen={idx < 3} />
          ))}
        </div>
      )}
    </div>
  );
}

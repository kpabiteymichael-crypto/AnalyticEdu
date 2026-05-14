import { useEffect, useState } from 'react';
import { rankingsApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { Trophy, Star, Flame, Medal } from 'lucide-react';
import clsx from 'clsx';

const RANK_STYLES: Record<number, { bg: string; text: string; icon: React.ReactNode }> = {
  1: { bg: 'bg-gradient-to-r from-amber-400 to-yellow-500', text: 'text-white', icon: <Trophy size={16} /> },
  2: { bg: 'bg-gradient-to-r from-slate-400 to-slate-500', text: 'text-white', icon: <Medal size={16} /> },
  3: { bg: 'bg-gradient-to-r from-amber-600 to-orange-500', text: 'text-white', icon: <Medal size={16} /> },
};

export default function Leaderboard() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    rankingsApi.leaderboard().then(setLeaderboard).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading leaderboard..." />;

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      <div className="page-header text-center">
        <div className="w-14 h-14 grad-gold rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-200">
          <Trophy size={28} className="text-white" />
        </div>
        <h1 className="page-title">Leaderboard</h1>
        <p className="page-subtitle">Top performers ranked by XP and academic achievement.</p>
      </div>

      {/* Top 3 Podium */}
      {top3.length >= 3 && (
        <div className="flex items-end justify-center gap-4 mb-10 px-4">
          {[top3[1], top3[0], top3[2]].map((s, i) => {
            const rank = i === 1 ? 1 : i === 0 ? 2 : 3;
            const heights = ['h-28', 'h-36', 'h-24'];
            return (
              <div key={s.studentId} className="flex flex-col items-center flex-1 max-w-[140px]">
                <div className="w-12 h-12 grad-primary rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg mb-2">
                  {s.name?.charAt(0)}
                </div>
                <div className="text-xs font-semibold text-slate-700 text-center mb-1 truncate w-full px-1">{s.name}</div>
                <div className="text-xs text-slate-500 mb-2">{s.xp?.toLocaleString()} XP</div>
                <div className={clsx('w-full rounded-t-2xl flex items-center justify-center shadow-md', heights[i],
                  rank === 1 ? 'grad-gold' : rank === 2 ? 'bg-gradient-to-t from-slate-400 to-slate-300' : 'bg-gradient-to-t from-amber-700 to-amber-500')}>
                  <span className="text-white font-black text-2xl">#{rank}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="card">
        <div className="space-y-2">
          {leaderboard.map((s: any) => {
            const isMe = user?.role === 'student'; // simplified — would need student ID comparison
            const rankStyle = RANK_STYLES[s.rank];
            return (
              <div
                key={s.studentId}
                className={clsx(
                  'flex items-center gap-4 p-4 rounded-2xl transition-all hover:bg-slate-50',
                  s.rank <= 3 && 'bg-gradient-to-r from-amber-50/50 to-transparent border border-amber-100'
                )}
              >
                {/* Rank */}
                <div className={clsx(
                  'w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0',
                  rankStyle ? `${rankStyle.bg} ${rankStyle.text} shadow-md` : 'bg-slate-100 text-slate-600'
                )}>
                  {rankStyle?.icon ?? `#${s.rank}`}
                </div>

                {/* Avatar */}
                <div className="w-10 h-10 grad-primary rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm">
                  {s.name?.charAt(0)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-sm">{s.name}</span>
                    {s.rank <= 3 && <Trophy size={12} className="text-amber-500" />}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-slate-500">Level {s.level}</span>
                    {s.streakDays > 0 && (
                      <span className="flex items-center gap-0.5 text-xs text-amber-600 font-medium">
                        <Flame size={10} /> {s.streakDays}d
                      </span>
                    )}
                    <span className="text-xs text-slate-400">{s.averageScore ? `${s.averageScore}% avg` : ''}</span>
                  </div>
                </div>

                {/* XP */}
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center gap-1 text-primary-600 font-bold text-sm justify-end">
                    <Star size={14} />
                    {s.xp?.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-400">XP</div>
                </div>
              </div>
            );
          })}
        </div>

        {leaderboard.length === 0 && (
          <div className="empty-state">
            <Trophy size={32} className="text-slate-300 mb-3" />
            <p className="text-slate-400">No rankings yet. Add some students and scores!</p>
          </div>
        )}
      </div>
    </div>
  );
}

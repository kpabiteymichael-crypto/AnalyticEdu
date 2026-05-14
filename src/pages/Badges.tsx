import { useEffect, useState } from 'react';
import { gamificationApi, studentsApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { Award, Star, Lock } from 'lucide-react';
import clsx from 'clsx';

const CATEGORY_LABELS: Record<string, string> = {
  academic: 'Academic Excellence',
  streak: 'Learning Streaks',
  improvement: 'Improvement',
  social: 'Social & Community',
  milestone: 'Milestones',
};

const CATEGORY_COLORS: Record<string, string> = {
  academic: '#4f46e5',
  streak: '#f43f5e',
  improvement: '#10b981',
  social: '#8b5cf6',
  milestone: '#f59e0b',
};

export default function Badges() {
  const { user } = useAuth();
  const [allBadges, setAllBadges] = useState<any[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    async function load() {
      try {
        const badges = await gamificationApi.badges();
        setAllBadges(badges);

        if (user?.role === 'student') {
          const studentData = await studentsApi.me();
          const earned = await gamificationApi.studentBadges(studentData.id);
          setEarnedBadges(earned.map((e: any) => e.badge.id));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const categories = Array.from(new Set(allBadges.map(b => b.category)));
  const filtered = selectedCategory === 'all' ? allBadges : allBadges.filter(b => b.category === selectedCategory);
  const grouped = Object.groupBy ? Object.groupBy(filtered, b => b.category) : filtered.reduce((acc: any, b) => {
    if (!acc[b.category]) acc[b.category] = [];
    acc[b.category].push(b);
    return acc;
  }, {});

  const earnedCount = user?.role === 'student' ? earnedBadges.length : 0;

  if (loading) return <LoadingSpinner text="Loading badges..." />;

  return (
    <div className="animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Award size={28} className="text-primary-600" />
            Achievement Badges
          </h1>
          <p className="page-subtitle">
            {user?.role === 'student'
              ? `You've earned ${earnedCount} of ${allBadges.length} badges`
              : `${allBadges.length} badges available on the platform`}
          </p>
        </div>
        {user?.role === 'student' && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
            <div className="w-10 h-10 grad-gold rounded-xl flex items-center justify-center shadow-sm">
              <Award size={18} className="text-white" />
            </div>
            <div>
              <div className="text-lg font-black text-amber-700">{earnedCount}/{allBadges.length}</div>
              <div className="text-xs text-amber-600">Badges Earned</div>
            </div>
          </div>
        )}
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap mb-8">
        <button
          onClick={() => setSelectedCategory('all')}
          className={clsx('px-4 py-2 rounded-xl text-sm font-semibold transition-all',
            selectedCategory === 'all' ? 'bg-primary-600 text-white shadow-md shadow-primary-200' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200')}
        >
          All ({allBadges.length})
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={clsx('px-4 py-2 rounded-xl text-sm font-semibold transition-all',
              selectedCategory === cat ? 'text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200')}
            style={selectedCategory === cat ? { background: CATEGORY_COLORS[cat] } : {}}
          >
            {CATEGORY_LABELS[cat] ?? cat} ({allBadges.filter(b => b.category === cat).length})
          </button>
        ))}
      </div>

      {/* Badges Grid */}
      {Object.entries(grouped).map(([category, catBadges]: [string, any]) => (
        <div key={category} className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-4 h-4 rounded-full" style={{ background: CATEGORY_COLORS[category] }} />
            <h3 className="text-lg font-bold text-slate-800">{CATEGORY_LABELS[category] ?? category}</h3>
            <span className="text-sm text-slate-400 font-medium">({catBadges.length})</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {catBadges.map((badge: any) => {
              const isEarned = user?.role !== 'student' || earnedBadges.includes(badge.id);
              return (
                <div
                  key={badge.id}
                  className={clsx(
                    'card group transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 text-center',
                    !isEarned && 'opacity-60 grayscale'
                  )}
                >
                  <div className="relative w-16 h-16 mx-auto mb-3">
                    <div
                      className="w-full h-full rounded-2xl flex items-center justify-center text-3xl shadow-md transition-transform group-hover:scale-110"
                      style={{ background: `${badge.color}20`, border: `2px solid ${badge.color}40` }}
                    >
                      {badge.icon}
                    </div>
                    {!isEarned && (
                      <div className="absolute inset-0 bg-slate-100/80 rounded-2xl flex items-center justify-center">
                        <Lock size={18} className="text-slate-400" />
                      </div>
                    )}
                    {isEarned && user?.role === 'student' && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm mb-1">{badge.name}</h4>
                  <p className="text-xs text-slate-500 mb-3 leading-relaxed">{badge.description}</p>

                  <div className="flex items-center justify-center gap-1">
                    <Star size={12} style={{ color: badge.color }} />
                    <span className="text-xs font-bold" style={{ color: badge.color }}>+{badge.xpReward} XP</span>
                  </div>

                  <div className="mt-2 px-2 py-0.5 rounded-full text-xs font-semibold inline-block"
                    style={{ background: `${badge.color}15`, color: badge.color }}>
                    {CATEGORY_LABELS[badge.category] ?? badge.category}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

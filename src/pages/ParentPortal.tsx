import { useEffect, useState } from 'react';
import { parentsApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import RiskBadge from '../components/RiskBadge';
import XpProgressBar from '../components/XpProgressBar';
import { Users2, Link, Star, Award, TrendingUp, Brain, Flame, RefreshCw } from 'lucide-react';
import { getXpProgress } from '../lib/xp';

function getXpData(xp: number) {
  const THRESHOLDS = [0,100,250,500,850,1300,1900,2650,3600,4800,6300,8150,10400,13100,16300,20050,24400,29400,35100,41550];
  let level = 1;
  for (let i = 0; i < THRESHOLDS.length; i++) {
    if (xp >= THRESHOLDS[i]) level = i + 1; else break;
  }
  const currentLevelXp = THRESHOLDS[level - 1] ?? 0;
  const nextLevelXp = THRESHOLDS[level] ?? THRESHOLDS[THRESHOLDS.length - 1] * 2;
  const currentXp = xp - currentLevelXp;
  const needed = nextLevelXp - currentLevelXp;
  return { level, currentXp, nextLevelXp: needed, progress: Math.min(100, Math.round((currentXp / needed) * 100)) };
}

export default function ParentPortal() {
  const { user } = useAuth();
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [childReport, setChildReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [linkCode, setLinkCode] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [linkSuccess, setLinkSuccess] = useState('');

  useEffect(() => {
    parentsApi.myChildren()
      .then(data => {
        setChildren(data);
        if (data.length > 0) selectChild(data[0]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const selectChild = async (child: any) => {
    setSelectedChild(child);
    setLoadingReport(true);
    try {
      const r = await parentsApi.childReport(child.studentId);
      setChildReport(r);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingReport(false);
    }
  };

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError('');
    setLinkSuccess('');
    setLinking(true);
    try {
      await parentsApi.link(linkCode.trim());
      setLinkSuccess('Successfully linked to student!');
      setLinkCode('');
      const updated = await parentsApi.myChildren();
      setChildren(updated);
    } catch (err: any) {
      setLinkError(err.response?.data?.error || 'Failed to link student');
    } finally {
      setLinking(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading parent portal..." />;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-3">
          <Users2 size={28} className="text-primary-600" />
          Parent Portal
        </h1>
        <p className="page-subtitle">Monitor your child's academic progress and achievements.</p>
      </div>

      {/* Link Student */}
      {user?.role === 'parent' && (
        <div className="card mb-6">
          <h3 className="section-title flex items-center gap-2">
            <Link size={18} className="text-primary-600" />
            Link a Student
          </h3>
          <p className="text-sm text-slate-500 mb-4">Enter your child's Student Code (e.g., STU-00001) to access their progress.</p>
          <form onSubmit={handleLink} className="flex gap-3">
            <input
              type="text"
              value={linkCode}
              onChange={e => setLinkCode(e.target.value)}
              placeholder="STU-XXXXX"
              className="input flex-1 max-w-xs uppercase"
              required
            />
            <button type="submit" disabled={linking} className="btn-primary flex items-center gap-2">
              {linking ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Link size={16} />}
              Link Student
            </button>
          </form>
          {linkError && <p className="text-red-600 text-sm mt-2">{linkError}</p>}
          {linkSuccess && <p className="text-emerald-600 text-sm mt-2">{linkSuccess}</p>}
        </div>
      )}

      {children.length === 0 ? (
        <div className="empty-state card">
          <Users2 size={40} className="text-slate-300 mb-3" />
          <h3 className="font-bold text-slate-700 text-lg">No students linked</h3>
          <p className="text-slate-400 text-sm mt-1">Link your child's Student Code above to view their progress.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Children Selector */}
          <div className="xl:col-span-1">
            <div className="card">
              <h3 className="font-semibold text-slate-700 mb-3 text-sm">My Children</h3>
              <div className="space-y-2">
                {children.map(child => (
                  <button
                    key={child.studentId}
                    onClick={() => selectChild(child)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${selectedChild?.studentId === child.studentId ? 'bg-primary-50 border-2 border-primary-200' : 'hover:bg-slate-50 border-2 border-transparent'}`}
                  >
                    <div className="w-10 h-10 grad-primary rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                      {child.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 text-sm truncate">{child.name}</div>
                      <div className="text-xs text-slate-500">Grade {child.grade} • Lv.{child.level}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Child Report */}
          <div className="xl:col-span-3">
            {loadingReport ? (
              <LoadingSpinner text="Loading report..." />
            ) : childReport ? (
              <div className="space-y-6">
                {/* Overview */}
                <div className="card">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                    <div className="w-16 h-16 grad-primary rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg">
                      {childReport.student?.name?.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="text-xl font-bold text-slate-900">{childReport.student?.name}</div>
                      <div className="text-sm text-slate-500">{childReport.student?.studentCode} • Grade {childReport.student?.grade}</div>
                      {childReport.student?.streakDays > 0 && (
                        <div className="flex items-center gap-1 mt-1 text-amber-600 text-sm font-medium">
                          <Flame size={14} /> {childReport.student.streakDays} day learning streak!
                        </div>
                      )}
                    </div>
                  </div>

                  {(() => {
                    const xpData = getXpData(childReport.student?.xp ?? 0);
                    return (
                      <XpProgressBar
                        xp={childReport.student?.xp ?? 0}
                        level={xpData.level}
                        currentXp={xpData.currentXp}
                        nextLevelXp={xpData.nextLevelXp}
                        progress={xpData.progress}
                      />
                    );
                  })()}
                </div>

                {/* Subject Averages */}
                <div className="card">
                  <h3 className="section-title flex items-center gap-2">
                    <TrendingUp size={18} className="text-primary-600" />
                    Subject Performance
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {childReport.subjectAverages.map((s: any) => (
                      <div key={s.subject} className="text-center p-3 rounded-xl bg-slate-50">
                        <div className={`text-xl font-black ${s.avgScore >= 80 ? 'text-emerald-600' : s.avgScore >= 60 ? 'text-amber-600' : 'text-red-500'}`}>
                          {s.avgScore}%
                        </div>
                        <div className="text-xs font-semibold text-slate-600 capitalize">{s.subject}</div>
                        <div className="text-xs text-slate-400">{s.count} tests</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Scores */}
                <div className="card">
                  <h3 className="section-title flex items-center gap-2">
                    <Star size={18} className="text-primary-600" />
                    Recent Assessments
                  </h3>
                  <div className="space-y-2">
                    {childReport.recentScores.slice(0, 8).map((s: any) => (
                      <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-slate-800">{s.assessmentName}</div>
                          <div className="text-xs text-slate-500 capitalize">{s.subject} • {s.assessmentType}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className={`text-sm font-bold ${(s.score / s.maxScore) >= 0.8 ? 'text-emerald-600' : (s.score / s.maxScore) >= 0.6 ? 'text-amber-600' : 'text-red-500'}`}>
                            {s.score}/{s.maxScore}
                          </div>
                          <div className="text-xs text-slate-400">{Math.round((s.score / s.maxScore) * 100)}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Badges */}
                {childReport.badges.length > 0 && (
                  <div className="card">
                    <h3 className="section-title flex items-center gap-2">
                      <Award size={18} className="text-primary-600" />
                      Badges Earned
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {childReport.badges.map(({ badge }: any) => (
                        <div key={badge.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border"
                          style={{ borderColor: `${badge.color}40`, background: `${badge.color}10` }}>
                          <span className="text-lg">{badge.icon}</span>
                          <div>
                            <div className="text-xs font-semibold text-slate-700">{badge.name}</div>
                            <div className="text-xs text-slate-400">+{badge.xpReward} XP</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Risk Predictions */}
                {childReport.predictions.length > 0 && (
                  <div className="card">
                    <h3 className="section-title flex items-center gap-2">
                      <Brain size={18} className="text-primary-600" />
                      Performance Outlook
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {childReport.predictions.slice(0, 8).map((p: any) => (
                        <div key={p.id} className="p-3 rounded-xl bg-slate-50 text-center">
                          <div className="text-xs font-semibold text-slate-400 uppercase mb-1 capitalize">{p.subject}</div>
                          <div className="text-xl font-black text-slate-900">{p.predictedScore}%</div>
                          <div className="mt-2">
                            <RiskBadge level={p.riskLevel} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

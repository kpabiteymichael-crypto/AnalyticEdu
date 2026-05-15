import { useEffect, useState } from 'react';
import { settingsApi } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { Settings as SettingsIcon, Save, RotateCcw, Trophy, Zap, BookOpen, CheckCircle, AlertCircle, Target } from 'lucide-react';

const SUBJECT_KEYS = ['math', 'science', 'english', 'history', 'art', 'pe', 'ict', 'music'];

const DEFAULT_SUBJECT_MAX_MARKS: Record<string, number> = {
  math: 100, science: 100, english: 100, history: 100,
  art: 100, pe: 100, ict: 100, music: 100,
};

const DEFAULT_LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 850, 1300, 1900, 2650, 3600, 4800,
  6300, 8150, 10400, 13100, 16300, 20050, 24400, 29400, 35100, 41550,
];

const DEFAULT_XP_REWARDS = [
  { minPct: 95, xp: 100 },
  { minPct: 85, xp: 75 },
  { minPct: 75, xp: 50 },
  { minPct: 65, xp: 30 },
  { minPct: 50, xp: 15 },
  { minPct: 0, xp: 5 },
];

const DEFAULT_SUBJECT_LABELS: Record<string, string> = {
  math: 'Mathematics', science: 'Science', english: 'English',
  history: 'History', art: 'Art', pe: 'Physical Education', ict: 'ICT', music: 'Music',
};

type Toast = { type: 'success' | 'error'; message: string };

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'levels' | 'xp' | 'subjects' | 'maxmarks'>('levels');
  const [toast, setToast] = useState<Toast | null>(null);

  const [levelThresholds, setLevelThresholds] = useState<number[]>(DEFAULT_LEVEL_THRESHOLDS);
  const [xpRewards, setXpRewards] = useState(DEFAULT_XP_REWARDS);
  const [subjectLabels, setSubjectLabels] = useState<Record<string, string>>(DEFAULT_SUBJECT_LABELS);

  const [subjectMaxMarks, setSubjectMaxMarks] = useState<Record<string, number>>(DEFAULT_SUBJECT_MAX_MARKS);

  const [savingLevels, setSavingLevels] = useState(false);
  const [savingXp, setSavingXp] = useState(false);
  const [savingSubjects, setSavingSubjects] = useState(false);
  const [savingMaxMarks, setSavingMaxMarks] = useState(false);

  useEffect(() => {
    settingsApi.get().then(data => {
      setLevelThresholds(data.levelThresholds ?? DEFAULT_LEVEL_THRESHOLDS);
      setXpRewards(data.xpRewards ?? DEFAULT_XP_REWARDS);
      setSubjectLabels(data.subjectLabels ?? DEFAULT_SUBJECT_LABELS);
      setSubjectMaxMarks(data.subjectMaxMarks ?? DEFAULT_SUBJECT_MAX_MARKS);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveLevels = async () => {
    setSavingLevels(true);
    try {
      await settingsApi.updateLevelThresholds(levelThresholds);
      showToast('success', 'Level thresholds saved successfully');
    } catch {
      showToast('error', 'Failed to save level thresholds');
    } finally { setSavingLevels(false); }
  };

  const handleSaveXp = async () => {
    setSavingXp(true);
    try {
      await settingsApi.updateXpRewards(xpRewards);
      showToast('success', 'XP rewards saved successfully');
    } catch {
      showToast('error', 'Failed to save XP rewards');
    } finally { setSavingXp(false); }
  };

  const handleSaveSubjects = async () => {
    setSavingSubjects(true);
    try {
      await settingsApi.updateSubjectLabels(subjectLabels);
      showToast('success', 'Subject labels saved successfully');
    } catch {
      showToast('error', 'Failed to save subject labels');
    } finally { setSavingSubjects(false); }
  };

  const handleSaveMaxMarks = async () => {
    setSavingMaxMarks(true);
    try {
      await settingsApi.updateSubjectMaxMarks(subjectMaxMarks);
      showToast('success', 'Subject max marks saved successfully');
    } catch {
      showToast('error', 'Failed to save subject max marks');
    } finally { setSavingMaxMarks(false); }
  };

  const totalMaxMarks = Object.values(subjectMaxMarks).reduce((a, b) => a + b, 0);

  const updateThreshold = (index: number, value: string) => {
    const num = parseInt(value);
    if (isNaN(num)) return;
    setLevelThresholds(prev => prev.map((v, i) => i === index ? num : v));
  };

  const updateXpReward = (index: number, field: 'minPct' | 'xp', value: string) => {
    const num = parseInt(value);
    if (isNaN(num)) return;
    setXpRewards(prev => prev.map((r, i) => i === index ? { ...r, [field]: num } : r));
  };

  if (loading) return <LoadingSpinner text="Loading settings..." />;

  const tabs = [
    { id: 'levels' as const, label: 'Level Thresholds', icon: <Trophy size={16} /> },
    { id: 'xp' as const, label: 'Score XP Rewards', icon: <Zap size={16} /> },
    { id: 'subjects' as const, label: 'Subject Labels', icon: <BookOpen size={16} /> },
    { id: 'maxmarks' as const, label: 'Max Marks', icon: <Target size={16} /> },
  ];

  return (
    <div className="animate-fade-in">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium animate-fade-in ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-500'}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 grad-primary rounded-xl flex items-center justify-center shadow-md">
            <SettingsIcon size={20} className="text-white" />
          </div>
          <div>
            <h1 className="page-title">Platform Settings</h1>
            <p className="page-subtitle">Configure level criteria, XP rewards, and subject labels</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Level Thresholds */}
      {activeTab === 'levels' && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Level XP Thresholds</h2>
              <p className="text-sm text-slate-500 mt-0.5">Set the total XP required to reach each level</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setLevelThresholds(DEFAULT_LEVEL_THRESHOLDS)} className="btn-secondary flex items-center gap-2 text-sm">
                <RotateCcw size={14} /> Reset
              </button>
              <button onClick={handleSaveLevels} disabled={savingLevels} className="btn-primary flex items-center gap-2 text-sm">
                <Save size={14} /> {savingLevels ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-5 gap-3">
            {levelThresholds.map((xp, index) => (
              <div key={index} className="bg-slate-50 rounded-xl p-3">
                <div className="text-xs font-bold text-primary-600 mb-2 flex items-center gap-1">
                  <Trophy size={11} /> Level {index + 1}
                </div>
                <input
                  type="number"
                  value={xp}
                  onChange={e => updateThreshold(index, e.target.value)}
                  disabled={index === 0}
                  min={0}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-900 text-center focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="text-xs text-slate-400 text-center mt-1">XP required</div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-xl">
            <p className="text-xs text-blue-700">
              <strong>Note:</strong> Level 1 always starts at 0 XP. Changes take effect for new score entries. Existing student levels will recalculate automatically when their XP is next updated.
            </p>
          </div>
        </div>
      )}

      {/* XP Rewards */}
      {activeTab === 'xp' && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Score XP Reward Tiers</h2>
              <p className="text-sm text-slate-500 mt-0.5">Define how much XP students earn based on their score percentage</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setXpRewards(DEFAULT_XP_REWARDS)} className="btn-secondary flex items-center gap-2 text-sm">
                <RotateCcw size={14} /> Reset
              </button>
              <button onClick={handleSaveXp} disabled={savingXp} className="btn-primary flex items-center gap-2 text-sm">
                <Save size={14} /> {savingXp ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="table-header text-left py-3 px-4">Tier</th>
                  <th className="table-header text-center py-3 px-4">Minimum Score %</th>
                  <th className="table-header text-center py-3 px-4">XP Awarded</th>
                  <th className="table-header text-left py-3 px-4">Description</th>
                </tr>
              </thead>
              <tbody>
                {xpRewards.map((reward, index) => {
                  const nextTier = xpRewards[index - 1];
                  const maxPct = nextTier ? nextTier.minPct - 1 : 100;
                  const tierLabel = index === 0 ? `${reward.minPct}% – 100%` : `${reward.minPct}% – ${maxPct}%`;
                  return (
                    <tr key={index} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          index === 0 ? 'bg-emerald-100 text-emerald-700' :
                          index === 1 ? 'bg-blue-100 text-blue-700' :
                          index === 2 ? 'bg-primary-100 text-primary-700' :
                          index === 3 ? 'bg-amber-100 text-amber-700' :
                          index === 4 ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          Tier {index + 1}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <input
                          type="number"
                          value={reward.minPct}
                          onChange={e => updateXpReward(index, 'minPct', e.target.value)}
                          disabled={index === xpRewards.length - 1}
                          min={0} max={100}
                          className="w-20 text-center border border-slate-200 rounded-lg px-2 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <span className="text-slate-400 ml-1 text-sm">%</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <input
                          type="number"
                          value={reward.xp}
                          onChange={e => updateXpReward(index, 'xp', e.target.value)}
                          min={0}
                          className="w-20 text-center border border-slate-200 rounded-lg px-2 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <span className="text-slate-400 ml-1 text-sm">XP</span>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-500">{tierLabel}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-3 bg-amber-50 rounded-xl">
            <p className="text-xs text-amber-700">
              <strong>Note:</strong> Tiers are evaluated from highest to lowest percentage. The last tier is the fallback (applies to all remaining scores). Changes affect new scores only — existing XP is not retroactively adjusted.
            </p>
          </div>
        </div>
      )}

      {/* Subject Labels */}
      {activeTab === 'subjects' && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Subject Display Labels</h2>
              <p className="text-sm text-slate-500 mt-0.5">Customise how subject names appear across the platform</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setSubjectLabels(DEFAULT_SUBJECT_LABELS)} className="btn-secondary flex items-center gap-2 text-sm">
                <RotateCcw size={14} /> Reset
              </button>
              <button onClick={handleSaveSubjects} disabled={savingSubjects} className="btn-primary flex items-center gap-2 text-sm">
                <Save size={14} /> {savingSubjects ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SUBJECT_KEYS.map(key => (
              <div key={key} className="flex items-center gap-4 bg-slate-50 rounded-xl p-4">
                <div className="w-20 text-xs font-bold text-slate-500 uppercase tracking-wider">{key}</div>
                <div className="text-slate-300">→</div>
                <input
                  type="text"
                  value={subjectLabels[key] ?? key}
                  onChange={e => setSubjectLabels(prev => ({ ...prev, [key]: e.target.value }))}
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder={`Display name for ${key}`}
                />
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-xl">
            <p className="text-xs text-blue-700">
              <strong>Note:</strong> These labels are used for display only. The underlying subject identifiers (math, science, etc.) remain unchanged in the database.
            </p>
          </div>
        </div>
      )}

      {/* Subject Max Marks */}
      {activeTab === 'maxmarks' && (
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Subject Max Marks</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Set the maximum obtainable marks per subject for the leaderboard.
                  Overall max = <strong>{totalMaxMarks}</strong> total marks.
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSubjectMaxMarks(DEFAULT_SUBJECT_MAX_MARKS)} className="btn-secondary flex items-center gap-2 text-sm">
                  <RotateCcw size={14} /> Reset
                </button>
                <button onClick={handleSaveMaxMarks} disabled={savingMaxMarks} className="btn-primary flex items-center gap-2 text-sm">
                  <Save size={14} /> {savingMaxMarks ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SUBJECT_KEYS.map(key => (
                <div key={key} className="flex items-center gap-4 bg-slate-50 rounded-xl p-4">
                  <div className="w-20 text-xs font-bold text-slate-500 uppercase tracking-wider">{key}</div>
                  <input
                    type="number" min={1}
                    value={subjectMaxMarks[key] ?? 100}
                    onChange={e => {
                      const v = parseInt(e.target.value);
                      if (!isNaN(v) && v > 0) setSubjectMaxMarks(prev => ({ ...prev, [key]: v }));
                    }}
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 bg-white text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <span className="text-slate-400 text-sm">marks</span>
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="p-3 bg-primary-50 rounded-xl text-center">
                <div className="text-2xl font-black text-primary-700">{totalMaxMarks}</div>
                <div className="text-xs text-primary-600 mt-0.5">Total overall max marks</div>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl text-center">
                <div className="text-2xl font-black text-amber-700">{SUBJECT_KEYS.length}</div>
                <div className="text-xs text-amber-600 mt-0.5">Subjects configured</div>
              </div>
            </div>
          </div>

          {/* Rank badge XP bonus table */}
          <div className="card">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Rank Badge XP Bonuses</h2>
            <p className="text-sm text-slate-500 mb-5">
              Students who maintain high performance receive automatic bonus XP on every score they record.
            </p>
            <div className="space-y-3">
              {[
                { badge: '💎 Diamond Gem', pct: '≥ 95%', bonus: '+10% XP', bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700' },
                { badge: '🥇 Golden Ticket', pct: '≥ 85%', bonus: '+5% XP', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
                { badge: '🎫 Ticket', pct: '≥ 70%', bonus: '+3% XP', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
                { badge: '⭐ Star', pct: '≥ 50%', bonus: '+2% XP', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
              ].map(r => (
                <div key={r.badge} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${r.bg} ${r.border}`}>
                  <span className={`font-semibold text-sm ${r.text}`}>{r.badge}</span>
                  <span className="text-xs text-slate-500">{r.pct} average</span>
                  <span className={`text-sm font-black ${r.text}`}>{r.bonus}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-500">
                <strong>How it works:</strong> When a student records a new score, the system checks their current overall average. If they're in a badge tier, the bonus percentage is automatically added on top of their base XP reward. For example, a Diamond student scoring 95/100 earns 100 base XP × 1.10 = 110 XP.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

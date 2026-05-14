import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentsApi, scoresApi, gamificationApi, predictionsApi, authApi } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import XpProgressBar from '../components/XpProgressBar';
import RiskBadge from '../components/RiskBadge';
import { ArrowLeft, Star, Award, Brain, TrendingUp, Flame, Pencil, Trash2, X, CheckCircle, AlertCircle, Save } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const SUBJECT_COLORS: Record<string, string> = {
  math: '#4f46e5', science: '#10b981', english: '#f59e0b',
  history: '#0ea5e9', art: '#ec4899', pe: '#f43f5e', ict: '#8b5cf6', music: '#06b6d4',
};

type Toast = { type: 'success' | 'error'; message: string };

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<any>(null);
  const [scores, setScores] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', grade: 7, classId: '' as string | number, xp: 0, streakDays: 0 });
  const [saving, setSaving] = useState(false);
  const [deletingScore, setDeletingScore] = useState<number | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!id) return;
    const studentId = parseInt(id);
    Promise.all([
      studentsApi.get(studentId),
      scoresApi.byStudent(studentId),
      scoresApi.trends(studentId),
      gamificationApi.studentBadges(studentId),
      predictionsApi.byStudent(studentId),
      authApi.classes(),
    ])
      .then(([s, sc, t, b, p, c]) => {
        setStudent(s); setScores(sc); setTrends(t); setBadges(b); setPredictions(p); setClasses(c);
        setEditForm({ name: s.name, grade: s.grade, classId: s.classId ?? '', xp: s.xp, streakDays: s.streakDays ?? 0 });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleSaveEdit = async () => {
    if (!student) return;
    setSaving(true);
    try {
      const updated = await studentsApi.update(student.id, {
        name: editForm.name,
        grade: Number(editForm.grade),
        classId: editForm.classId !== '' ? Number(editForm.classId) : null,
        xp: Number(editForm.xp),
        streakDays: Number(editForm.streakDays),
      });
      setStudent((prev: any) => ({ ...prev, ...updated }));
      setEditMode(false);
      showToast('success', 'Student profile updated');
    } catch (err: any) {
      showToast('error', err.response?.data?.error ?? 'Failed to update student');
    } finally { setSaving(false); }
  };

  const handleDeleteScore = async (scoreId: number) => {
    setDeletingScore(scoreId);
    try {
      await scoresApi.delete(scoreId);
      setScores(prev => prev.filter(s => s.id !== scoreId));
      // Refresh student data (XP may have changed)
      const updated = await studentsApi.get(student.id);
      setStudent(updated);
      showToast('success', 'Score deleted and XP adjusted');
    } catch (err: any) {
      showToast('error', err.response?.data?.error ?? 'Failed to delete score');
    } finally { setDeletingScore(null); }
  };

  if (loading) return <LoadingSpinner text="Loading student profile..." />;
  if (!student) return <div className="empty-state"><p>Student not found</p></div>;

  const xpData = student.xpProgress ?? { level: 1, currentXp: 0, nextLevelXp: 100, progress: 0 };
  const months = Array.from(new Set(trends.map((t: any) => t.month)));
  const chartData = months.map(month => {
    const row: any = { month };
    trends.filter((t: any) => t.month === month).forEach((t: any) => { row[t.subject] = Math.round(t.avgScore); });
    return row;
  });
  const subjects = Array.from(new Set(scores.map((s: any) => s.subject))) as string[];

  return (
    <div className="animate-fade-in">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium animate-fade-in ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-500'}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      <button onClick={() => navigate('/students')} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-6 transition-colors">
        <ArrowLeft size={18} /> Back to Students
      </button>

      {/* Header */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6">
          <div className="w-16 h-16 grad-primary rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg flex-shrink-0">
            {(editMode ? editForm.name : student.name)?.charAt(0)}
          </div>

          {editMode ? (
            <div className="flex-1 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Full Name</label>
                  <input type="text" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className="input text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Grade</label>
                  <select value={editForm.grade} onChange={e => setEditForm(p => ({ ...p, grade: parseInt(e.target.value) }))} className="input text-sm">
                    {Array.from({ length: 13 }, (_, i) => i + 1).map(g => (
                      <option key={g} value={g}>Grade {g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Class</label>
                  <select value={editForm.classId} onChange={e => setEditForm(p => ({ ...p, classId: e.target.value }))} className="input text-sm">
                    <option value="">No class</option>
                    {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">XP (override)</label>
                  <input type="number" min={0} value={editForm.xp} onChange={e => setEditForm(p => ({ ...p, xp: parseInt(e.target.value) }))} className="input text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Streak Days</label>
                  <input type="number" min={0} value={editForm.streakDays} onChange={e => setEditForm(p => ({ ...p, streakDays: parseInt(e.target.value) }))} className="input text-sm" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleSaveEdit} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
                  <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button onClick={() => setEditMode(false)} className="btn-secondary text-sm flex items-center gap-2">
                  <X size={14} /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-slate-900">{student.name}</h1>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-sm text-slate-500">{student.studentCode}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-sm text-slate-500">Grade {student.grade}</span>
                  {student.streakDays > 0 && (
                    <span className="flex items-center gap-1 text-amber-600 text-sm font-medium">
                      <Flame size={14} /> {student.streakDays} day streak
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setEditForm({ name: student.name, grade: student.grade, classId: student.classId ?? '', xp: student.xp, streakDays: student.streakDays ?? 0 });
                  setEditMode(true);
                }}
                className="btn-secondary flex items-center gap-2 text-sm self-start"
              >
                <Pencil size={14} /> Edit Profile
              </button>
            </>
          )}

          {!editMode && (
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-primary-50 rounded-xl p-3">
                <div className="text-xl font-black text-primary-600">{student.xp?.toLocaleString()}</div>
                <div className="text-xs text-slate-500">Total XP</div>
              </div>
              <div className="bg-purple-50 rounded-xl p-3">
                <div className="text-xl font-black text-purple-600">Lv.{student.level}</div>
                <div className="text-xs text-slate-500">Level</div>
              </div>
            </div>
          )}
        </div>

        {!editMode && (
          <XpProgressBar
            xp={student.xp}
            level={xpData.level}
            currentXp={xpData.currentXp}
            nextLevelXp={xpData.nextLevelXp}
            progress={xpData.progress}
          />
        )}
      </div>

      {/* Subject Averages */}
      {student.subjectAverages?.length > 0 && (
        <div className="card mb-6">
          <h3 className="section-title flex items-center gap-2">
            <Star size={18} className="text-primary-600" />
            Subject Averages
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
            {student.subjectAverages.map((s: any) => (
              <div key={s.subject} className="text-center p-3 rounded-xl"
                style={{ background: `${SUBJECT_COLORS[s.subject]}15` }}>
                <div className="text-lg font-black" style={{ color: SUBJECT_COLORS[s.subject] }}>
                  {Math.round(s.avgScore)}%
                </div>
                <div className="text-xs font-semibold text-slate-600 capitalize">{s.subject}</div>
                <div className="text-xs text-slate-400">{s.count} tests</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        {/* Trend Chart */}
        <div className="card">
          <h3 className="section-title flex items-center gap-2">
            <TrendingUp size={18} className="text-primary-600" />
            Performance Trend
          </h3>
          {chartData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }}
                    formatter={(v: number) => [`${Math.round(v)}%`]} />
                  {subjects.slice(0, 4).map(subject => (
                    <Line key={subject} type="monotone" dataKey={subject}
                      stroke={SUBJECT_COLORS[subject]} strokeWidth={2} dot={{ r: 3 }} connectNulls
                      name={subject.charAt(0).toUpperCase() + subject.slice(1)} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-2">
                {subjects.slice(0, 4).map(s => (
                  <div key={s} className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full" style={{ background: SUBJECT_COLORS[s] }} />
                    <span className="text-xs text-slate-500 capitalize">{s}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state h-48"><TrendingUp size={28} className="text-slate-300 mb-2" /><p className="text-slate-400 text-sm">No trend data yet</p></div>
          )}
        </div>

        {/* Badges */}
        <div className="card">
          <h3 className="section-title flex items-center gap-2">
            <Award size={18} className="text-primary-600" />
            Badges ({badges.length})
          </h3>
          {badges.length === 0 ? (
            <div className="empty-state h-48"><Award size={28} className="text-slate-300 mb-2" /><p className="text-slate-400 text-sm">No badges yet</p></div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {badges.map(({ badge, earnedAt }: any) => (
                <div key={badge.id} className="flex flex-col items-center p-3 rounded-xl text-center"
                  style={{ background: `${badge.color}10`, border: `1px solid ${badge.color}30` }}>
                  <span className="text-2xl mb-1">{badge.icon}</span>
                  <div className="text-xs font-semibold text-slate-700 leading-tight">{badge.name}</div>
                  <div className="text-xs font-bold mt-1" style={{ color: badge.color }}>+{badge.xpReward} XP</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Predictions */}
      {predictions.length > 0 && (
        <div className="card mb-6">
          <h3 className="section-title flex items-center gap-2">
            <Brain size={18} className="text-primary-600" />
            AI Performance Predictions
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {predictions.slice(0, 8).map((p: any) => (
              <div key={p.id} className="p-3 rounded-xl bg-slate-50 text-center">
                <div className="text-xs font-semibold text-slate-400 uppercase mb-1 capitalize">{p.subject}</div>
                <div className="text-2xl font-black text-slate-900">{p.predictedScore}%</div>
                <div className="mt-2"><RiskBadge level={p.riskLevel} /></div>
                <div className="text-xs text-slate-400 mt-1">{Math.round(p.confidenceScore * 100)}% confidence</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Scores */}
      <div className="card">
        <h3 className="section-title">Recent Scores</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="table-header text-left py-3 px-3">Assessment</th>
                <th className="table-header text-left py-3 px-3">Subject</th>
                <th className="table-header text-left py-3 px-3">Type</th>
                <th className="table-header text-right py-3 px-3">Score</th>
                <th className="table-header text-right py-3 px-3">%</th>
                <th className="table-header text-right py-3 px-3">Date</th>
                <th className="table-header text-center py-3 px-3">Delete</th>
              </tr>
            </thead>
            <tbody>
              {scores.slice(0, 20).map((s: any) => (
                <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3 text-sm font-medium text-slate-800">{s.assessmentName}</td>
                  <td className="py-3 px-3">
                    <span className="badge-pill capitalize" style={{ background: `${SUBJECT_COLORS[s.subject]}15`, color: SUBJECT_COLORS[s.subject] }}>
                      {s.subject}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-xs text-slate-500 capitalize">{s.assessmentType}</td>
                  <td className="py-3 px-3 text-right text-sm font-semibold text-slate-800">{s.score}/{s.maxScore}</td>
                  <td className="py-3 px-3 text-right">
                    <span className={`text-sm font-bold ${(s.score / s.maxScore) >= 0.8 ? 'text-emerald-600' : (s.score / s.maxScore) >= 0.6 ? 'text-amber-600' : 'text-red-500'}`}>
                      {Math.round((s.score / s.maxScore) * 100)}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right text-xs text-slate-400">
                    {new Date(s.recordedAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => handleDeleteScore(s.id)}
                      disabled={deletingScore === s.id}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                      title="Delete this score"
                    >
                      {deletingScore === s.id ? (
                        <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {scores.length === 0 && (
            <div className="py-12 text-center text-slate-400">No scores recorded yet</div>
          )}
        </div>
      </div>
    </div>
  );
}

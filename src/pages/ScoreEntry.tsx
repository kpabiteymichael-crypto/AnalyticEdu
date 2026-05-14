import { useEffect, useState } from 'react';
import { studentsApi, scoresApi } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { ClipboardList, Check, AlertCircle, Star } from 'lucide-react';

const SUBJECTS = ['math', 'science', 'english', 'history', 'art', 'pe', 'ict', 'music'];
const ASSESSMENT_TYPES = ['quiz', 'exam', 'homework', 'project', 'participation'];

export default function ScoreEntry() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ xpEarned: number; newLevel: number } | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    studentId: '',
    subject: 'math',
    score: '',
    maxScore: '100',
    assessmentType: 'quiz',
    assessmentName: '',
    semester: '1',
    academicYear: '2024-2025',
  });

  useEffect(() => {
    studentsApi.list().then(setStudents).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.studentId) return setError('Please select a student');
    setSubmitting(true);
    setError('');
    setResult(null);
    try {
      const res = await scoresApi.create({
        studentId: parseInt(form.studentId),
        subject: form.subject,
        score: parseFloat(form.score),
        maxScore: parseFloat(form.maxScore),
        assessmentType: form.assessmentType,
        assessmentName: form.assessmentName,
        semester: parseInt(form.semester),
        academicYear: form.academicYear,
      });
      setResult({ xpEarned: res.xpEarned, newLevel: res.newLevel });
      setForm(f => ({ ...f, score: '', assessmentName: '' }));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit score');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading students..." />;

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="page-header">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <ClipboardList size={20} className="text-emerald-600" />
          </div>
          <h1 className="page-title">Score Entry</h1>
        </div>
        <p className="page-subtitle">Record assessment results for students. XP is automatically awarded.</p>
      </div>

      {result && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Check size={20} className="text-emerald-600" />
          </div>
          <div>
            <div className="font-semibold text-emerald-800">Score recorded successfully!</div>
            <div className="text-sm text-emerald-700 flex items-center gap-2 mt-0.5">
              <Star size={14} /> <span>+{result.xpEarned} XP awarded</span>
              {result.newLevel && <span>• Student is now Level {result.newLevel}</span>}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Student *</label>
            <select
              value={form.studentId}
              onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))}
              className="input"
              required
            >
              <option value="">Select a student...</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.studentCode}) — Grade {s.grade}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Subject *</label>
              <select
                value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                className="input"
              >
                {SUBJECTS.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Assessment Type *</label>
              <select
                value={form.assessmentType}
                onChange={e => setForm(f => ({ ...f, assessmentType: e.target.value }))}
                className="input"
              >
                {ASSESSMENT_TYPES.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Assessment Name *</label>
            <input
              type="text"
              value={form.assessmentName}
              onChange={e => setForm(f => ({ ...f, assessmentName: e.target.value }))}
              className="input"
              placeholder="e.g. Chapter 5 Quiz, Midterm Exam"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Score *</label>
              <input
                type="number"
                value={form.score}
                onChange={e => setForm(f => ({ ...f, score: e.target.value }))}
                className="input"
                placeholder="0"
                min="0"
                max={form.maxScore}
                step="0.5"
                required
              />
            </div>
            <div>
              <label className="label">Max Score *</label>
              <input
                type="number"
                value={form.maxScore}
                onChange={e => setForm(f => ({ ...f, maxScore: e.target.value }))}
                className="input"
                placeholder="100"
                min="1"
                step="0.5"
                required
              />
            </div>
          </div>

          {form.score && form.maxScore && (
            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-600 font-medium">Score Percentage</span>
                <span className="font-bold text-primary-600">
                  {Math.round((parseFloat(form.score) / parseFloat(form.maxScore)) * 100)}%
                </span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary-500 to-emerald-500"
                  style={{ width: `${Math.min(100, (parseFloat(form.score) / parseFloat(form.maxScore)) * 100)}%` }}
                />
              </div>
              <div className="text-xs text-slate-400 mt-2">
                XP Reward: ~{
                  (() => {
                    const pct = (parseFloat(form.score) / parseFloat(form.maxScore)) * 100;
                    if (pct >= 95) return 100;
                    if (pct >= 85) return 75;
                    if (pct >= 75) return 50;
                    if (pct >= 65) return 30;
                    if (pct >= 50) return 15;
                    return 5;
                  })()
                } XP
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Semester</label>
              <select value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))} className="input">
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
              </select>
            </div>
            <div>
              <label className="label">Academic Year</label>
              <input type="text" value={form.academicYear} onChange={e => setForm(f => ({ ...f, academicYear: e.target.value }))} className="input" />
            </div>
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2">
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <><ClipboardList size={18} /> Record Score</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

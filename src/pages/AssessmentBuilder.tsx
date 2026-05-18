import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { assessmentsApi } from '../lib/api';
import {
  Save, Send, ArrowLeft, Plus, Trash2, Edit3, GripVertical,
  CheckCircle2, ChevronDown, ChevronUp, X, AlertCircle
} from 'lucide-react';
import clsx from 'clsx';

const SUBJECTS = [
  'Mathematics', 'English Language', 'Integrated Science', 'Chemistry',
  'Physics', 'Biology', 'History', 'Geography', 'Economics',
  'Government', 'Literature', 'ICT', 'Art', 'Music', 'PE',
];

const QUESTION_TYPES = [
  { value: 'mcq', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'essay', label: 'Essay' },
];

interface QuestionOption { id?: number; text: string; isCorrect: boolean; orderIndex: number }
interface Question {
  id?: number; type: string; text: string; points: number;
  explanation: string; correctAnswer: string; options: QuestionOption[];
  orderIndex?: number;
}

const emptyQuestion = (): Question => ({
  type: 'mcq', text: '', points: 1, explanation: '', correctAnswer: '',
  options: [
    { text: '', isCorrect: true, orderIndex: 0 },
    { text: '', isCorrect: false, orderIndex: 1 },
    { text: '', isCorrect: false, orderIndex: 2 },
    { text: '', isCorrect: false, orderIndex: 3 },
  ],
});

export default function AssessmentBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    title: '', description: '', subject: 'Mathematics', type: 'quiz',
    timeLimitMins: '', maxAttempts: 1, passingScore: 50,
    instructions: '', shuffleQuestions: false, shuffleOptions: false,
    semester: 1, academicYear: '2024-2025',
    closesAt: '', classId: '',
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingQ, setEditingQ] = useState<Question | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [assessmentId, setAssessmentId] = useState<number | null>(null);
  const [status, setStatus] = useState('draft');

  useEffect(() => {
    if (isEdit && id) {
      assessmentsApi.get(parseInt(id)).then((data: any) => {
        setAssessmentId(data.id);
        setStatus(data.status);
        setForm({
          title: data.title, description: data.description ?? '',
          subject: data.subject, type: data.type,
          timeLimitMins: data.time_limit_mins ? String(data.time_limit_mins) : '',
          maxAttempts: data.max_attempts, passingScore: data.passing_score ?? 50,
          instructions: data.instructions ?? '', shuffleQuestions: data.shuffle_questions,
          shuffleOptions: data.shuffle_options, semester: data.semester,
          academicYear: data.academic_year,
          closesAt: data.closes_at ? data.closes_at.slice(0, 16) : '',
          classId: data.class_id ? String(data.class_id) : '',
        });
        setQuestions((data.questions ?? []).map((q: any) => ({
          id: q.id, type: q.type, text: q.text, points: q.points,
          explanation: q.explanation ?? '', correctAnswer: q.correct_answer ?? '',
          options: q.options ?? [], orderIndex: q.order_index,
        })));
      }).catch(() => navigate('/assessments'));
    }
  }, [id, isEdit]);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const saveAssessment = async () => {
    if (!form.title.trim()) { showToast('error', 'Title is required'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        timeLimitMins: form.timeLimitMins ? parseInt(form.timeLimitMins) : null,
        classId: form.classId ? parseInt(form.classId) : null,
        closesAt: form.closesAt || null,
      };
      if (assessmentId) {
        await assessmentsApi.update(assessmentId, payload);
        showToast('success', 'Assessment saved');
      } else {
        const created: any = await assessmentsApi.create(payload);
        setAssessmentId(created.id);
        navigate(`/assessments/${created.id}/edit`, { replace: true });
        showToast('success', 'Assessment created — now add questions');
      }
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const publishAssessment = async () => {
    if (!assessmentId) { await saveAssessment(); return; }
    if (questions.length === 0) { showToast('error', 'Add at least one question before publishing'); return; }
    setPublishing(true);
    try {
      const updated: any = await assessmentsApi.setStatus(assessmentId, status === 'published' ? 'closed' : 'published');
      setStatus(updated.status);
      showToast('success', updated.status === 'published' ? 'Published! Students can now take this assessment.' : 'Assessment closed.');
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setPublishing(false);
    }
  };

  const openAddQuestion = () => { setEditingQ(emptyQuestion()); setEditingIdx(null); };
  const openEditQuestion = (idx: number) => { setEditingQ({ ...questions[idx] }); setEditingIdx(idx); };

  const setQOption = (oIdx: number, field: string, value: string | boolean) => {
    setEditingQ(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        options: prev.options.map((o, i) =>
          i === oIdx ? { ...o, [field]: value } : (field === 'isCorrect' && value === true ? { ...o, isCorrect: false } : o)
        ),
      };
    });
  };

  const addOption = () => setEditingQ(prev => prev ? {
    ...prev,
    options: [...prev.options, { text: '', isCorrect: false, orderIndex: prev.options.length }],
  } : prev);

  const removeOption = (idx: number) => setEditingQ(prev => prev ? {
    ...prev,
    options: prev.options.filter((_, i) => i !== idx).map((o, i) => ({ ...o, orderIndex: i })),
  } : prev);

  const saveQuestion = async () => {
    if (!editingQ) return;
    if (!editingQ.text.trim()) { showToast('error', 'Question text is required'); return; }
    if ((editingQ.type === 'mcq') && editingQ.options.filter(o => o.text.trim()).length < 2) {
      showToast('error', 'MCQ needs at least 2 options'); return;
    }
    if ((editingQ.type === 'mcq') && !editingQ.options.some(o => o.isCorrect)) {
      showToast('error', 'Mark at least one option as correct'); return;
    }

    if (!assessmentId) {
      showToast('error', 'Save the assessment details first');
      return;
    }

    try {
      const payload = {
        type: editingQ.type,
        text: editingQ.text,
        points: editingQ.points,
        explanation: editingQ.explanation || null,
        correctAnswer: editingQ.correctAnswer || null,
        options: editingQ.type === 'mcq' ? editingQ.options.filter(o => o.text.trim()) : undefined,
      };

      let saved: any;
      if (editingQ.id) {
        saved = await assessmentsApi.updateQuestion(assessmentId, editingQ.id, payload);
      } else {
        saved = await assessmentsApi.addQuestion(assessmentId, payload);
      }

      const normalized: Question = {
        id: saved.id, type: saved.type, text: saved.text, points: saved.points,
        explanation: saved.explanation ?? '', correctAnswer: saved.correct_answer ?? '',
        options: saved.options ?? [], orderIndex: saved.order_index,
      };

      if (editingIdx !== null) {
        setQuestions(prev => prev.map((q, i) => i === editingIdx ? normalized : q));
      } else {
        setQuestions(prev => [...prev, normalized]);
      }
      setEditingQ(null);
      setEditingIdx(null);
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const deleteQuestion = async (idx: number) => {
    const q = questions[idx];
    if (!assessmentId || !q.id) { setQuestions(prev => prev.filter((_, i) => i !== idx)); return; }
    try {
      await assessmentsApi.deleteQuestion(assessmentId, q.id);
      setQuestions(prev => prev.filter((_, i) => i !== idx));
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <div className={clsx(
          'fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-fade-in',
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        )}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/assessments')} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{isEdit ? 'Edit Assessment' : 'New Assessment'}</h1>
            {status !== 'draft' && (
              <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full',
                status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600')}>
                {status}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={saveAssessment} disabled={saving} className="btn-secondary flex items-center gap-1.5 text-sm">
            <Save size={14} /> {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button onClick={publishAssessment} disabled={publishing} className="btn-primary flex items-center gap-1.5 text-sm">
            <Send size={14} /> {publishing ? 'Working…' : status === 'published' ? 'Close' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Details Card */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">Assessment Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Title *</label>
            <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Chapter 5 Chemistry Quiz" />
          </div>
          <div>
            <label className="label">Subject *</label>
            <select className="input" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}>
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {[['quiz','Quiz'],['exam','Exam'],['homework','Homework'],['practice','Practice'],['wassce','WASSCE']].map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Time Limit (minutes)</label>
            <input className="input" type="number" min={1} placeholder="Leave blank for no limit"
              value={form.timeLimitMins} onChange={e => setForm(f => ({ ...f, timeLimitMins: e.target.value }))} />
          </div>
          <div>
            <label className="label">Max Attempts</label>
            <input className="input" type="number" min={1} max={10}
              value={form.maxAttempts} onChange={e => setForm(f => ({ ...f, maxAttempts: parseInt(e.target.value) || 1 }))} />
          </div>
          <div>
            <label className="label">Passing Score (%)</label>
            <input className="input" type="number" min={0} max={100}
              value={form.passingScore} onChange={e => setForm(f => ({ ...f, passingScore: parseFloat(e.target.value) || 50 }))} />
          </div>
          <div>
            <label className="label">Closes At (optional)</label>
            <input className="input" type="datetime-local"
              value={form.closesAt} onChange={e => setForm(f => ({ ...f, closesAt: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Instructions (shown to students before starting)</label>
            <textarea className="input min-h-[80px] resize-none" placeholder="Any instructions or notes for students…"
              value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} />
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
              <input type="checkbox" checked={form.shuffleQuestions} onChange={e => setForm(f => ({ ...f, shuffleQuestions: e.target.checked }))}
                className="w-4 h-4 rounded accent-primary-600" />
              Shuffle questions
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
              <input type="checkbox" checked={form.shuffleOptions} onChange={e => setForm(f => ({ ...f, shuffleOptions: e.target.checked }))}
                className="w-4 h-4 rounded accent-primary-600" />
              Shuffle options
            </label>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">
            Questions ({questions.length})
          </h2>
          <button onClick={openAddQuestion} disabled={!assessmentId}
            title={!assessmentId ? 'Save assessment details first' : ''}
            className="btn-primary text-sm flex items-center gap-1.5 py-1.5">
            <Plus size={14} /> Add Question
          </button>
        </div>

        {!assessmentId && (
          <p className="text-sm text-slate-400 italic">Save the assessment details above before adding questions.</p>
        )}

        {questions.length === 0 && assessmentId && (
          <div className="text-center py-8 text-slate-400">
            <Plus size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No questions yet. Click "Add Question" to start building.</p>
          </div>
        )}

        <div className="space-y-2">
          {questions.map((q, idx) => (
            <div key={q.id ?? idx} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50 group transition-colors">
              <GripVertical size={16} className="text-slate-300 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold text-slate-400">Q{idx + 1}</span>
                  <span className="text-xs px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-500 capitalize">{QUESTION_TYPES.find(t => t.value === q.type)?.label ?? q.type}</span>
                  <span className="text-xs text-slate-400">{q.points} pt{q.points !== 1 ? 's' : ''}</span>
                </div>
                <p className="text-sm text-slate-700 line-clamp-2">{q.text}</p>
                {q.type === 'mcq' && (
                  <p className="text-xs text-slate-400 mt-0.5">{q.options.length} options · {q.options.filter(o => o.isCorrect).length} correct</p>
                )}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button onClick={() => openEditQuestion(idx)} className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-white transition-colors">
                  <Edit3 size={14} />
                </button>
                <button onClick={() => deleteQuestion(idx)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-white transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Question Editor Modal */}
      {editingQ && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setEditingQ(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h3 className="font-bold text-slate-900">{editingIdx !== null ? 'Edit Question' : 'Add Question'}</h3>
              <button onClick={() => setEditingQ(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Question Type</label>
                  <select className="input" value={editingQ.type}
                    onChange={e => setEditingQ(q => q ? {
                      ...q, type: e.target.value,
                      options: e.target.value === 'mcq' ? [
                        { text: '', isCorrect: true, orderIndex: 0 }, { text: '', isCorrect: false, orderIndex: 1 },
                        { text: '', isCorrect: false, orderIndex: 2 }, { text: '', isCorrect: false, orderIndex: 3 },
                      ] : [],
                      correctAnswer: '',
                    } : q)}>
                    {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Points</label>
                  <input className="input" type="number" min={0.5} step={0.5} value={editingQ.points}
                    onChange={e => setEditingQ(q => q ? { ...q, points: parseFloat(e.target.value) || 1 } : q)} />
                </div>
              </div>

              <div>
                <label className="label">Question Text *</label>
                <textarea className="input min-h-[80px] resize-none" placeholder="Enter the question…"
                  value={editingQ.text} onChange={e => setEditingQ(q => q ? { ...q, text: e.target.value } : q)} />
              </div>

              {/* MCQ options */}
              {editingQ.type === 'mcq' && (
                <div className="space-y-2">
                  <label className="label">Answer Options <span className="text-slate-400 font-normal">(check correct answer)</span></label>
                  {editingQ.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input type="radio" name="correct" checked={opt.isCorrect}
                        onChange={() => setQOption(i, 'isCorrect', true)}
                        className="w-4 h-4 accent-emerald-500 flex-shrink-0" />
                      <input className="input flex-1 text-sm py-1.5" placeholder={`Option ${i + 1}`}
                        value={opt.text} onChange={e => setQOption(i, 'text', e.target.value)} />
                      {editingQ.options.length > 2 && (
                        <button onClick={() => removeOption(i)} className="p-1 text-slate-400 hover:text-red-500">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  {editingQ.options.length < 6 && (
                    <button onClick={addOption} className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 mt-1">
                      <Plus size={12} /> Add option
                    </button>
                  )}
                </div>
              )}

              {/* True/False */}
              {editingQ.type === 'true_false' && (
                <div>
                  <label className="label">Correct Answer</label>
                  <div className="flex gap-3">
                    {['True', 'False'].map(v => (
                      <label key={v} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input type="radio" name="tf" value={v} checked={editingQ.correctAnswer === v}
                          onChange={() => setEditingQ(q => q ? { ...q, correctAnswer: v } : q)}
                          className="w-4 h-4 accent-emerald-500" />
                        {v}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Short answer */}
              {editingQ.type === 'short_answer' && (
                <div>
                  <label className="label">Correct Answer <span className="text-slate-400 font-normal">(case-insensitive match)</span></label>
                  <input className="input" placeholder="Expected answer…"
                    value={editingQ.correctAnswer}
                    onChange={e => setEditingQ(q => q ? { ...q, correctAnswer: e.target.value } : q)} />
                </div>
              )}

              <div>
                <label className="label">Explanation <span className="text-slate-400 font-normal">(shown after submission)</span></label>
                <textarea className="input min-h-[60px] resize-none text-sm" placeholder="Optional explanation or marking notes…"
                  value={editingQ.explanation}
                  onChange={e => setEditingQ(q => q ? { ...q, explanation: e.target.value } : q)} />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditingQ(null)} className="flex-1 btn-secondary">Cancel</button>
                <button onClick={saveQuestion} className="flex-1 btn-primary">
                  {editingIdx !== null ? 'Update Question' : 'Add Question'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

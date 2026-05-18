import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { assessmentsApi, questionBankApi } from '../lib/api';
import {
  Save, Send, ArrowLeft, Plus, Trash2, Edit3, GripVertical,
  CheckCircle2, X, AlertCircle, Sparkles, BookOpen, Database,
  ChevronDown, ChevronUp, Loader2, BookMarked, Search, Filter,
} from 'lucide-react';
import clsx from 'clsx';

const SUBJECTS = [
  'Mathematics','English Language','Integrated Science','Chemistry',
  'Physics','Biology','History','Geography','Economics',
  'Government','Literature','ICT','Art','Music','PE',
];
const QUESTION_TYPES = [
  { value: 'mcq', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'essay', label: 'Essay' },
];
const TYPE_LABELS: Record<string, string> = {
  mcq: 'MCQ', true_false: 'T/F', short_answer: 'Short', essay: 'Essay', mixed: 'Mixed',
};

interface Option { id?: number; text: string; isCorrect: boolean; orderIndex: number }
interface Question {
  id?: number; type: string; text: string; points: number;
  explanation: string; correctAnswer: string; options: Option[]; orderIndex?: number;
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
    semester: 1, academicYear: '2024-2025', closesAt: '', classId: '',
  });
  const [questions, setQuestions]   = useState<Question[]>([]);
  const [editingQ, setEditingQ]     = useState<Question | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [saving, setSaving]         = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [toast, setToast]           = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [assessmentId, setAssessmentId] = useState<number | null>(null);
  const [status, setStatus]         = useState('draft');

  // ── AI Generation state ──────────────────────────────────────────────────
  const [showAI, setShowAI]         = useState(false);
  const [aiTab, setAiTab]           = useState<'topic'|'notes'>('topic');
  const [aiForm, setAiForm]         = useState({ topic: '', notes: '', count: 5, type: 'mcq', difficulty: 'medium' });
  const [aiLoading, setAiLoading]   = useState(false);
  const [aiResults, setAiResults]   = useState<any[]>([]);
  const [aiSelected, setAiSelected] = useState<Set<number>>(new Set());
  const [aiError, setAiError]       = useState('');
  const [aiAdding, setAiAdding]     = useState(false);

  // ── Library Browser state ─────────────────────────────────────────────────
  const [showLib, setShowLib]       = useState(false);
  const [libSearch, setLibSearch]   = useState('');
  const [libType, setLibType]       = useState('');
  const [libResults, setLibResults] = useState<any[]>([]);
  const [libLoading, setLibLoading] = useState(false);
  const [libSelected, setLibSelected] = useState<Set<number>>(new Set());
  const [libAdding, setLibAdding]   = useState(false);

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
    setTimeout(() => setToast(null), 3500);
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

  const saveQuestion = async () => {
    if (!editingQ) return;
    if (!editingQ.text.trim()) { showToast('error', 'Question text is required'); return; }
    if (editingQ.type === 'mcq' && editingQ.options.filter(o => o.text.trim()).length < 2) {
      showToast('error', 'MCQ needs at least 2 options'); return;
    }
    if (editingQ.type === 'mcq' && !editingQ.options.some(o => o.isCorrect)) {
      showToast('error', 'Mark at least one option as correct'); return;
    }
    if (!assessmentId) { showToast('error', 'Save the assessment details first'); return; }
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
      setEditingQ(null); setEditingIdx(null);
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

  const saveQuestionToBank = async (idx: number) => {
    const q = questions[idx];
    try {
      await questionBankApi.create({
        subject: form.subject,
        type: q.type, text: q.text, points: q.points,
        options: q.options?.length ? q.options : undefined,
        correctAnswer: q.correctAnswer || null,
        explanation: q.explanation || null,
      });
      showToast('success', 'Saved to question bank');
    } catch {
      showToast('error', 'Failed to save to bank');
    }
  };

  // ── AI Generation ──────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (aiTab === 'topic' && !aiForm.topic.trim()) { setAiError('Enter a topic first'); return; }
    if (aiTab === 'notes' && !aiForm.notes.trim()) { setAiError('Paste some notes first'); return; }
    setAiLoading(true); setAiError(''); setAiResults([]);
    try {
      const qs = await questionBankApi.generateQuestions({
        topic: aiTab === 'topic' ? aiForm.topic : undefined,
        notes: aiTab === 'notes' ? aiForm.notes : undefined,
        count: aiForm.count,
        type: aiForm.type,
        subject: form.subject,
        difficulty: aiForm.difficulty,
      });
      setAiResults(qs);
      setAiSelected(new Set(qs.map((_: any, i: number) => i)));
    } catch (err: any) {
      setAiError(err.response?.data?.error ?? err.message ?? 'Generation failed');
    } finally {
      setAiLoading(false);
    }
  };

  const addGeneratedQuestions = async () => {
    if (!assessmentId) { showToast('error', 'Save assessment details first'); return; }
    setAiAdding(true);
    const toAdd = aiResults.filter((_, i) => aiSelected.has(i));
    let added = 0;
    for (const q of toAdd) {
      try {
        const saved: any = await assessmentsApi.addQuestion(assessmentId, {
          type: q.type, text: q.text, points: q.points,
          explanation: q.explanation || null, correctAnswer: q.correctAnswer || null,
          options: q.type === 'mcq' ? q.options : undefined,
        });
        setQuestions(prev => [...prev, {
          id: saved.id, type: saved.type, text: saved.text, points: saved.points,
          explanation: saved.explanation ?? '', correctAnswer: saved.correct_answer ?? '',
          options: saved.options ?? [], orderIndex: saved.order_index,
        }]);
        added++;
      } catch {}
    }
    setAiAdding(false); setShowAI(false); setAiResults([]); setAiSelected(new Set());
    showToast('success', `Added ${added} question${added !== 1 ? 's' : ''}`);
  };

  // ── Library Browser ────────────────────────────────────────────────────────
  const openLibrary = async () => {
    setShowLib(true); setLibLoading(true); setLibSelected(new Set());
    try {
      const qs = await questionBankApi.list({ subject: form.subject });
      setLibResults(qs);
    } catch { setLibResults([]); } finally { setLibLoading(false); }
  };

  const importLibraryQuestions = async () => {
    if (!assessmentId) { showToast('error', 'Save assessment details first'); return; }
    setLibAdding(true);
    const filtered = libResults.filter(q =>
      (!libSearch || q.text.toLowerCase().includes(libSearch.toLowerCase())) &&
      (!libType || q.type === libType)
    );
    const toImport = filtered.filter(q => libSelected.has(q.id));
    let imported = 0;
    for (const bq of toImport) {
      try {
        const saved: any = await assessmentsApi.addQuestion(assessmentId, {
          type: bq.type, text: bq.text, points: bq.points,
          explanation: bq.explanation || null, correctAnswer: bq.correctAnswer || null,
          options: bq.options?.length ? bq.options : undefined,
        });
        setQuestions(prev => [...prev, {
          id: saved.id, type: saved.type, text: saved.text, points: saved.points,
          explanation: saved.explanation ?? '', correctAnswer: saved.correct_answer ?? '',
          options: saved.options ?? [], orderIndex: saved.order_index,
        }]);
        imported++;
      } catch {}
    }
    setLibAdding(false); setShowLib(false); setLibSelected(new Set());
    showToast('success', `Imported ${imported} question${imported !== 1 ? 's' : ''}`);
  };

  const filteredLib = libResults.filter(q =>
    (!libSearch || q.text.toLowerCase().includes(libSearch.toLowerCase()) || (q.tags ?? '').toLowerCase().includes(libSearch.toLowerCase())) &&
    (!libType || q.type === libType)
  );

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
            <label className="label">Instructions</label>
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
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">
            Questions ({questions.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setShowAI(true); setAiResults([]); setAiError(''); }}
              disabled={!assessmentId}
              title={!assessmentId ? 'Save assessment details first' : 'Generate questions with AI'}
              className={clsx('flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl font-medium transition-all border',
                assessmentId
                  ? 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100'
                  : 'border-slate-200 text-slate-400 cursor-not-allowed')}
            >
              <Sparkles size={14} /> AI Generate
            </button>
            <button
              onClick={openLibrary}
              disabled={!assessmentId}
              title={!assessmentId ? 'Save assessment details first' : 'Browse question library'}
              className={clsx('flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl font-medium transition-all border',
                assessmentId
                  ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                  : 'border-slate-200 text-slate-400 cursor-not-allowed')}
            >
              <BookOpen size={14} /> Browse Library
            </button>
            <button onClick={openAddQuestion} disabled={!assessmentId}
              title={!assessmentId ? 'Save assessment details first' : ''}
              className="btn-primary text-sm flex items-center gap-1.5 py-1.5">
              <Plus size={14} /> Add Question
            </button>
          </div>
        </div>

        {!assessmentId && (
          <p className="text-sm text-slate-400 italic">Save the assessment details above before adding questions.</p>
        )}
        {questions.length === 0 && assessmentId && (
          <div className="text-center py-8 text-slate-400">
            <Plus size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No questions yet. Add manually, use AI, or browse the library.</p>
          </div>
        )}

        <div className="space-y-2">
          {questions.map((q, idx) => (
            <div key={q.id ?? idx} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50 group transition-colors">
              <GripVertical size={16} className="text-slate-300 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold text-slate-400">Q{idx + 1}</span>
                  <span className="text-xs px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-500 capitalize">
                    {QUESTION_TYPES.find(t => t.value === q.type)?.label ?? q.type}
                  </span>
                  <span className="text-xs text-slate-400">{q.points} pt{q.points !== 1 ? 's' : ''}</span>
                </div>
                <p className="text-sm text-slate-700 line-clamp-2">{q.text}</p>
                {q.type === 'mcq' && (
                  <p className="text-xs text-slate-400 mt-0.5">{q.options.length} options</p>
                )}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button onClick={() => saveQuestionToBank(idx)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-white transition-colors" title="Save to library">
                  <BookMarked size={14} />
                </button>
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
                        <button onClick={() => setEditingQ(prev => prev ? {
                          ...prev, options: prev.options.filter((_, oi) => oi !== i).map((o, oi) => ({ ...o, orderIndex: oi }))
                        } : prev)} className="p-1 text-slate-400 hover:text-red-500"><X size={14} /></button>
                      )}
                    </div>
                  ))}
                  {editingQ.options.length < 6 && (
                    <button onClick={() => setEditingQ(prev => prev ? {
                      ...prev, options: [...prev.options, { text: '', isCorrect: false, orderIndex: prev.options.length }]
                    } : prev)} className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 mt-1">
                      <Plus size={12} /> Add option
                    </button>
                  )}
                </div>
              )}
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
                <textarea className="input min-h-[60px] resize-none text-sm" placeholder="Optional explanation…"
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

      {/* AI Generation Modal */}
      {showAI && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => { if (!aiLoading) setShowAI(false); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center">
                  <Sparkles size={14} className="text-violet-600" />
                </div>
                <h3 className="font-bold text-slate-900">AI Question Generator</h3>
              </div>
              <button onClick={() => setShowAI(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Mode tabs */}
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                {[['topic','By Topic'],['notes','From Notes']].map(([v, l]) => (
                  <button key={v} onClick={() => setAiTab(v as 'topic'|'notes')}
                    className={clsx('flex-1 py-1.5 rounded-lg text-sm font-medium transition-all',
                      aiTab === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                    {l}
                  </button>
                ))}
              </div>

              {aiTab === 'topic' ? (
                <div>
                  <label className="label">Topic *</label>
                  <input className="input" placeholder={`e.g. Photosynthesis, Newton's Laws, World War II…`}
                    value={aiForm.topic} onChange={e => setAiForm(f => ({ ...f, topic: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && !aiLoading && handleGenerate()} />
                </div>
              ) : (
                <div>
                  <label className="label">Paste Your Notes / Study Material *</label>
                  <textarea className="input min-h-[140px] resize-y text-sm" placeholder="Paste chapter notes, lecture content, or any text to generate questions from…"
                    value={aiForm.notes} onChange={e => setAiForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Question Type</label>
                  <select className="input text-sm" value={aiForm.type} onChange={e => setAiForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="mcq">Multiple Choice</option>
                    <option value="true_false">True / False</option>
                    <option value="short_answer">Short Answer</option>
                    <option value="essay">Essay</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
                <div>
                  <label className="label">Difficulty</label>
                  <select className="input text-sm" value={aiForm.difficulty} onChange={e => setAiForm(f => ({ ...f, difficulty: e.target.value }))}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="label">Count</label>
                  <input className="input text-sm" type="number" min={1} max={20} value={aiForm.count}
                    onChange={e => setAiForm(f => ({ ...f, count: Math.min(20, Math.max(1, parseInt(e.target.value) || 5)) }))} />
                </div>
              </div>

              {aiError && (
                <div className={clsx('flex items-start gap-2 p-3 rounded-xl text-sm border',
                  aiError.includes('not configured') || aiError.includes('OPENAI_API_KEY')
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : aiError.includes('credits') || aiError.includes('quota') || aiError.includes('billing')
                    ? 'bg-orange-50 border-orange-200 text-orange-800'
                    : 'bg-red-50 border-red-200 text-red-700')}>
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">{aiError}</p>
                    {(aiError.includes('not configured') || aiError.includes('OPENAI_API_KEY')) && (
                      <p className="mt-1 text-xs">Go to <strong>Replit Secrets</strong> and add <code className="bg-amber-100 px-1 rounded">OPENAI_API_KEY</code> with your OpenAI API key.</p>
                    )}
                    {(aiError.includes('credits') || aiError.includes('quota') || aiError.includes('billing')) && (
                      <p className="mt-1 text-xs">Add billing credits at <a href="https://platform.openai.com/billing" target="_blank" rel="noreferrer" className="underline font-semibold">platform.openai.com/billing</a>, then try again.</p>
                    )}
                  </div>
                </div>
              )}

              <button onClick={handleGenerate} disabled={aiLoading}
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-60">
                {aiLoading
                  ? <><Loader2 size={15} className="animate-spin" /> Generating {aiForm.count} questions…</>
                  : <><Sparkles size={15} /> Generate Questions</>}
              </button>

              {/* Generated results */}
              {aiResults.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">{aiResults.length} questions generated</p>
                    <div className="flex gap-2 text-xs">
                      <button onClick={() => setAiSelected(new Set(aiResults.map((_, i) => i)))} className="text-primary-600 hover:underline">Select all</button>
                      <span className="text-slate-300">·</span>
                      <button onClick={() => setAiSelected(new Set())} className="text-slate-500 hover:underline">Clear</button>
                    </div>
                  </div>
                  {aiResults.map((q: any, i: number) => (
                    <label key={i} className={clsx('flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
                      aiSelected.has(i) ? 'border-violet-300 bg-violet-50' : 'border-slate-200 hover:border-slate-300')}>
                      <input type="checkbox" checked={aiSelected.has(i)}
                        onChange={e => setAiSelected(prev => {
                          const s = new Set(prev);
                          e.target.checked ? s.add(i) : s.delete(i);
                          return s;
                        })}
                        className="w-4 h-4 accent-violet-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={clsx('text-xs px-1.5 py-0.5 rounded font-semibold',
                            q.type === 'mcq' ? 'bg-blue-100 text-blue-700' :
                            q.type === 'true_false' ? 'bg-green-100 text-green-700' :
                            q.type === 'short_answer' ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700')}>
                            {TYPE_LABELS[q.type] ?? q.type}
                          </span>
                          <span className="text-xs text-slate-400">{q.points} pt{q.points !== 1 ? 's' : ''}</span>
                        </div>
                        <p className="text-sm text-slate-800 font-medium line-clamp-2">{q.text}</p>
                        {q.type === 'mcq' && q.options?.length > 0 && (
                          <p className="text-xs text-slate-400 mt-0.5">{q.options.length} options</p>
                        )}
                        {(q.type === 'true_false' || q.type === 'short_answer') && q.correctAnswer && (
                          <p className="text-xs text-emerald-600 mt-0.5">Answer: {q.correctAnswer}</p>
                        )}
                      </div>
                    </label>
                  ))}
                  <button onClick={addGeneratedQuestions} disabled={aiAdding || aiSelected.size === 0}
                    className="w-full btn-primary flex items-center justify-center gap-2 mt-2 disabled:opacity-60">
                    {aiAdding
                      ? <><Loader2 size={14} className="animate-spin" /> Adding…</>
                      : <><Plus size={14} /> Add {aiSelected.size} Selected Question{aiSelected.size !== 1 ? 's' : ''}</>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Library Browser Modal */}
      {showLib && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => { if (!libAdding) setShowLib(false); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BookOpen size={14} className="text-blue-600" />
                </div>
                <h3 className="font-bold text-slate-900">Question Library</h3>
                <span className="text-xs text-slate-400">({form.subject})</span>
              </div>
              <button onClick={() => setShowLib(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Filters */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className="input pl-8 text-sm" placeholder="Search questions…"
                    value={libSearch} onChange={e => setLibSearch(e.target.value)} />
                </div>
                <select className="input text-sm w-40" value={libType} onChange={e => setLibType(e.target.value)}>
                  <option value="">All types</option>
                  {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              {libLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-slate-400" />
                </div>
              ) : filteredLib.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Database size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{libResults.length === 0
                    ? `No ${form.subject} questions in the library yet. Add questions from your assessments or the Question Bank page.`
                    : 'No questions match your search.'}</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">{filteredLib.length} question{filteredLib.length !== 1 ? 's' : ''} found</p>
                    <div className="flex gap-2 text-xs">
                      <button onClick={() => setLibSelected(new Set(filteredLib.map(q => q.id)))} className="text-primary-600 hover:underline">Select all</button>
                      <span className="text-slate-300">·</span>
                      <button onClick={() => setLibSelected(new Set())} className="text-slate-500 hover:underline">Clear</button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {filteredLib.map((q: any) => (
                      <label key={q.id} className={clsx('flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
                        libSelected.has(q.id) ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:border-slate-300')}>
                        <input type="checkbox" checked={libSelected.has(q.id)}
                          onChange={e => setLibSelected(prev => {
                            const s = new Set(prev);
                            e.target.checked ? s.add(q.id) : s.delete(q.id);
                            return s;
                          })}
                          className="w-4 h-4 accent-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={clsx('text-xs px-1.5 py-0.5 rounded font-semibold',
                              q.type === 'mcq' ? 'bg-blue-100 text-blue-700' :
                              q.type === 'true_false' ? 'bg-green-100 text-green-700' :
                              q.type === 'short_answer' ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700')}>
                              {TYPE_LABELS[q.type] ?? q.type}
                            </span>
                            <span className="text-xs text-slate-400">{q.points} pt{q.points !== 1 ? 's' : ''}</span>
                          </div>
                          <p className="text-sm text-slate-800 line-clamp-2">{q.text}</p>
                          {q.options?.length > 0 && (
                            <p className="text-xs text-slate-400 mt-0.5">{q.options.length} options</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                  <button onClick={importLibraryQuestions} disabled={libAdding || libSelected.size === 0}
                    className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-60">
                    {libAdding
                      ? <><Loader2 size={14} className="animate-spin" /> Importing…</>
                      : <><Plus size={14} /> Import {libSelected.size} Selected Question{libSelected.size !== 1 ? 's' : ''}</>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

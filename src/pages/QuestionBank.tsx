import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { questionBankApi, assessmentsApi } from '../lib/api';
import {
  Database, Plus, Search, Trash2, BookOpen, ChevronDown, ChevronUp,
  X, CheckCircle2, AlertCircle, Filter, Download, RefreshCw
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
const TYPE_COLORS: Record<string, string> = {
  mcq: 'bg-blue-100 text-blue-700',
  true_false: 'bg-green-100 text-green-700',
  short_answer: 'bg-amber-100 text-amber-700',
  essay: 'bg-purple-100 text-purple-700',
};

export default function QuestionBank() {
  const navigate = useNavigate();
  const [items, setItems]               = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [searchQ, setSearchQ]           = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterType, setFilterType]     = useState('');
  const [expanded, setExpanded]         = useState<Set<number>>(new Set());
  const [deleting, setDeleting]         = useState<number | null>(null);
  const [toast, setToast]               = useState<{ type: 'success'|'error'; msg: string } | null>(null);

  // Add question manually
  const [showAdd, setShowAdd]           = useState(false);
  const defaultAdd = () => ({
    subject: 'Mathematics', type: 'mcq', text: '', points: 1, explanation: '', correctAnswer: '',
    options: [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ],
  });
  const [addForm, setAddForm]           = useState(defaultAdd());
  const [addSaving, setAddSaving]       = useState(false);

  // Import from assessment
  const [showImport, setShowImport]     = useState(false);
  const [myAssessments, setMyAssessments] = useState<any[]>([]);
  const [importId, setImportId]         = useState('');
  const [importing, setImporting]       = useState(false);

  const showToast = (type: 'success'|'error', msg: string) => {
    setToast({ type, msg }); setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    questionBankApi.list().then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => items.filter(q =>
    (!filterSubject || q.subject.toLowerCase() === filterSubject.toLowerCase()) &&
    (!filterType    || q.type === filterType) &&
    (!searchQ       || q.text.toLowerCase().includes(searchQ.toLowerCase()) ||
                       (q.tags ?? '').toLowerCase().includes(searchQ.toLowerCase()))
  ), [items, filterSubject, filterType, searchQ]);

  const toggle = (id: number) => setExpanded(prev => {
    const s = new Set(prev);
    s.has(id) ? s.delete(id) : s.add(id);
    return s;
  });

  const handleDelete = async (id: number) => {
    if (!confirm('Remove this question from the bank?')) return;
    setDeleting(id);
    try {
      await questionBankApi.remove(id);
      setItems(prev => prev.filter(q => q.id !== id));
      showToast('success', 'Question removed');
    } catch { showToast('error', 'Failed to delete'); } finally { setDeleting(null); }
  };

  const handleAddSave = async () => {
    if (!addForm.text.trim()) { showToast('error', 'Question text is required'); return; }
    if (addForm.type === 'mcq' && !addForm.options.some(o => o.isCorrect)) {
      showToast('error', 'Mark a correct answer'); return;
    }
    setAddSaving(true);
    try {
      const saved = await questionBankApi.create({
        subject: addForm.subject,
        type: addForm.type,
        text: addForm.text,
        points: addForm.points,
        explanation: addForm.explanation || null,
        correctAnswer: addForm.correctAnswer || null,
        options: addForm.type === 'mcq' ? addForm.options.filter(o => o.text.trim()) : undefined,
      });
      setItems(prev => [saved, ...prev]);
      setShowAdd(false);
      setAddForm(defaultAdd());
      showToast('success', 'Question added to bank');
    } catch { showToast('error', 'Failed to save'); } finally { setAddSaving(false); }
  };

  const openImport = async () => {
    setShowImport(true);
    if (myAssessments.length === 0) {
      const data = await assessmentsApi.list().catch(() => []);
      setMyAssessments(data);
    }
  };

  const handleImport = async () => {
    if (!importId) return;
    const asmnt = myAssessments.find((a: any) => String(a.id) === importId);
    if (!asmnt) return;
    setImporting(true);
    try {
      const result: any = await questionBankApi.importAssessment(parseInt(importId), asmnt.subject);
      showToast('success', `Imported ${result.imported} question${result.imported !== 1 ? 's' : ''}`);
      const fresh = await questionBankApi.list();
      setItems(fresh);
      setShowImport(false);
      setImportId('');
    } catch (err: any) {
      showToast('error', err.response?.data?.error ?? 'Import failed');
    } finally { setImporting(false); }
  };

  const subjects = useMemo(() => Array.from(new Set(items.map(q => q.subject))).sort(), [items]);
  const counts   = useMemo(() => ({
    total: items.length,
    mcq: items.filter(q => q.type === 'mcq').length,
    tf: items.filter(q => q.type === 'true_false').length,
    sa: items.filter(q => q.type === 'short_answer').length,
  }), [items]);

  return (
    <div className="space-y-6">
      {toast && (
        <div className={clsx('fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-fade-in',
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white')}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Question Bank</h1>
          <p className="text-sm text-slate-500 mt-0.5">Reusable question library — import into any assessment</p>
        </div>
        <div className="flex gap-2">
          <button onClick={openImport} className="btn-secondary flex items-center gap-1.5 text-sm">
            <Download size={14} /> Import from Assessment
          </button>
          <button onClick={() => { setShowAdd(true); setAddForm(defaultAdd()); }} className="btn-primary flex items-center gap-1.5 text-sm">
            <Plus size={14} /> Add Question
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: counts.total, color: 'text-slate-700' },
          { label: 'MCQ', value: counts.mcq, color: 'text-blue-600' },
          { label: 'True / False', value: counts.tf, color: 'text-green-600' },
          { label: 'Short Answer', value: counts.sa, color: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9 text-sm" placeholder="Search questions or tags…"
            value={searchQ} onChange={e => setSearchQ(e.target.value)} />
        </div>
        <select className="input text-sm sm:w-48" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
          <option value="">All subjects</option>
          {subjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input text-sm sm:w-44" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All types</option>
          {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* Questions list */}
      {loading ? (
        <div className="flex items-center justify-center min-h-64">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <Database size={40} className="mx-auto text-slate-300 mb-4" />
          <h3 className="font-semibold text-slate-700 mb-1">
            {items.length === 0 ? 'Your question bank is empty' : 'No questions match your filters'}
          </h3>
          <p className="text-sm text-slate-400 mb-4">
            {items.length === 0
              ? 'Add questions manually, import from an assessment, or generate them with AI in the Assessment Builder.'
              : 'Try adjusting your search or filters.'}
          </p>
          {items.length === 0 && (
            <div className="flex flex-wrap gap-2 justify-center">
              <button onClick={openImport} className="btn-secondary text-sm flex items-center gap-1.5">
                <Download size={13} /> Import from Assessment
              </button>
              <button onClick={() => navigate('/assessments/new')} className="btn-primary text-sm flex items-center gap-1.5">
                <BookOpen size={13} /> Open Assessment Builder
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-slate-400 pl-1">{filtered.length} question{filtered.length !== 1 ? 's' : ''}</p>
          {filtered.map((q: any) => (
            <div key={q.id} className="card overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50/70 transition-colors"
                onClick={() => toggle(q.id)}>
                <span className={clsx('text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0', TYPE_COLORS[q.type] ?? 'bg-slate-100 text-slate-600')}>
                  {QUESTION_TYPES.find(t => t.value === q.type)?.label ?? q.type}
                </span>
                <p className="flex-1 text-sm font-medium text-slate-800 line-clamp-1">{q.text}</p>
                <span className="text-xs text-slate-400 flex-shrink-0">{q.subject}</span>
                <span className="text-xs text-slate-400 flex-shrink-0">{q.points} pt{q.points !== 1 ? 's' : ''}</span>
                <button onClick={e => { e.stopPropagation(); handleDelete(q.id); }} disabled={deleting === q.id}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                  <Trash2 size={13} />
                </button>
                {expanded.has(q.id) ? <ChevronUp size={14} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />}
              </div>
              {expanded.has(q.id) && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-50 space-y-3">
                  <p className="text-sm text-slate-700">{q.text}</p>
                  {q.type === 'mcq' && q.options?.length > 0 && (
                    <div className="space-y-1.5">
                      {q.options.map((o: any, i: number) => (
                        <div key={i} className={clsx('flex items-center gap-2 text-sm px-2 py-1 rounded-lg',
                          o.isCorrect ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600')}>
                          {o.isCorrect ? <CheckCircle2 size={13} className="flex-shrink-0" /> : <span className="w-3 h-3 border border-slate-300 rounded-full flex-shrink-0 inline-block" />}
                          {o.text}
                        </div>
                      ))}
                    </div>
                  )}
                  {(q.type === 'true_false' || q.type === 'short_answer') && q.correctAnswer && (
                    <p className="text-sm text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle2 size={13} /> <strong>Answer:</strong> {q.correctAnswer}
                    </p>
                  )}
                  {q.explanation && (
                    <div className="text-xs text-blue-700 bg-blue-50 rounded-lg p-2 border border-blue-100">
                      <strong>Explanation:</strong> {q.explanation}
                    </div>
                  )}
                  {q.tags && (
                    <div className="flex flex-wrap gap-1">
                      {q.tags.split(',').filter(Boolean).map((t: string) => (
                        <span key={t} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{t.trim()}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Question Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h3 className="font-bold text-slate-900">Add to Question Bank</h3>
              <button onClick={() => setShowAdd(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Subject</label>
                  <select className="input" value={addForm.subject} onChange={e => setAddForm(f => ({ ...f, subject: e.target.value }))}>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Type</label>
                  <select className="input" value={addForm.type}
                    onChange={e => setAddForm(f => ({
                      ...f, type: e.target.value,
                      options: e.target.value === 'mcq' ? [{ text:'',isCorrect:true },{text:'',isCorrect:false},{text:'',isCorrect:false},{text:'',isCorrect:false}] : [],
                      correctAnswer: '',
                    }))}>
                    {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Points</label>
                  <input className="input" type="number" min={0.5} step={0.5} value={addForm.points}
                    onChange={e => setAddForm(f => ({ ...f, points: parseFloat(e.target.value) || 1 }))} />
                </div>
                <div>
                  <label className="label">Tags (comma-separated)</label>
                  <input className="input" placeholder="e.g. cell biology, photosynthesis"
                    onChange={e => setAddForm(f => ({ ...f, tags: e.target.value } as any))} />
                </div>
              </div>
              <div>
                <label className="label">Question Text *</label>
                <textarea className="input min-h-[80px] resize-none" placeholder="Enter the question…"
                  value={addForm.text} onChange={e => setAddForm(f => ({ ...f, text: e.target.value }))} />
              </div>
              {addForm.type === 'mcq' && (
                <div className="space-y-2">
                  <label className="label">Options <span className="text-slate-400 font-normal">(radio = correct)</span></label>
                  {addForm.options.map((o, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input type="radio" name="add-correct" checked={o.isCorrect}
                        onChange={() => setAddForm(f => ({ ...f, options: f.options.map((opt, oi) => ({ ...opt, isCorrect: oi === i })) }))}
                        className="w-4 h-4 accent-emerald-500 flex-shrink-0" />
                      <input className="input flex-1 text-sm py-1.5" placeholder={`Option ${i + 1}`}
                        value={o.text} onChange={e => setAddForm(f => ({
                          ...f, options: f.options.map((opt, oi) => oi === i ? { ...opt, text: e.target.value } : opt)
                        }))} />
                    </div>
                  ))}
                </div>
              )}
              {addForm.type === 'true_false' && (
                <div>
                  <label className="label">Correct Answer</label>
                  <div className="flex gap-3">
                    {['True','False'].map(v => (
                      <label key={v} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input type="radio" name="add-tf" value={v} checked={addForm.correctAnswer === v}
                          onChange={() => setAddForm(f => ({ ...f, correctAnswer: v }))}
                          className="w-4 h-4 accent-emerald-500" />
                        {v}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {addForm.type === 'short_answer' && (
                <div>
                  <label className="label">Correct Answer</label>
                  <input className="input" placeholder="Expected answer…" value={addForm.correctAnswer}
                    onChange={e => setAddForm(f => ({ ...f, correctAnswer: e.target.value }))} />
                </div>
              )}
              <div>
                <label className="label">Explanation (optional)</label>
                <textarea className="input min-h-[60px] resize-none text-sm" placeholder="Explanation shown after submission…"
                  value={addForm.explanation} onChange={e => setAddForm(f => ({ ...f, explanation: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAdd(false)} className="flex-1 btn-secondary">Cancel</button>
                <button onClick={handleAddSave} disabled={addSaving} className="flex-1 btn-primary">
                  {addSaving ? 'Saving…' : 'Add to Bank'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import from Assessment Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowImport(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Import from Assessment</h3>
              <button onClick={() => setShowImport(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-500">All questions from the selected assessment will be added to your question bank.</p>
              <div>
                <label className="label">Select Assessment</label>
                <select className="input" value={importId} onChange={e => setImportId(e.target.value)}>
                  <option value="">— choose an assessment —</option>
                  {myAssessments.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.title} ({a.question_count ?? 0} questions)</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowImport(false)} className="flex-1 btn-secondary">Cancel</button>
                <button onClick={handleImport} disabled={!importId || importing}
                  className="flex-1 btn-primary flex items-center justify-center gap-2">
                  {importing ? <><RefreshCw size={14} className="animate-spin" /> Importing…</> : <><Download size={14} /> Import All</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

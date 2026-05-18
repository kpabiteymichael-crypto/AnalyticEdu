import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { assessmentsApi } from '../lib/api';
import { Clock, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import clsx from 'clsx';

interface Option { id: number; text: string; orderIndex: number }
interface Question { id: number; type: string; text: string; points: number; options: Option[] }
interface Assessment {
  id: number; title: string; subject: string; instructions: string | null;
  time_limit_mins: number | null; passing_score: number; questions: Question[];
}

export default function TakeAssessment() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const assessmentId = parseInt(id!);

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [submissionId, setSubmissionId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, { selectedOptionId?: number; answerText?: string }>>({});
  const [phase, setPhase] = useState<'loading' | 'instructions' | 'taking' | 'submitting' | 'done'>('loading');
  const [currentQ, setCurrentQ] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [result, setResult] = useState<any>(null);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    assessmentsApi.get(assessmentId).then((data: any) => {
      setAssessment(data);
      setPhase('instructions');
    }).catch(() => navigate('/assessments'));
    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [assessmentId]);

  const startTest = async () => {
    try {
      const sub: any = await assessmentsApi.start(assessmentId);
      setSubmissionId(sub.id);
      setStartTime(Date.now());
      setPhase('taking');

      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);

      autoSaveRef.current = setInterval(async () => {
        if (sub.id) {
          const ansArr = Object.entries(answers).map(([qId, a]) => ({
            questionId: parseInt(qId), ...a,
          }));
          await assessmentsApi.saveProgress(assessmentId, { submissionId: sub.id, answers: ansArr }).catch(() => {});
        }
      }, 30000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSubmit = useCallback(async (auto = false) => {
    if (!submissionId || !assessment) return;
    if (!auto && !confirmSubmit) { setConfirmSubmit(true); return; }
    setConfirmSubmit(false);
    setPhase('submitting');

    if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const ansArr = Object.entries(answers).map(([qId, a]) => ({
        questionId: parseInt(qId), ...a,
      }));
      const res: any = await assessmentsApi.submit(assessmentId, {
        submissionId,
        answers: ansArr,
        timeTakenSecs: elapsed,
      });
      setResult(res);
      setPhase('done');
    } catch (err: any) {
      alert(err.message);
      setPhase('taking');
    }
  }, [submissionId, assessment, answers, elapsed, confirmSubmit]);

  // Auto-submit on timer expiry
  useEffect(() => {
    if (!assessment?.time_limit_mins || phase !== 'taking') return;
    const limit = assessment.time_limit_mins * 60;
    if (elapsed >= limit) handleSubmit(true);
  }, [elapsed, assessment, phase]);

  const setAnswer = (qId: number, val: Partial<{ selectedOptionId: number; answerText: string }>) => {
    setAnswers(prev => ({ ...prev, [qId]: { ...prev[qId], ...val } }));
  };

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  if (phase === 'loading') return (
    <div className="flex items-center justify-center min-h-96">
      <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (phase === 'instructions' && assessment) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">{assessment.title}</h1>
            <p className="text-slate-500 capitalize">{assessment.subject}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <div className="font-bold text-slate-800">{assessment.questions.length}</div>
              <div className="text-slate-500 text-xs">Questions</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <div className="font-bold text-slate-800">{assessment.time_limit_mins ? `${assessment.time_limit_mins} min` : '∞'}</div>
              <div className="text-slate-500 text-xs">Time Limit</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <div className="font-bold text-slate-800">{assessment.passing_score ?? 50}%</div>
              <div className="text-slate-500 text-xs">Passing Score</div>
            </div>
          </div>
          {assessment.instructions && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
              <p className="font-semibold mb-1">Instructions</p>
              <p className="whitespace-pre-wrap">{assessment.instructions}</p>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => navigate('/assessments')} className="flex-1 btn-secondary">Back</button>
            <button onClick={startTest} className="flex-1 btn-primary">Start Assessment</button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'submitting') return (
    <div className="flex items-center justify-center min-h-96 flex-col gap-4">
      <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-500">Submitting and marking your answers…</p>
    </div>
  );

  if (phase === 'done' && result) {
    const pct = result.percentage ?? (result.max_score > 0 ? Math.round(result.total_score / result.max_score * 100) : 0);
    const passed = pct >= (assessment?.passing_score ?? 50);
    return (
      <div className="max-w-lg mx-auto">
        <div className="card p-8 text-center space-y-6">
          <div className={clsx('w-20 h-20 mx-auto rounded-full flex items-center justify-center text-white text-3xl font-bold',
            passed ? 'bg-emerald-500' : 'bg-red-400')}>
            {pct}%
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{passed ? 'Well done!' : 'Keep practising'}</h2>
            <p className="text-slate-500 mt-1">
              You scored <strong>{result.total_score}</strong> out of <strong>{result.max_score}</strong> marks
            </p>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className={clsx('h-full rounded-full transition-all', passed ? 'bg-emerald-500' : 'bg-red-400')}
              style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/assessments')} className="flex-1 btn-secondary">Back</button>
            <button onClick={() => navigate(`/assessments/${assessmentId}/results`)} className="flex-1 btn-primary">View Detailed Results</button>
          </div>
        </div>
      </div>
    );
  }

  if (phase !== 'taking' || !assessment) return null;

  const qs = assessment.questions;
  const q = qs[currentQ];
  const ans = answers[q.id] ?? {};
  const answered = answers[q.id]?.selectedOptionId != null || (answers[q.id]?.answerText?.trim() !== '' && answers[q.id]?.answerText != null);
  const answeredCount = qs.filter(question => {
    const a = answers[question.id];
    return a?.selectedOptionId != null || (a?.answerText?.trim() !== '' && a?.answerText != null);
  }).length;
  const remaining = assessment.time_limit_mins ? assessment.time_limit_mins * 60 - elapsed : null;
  const timerDanger = remaining !== null && remaining < 60;

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-4">
      {/* Timer + progress bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>{answeredCount} / {qs.length} answered</span>
            <span>{Math.round(answeredCount / qs.length * 100)}%</span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-primary-600 rounded-full transition-all" style={{ width: `${answeredCount / qs.length * 100}%` }} />
          </div>
        </div>
        {remaining !== null && (
          <div className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-bold text-sm',
            timerDanger ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-700')}>
            <Clock size={14} />
            {fmtTime(Math.max(0, remaining))}
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Question panel */}
        <div className="flex-1 card p-6 space-y-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-400">Question {currentQ + 1} of {qs.length}</span>
              <span className="ml-2 text-xs px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded capitalize">{q.type.replace('_', ' ')}</span>
            </div>
            <span className="text-xs text-slate-400 flex-shrink-0">{q.points} pt{q.points !== 1 ? 's' : ''}</span>
          </div>

          <p className="text-slate-900 text-base font-medium leading-relaxed">{q.text}</p>

          {/* MCQ / True-False */}
          {(q.type === 'mcq' || q.type === 'true_false') && (
            <div className="space-y-2">
              {q.options.map(opt => (
                <label key={opt.id}
                  className={clsx(
                    'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
                    ans.selectedOptionId === opt.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  )}>
                  <input type="radio" name={`q-${q.id}`} value={opt.id}
                    checked={ans.selectedOptionId === opt.id}
                    onChange={() => setAnswer(q.id, { selectedOptionId: opt.id })}
                    className="w-4 h-4 accent-primary-600" />
                  <span className="text-slate-800 text-sm">{opt.text}</span>
                </label>
              ))}
            </div>
          )}

          {/* Short answer */}
          {q.type === 'short_answer' && (
            <input className="input" placeholder="Type your answer…"
              value={ans.answerText ?? ''}
              onChange={e => setAnswer(q.id, { answerText: e.target.value })} />
          )}

          {/* Essay */}
          {q.type === 'essay' && (
            <textarea className="input min-h-[160px] resize-y" placeholder="Write your answer here…"
              value={ans.answerText ?? ''}
              onChange={e => setAnswer(q.id, { answerText: e.target.value })} />
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <button onClick={() => setCurrentQ(q => Math.max(0, q - 1))} disabled={currentQ === 0}
              className="btn-secondary flex items-center gap-1.5 text-sm py-2 disabled:opacity-40">
              <ChevronLeft size={15} /> Previous
            </button>
            {currentQ < qs.length - 1 ? (
              <button onClick={() => setCurrentQ(q => Math.min(qs.length - 1, q + 1))}
                className="btn-primary flex items-center gap-1.5 text-sm py-2">
                Next <ChevronRight size={15} />
              </button>
            ) : (
              <button onClick={() => handleSubmit(false)}
                className="btn-primary flex items-center gap-1.5 text-sm py-2 bg-emerald-600 hover:bg-emerald-700">
                <Send size={14} /> Submit
              </button>
            )}
          </div>
        </div>

        {/* Question navigator */}
        <div className="card p-4 lg:w-48 flex-shrink-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Questions</p>
          <div className="grid grid-cols-5 lg:grid-cols-4 gap-1.5">
            {qs.map((question, i) => {
              const isAnswered = answers[question.id]?.selectedOptionId != null ||
                (answers[question.id]?.answerText?.trim() !== '' && answers[question.id]?.answerText != null);
              return (
                <button key={question.id} onClick={() => setCurrentQ(i)}
                  className={clsx(
                    'w-8 h-8 rounded-lg text-xs font-bold transition-all',
                    i === currentQ ? 'bg-primary-600 text-white shadow-md' :
                    isAnswered ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  )}>
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-4 space-y-1.5 text-xs text-slate-500">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-100 flex-shrink-0" /> Answered</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-100 flex-shrink-0" /> Not answered</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary-600 flex-shrink-0" /> Current</div>
          </div>
          <button onClick={() => handleSubmit(false)}
            className="w-full mt-4 btn-primary text-xs py-2 flex items-center justify-center gap-1.5">
            <Send size={12} /> Submit Test
          </button>
        </div>
      </div>

      {/* Confirm submit dialog */}
      {confirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setConfirmSubmit(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center animate-fade-in">
            <AlertCircle size={40} className="mx-auto text-amber-500 mb-3" />
            <h3 className="font-bold text-slate-900 text-lg">Submit Assessment?</h3>
            <p className="text-slate-500 text-sm mt-1">
              You have answered {answeredCount} of {qs.length} questions.
              {answeredCount < qs.length && ` ${qs.length - answeredCount} unanswered question${qs.length - answeredCount > 1 ? 's' : ''} will score zero.`}
            </p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setConfirmSubmit(false)} className="flex-1 btn-secondary">Review</button>
              <button onClick={() => handleSubmit(false)} className="flex-1 btn-primary bg-emerald-600 hover:bg-emerald-700">
                <Send size={14} className="mr-1.5" /> Confirm Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

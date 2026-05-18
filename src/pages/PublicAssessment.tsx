import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { publicAssessmentApi } from '../lib/api';
import {
  GraduationCap, Clock, BookOpen, CheckCircle2, AlertCircle,
  ChevronLeft, ChevronRight, Send, User, XCircle, Minus
} from 'lucide-react';
import clsx from 'clsx';

interface Option { id: number; text: string; orderIndex: number }
interface Question { id: number; type: string; text: string; points: number; options: Option[]; correctAnswer?: string; explanation?: string }
interface Assessment {
  id: number; title: string; subject: string; instructions: string | null;
  time_limit_mins: number | null; timeLimitMins?: number | null;
  passingScore: number; passing_score?: number; questions: Question[];
}

export default function PublicAssessment() {
  const { token } = useParams<{ token: string }>();

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [submissionId, setSubmissionId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, { selectedOptionId?: number; answerText?: string }>>({});
  const [phase, setPhase] = useState<'loading' | 'enter-name' | 'instructions' | 'taking' | 'submitting' | 'done'>('loading');
  const [participantName, setParticipantName] = useState('');
  const [currentQ, setCurrentQ] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!token) return;
    publicAssessmentApi.get(token).then((data: any) => {
      setAssessment(data);
      setPhase('enter-name');
    }).catch((err: any) => {
      setError(err.message ?? 'Assessment not found or not available');
      setPhase('done');
    });
    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [token]);

  const startTest = async () => {
    if (!participantName.trim()) return;
    try {
      const sub: any = await publicAssessmentApi.start(token!, { participantName: participantName.trim() });
      setSubmissionId(sub.id);
      setPhase('taking');

      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
      autoSaveRef.current = setInterval(async () => {
        const ansArr = Object.entries(answers).map(([qId, a]) => ({ questionId: parseInt(qId), ...a }));
        await publicAssessmentApi.saveProgress(token!, { submissionId: sub.id, answers: ansArr }).catch(() => {});
      }, 30000);
    } catch (err: any) {
      setError(err.message);
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
      const ansArr = Object.entries(answers).map(([qId, a]) => ({ questionId: parseInt(qId), ...a }));
      const res: any = await publicAssessmentApi.submit(token!, { submissionId, answers: ansArr, timeTakenSecs: elapsed });

      // Fetch full result with breakdown
      const fullResult: any = await publicAssessmentApi.result(token!, res.id);
      setResult(fullResult);
      setPhase('done');
    } catch (err: any) {
      setError(err.message);
      setPhase('taking');
    }
  }, [submissionId, assessment, answers, elapsed, confirmSubmit, token]);

  useEffect(() => {
    const limit = assessment?.timeLimitMins ?? assessment?.time_limit_mins;
    if (!limit || phase !== 'taking') return;
    if (elapsed >= limit * 60) handleSubmit(true);
  }, [elapsed, assessment, phase]);

  const setAnswer = (qId: number, val: Partial<{ selectedOptionId: number; answerText: string }>) => {
    setAnswers(prev => ({ ...prev, [qId]: { ...prev[qId], ...val } }));
  };

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  if (phase === 'loading') return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (phase === 'done' && error) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="card p-8 text-center max-w-md w-full">
        <AlertCircle size={40} className="mx-auto text-red-400 mb-3" />
        <h2 className="font-bold text-slate-900 text-lg">Assessment Unavailable</h2>
        <p className="text-slate-500 mt-1">{error}</p>
      </div>
    </div>
  );

  const Header = () => (
    <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3 shadow-sm">
      <div className="w-8 h-8 grad-primary rounded-xl flex items-center justify-center shadow-sm">
        <GraduationCap size={16} className="text-white" />
      </div>
      <div>
        <div className="font-bold text-slate-900 text-sm">EduAnalytics</div>
        <div className="text-xs text-slate-400">{assessment?.title}</div>
      </div>
    </div>
  );

  // ── Name entry ──────────────────────────────────────────────────────────────
  if (phase === 'enter-name' && assessment) return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <div className="max-w-md mx-auto p-4 pt-12">
        <div className="card p-8 space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold text-slate-900">{assessment.title}</h1>
            <p className="text-slate-500 text-sm capitalize">{assessment.subject}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <div className="font-bold text-slate-800">{assessment.questions.length}</div>
              <div className="text-slate-500 text-xs">Questions</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <div className="font-bold text-slate-800">{(assessment.timeLimitMins ?? assessment.time_limit_mins) ? `${assessment.timeLimitMins ?? assessment.time_limit_mins} min` : '∞'}</div>
              <div className="text-slate-500 text-xs">Time Limit</div>
            </div>
          </div>
          {assessment.instructions && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
              <p className="font-semibold mb-1">Instructions</p>
              <p className="whitespace-pre-wrap">{assessment.instructions}</p>
            </div>
          )}
          <div>
            <label className="label">Your Full Name *</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9"
                placeholder="Enter your name to begin"
                value={participantName}
                onChange={e => setParticipantName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && participantName.trim() && startTest()}
                autoFocus
              />
            </div>
          </div>
          <button
            onClick={startTest}
            disabled={!participantName.trim()}
            className="w-full btn-primary disabled:opacity-50"
          >
            Start Assessment
          </button>
        </div>
      </div>
    </div>
  );

  if (phase === 'submitting') return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center flex-col gap-4">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500">Submitting and marking your answers…</p>
      </div>
    </div>
  );

  // ── Results ──────────────────────────────────────────────────────────────────
  if (phase === 'done' && result) {
    const { submission, assessment: a, questions: qs } = result;
    const totalScore = submission.totalScore ?? 0;
    const maxScore   = submission.maxScore ?? 0;
    const pct  = maxScore > 0 ? Math.round(totalScore / maxScore * 100) : 0;
    const pass = pct >= (a?.passingScore ?? 50);
    const correctCount   = qs.filter((q: any) => q.answer?.isCorrect === true).length;
    const incorrectCount = qs.filter((q: any) => q.answer?.isCorrect === false).length;

    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="max-w-3xl mx-auto p-4 pt-8 space-y-6">
          <div className={clsx('card p-6 flex flex-col sm:flex-row items-center gap-6',
            pass ? 'border-emerald-200 bg-emerald-50/30' : 'border-red-200 bg-red-50/20')}>
            <div className={clsx('w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0',
              pass ? 'bg-emerald-500' : 'bg-red-400')}>
              {pct}%
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-xl font-bold text-slate-900">{pass ? `Well done, ${submission.participantName}!` : `Keep studying, ${submission.participantName}`}</h2>
              <p className="text-slate-600 mt-0.5">{totalScore} / {maxScore} marks</p>
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-500 justify-center sm:justify-start">
                <span className="flex items-center gap-1"><CheckCircle2 size={14} className="text-emerald-500" />{correctCount} correct</span>
                <span className="flex items-center gap-1"><XCircle size={14} className="text-red-400" />{incorrectCount} incorrect</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-slate-800">Question Breakdown</h3>
            {qs.map((q: any, i: number) => {
              const ans = q.answer;
              const icon = ans?.isCorrect === true
                ? <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
                : ans?.isCorrect === false
                ? <XCircle size={18} className="text-red-400 flex-shrink-0" />
                : <Minus size={18} className="text-slate-400 flex-shrink-0" />;
              const selectedOpt = q.options?.find((o: any) => o.id === ans?.selectedOptionId);
              const correctOpt  = q.options?.find((o: any) => o.isCorrect);
              return (
                <div key={q.id} className={clsx('card p-4',
                  ans?.isCorrect === true  ? 'border-emerald-100' :
                  ans?.isCorrect === false ? 'border-red-100'     : 'border-slate-100')}>
                  <div className="flex items-start gap-3">
                    {icon}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-400">Q{i + 1}</span>
                        <span className="text-xs font-bold ml-auto">{ans?.pointsAwarded ?? 0} / {q.points} pts</span>
                      </div>
                      <p className="text-slate-800 text-sm font-medium">{q.text}</p>
                      {(q.type === 'mcq' || q.type === 'true_false') && (
                        <div className="mt-2 space-y-0.5 text-xs">
                          {selectedOpt && (
                            <p className={clsx('flex items-center gap-1', ans?.isCorrect ? 'text-emerald-700' : 'text-red-600')}>
                              {ans?.isCorrect ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                              Your answer: <strong>{selectedOpt.text}</strong>
                            </p>
                          )}
                          {!ans?.isCorrect && correctOpt && (
                            <p className="flex items-center gap-1 text-emerald-700">
                              <CheckCircle2 size={11} /> Correct: <strong>{correctOpt.text}</strong>
                            </p>
                          )}
                        </div>
                      )}
                      {q.explanation && (
                        <div className="mt-2 text-xs text-blue-700 bg-blue-50 rounded-lg p-2">
                          <strong>Explanation:</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (phase !== 'taking' || !assessment) return null;

  // ── Test taking ────────────────────────────────────────────────────────────
  const qs = assessment.questions;
  const q  = qs[currentQ];
  const ans = answers[q.id] ?? {};
  const timeLimitMins = assessment.timeLimitMins ?? assessment.time_limit_mins;
  const remaining = timeLimitMins ? timeLimitMins * 60 - elapsed : null;
  const timerDanger = remaining !== null && remaining < 60;
  const answeredCount = qs.filter(question => {
    const a = answers[question.id];
    return a?.selectedOptionId != null || (a?.answerText?.trim() !== '' && a?.answerText != null);
  }).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 space-y-4">
          {/* Timer + progress */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>{participantName}</span>
                <span>{answeredCount} / {qs.length} answered</span>
              </div>
              <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-primary-600 rounded-full transition-all" style={{ width: `${answeredCount / qs.length * 100}%` }} />
              </div>
            </div>
            {remaining !== null && (
              <div className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-bold text-sm flex-shrink-0',
                timerDanger ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-700')}>
                <Clock size={14} />
                {fmtTime(Math.max(0, remaining))}
              </div>
            )}
          </div>

          <div className="flex flex-col lg:flex-row gap-4">
            {/* Question panel */}
            <div className="flex-1 card p-6 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs font-bold text-slate-400">Question {currentQ + 1} of {qs.length}</span>
                <span className="text-xs text-slate-400">{q.points} pt{q.points !== 1 ? 's' : ''}</span>
              </div>
              <p className="text-slate-900 text-base font-medium leading-relaxed">{q.text}</p>

              {(q.type === 'mcq' || q.type === 'true_false') && (
                <div className="space-y-2">
                  {q.options.map(opt => (
                    <label key={opt.id} className={clsx(
                      'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
                      ans.selectedOptionId === opt.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    )}>
                      <input type="radio" name={`q-${q.id}`} checked={ans.selectedOptionId === opt.id}
                        onChange={() => setAnswer(q.id, { selectedOptionId: opt.id })}
                        className="w-4 h-4 accent-primary-600" />
                      <span className="text-slate-800 text-sm">{opt.text}</span>
                    </label>
                  ))}
                </div>
              )}
              {q.type === 'short_answer' && (
                <input className="input" placeholder="Type your answer…"
                  value={ans.answerText ?? ''}
                  onChange={e => setAnswer(q.id, { answerText: e.target.value })} />
              )}
              {q.type === 'essay' && (
                <textarea className="input min-h-[140px] resize-y" placeholder="Write your answer…"
                  value={ans.answerText ?? ''}
                  onChange={e => setAnswer(q.id, { answerText: e.target.value })} />
              )}

              <div className="flex items-center justify-between pt-2">
                <button onClick={() => setCurrentQ(q => Math.max(0, q - 1))} disabled={currentQ === 0}
                  className="btn-secondary flex items-center gap-1.5 text-sm py-2 disabled:opacity-40">
                  <ChevronLeft size={15} /> Previous
                </button>
                {currentQ < qs.length - 1 ? (
                  <button onClick={() => setCurrentQ(q => q + 1)} className="btn-primary flex items-center gap-1.5 text-sm py-2">
                    Next <ChevronRight size={15} />
                  </button>
                ) : (
                  <button onClick={() => handleSubmit(false)} className="btn-primary flex items-center gap-1.5 text-sm py-2 bg-emerald-600 hover:bg-emerald-700">
                    <Send size={14} /> Submit
                  </button>
                )}
              </div>
            </div>

            {/* Navigator */}
            <div className="card p-4 lg:w-44 flex-shrink-0">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Questions</p>
              <div className="grid grid-cols-5 lg:grid-cols-4 gap-1.5">
                {qs.map((question, i) => {
                  const isAnswered = answers[question.id]?.selectedOptionId != null ||
                    (answers[question.id]?.answerText?.trim() !== '' && answers[question.id]?.answerText != null);
                  return (
                    <button key={question.id} onClick={() => setCurrentQ(i)}
                      className={clsx('w-8 h-8 rounded-lg text-xs font-bold transition-all',
                        i === currentQ ? 'bg-primary-600 text-white shadow-md' :
                        isAnswered ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}>
                      {i + 1}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => handleSubmit(false)}
                className="w-full mt-4 btn-primary text-xs py-2 flex items-center justify-center gap-1.5">
                <Send size={12} /> Submit
              </button>
            </div>
          </div>
        </div>
      </div>

      {confirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setConfirmSubmit(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center animate-fade-in">
            <AlertCircle size={40} className="mx-auto text-amber-500 mb-3" />
            <h3 className="font-bold text-slate-900 text-lg">Submit Assessment?</h3>
            <p className="text-slate-500 text-sm mt-1">
              {answeredCount} of {qs.length} questions answered.
            </p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setConfirmSubmit(false)} className="flex-1 btn-secondary">Review</button>
              <button onClick={() => handleSubmit(false)} className="flex-1 btn-primary bg-emerald-600 hover:bg-emerald-700">
                <Send size={14} className="mr-1.5" /> Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { assessmentsApi } from '../lib/api';
import { ArrowLeft, CheckCircle2, XCircle, Clock, Trophy, Users, BarChart2, Minus, Globe } from 'lucide-react';
import clsx from 'clsx';

export default function AssessmentResults() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const assessmentId = parseInt(id!);

  const isTeacher = user?.role === 'admin' || user?.role === 'teacher';
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = isTeacher
      ? assessmentsApi.results(assessmentId)
      : assessmentsApi.myResult(assessmentId);

    fetch.then(setData).catch(() => navigate('/assessments')).finally(() => setLoading(false));
  }, [assessmentId, isTeacher]);

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${m}m ${String(sec).padStart(2, '0')}s`;
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-96">
      <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data) return null;

  // ── Teacher view ──────────────────────────────────────────────────────────
  if (isTeacher) {
    const { assessment, submissions } = data;
    // assessment comes from Drizzle (camelCase)
    const passingScore = assessment?.passingScore ?? 50;
    const scores = submissions.map((s: any) =>
      s.max_score > 0 ? Math.round(s.total_score / s.max_score * 100) : 0
    );
    const avg = scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;
    const passed = scores.filter((s: number) => s >= passingScore).length;

    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/assessments')} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Results — {assessment?.title}</h1>
            <p className="text-sm text-slate-500 capitalize">{assessment?.subject} · {assessment?.type}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Submissions', value: submissions.length, icon: <Users size={16} />, color: 'text-primary-600' },
            { label: 'Average Score', value: `${avg}%`, icon: <BarChart2 size={16} />, color: 'text-indigo-600' },
            { label: 'Passed', value: passed, icon: <CheckCircle2 size={16} />, color: 'text-emerald-600' },
            { label: 'Pass Rate', value: submissions.length ? `${Math.round(passed / submissions.length * 100)}%` : '—', icon: <Trophy size={16} />, color: 'text-amber-600' },
          ].map(stat => (
            <div key={stat.label} className="card p-4">
              <div className={`flex items-center gap-1.5 ${stat.color} mb-1`}>{stat.icon}<span className="text-xs font-semibold">{stat.label}</span></div>
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
            </div>
          ))}
        </div>

        {submissions.length === 0 ? (
          <div className="card p-12 text-center">
            <BarChart2 size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No submissions yet</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <Trophy size={15} className="text-amber-500" />
              <span className="font-semibold text-slate-700 text-sm">Participant Results</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">#</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Participant</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Score</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden sm:table-cell">Percentage</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Time</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {submissions.map((sub: any, i: number) => {
                    const pct = sub.max_score > 0 ? Math.round(sub.total_score / sub.max_score * 100) : 0;
                    const subPassed = pct >= passingScore;
                    return (
                      <tr key={sub.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-slate-400 font-medium">{i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                {sub.student_name}
                                {sub.is_guest && (
                                  <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full font-medium">
                                    <Globe size={10} /> Guest
                                  </span>
                                )}
                              </div>
                              {!sub.is_guest && <div className="text-xs text-slate-400">{sub.student_code}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700">
                          {sub.total_score ?? 0} / {sub.max_score ?? 0}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className={clsx('h-full rounded-full', subPassed ? 'bg-emerald-500' : 'bg-red-400')}
                                style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                            <span className={clsx('font-bold text-xs', subPassed ? 'text-emerald-600' : 'text-red-500')}>{pct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                          {sub.time_taken_secs ? fmtTime(sub.time_taken_secs) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={clsx('px-2 py-0.5 rounded-full text-xs font-semibold',
                            subPassed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600')}>
                            {subPassed ? 'Pass' : 'Fail'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Student view ──────────────────────────────────────────────────────────
  // All fields from Drizzle are camelCase
  const { submission, assessment, questions } = data;
  const totalScore = submission.totalScore ?? 0;
  const maxScore = submission.maxScore ?? 0;
  const pct = maxScore > 0 ? Math.round(totalScore / maxScore * 100) : 0;
  const passingScore = assessment?.passingScore ?? 50;
  const passed = pct >= passingScore;

  const correctCount = questions.filter((q: any) => q.answer?.isCorrect === true).length;
  const incorrectCount = questions.filter((q: any) => q.answer?.isCorrect === false).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/assessments')} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{assessment?.title}</h1>
          <p className="text-sm text-slate-500 capitalize">{assessment?.subject}</p>
        </div>
      </div>

      {/* Result summary */}
      <div className={clsx('card p-6 flex flex-col sm:flex-row items-center gap-6',
        passed ? 'border-emerald-200 bg-emerald-50/30' : 'border-red-200 bg-red-50/20')}>
        <div className={clsx('w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0',
          passed ? 'bg-emerald-500' : 'bg-red-400')}>
          {pct}%
        </div>
        <div className="text-center sm:text-left">
          <h2 className="text-xl font-bold text-slate-900">{passed ? 'Passed!' : 'Not Passed'}</h2>
          <p className="text-slate-600 mt-0.5">{totalScore} / {maxScore} marks</p>
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-500 justify-center sm:justify-start">
            <span className="flex items-center gap-1">
              <CheckCircle2 size={14} className="text-emerald-500" />
              {correctCount} correct
            </span>
            <span className="flex items-center gap-1">
              <XCircle size={14} className="text-red-400" />
              {incorrectCount} incorrect
            </span>
            {submission.timeTakenSecs && (
              <span className="flex items-center gap-1">
                <Clock size={14} />{fmtTime(submission.timeTakenSecs)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Question breakdown */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-800">Question Breakdown</h3>
        {questions.map((q: any, i: number) => {
          const ans = q.answer;
          const icon = ans?.isCorrect === true
            ? <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
            : ans?.isCorrect === false
            ? <XCircle size={18} className="text-red-400 flex-shrink-0" />
            : <Minus size={18} className="text-slate-400 flex-shrink-0" />;

          // options come from Drizzle — camelCase (isCorrect, etc.)
          const selectedOpt = q.options?.find((o: any) => o.id === ans?.selectedOptionId);
          const correctOpt  = q.options?.find((o: any) => o.isCorrect);

          return (
            <div key={q.id} className={clsx('card p-4',
              ans?.isCorrect === true  ? 'border-emerald-100' :
              ans?.isCorrect === false ? 'border-red-100'     : 'border-slate-100')}>
              <div className="flex items-start gap-3">
                {icon}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-400">Q{i + 1}</span>
                    <span className="text-xs text-slate-400">{q.points} pt{q.points !== 1 ? 's' : ''}</span>
                    <span className="text-xs font-bold ml-auto">
                      {ans?.pointsAwarded ?? 0} / {q.points} pts
                    </span>
                  </div>
                  <p className="text-slate-800 text-sm font-medium">{q.text}</p>

                  {(q.type === 'mcq' || q.type === 'true_false') && (
                    <div className="mt-2 space-y-1 text-xs">
                      {selectedOpt && (
                        <p className={clsx('flex items-center gap-1', ans?.isCorrect ? 'text-emerald-700' : 'text-red-600')}>
                          {ans?.isCorrect ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                          Your answer: <strong>{selectedOpt.text}</strong>
                        </p>
                      )}
                      {!ans?.isCorrect && correctOpt && (
                        <p className="flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 size={11} /> Correct answer: <strong>{correctOpt.text}</strong>
                        </p>
                      )}
                      {!selectedOpt && (
                        <p className="text-slate-400 italic">Not answered</p>
                      )}
                    </div>
                  )}

                  {q.type === 'short_answer' && (
                    <div className="mt-1 text-xs">
                      {ans?.answerText ? (
                        <p className={clsx(ans?.isCorrect ? 'text-emerald-700' : 'text-red-600')}>
                          Your answer: <strong>{ans.answerText}</strong>
                        </p>
                      ) : (
                        <p className="text-slate-400 italic">Not answered</p>
                      )}
                      {!ans?.isCorrect && q.correctAnswer && (
                        <p className="text-emerald-700 mt-0.5">
                          Correct: <strong>{q.correctAnswer}</strong>
                        </p>
                      )}
                    </div>
                  )}

                  {q.type === 'essay' && ans?.answerText && (
                    <div className="mt-2 text-xs text-slate-600 bg-slate-50 rounded-lg p-2 border border-slate-100">
                      {ans.answerText}
                      <p className="text-slate-400 mt-1 italic">Awaiting teacher marking</p>
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
  );
}

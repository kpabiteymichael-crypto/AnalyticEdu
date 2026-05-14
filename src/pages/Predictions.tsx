import { useEffect, useState } from 'react';
import { studentsApi, predictionsApi } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import RiskBadge from '../components/RiskBadge';
import { Brain, RefreshCw, AlertTriangle, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';

export default function Predictions() {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [predictions, setPredictions] = useState<any[]>([]);
  const [atRisk, setAtRisk] = useState<{ high: any[]; critical: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([studentsApi.list(), predictionsApi.atRisk()])
      .then(([s, r]) => { setStudents(s); setAtRisk(r); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const loadPredictions = async (studentId: string) => {
    if (!studentId) return;
    try {
      const p = await predictionsApi.byStudent(parseInt(studentId));
      setPredictions(p);
    } catch (e) {
      console.error(e);
    }
  };

  const generate = async () => {
    if (!selectedStudent) return;
    setGenerating(true);
    try {
      const p = await predictionsApi.generate(parseInt(selectedStudent));
      setPredictions(p);
      const r = await predictionsApi.atRisk();
      setAtRisk(r);
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handleStudentChange = (val: string) => {
    setSelectedStudent(val);
    setPredictions([]);
    loadPredictions(val);
  };

  if (loading) return <LoadingSpinner text="Loading AI predictions..." />;

  const riskCount = (atRisk?.critical?.length ?? 0) + (atRisk?.high?.length ?? 0);

  return (
    <div className="animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Brain size={28} className="text-primary-600" />
            AI Performance Predictions
          </h1>
          <p className="page-subtitle">Machine learning-powered score predictions and risk assessment.</p>
        </div>
        {riskCount > 0 && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <AlertTriangle size={18} className="text-red-500" />
            <div>
              <div className="text-sm font-bold text-red-700">{riskCount} Students At Risk</div>
              <div className="text-xs text-red-600">Require intervention</div>
            </div>
          </div>
        )}
      </div>

      {/* Student Selector */}
      <div className="card mb-6">
        <h3 className="section-title">Generate Predictions</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedStudent}
            onChange={e => handleStudentChange(e.target.value)}
            className="input flex-1"
          >
            <option value="">Select a student to analyze...</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.studentCode}) — Grade {s.grade}</option>
            ))}
          </select>
          <button
            onClick={generate}
            disabled={!selectedStudent || generating}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            {generating ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            {generating ? 'Analyzing...' : 'Generate AI Predictions'}
          </button>
        </div>
      </div>

      {/* Predictions Grid */}
      {predictions.length > 0 && (
        <div className="mb-8">
          <h3 className="section-title flex items-center gap-2">
            <TrendingUp size={18} className="text-primary-600" />
            Predictions for {students.find(s => s.id === parseInt(selectedStudent))?.name}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {predictions.map((p: any) => (
              <div
                key={p.id}
                className={clsx('card-hover cursor-pointer transition-all', expanded === p.id && 'ring-2 ring-primary-400')}
                onClick={() => setExpanded(expanded === p.id ? null : p.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 capitalize">
                      {p.subject}
                    </div>
                    <div className="text-3xl font-black text-slate-900">{p.predictedScore}%</div>
                    <div className="text-xs text-slate-400 mt-0.5">Predicted score</div>
                  </div>
                  {expanded === p.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </div>

                <div className="mb-3">
                  <RiskBadge level={p.riskLevel} />
                </div>

                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${p.predictedScore}%`,
                      background: p.riskLevel === 'critical' ? '#ef4444' : p.riskLevel === 'high' ? '#f97316' : p.riskLevel === 'medium' ? '#f59e0b' : '#10b981'
                    }} />
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Confidence: {Math.round(p.confidenceScore * 100)}%
                </div>

                {expanded === p.id && (
                  <div className="mt-3 pt-3 border-t border-slate-100 animate-fade-in">
                    {p.riskFactors?.length > 0 && (
                      <div className="mb-2">
                        <div className="text-xs font-semibold text-slate-600 mb-1">Risk Factors</div>
                        {p.riskFactors.map((r: string, i: number) => (
                          <div key={i} className="text-xs text-red-600 flex items-start gap-1 mb-1">
                            <AlertTriangle size={10} className="mt-0.5 flex-shrink-0" />
                            {r}
                          </div>
                        ))}
                      </div>
                    )}
                    {p.recommendations?.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-slate-600 mb-1">Recommendations</div>
                        {p.recommendations.map((r: string, i: number) => (
                          <div key={i} className="text-xs text-emerald-700 flex items-start gap-1 mb-1">
                            <span className="mt-0.5">•</span>
                            {r}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* At-Risk Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="section-title flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" />
            Critical Risk Students
          </h3>
          {!atRisk?.critical?.length ? (
            <div className="empty-state py-8">
              <div className="text-2xl mb-2">✅</div>
              <p className="text-slate-400 text-sm">No students at critical risk</p>
            </div>
          ) : atRisk.critical.map((p: any, i: number) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-red-50 rounded-xl mb-2 last:mb-0">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={14} className="text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-800 capitalize">Student #{p.studentId} — {p.subject}</div>
                <div className="text-xs text-red-600">Predicted: {p.predictedScore}%</div>
              </div>
              <RiskBadge level={p.riskLevel} />
            </div>
          ))}
        </div>

        <div className="card">
          <h3 className="section-title flex items-center gap-2">
            <AlertTriangle size={18} className="text-orange-500" />
            High Risk Students
          </h3>
          {!atRisk?.high?.length ? (
            <div className="empty-state py-8">
              <div className="text-2xl mb-2">✅</div>
              <p className="text-slate-400 text-sm">No students at high risk</p>
            </div>
          ) : atRisk.high.slice(0, 8).map((p: any, i: number) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl mb-2 last:mb-0">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={14} className="text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-800 capitalize">Student #{p.studentId} — {p.subject}</div>
                <div className="text-xs text-orange-600">Predicted: {p.predictedScore}%</div>
              </div>
              <RiskBadge level={p.riskLevel} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

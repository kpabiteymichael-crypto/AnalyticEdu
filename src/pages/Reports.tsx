import { useEffect, useState } from 'react';
import { reportsApi, studentsApi } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { FileText, Download, TrendingUp, Award, BarChart3 } from 'lucide-react';
import clsx from 'clsx';

export default function Reports() {
  const [classReport, setClassReport] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [studentReport, setStudentReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [sortField, setSortField] = useState<'avgScore' | 'xp' | 'name'>('avgScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    Promise.all([reportsApi.classPerformance(), studentsApi.list()])
      .then(([r, s]) => { setClassReport(r); setStudents(s); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const loadStudentReport = async (id: string) => {
    if (!id) return;
    setSelectedStudent(id);
    setLoadingStudent(true);
    try {
      const r = await reportsApi.studentFull(parseInt(id));
      setStudentReport(r);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStudent(false);
    }
  };

  const sortedReport = [...classReport].sort((a, b) => {
    const dir = sortDir === 'desc' ? -1 : 1;
    if (sortField === 'avgScore') return dir * (a.avgScore - b.avgScore);
    if (sortField === 'xp') return dir * (a.xp - b.xp);
    return dir * a.name.localeCompare(b.name);
  });

  if (loading) return <LoadingSpinner text="Generating reports..." />;

  return (
    <div className="animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <FileText size={28} className="text-primary-600" />
            Reports
          </h1>
          <p className="page-subtitle">Comprehensive academic reports for students and classes.</p>
        </div>
        <button
          onClick={() => reportsApi.exportCSV()}
          className="btn-secondary flex items-center gap-2"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* Class Performance Table */}
      <div className="card mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3 className="section-title mb-0">Class Performance Overview</h3>
          <div className="flex gap-2">
            {(['avgScore', 'xp', 'name'] as const).map(f => (
              <button
                key={f}
                onClick={() => { setSortField(f); setSortDir(d => d === 'desc' ? 'asc' : 'desc'); }}
                className={clsx('text-xs px-3 py-1.5 rounded-lg font-medium transition-colors',
                  sortField === f ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
              >
                {f === 'avgScore' ? 'Score' : f === 'xp' ? 'XP' : 'Name'}
                {sortField === f && (sortDir === 'desc' ? ' ↓' : ' ↑')}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="table-header text-left py-3 px-3">Rank</th>
                <th className="table-header text-left py-3 px-3">Student</th>
                <th className="table-header text-right py-3 px-3">Avg Score</th>
                <th className="table-header text-right py-3 px-3">XP</th>
                <th className="table-header text-right py-3 px-3">Level</th>
                <th className="table-header text-right py-3 px-3">Badges</th>
                <th className="table-header text-right py-3 px-3">Assessments</th>
              </tr>
            </thead>
            <tbody>
              {sortedReport.map((s: any, i: number) => (
                <tr
                  key={s.studentId}
                  className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => loadStudentReport(String(s.studentId))}
                >
                  <td className="py-3 px-3">
                    <span className={clsx('text-sm font-bold', i < 3 ? 'text-amber-600' : 'text-slate-400')}>#{i + 1}</span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 grad-primary rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        {s.name?.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{s.name}</div>
                        <div className="text-xs text-slate-400">{s.studentCode} • Grade {s.grade}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className={clsx('text-sm font-bold', s.avgScore >= 80 ? 'text-emerald-600' : s.avgScore >= 60 ? 'text-amber-600' : 'text-red-500')}>
                      {s.avgScore}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right text-sm font-semibold text-primary-600">{s.xp?.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right text-sm text-slate-600">Lv.{s.level}</td>
                  <td className="py-3 px-3 text-right text-sm text-slate-600">{s.badgeCount}</td>
                  <td className="py-3 px-3 text-right text-sm text-slate-600">{s.totalAssessments}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Individual Student Report */}
      <div className="card">
        <h3 className="section-title">Individual Student Report</h3>
        <div className="mb-6">
          <select
            value={selectedStudent}
            onChange={e => loadStudentReport(e.target.value)}
            className="input max-w-md"
          >
            <option value="">Click a student above or select here...</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.studentCode})</option>)}
          </select>
        </div>

        {loadingStudent && <LoadingSpinner text="Loading student report..." />}

        {studentReport && !loadingStudent && (
          <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-slate-50 rounded-2xl mb-6">
              <div className="w-14 h-14 grad-primary rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-md">
                {studentReport.student?.name?.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="font-bold text-slate-900 text-lg">{studentReport.student?.name}</div>
                <div className="text-sm text-slate-500">{studentReport.student?.studentCode} • Grade {studentReport.student?.grade}</div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xl font-black text-primary-600">{studentReport.student?.xp?.toLocaleString()}</div>
                  <div className="text-xs text-slate-500">XP</div>
                </div>
                <div>
                  <div className="text-xl font-black text-purple-600">Lv.{studentReport.student?.level}</div>
                  <div className="text-xs text-slate-500">Level</div>
                </div>
                <div>
                  <div className="text-xl font-black text-amber-600">#{studentReport.ranking?.overallRank ?? 'N/A'}</div>
                  <div className="text-xs text-slate-500">Rank</div>
                </div>
              </div>
            </div>

            {/* Subject Summary */}
            <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <BarChart3 size={16} className="text-primary-600" />
              Subject Summary
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {studentReport.subjectSummary.map((s: any) => (
                <div key={s.subject} className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-xs font-semibold text-slate-500 uppercase capitalize mb-1">{s.subject}</div>
                  <div className={clsx('text-xl font-black', s.avgScore >= 80 ? 'text-emerald-600' : s.avgScore >= 60 ? 'text-amber-600' : 'text-red-500')}>
                    {s.avgScore}%
                  </div>
                  <div className="text-xs text-slate-400">{s.count} assessments</div>
                  <div className="text-xs text-slate-400">
                    H: {Math.round(s.highest)}% / L: {Math.round(s.lowest)}%
                  </div>
                </div>
              ))}
            </div>

            {/* Badges */}
            {studentReport.badges.length > 0 && (
              <>
                <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Award size={16} className="text-primary-600" />
                  Earned Badges
                </h4>
                <div className="flex flex-wrap gap-2 mb-6">
                  {studentReport.badges.map(({ badge }: any) => (
                    <div key={badge.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border" style={{ borderColor: `${badge.color}40`, background: `${badge.color}10` }}>
                      <span className="text-lg">{badge.icon}</span>
                      <span className="text-xs font-semibold text-slate-700">{badge.name}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Monthly Progress */}
            {studentReport.monthlyProgress.length > 0 && (
              <>
                <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <TrendingUp size={16} className="text-primary-600" />
                  Monthly Progress
                </h4>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {studentReport.monthlyProgress.map((m: any) => (
                    <div key={m.month} className="flex-shrink-0 text-center p-3 bg-slate-50 rounded-xl min-w-[80px]">
                      <div className={clsx('text-lg font-black', m.avgScore >= 80 ? 'text-emerald-600' : m.avgScore >= 60 ? 'text-amber-600' : 'text-red-500')}>
                        {m.avgScore}%
                      </div>
                      <div className="text-xs text-slate-500">{m.month.split(' ')[0]}</div>
                      <div className="text-xs text-slate-400">{m.assessments} tests</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { studentsApi } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { Users, Search, ChevronRight, Star, Flame, TrendingUp } from 'lucide-react';
import clsx from 'clsx';

export default function Students() {
  const [students, setStudents] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'xp' | 'name' | 'level'>('xp');

  useEffect(() => {
    studentsApi.list().then(data => {
      setStudents(data);
      setFiltered(data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let data = [...students];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(s => s.name.toLowerCase().includes(q) || s.studentCode.toLowerCase().includes(q));
    }
    if (gradeFilter !== 'all') {
      data = data.filter(s => s.grade === parseInt(gradeFilter));
    }
    data.sort((a, b) => {
      if (sortBy === 'xp') return b.xp - a.xp;
      if (sortBy === 'level') return b.level - a.level;
      return a.name.localeCompare(b.name);
    });
    setFiltered(data);
  }, [search, gradeFilter, sortBy, students]);

  const grades = Array.from(new Set(students.map(s => s.grade))).sort();

  if (loading) return <LoadingSpinner text="Loading students..." />;

  return (
    <div className="animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-subtitle">{students.length} students enrolled</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or student code..."
            className="input pl-9"
          />
        </div>
        <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)} className="input sm:w-36">
          <option value="all">All Grades</option>
          {grades.map(g => <option key={g} value={g}>Grade {g}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="input sm:w-36">
          <option value="xp">Sort: XP</option>
          <option value="level">Sort: Level</option>
          <option value="name">Sort: Name</option>
        </select>
      </div>

      {/* Student Grid */}
      {filtered.length === 0 ? (
        <div className="empty-state card">
          <Users size={32} className="text-slate-300 mb-3" />
          <p className="text-slate-500 font-semibold">No students found</p>
          <p className="text-slate-400 text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((student, idx) => {
            const xpProgress = Math.min(100, (student.xp % 1000) / 10);
            return (
              <Link
                key={student.id}
                to={`/students/${student.id}`}
                className="card-hover group cursor-pointer block"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 grad-primary rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0">
                    {student.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{student.name}</div>
                    <div className="text-xs text-slate-500">{student.studentCode} • Grade {student.grade}</div>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={clsx(
                      'text-xs font-bold px-2.5 py-1 rounded-full',
                      idx < 3 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                    )}>
                      #{idx + 1}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center bg-slate-50 rounded-xl p-2">
                    <div className="flex items-center justify-center gap-1 text-primary-600">
                      <Star size={12} />
                      <span className="text-sm font-bold">{student.xp >= 1000 ? `${Math.round(student.xp / 1000)}k` : student.xp}</span>
                    </div>
                    <div className="text-xs text-slate-400">XP</div>
                  </div>
                  <div className="text-center bg-slate-50 rounded-xl p-2">
                    <div className="text-sm font-bold text-purple-600">Lv.{student.level}</div>
                    <div className="text-xs text-slate-400">Level</div>
                  </div>
                  <div className="text-center bg-slate-50 rounded-xl p-2">
                    <div className="flex items-center justify-center gap-1 text-amber-600">
                      <Flame size={12} />
                      <span className="text-sm font-bold">{student.streakDays}</span>
                    </div>
                    <div className="text-xs text-slate-400">Streak</div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-slate-500">XP Progress</span>
                    <span className="text-xs font-bold text-primary-600">{Math.round(xpProgress)}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-400 progress-animate"
                      style={{ '--progress-width': `${xpProgress}%` } as any} />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-slate-400">{student.className ?? `Grade ${student.grade}`}</span>
                  <ChevronRight size={14} className="text-slate-400 group-hover:text-primary-600 transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

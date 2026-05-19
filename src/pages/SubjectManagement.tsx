import { useEffect, useState } from 'react';
import { subjectAssignmentsApi, settingsApi } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  BookOpen, Search, Users, GraduationCap, Check, X, CheckCircle, AlertCircle,
} from 'lucide-react';

const SUBJECT_COLORS: Record<string, string> = {
  math:    'bg-blue-100 text-blue-700 border-blue-200',
  science: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  english: 'bg-violet-100 text-violet-700 border-violet-200',
  history: 'bg-amber-100 text-amber-700 border-amber-200',
  art:     'bg-pink-100 text-pink-700 border-pink-200',
  pe:      'bg-cyan-100 text-cyan-700 border-cyan-200',
  ict:     'bg-slate-100 text-slate-700 border-slate-200',
  music:   'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
};
const FALLBACK_COLORS = [
  'bg-red-100 text-red-700 border-red-200',
  'bg-teal-100 text-teal-700 border-teal-200',
  'bg-orange-100 text-orange-700 border-orange-200',
  'bg-lime-100 text-lime-700 border-lime-200',
  'bg-indigo-100 text-indigo-700 border-indigo-200',
];

type SubjectEntry = { key: string; label: string };
type PersonRow = {
  id: number;
  user_id?: number;
  name: string;
  email: string;
  role?: string;
  subjects: string[];
};
type Toast = { type: 'success' | 'error'; message: string };

export default function SubjectManagement() {
  const [tab, setTab] = useState<'students' | 'teachers'>('students');
  const [students, setStudents] = useState<PersonRow[]>([]);
  const [teachers, setTeachers] = useState<PersonRow[]>([]);
  const [allSubjects, setAllSubjects] = useState<SubjectEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<PersonRow | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    Promise.all([
      subjectAssignmentsApi.getStudents(),
      subjectAssignmentsApi.getTeachers(),
      settingsApi.listSubjects(),
    ]).then(([s, t, subs]) => {
      setStudents(s);
      setTeachers(t);
      setAllSubjects(subs);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const getSubjectColor = (key: string, index: number) =>
    SUBJECT_COLORS[key] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];

  const list = tab === 'students' ? students : teachers;
  const filtered = list.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSubject = async (subject: string) => {
    if (!selected || toggling) return;
    const hasIt = selected.subjects.includes(subject);
    setToggling(subject);
    try {
      if (tab === 'students') {
        if (hasIt) await subjectAssignmentsApi.dropStudentSubject(selected.id, subject);
        else        await subjectAssignmentsApi.addStudentSubject(selected.id, subject);
      } else {
        if (hasIt) await subjectAssignmentsApi.dropTeacherSubject(selected.id, subject);
        else        await subjectAssignmentsApi.addTeacherSubject(selected.id, subject);
      }

      const newSubjects = hasIt
        ? selected.subjects.filter(s => s !== subject)
        : [...selected.subjects, subject];
      const updatedPerson = { ...selected, subjects: newSubjects };
      setSelected(updatedPerson);

      if (tab === 'students') {
        setStudents(prev => prev.map(s => s.id === selected.id ? { ...s, subjects: newSubjects } : s));
      } else {
        setTeachers(prev => prev.map(t => t.id === selected.id ? { ...t, subjects: newSubjects } : t));
      }
      showToast('success', `${hasIt ? 'Removed' : 'Added'} ${allSubjects.find(s => s.key === subject)?.label ?? subject}`);
    } catch {
      showToast('error', 'Failed to update subject assignment');
    } finally {
      setToggling(null);
    }
  };

  const handleTabChange = (newTab: 'students' | 'teachers') => {
    setTab(newTab);
    setSelected(null);
    setSearch('');
  };

  if (loading) return <LoadingSpinner text="Loading subject assignments..." />;

  return (
    <div className="animate-fade-in">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium animate-fade-in ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-500'}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 grad-primary rounded-xl flex items-center justify-center shadow-md">
            <BookOpen size={20} className="text-white" />
          </div>
          <div>
            <h1 className="page-title">Subject Management</h1>
            <p className="page-subtitle">Assign or remove subjects for students and teachers</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6 w-fit">
        <button
          onClick={() => handleTabChange('students')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'students' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <GraduationCap size={15} /> Students
        </button>
        <button
          onClick={() => handleTabChange('teachers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'teachers' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Users size={15} /> Teachers / Admins
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left — person list */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={`Search ${tab}...`}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input pl-9 py-2 text-sm w-full"
              />
            </div>
            <span className="text-xs text-slate-500 whitespace-nowrap">{filtered.length} found</span>
          </div>

          <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
            {filtered.length === 0 && (
              <p className="text-center text-slate-400 text-sm py-8">No results found</p>
            )}
            {filtered.map(person => (
              <button
                key={person.id}
                onClick={() => setSelected(person)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${selected?.id === person.id ? 'bg-primary-50 border border-primary-200' : 'hover:bg-slate-50 border border-transparent'}`}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {person.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-800 truncate">{person.name}</div>
                  <div className="text-xs text-slate-500 truncate">{person.email}</div>
                </div>
                <div className="flex-shrink-0">
                  {person.subjects.length === 0 ? (
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">All</span>
                  ) : (
                    <span className="text-xs text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full font-semibold">{person.subjects.length} subj</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right — subject toggles */}
        <div className="card">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <BookOpen size={32} className="mb-3 opacity-40" />
              <p className="text-sm font-medium">Select a {tab === 'students' ? 'student' : 'teacher'} to manage their subjects</p>
              <p className="text-xs mt-1">If no subjects are assigned, they can access all {allSubjects.length} subjects</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  {selected.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <div className="font-semibold text-slate-800">{selected.name}</div>
                  <div className="text-xs text-slate-500">{selected.email}</div>
                </div>
                {selected.subjects.length === 0 && (
                  <span className="ml-auto text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
                    Access to all subjects (none assigned)
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wide">
                Toggle subjects — checked means assigned
              </p>

              <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {allSubjects.map(({ key, label }, i) => {
                  const has = selected.subjects.includes(key);
                  const isLoading = toggling === key;
                  const colorClass = getSubjectColor(key, i);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleSubject(key)}
                      disabled={!!toggling}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all text-left ${has ? `${colorClass} border` : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'} ${isLoading ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
                    >
                      <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border ${has ? 'border-current bg-current/20' : 'border-slate-300'}`}>
                        {has && <Check size={10} />}
                      </div>
                      <span className="truncate">{label}</span>
                      {isLoading && <div className="ml-auto w-3 h-3 border border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={async () => {
                    for (const { key } of allSubjects) {
                      if (!selected.subjects.includes(key)) await toggleSubject(key);
                    }
                  }}
                  disabled={!!toggling || selected.subjects.length === allSubjects.length}
                  className="text-xs px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 font-semibold hover:bg-primary-100 disabled:opacity-40 transition-colors flex items-center gap-1"
                >
                  <Check size={12} /> Assign All
                </button>
                <button
                  onClick={async () => {
                    for (const key of [...selected.subjects]) await toggleSubject(key);
                  }}
                  disabled={!!toggling || selected.subjects.length === 0}
                  className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-700 font-semibold hover:bg-red-100 disabled:opacity-40 transition-colors flex items-center gap-1"
                >
                  <X size={12} /> Clear All
                </button>
                <span className="ml-auto text-xs text-slate-400">{selected.subjects.length} / {allSubjects.length} assigned</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

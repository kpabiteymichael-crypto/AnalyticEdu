import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { studentsApi, authApi } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { Users, Search, ChevronRight, Star, Flame, Plus, Pencil, Trash2, X, CheckCircle, AlertCircle, ChevronDown, ChevronUp, LayoutGrid, Layers } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';

type Toast = { type: 'success' | 'error'; message: string };

const emptyForm = { name: '', email: '', password: '', grade: 7, classId: '' };

function TeamGroup({ teamName, members, onEdit, onDelete }: {
  teamName: string;
  members: any[];
  onEdit: (s: any) => void;
  onDelete: (s: any) => void;
}) {
  const [open, setOpen] = useState(true);
  const avgXp = Math.round(members.reduce((s, m) => s + m.xp, 0) / (members.length || 1));
  return (
    <div className="card">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 text-left">
        <div className="w-10 h-10 grad-primary rounded-xl flex items-center justify-center flex-shrink-0">
          <Layers size={18} className="text-white" />
        </div>
        <div className="flex-1">
          <div className="font-bold text-slate-900">{teamName}</div>
          <div className="text-xs text-slate-500">{members.length} member{members.length !== 1 ? 's' : ''} · avg {avgXp.toLocaleString()} XP</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-semibold bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full">
            {members.length} students
          </span>
          {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>

      {open && (
        <div className="mt-4 border-t border-slate-100 pt-4 space-y-2">
          {members.sort((a, b) => b.xp - a.xp).map((student, idx) => (
            <div key={student.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
              <span className={clsx('text-xs font-bold w-6 text-center flex-shrink-0',
                idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-amber-700' : 'text-slate-400')}>
                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
              </span>
              <div className="w-8 h-8 grad-primary rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {student.name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 text-sm truncate">{student.name}</div>
                <div className="text-xs text-slate-400">{student.studentCode} · Grade {student.grade}</div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-bold text-primary-600">{student.xp.toLocaleString()} XP</div>
                  <div className="text-xs text-slate-400">Lv.{student.level}</div>
                </div>
                {student.streakDays > 0 && (
                  <div className="flex items-center gap-0.5 text-amber-500 text-xs font-medium hidden sm:flex">
                    <Flame size={12} />{student.streakDays}d
                  </div>
                )}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onEdit(student)}
                    className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-100 text-slate-400 hover:text-primary-600 hover:border-primary-200 transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => onDelete(student)}
                    className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-100 text-slate-400 hover:text-red-600 hover:border-red-200 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Students() {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'xp' | 'name' | 'level' | 'team'>('xp');
  const [groupByTeam, setGroupByTeam] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<any | null>(null);
  const [showDelete, setShowDelete] = useState<any | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState({ name: '', grade: 7, classId: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    Promise.all([studentsApi.list(), authApi.classes()])
      .then(([s, c]) => { setStudents(s); setFiltered(s); setClasses(c); })
      .catch(console.error)
      .finally(() => setLoading(false));
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await studentsApi.create({
        name: form.name,
        email: form.email,
        password: form.password,
        grade: Number(form.grade),
        classId: form.classId ? Number(form.classId) : undefined,
      });
      setStudents(prev => [created, ...prev]);
      setShowCreate(false);
      setForm(emptyForm);
      showToast('success', `Student "${created.name}" created successfully`);
    } catch (err: any) {
      showToast('error', err.response?.data?.error ?? 'Failed to create student');
    } finally { setSaving(false); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEdit) return;
    setSaving(true);
    try {
      const updated = await studentsApi.update(showEdit.id, {
        name: editForm.name,
        grade: Number(editForm.grade),
        classId: editForm.classId ? Number(editForm.classId) : null,
      });
      setStudents(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s));
      setShowEdit(null);
      showToast('success', 'Student updated successfully');
    } catch (err: any) {
      showToast('error', err.response?.data?.error ?? 'Failed to update student');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    setDeleting(true);
    try {
      await studentsApi.delete(showDelete.id);
      setStudents(prev => prev.filter(s => s.id !== showDelete.id));
      setShowDelete(null);
      showToast('success', `Student "${showDelete.name}" deleted`);
    } catch (err: any) {
      showToast('error', err.response?.data?.error ?? 'Failed to delete student');
    } finally { setDeleting(false); }
  };

  const openEdit = (s: any) => {
    setEditForm({ name: s.name, grade: s.grade, classId: s.classId ?? '' });
    setShowEdit(s);
  };

  if (loading) return <LoadingSpinner text="Loading students..." />;

  const Modal = ({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium animate-fade-in ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-500'}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-subtitle">{students.length} students enrolled</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setShowCreate(true); }}
          className="btn-primary flex items-center gap-2 self-start"
        >
          <Plus size={18} /> Add Student
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6 flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
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
        <select value={sortBy} onChange={e => { setSortBy(e.target.value as any); setGroupByTeam(false); }} className="input sm:w-36" disabled={groupByTeam}>
          <option value="xp">Sort: XP</option>
          <option value="level">Sort: Level</option>
          <option value="name">Sort: Name</option>
        </select>
        <button
          onClick={() => setGroupByTeam(g => !g)}
          className={clsx('flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all',
            groupByTeam
              ? 'bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-100'
              : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300 hover:text-primary-600')}
        >
          <Layers size={15} />
          By Team
        </button>
      </div>

      {/* === BY-TEAM GROUP VIEW === */}
      {groupByTeam ? (() => {
        const teams: Record<string, typeof filtered> = {};
        filtered.forEach(s => {
          const key = s.className ?? 'Unassigned';
          if (!teams[key]) teams[key] = [];
          teams[key].push(s);
        });
        const teamEntries = Object.entries(teams).sort((a, b) => b[1].length - a[1].length);

        return (
          <div className="space-y-4">
            {teamEntries.map(([teamName, members]) => (
              <TeamGroup
                key={teamName}
                teamName={teamName}
                members={members}
                onEdit={openEdit}
                onDelete={s => setShowDelete(s)}
              />
            ))}
            {teamEntries.length === 0 && (
              <div className="empty-state card">
                <Layers size={32} className="text-slate-300 mb-3" />
                <p className="text-slate-500 font-semibold">No teams found</p>
              </div>
            )}
          </div>
        );
      })() : null}

      {/* === REGULAR GRID VIEW === */}
      {!groupByTeam && (filtered.length === 0 ? (
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
              <div key={student.id} className="card-hover group relative">
                {/* Action buttons */}
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button
                    onClick={e => { e.preventDefault(); openEdit(student); }}
                    className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-100 text-slate-500 hover:text-primary-600 hover:border-primary-200 transition-colors"
                    title="Edit student"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={e => { e.preventDefault(); setShowDelete(student); }}
                    className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-100 text-slate-500 hover:text-red-600 hover:border-red-200 transition-colors"
                    title="Delete student"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <Link to={`/students/${student.id}`} className="block">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-12 h-12 grad-primary rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0">
                      {student.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0 pr-14">
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
              </div>
            );
          })}
        </div>
      ))}

      {/* Create Modal */}
      {showCreate && (
        <Modal title="Add New Student" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input type="text" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input" placeholder="e.g. Jane Smith" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input type="email" required value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="input" placeholder="student@school.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input type="text" required minLength={6} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} className="input" placeholder="Minimum 6 characters" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Grade</label>
                <select value={form.grade} onChange={e => setForm(p => ({ ...p, grade: parseInt(e.target.value) }))} className="input">
                  {Array.from({ length: 13 }, (_, i) => i + 1).map(g => (
                    <option key={g} value={g}>Grade {g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Class (optional)</label>
                <select value={form.classId} onChange={e => setForm(p => ({ ...p, classId: e.target.value }))} className="input">
                  <option value="">No class</option>
                  {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="flex-1 btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 btn-primary">{saving ? 'Creating...' : 'Create Student'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <Modal title={`Edit ${showEdit.name}`} onClose={() => setShowEdit(null)}>
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input type="text" required value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className="input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Grade</label>
                <select value={editForm.grade} onChange={e => setEditForm(p => ({ ...p, grade: parseInt(e.target.value) }))} className="input">
                  {Array.from({ length: 13 }, (_, i) => i + 1).map(g => (
                    <option key={g} value={g}>Grade {g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
                <select value={editForm.classId} onChange={e => setEditForm(p => ({ ...p, classId: e.target.value }))} className="input">
                  <option value="">No class</option>
                  {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowEdit(null)} className="flex-1 btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {showDelete && (
        <Modal title="Delete Student" onClose={() => setShowDelete(null)}>
          <div className="text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-red-600" />
            </div>
            <p className="text-slate-700 mb-1">Are you sure you want to delete</p>
            <p className="font-bold text-slate-900 text-lg mb-2">"{showDelete.name}"?</p>
            <p className="text-sm text-slate-500 mb-6">This will permanently remove all their scores, badges, activity history, and account data. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(null)} className="flex-1 btn-secondary">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50">
                {deleting ? 'Deleting...' : 'Delete Student'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { teamsApi, studentsApi } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Users, Plus, Pencil, Trash2, X, CheckCircle, AlertCircle,
  ChevronDown, Star, Flame, UserPlus, UserMinus, MoveRight, GraduationCap, Search, BookOpen, Save
} from 'lucide-react';
import clsx from 'clsx';

const ALL_SUBJECTS = ['math', 'science', 'english', 'history', 'art', 'pe', 'ict', 'music'];
const SUBJECT_LABELS: Record<string, string> = {
  math: 'Mathematics', science: 'Science', english: 'English', history: 'History',
  art: 'Art', pe: 'Physical Education', ict: 'ICT', music: 'Music',
};

type Toast = { type: 'success' | 'error'; message: string };

const TEAM_COLORS = [
  'from-indigo-500 to-indigo-600', 'from-violet-500 to-purple-600',
  'from-sky-500 to-blue-600', 'from-emerald-500 to-green-600',
  'from-rose-500 to-pink-600', 'from-amber-500 to-orange-600',
  'from-teal-500 to-cyan-600', 'from-fuchsia-500 to-purple-600',
];

function getTeamColor(id: number) {
  return TEAM_COLORS[id % TEAM_COLORS.length];
}

function Badge({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', color ?? 'bg-slate-100 text-slate-600')}>
      {children}
    </span>
  );
}

export default function Teams() {
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);
  const [teamStudents, setTeamStudents] = useState<any[]>([]);
  const [unassigned, setUnassigned] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamLoading, setTeamLoading] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [search, setSearch] = useState('');

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [showRename, setShowRename] = useState<any | null>(null);
  const [showDelete, setShowDelete] = useState<any | null>(null);
  const [showAssign, setShowAssign] = useState(false);
  const [showMove, setShowMove] = useState<any | null>(null);

  const [createForm, setCreateForm] = useState({ name: '', grade: 7 });
  const [renameValue, setRenameValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Subject management
  const [teamSubjects, setTeamSubjects] = useState<string[]>(ALL_SUBJECTS);
  const [subjectDraft, setSubjectDraft] = useState<string[]>(ALL_SUBJECTS);
  const [savingSubjects, setSavingSubjects] = useState(false);
  const [subjectsDirty, setSubjectsDirty] = useState(false);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const refresh = useCallback(async () => {
    const [t, u, s] = await Promise.all([teamsApi.list(), teamsApi.unassigned(), studentsApi.list()]);
    setTeams(t);
    setUnassigned(u);
    setAllStudents(s);
    if (selectedTeam) {
      const updated = t.find((x: any) => x.id === selectedTeam.id);
      if (updated) setSelectedTeam(updated);
    }
  }, [selectedTeam]);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  const loadTeamStudents = async (team: any) => {
    setTeamLoading(true);
    setSelectedTeam(team);
    setSubjectsDirty(false);
    try {
      const [s, subs] = await Promise.all([
        teamsApi.students(team.id),
        teamsApi.getSubjects(team.id).catch(() => ALL_SUBJECTS),
      ]);
      setTeamStudents(s);
      setTeamSubjects(subs);
      setSubjectDraft(subs);
    } catch { setTeamStudents([]); }
    finally { setTeamLoading(false); }
  };

  const handleSaveSubjects = async () => {
    if (!selectedTeam) return;
    setSavingSubjects(true);
    try {
      await teamsApi.updateSubjects(selectedTeam.id, subjectDraft);
      setTeamSubjects(subjectDraft);
      setSubjectsDirty(false);
      showToast('success', 'Subjects updated successfully');
    } catch {
      showToast('error', 'Failed to update subjects');
    } finally { setSavingSubjects(false); }
  };

  const toggleSubject = (sub: string) => {
    setSubjectDraft(prev => {
      const next = prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub];
      setSubjectsDirty(JSON.stringify([...next].sort()) !== JSON.stringify([...teamSubjects].sort()));
      return next;
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await teamsApi.create({ name: createForm.name, grade: Number(createForm.grade) });
      await refresh();
      setShowCreate(false);
      setCreateForm({ name: '', grade: 7 });
      showToast('success', `Team "${createForm.name}" created`);
    } catch (err: any) {
      showToast('error', err.response?.data?.error ?? 'Failed to create team');
    } finally { setSaving(false); }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRename) return;
    setSaving(true);
    try {
      await teamsApi.update(showRename.id, { name: renameValue, grade: showRename.grade });
      await refresh();
      if (selectedTeam?.id === showRename.id) setSelectedTeam((p: any) => ({ ...p, name: renameValue }));
      setShowRename(null);
      showToast('success', 'Team renamed successfully');
    } catch (err: any) {
      showToast('error', err.response?.data?.error ?? 'Failed to rename team');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    setDeleting(true);
    try {
      await teamsApi.delete(showDelete.id);
      await refresh();
      if (selectedTeam?.id === showDelete.id) { setSelectedTeam(null); setTeamStudents([]); }
      setShowDelete(null);
      showToast('success', `Team "${showDelete.name}" deleted, students unassigned`);
    } catch (err: any) {
      showToast('error', err.response?.data?.error ?? 'Failed to delete team');
    } finally { setDeleting(false); }
  };

  const handleAssign = async (studentId: number) => {
    if (!selectedTeam) return;
    try {
      await teamsApi.assignStudent(selectedTeam.id, studentId);
      await Promise.all([refresh(), loadTeamStudents(selectedTeam)]);
      showToast('success', 'Student assigned to team');
    } catch {
      showToast('error', 'Failed to assign student');
    }
  };

  const handleRemove = async (studentId: number, studentName: string) => {
    if (!selectedTeam) return;
    try {
      await teamsApi.removeStudent(selectedTeam.id, studentId);
      await Promise.all([refresh(), loadTeamStudents(selectedTeam)]);
      showToast('success', `${studentName} removed from team`);
    } catch {
      showToast('error', 'Failed to remove student');
    }
  };

  const handleMove = async (studentId: number, targetTeamId: number) => {
    try {
      await teamsApi.assignStudent(targetTeamId, studentId);
      if (selectedTeam) await loadTeamStudents(selectedTeam);
      await refresh();
      setShowMove(null);
      showToast('success', 'Student moved successfully');
    } catch {
      showToast('error', 'Failed to move student');
    }
  };

  if (loading) return <LoadingSpinner text="Loading teams..." />;

  const filteredUnassigned = search
    ? unassigned.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()))
    : unassigned;

  const Modal = ({ title, onClose, children, size = 'md' }: { title: string; onClose: () => void; children: React.ReactNode; size?: 'sm' | 'md' | 'lg' }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className={clsx('relative bg-white rounded-2xl shadow-2xl w-full animate-fade-in', size === 'lg' ? 'max-w-2xl' : size === 'sm' ? 'max-w-sm' : 'max-w-md')}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"><X size={18} /></button>
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

      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 grad-primary rounded-xl flex items-center justify-center shadow-md">
            <GraduationCap size={20} className="text-white" />
          </div>
          <div>
            <h1 className="page-title">Team Management</h1>
            <p className="page-subtitle">{teams.length} teams · {unassigned.length} unassigned student{unassigned.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 self-start">
          <Plus size={18} /> New Team
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── LEFT PANEL: Team list ── */}
        <div className="xl:col-span-1 space-y-3">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider px-1">Teams</h2>
          {teams.length === 0 && (
            <div className="card py-10 text-center">
              <GraduationCap size={28} className="text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No teams yet</p>
              <button onClick={() => setShowCreate(true)} className="btn-primary mt-4 text-sm">Create First Team</button>
            </div>
          )}
          {teams.map(team => (
            <div
              key={team.id}
              onClick={() => loadTeamStudents(team)}
              className={clsx(
                'card cursor-pointer transition-all hover:shadow-md group',
                selectedTeam?.id === team.id ? 'ring-2 ring-primary-500 shadow-md' : ''
              )}
            >
              <div className="flex items-start gap-3">
                <div className={clsx('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-sm', getTeamColor(team.id))}>
                  <span className="text-white font-black text-sm">{team.name?.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 truncate">{team.name}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button onClick={e => { e.stopPropagation(); setRenameValue(team.name); setShowRename(team); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={e => { e.stopPropagation(); setShowDelete(team); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-500">Grade {team.grade}</span>
                    <span className="text-xs font-semibold text-primary-600">{team.studentCount} student{team.studentCount !== 1 ? 's' : ''}</span>
                    {team.avgXp > 0 && <span className="text-xs text-slate-400">{Math.round(team.avgXp).toLocaleString()} avg XP</span>}
                  </div>
                </div>
              </div>

              {/* Mini progress bar */}
              {team.studentCount > 0 && (
                <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-400"
                    style={{ width: `${Math.min(100, (team.avgLevel / 20) * 100)}%` }} />
                </div>
              )}
            </div>
          ))}

          {/* Unassigned count card */}
          {unassigned.length > 0 && (
            <div className="card border-dashed border-2 border-slate-200 bg-slate-50 py-3 px-4">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-slate-400" />
                <span className="text-sm text-slate-500"><strong className="text-slate-700">{unassigned.length}</strong> student{unassigned.length !== 1 ? 's' : ''} not assigned to a team</span>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL: Team detail / unassigned ── */}
        <div className="xl:col-span-2 space-y-6">
          {/* Selected team detail */}
          {selectedTeam ? (
            <div className="card">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className={clsx('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm', getTeamColor(selectedTeam.id))}>
                    <span className="text-white font-black text-sm">{selectedTeam.name?.charAt(0)}</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{selectedTeam.name}</h2>
                    <p className="text-xs text-slate-500">Grade {selectedTeam.grade} · {selectedTeam.studentCount ?? teamStudents.length} students</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAssign(true)}
                  disabled={unassigned.length === 0}
                  className="btn-primary text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <UserPlus size={15} /> Add Student
                </button>
              </div>

              {teamLoading ? (
                <div className="py-12 text-center"><div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>
              ) : teamStudents.length === 0 ? (
                <div className="py-12 text-center">
                  <Users size={28} className="text-slate-200 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">No students in this team yet</p>
                  <button onClick={() => setShowAssign(true)} disabled={unassigned.length === 0} className="btn-primary mt-4 text-sm disabled:opacity-40">
                    Assign Students
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Column headers */}
                  <div className="grid grid-cols-[2rem_1fr_5rem_5rem_5rem_3.5rem] gap-2 px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <div>#</div><div>Student</div><div className="text-center">XP</div><div className="text-center">Level</div><div className="text-center">Streak</div><div className="text-center">Actions</div>
                  </div>
                  {teamStudents.map((s, idx) => (
                    <div key={s.id} className="grid grid-cols-[2rem_1fr_5rem_5rem_5rem_3.5rem] gap-2 items-center px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group">
                      <span className={clsx('text-xs font-bold text-center', idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-amber-700' : 'text-slate-300')}>
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
                      </span>
                      <div className="min-w-0 flex items-center gap-2">
                        <div className="w-7 h-7 grad-primary rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                          {s.name?.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 text-sm truncate">{s.name}</div>
                          <div className="text-xs text-slate-400">{s.studentCode}</div>
                        </div>
                      </div>
                      <div className="text-center">
                        <span className="text-sm font-bold text-primary-600">{s.xp >= 1000 ? `${Math.round(s.xp / 1000)}k` : s.xp}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-sm font-bold text-purple-600">Lv.{s.level}</span>
                      </div>
                      <div className="text-center">
                        {s.streakDays > 0 ? (
                          <span className="flex items-center justify-center gap-0.5 text-amber-500 text-sm font-bold">
                            <Flame size={12} />{s.streakDays}
                          </span>
                        ) : <span className="text-slate-300 text-sm">—</span>}
                      </div>
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setShowMove(s)}
                          title="Move to another team"
                          className="p-1 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        >
                          <MoveRight size={13} />
                        </button>
                        <button
                          onClick={() => handleRemove(s.id, s.name)}
                          title="Remove from team"
                          className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <UserMinus size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="card py-16 text-center border-dashed border-2 border-slate-200 bg-slate-50">
              <GraduationCap size={36} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-semibold">Select a team to manage it</p>
              <p className="text-slate-400 text-sm mt-1">Click any team on the left to view and manage its students</p>
            </div>
          )}

          {/* Subject management for selected team */}
          {selectedTeam && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen size={18} className="text-primary-600" />
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Class Subjects</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Toggle which subjects are active for <strong>{selectedTeam.name}</strong>
                    </p>
                  </div>
                </div>
                {subjectsDirty && (
                  <button
                    onClick={handleSaveSubjects}
                    disabled={savingSubjects || subjectDraft.length === 0}
                    className="btn-primary text-sm flex items-center gap-2 disabled:opacity-40"
                  >
                    <Save size={14} /> {savingSubjects ? 'Saving...' : 'Save Changes'}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ALL_SUBJECTS.map(sub => {
                  const active = subjectDraft.includes(sub);
                  return (
                    <button
                      key={sub}
                      onClick={() => toggleSubject(sub)}
                      className={clsx(
                        'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-sm font-semibold transition-all',
                        active
                          ? 'border-primary-400 bg-primary-50 text-primary-700 shadow-sm shadow-primary-100'
                          : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300'
                      )}
                    >
                      <span className="text-xl">{
                        sub === 'math' ? '📐' : sub === 'science' ? '🔬' : sub === 'english' ? '📖' :
                        sub === 'history' ? '🏛️' : sub === 'art' ? '🎨' : sub === 'pe' ? '⚽' :
                        sub === 'ict' ? '💻' : '🎵'
                      }</span>
                      <span className="text-xs text-center leading-tight">{SUBJECT_LABELS[sub]}</span>
                      <span className={clsx(
                        'w-3 h-3 rounded-full border-2 mt-0.5',
                        active ? 'bg-primary-500 border-primary-500' : 'bg-white border-slate-300'
                      )} />
                    </button>
                  );
                })}
              </div>

              {subjectDraft.length === 0 && (
                <p className="text-xs text-red-500 mt-2 text-center">At least one subject must be selected.</p>
              )}

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>{subjectDraft.length} of {ALL_SUBJECTS.length} subjects active</span>
                <button
                  onClick={() => { setSubjectDraft(ALL_SUBJECTS); setSubjectsDirty(JSON.stringify([...ALL_SUBJECTS].sort()) !== JSON.stringify([...teamSubjects].sort())); }}
                  className="text-primary-600 hover:text-primary-700 font-semibold"
                >
                  Select all
                </button>
              </div>
            </div>
          )}

          {/* Unassigned students */}
          {unassigned.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users size={18} className="text-slate-400" />
                  Unassigned Students
                  <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{unassigned.length}</span>
                </h3>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="input pl-8 text-sm py-2 w-48"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                {filteredUnassigned.map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                    <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-bold text-sm flex-shrink-0">
                      {s.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 text-sm truncate">{s.name}</div>
                      <div className="text-xs text-slate-400">{s.studentCode} · Grade {s.grade}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-primary-600 font-semibold hidden sm:block">{s.xp?.toLocaleString()} XP</span>
                      {selectedTeam ? (
                        <button
                          onClick={() => handleAssign(s.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 hover:bg-primary-600 hover:text-white rounded-lg text-xs font-semibold transition-all border border-primary-100"
                        >
                          <UserPlus size={12} /> Add to {selectedTeam.name}
                        </button>
                      ) : (
                        <div className="relative group/dropdown">
                          <button className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-primary-50 hover:text-primary-700 rounded-lg text-xs font-semibold transition-all">
                            Assign <ChevronDown size={12} />
                          </button>
                          <div className="absolute right-0 top-8 z-20 bg-white rounded-xl shadow-xl border border-slate-100 py-1 min-w-40 hidden group-hover/dropdown:block">
                            {teams.length === 0 ? (
                              <div className="px-3 py-2 text-xs text-slate-400">No teams yet</div>
                            ) : teams.map(t => (
                              <button
                                key={t.id}
                                onClick={() => handleAssign(s.id)}
                                className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                {t.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {filteredUnassigned.length === 0 && search && (
                  <p className="text-center text-slate-400 text-sm py-4">No matching students</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Team Modal */}
      {showCreate && (
        <Modal title="Create New Team" onClose={() => setShowCreate(false)} size="sm">
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Team Name</label>
              <input
                type="text" required autoFocus
                value={createForm.name}
                onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))}
                className="input" placeholder="e.g. Team Alpha"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Grade</label>
              <select value={createForm.grade} onChange={e => setCreateForm(p => ({ ...p, grade: parseInt(e.target.value) }))} className="input">
                {Array.from({ length: 13 }, (_, i) => i + 1).map(g => (
                  <option key={g} value={g}>Grade {g}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowCreate(false)} className="flex-1 btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 btn-primary">{saving ? 'Creating...' : 'Create Team'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Rename Modal */}
      {showRename && (
        <Modal title={`Rename "${showRename.name}"`} onClose={() => setShowRename(null)} size="sm">
          <form onSubmit={handleRename} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New Name</label>
              <input
                type="text" required autoFocus
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                className="input"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowRename(null)} className="flex-1 btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 btn-primary">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Team Modal */}
      {showDelete && (
        <Modal title="Delete Team" onClose={() => setShowDelete(null)} size="sm">
          <div className="text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-red-600" />
            </div>
            <p className="text-slate-700 mb-1">Delete team</p>
            <p className="font-bold text-slate-900 text-lg mb-2">"{showDelete.name}"?</p>
            <p className="text-sm text-slate-500 mb-6">
              The <strong>{showDelete.studentCount}</strong> student{showDelete.studentCount !== 1 ? 's' : ''} in this team will be moved to unassigned. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(null)} className="flex-1 btn-secondary">Cancel</button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50">
                {deleting ? 'Deleting...' : 'Delete Team'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Assign Student Modal */}
      {showAssign && selectedTeam && (
        <Modal title={`Add Students to ${selectedTeam.name}`} onClose={() => setShowAssign(false)} size="md">
          {unassigned.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle size={32} className="text-emerald-500 mx-auto mb-3" />
              <p className="text-slate-600 font-semibold">All students are assigned to teams</p>
              <button onClick={() => setShowAssign(false)} className="btn-secondary mt-4">Close</button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-500 mb-4">Click a student to add them to <strong>{selectedTeam.name}</strong></p>
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {unassigned.map(s => (
                  <button
                    key={s.id}
                    onClick={async () => { await handleAssign(s.id); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-primary-50 hover:border-primary-200 border border-transparent transition-all group text-left"
                  >
                    <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-bold text-sm flex-shrink-0">
                      {s.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 text-sm">{s.name}</div>
                      <div className="text-xs text-slate-400">{s.studentCode} · Grade {s.grade}</div>
                    </div>
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary-600 text-xs font-semibold">
                      <UserPlus size={14} /> Add
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowAssign(false)} className="btn-secondary w-full mt-4">Done</button>
            </div>
          )}
        </Modal>
      )}

      {/* Move Student Modal */}
      {showMove && selectedTeam && (
        <Modal title={`Move ${showMove.name}`} onClose={() => setShowMove(null)} size="sm">
          <p className="text-sm text-slate-500 mb-4">Move to which team?</p>
          <div className="space-y-2">
            {teams.filter(t => t.id !== selectedTeam.id).map(t => (
              <button
                key={t.id}
                onClick={() => handleMove(showMove.id, t.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-primary-50 border border-slate-100 hover:border-primary-200 transition-all text-left"
              >
                <div className={clsx('w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0', getTeamColor(t.id))}>
                  <span className="text-white font-black text-xs">{t.name?.charAt(0)}</span>
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm">{t.name}</div>
                  <div className="text-xs text-slate-400">Grade {t.grade} · {t.studentCount} students</div>
                </div>
              </button>
            ))}
            {teams.filter(t => t.id !== selectedTeam.id).length === 0 && (
              <p className="text-center text-slate-400 text-sm py-4">No other teams available. Create one first.</p>
            )}
          </div>
          <button onClick={() => setShowMove(null)} className="btn-secondary w-full mt-4">Cancel</button>
        </Modal>
      )}
    </div>
  );
}

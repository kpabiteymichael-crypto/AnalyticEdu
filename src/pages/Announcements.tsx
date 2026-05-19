import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useClass } from '../context/ClassContext';
import { announcementsApi, teamsApi } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { Megaphone, Pin, Plus, Trash2, Edit3, Save, X, Clock } from 'lucide-react';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';

export default function Announcements() {
  const { user } = useAuth();
  const { activeClass } = useClass();
  const [items, setItems] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', classId: '', isPinned: false });

  const canManage = user?.role === 'admin' || user?.role === 'teacher';

  async function load() {
    try {
      const classId = activeClass?.id;
      const [anns, cls] = await Promise.all([
        announcementsApi.list(classId),
        canManage ? teamsApi.list() : Promise.resolve([]),
      ]);
      setItems(anns);
      setClasses(cls);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [activeClass?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        body: form.body,
        isPinned: form.isPinned,
        classId: form.classId ? parseInt(form.classId) : undefined,
      };
      if (editingItem) {
        await announcementsApi.update(editingItem.id, payload);
      } else {
        await announcementsApi.create(payload);
      }
      await load();
      setShowForm(false);
      setEditingItem(null);
      setForm({ title: '', body: '', classId: '', isPinned: false });
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this announcement?')) return;
    await announcementsApi.delete(id);
    await load();
  };

  const openEdit = (item: any) => {
    setForm({
      title: item.title,
      body: item.body,
      isPinned: item.isPinned,
      classId: item.classId?.toString() ?? '',
    });
    setEditingItem(item);
    setShowForm(true);
  };

  const pinned = items.filter(i => i.isPinned);
  const regular = items.filter(i => !i.isPinned);

  if (loading) return <LoadingSpinner text="Loading announcements..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Announcements</h1>
          <p className="text-slate-500 text-sm mt-1">
            {activeClass ? `Showing announcements for ${activeClass.name}` : 'All announcements'}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => { setForm({ title: '', body: '', classId: activeClass?.id?.toString() ?? '', isPinned: false }); setEditingItem(null); setShowForm(true); }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} /> New Announcement
          </button>
        )}
      </div>

      {/* Pinned announcements */}
      {pinned.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-wider">
            <Pin size={13} /> Pinned
          </div>
          {pinned.map(item => (
            <AnnouncementCard
              key={item.id}
              item={item}
              canManage={canManage}
              onEdit={openEdit}
              onDelete={handleDelete}
              pinned
            />
          ))}
        </div>
      )}

      {/* Regular announcements */}
      {regular.length === 0 && pinned.length === 0 ? (
        <div className="empty-state">
          <Megaphone size={40} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-bold text-slate-700">No announcements yet</h3>
          <p className="text-slate-400 mt-2 text-sm">
            {canManage ? 'Post your first announcement to inform your students.' : 'Your teacher hasn\'t posted any announcements yet.'}
          </p>
          {canManage && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 btn-primary"
            >
              Post First Announcement
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {pinned.length > 0 && regular.length > 0 && (
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-2">Recent</div>
          )}
          {regular.map(item => (
            <AnnouncementCard
              key={item.id}
              item={item}
              canManage={canManage}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 grad-primary rounded-xl flex items-center justify-center">
                  <Megaphone size={16} className="text-white" />
                </div>
                <h3 className="font-bold text-slate-900">{editingItem ? 'Edit Announcement' : 'New Announcement'}</h3>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Title</label>
                <input
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="input"
                  placeholder="Announcement title..."
                  required
                />
              </div>
              <div>
                <label className="label">Message</label>
                <textarea
                  value={form.body}
                  onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                  className="input resize-none"
                  rows={5}
                  placeholder="Write your announcement..."
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Class <span className="text-slate-400 font-normal">(optional)</span></label>
                  <select value={form.classId} onChange={e => setForm(p => ({ ...p, classId: e.target.value }))} className="input">
                    <option value="">All classes</option>
                    {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={form.isPinned} onChange={e => setForm(p => ({ ...p, isPinned: e.target.checked }))} className="w-4 h-4 accent-primary-600" />
                    <Pin size={14} className="text-amber-500" />
                    <span className="text-sm font-medium text-slate-700">Pin announcement</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary flex items-center justify-center gap-2">
                  <Save size={14} /> {saving ? 'Posting...' : editingItem ? 'Save Changes' : 'Post Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function AnnouncementCard({ item, canManage, onEdit, onDelete, pinned = false }: {
  item: any;
  canManage: boolean;
  onEdit: (item: any) => void;
  onDelete: (id: number) => void;
  pinned?: boolean;
}) {
  return (
    <div className={clsx(
      'card p-5 group transition-all',
      pinned ? 'border-l-4 border-amber-400 bg-amber-50/30' : ''
    )}>
      <div className="flex items-start gap-3">
        <div className={clsx(
          'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
          pinned ? 'bg-amber-100' : 'bg-primary-50'
        )}>
          {pinned
            ? <Pin size={15} className="text-amber-600" />
            : <Megaphone size={15} className="text-primary-600" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-slate-900 text-sm">{item.title}</h3>
            {canManage && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button onClick={() => onEdit(item)} className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-all">
                  <Edit3 size={13} />
                </button>
                <button onClick={() => onDelete(item.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>
          <p className="text-sm text-slate-600 mt-1.5 whitespace-pre-line">{item.body}</p>
          <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
            <div className="w-5 h-5 grad-primary rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
              {item.authorName?.charAt(0).toUpperCase()}
            </div>
            <span className="font-medium text-slate-600">{item.authorName}</span>
            <span className="capitalize text-slate-400">{item.authorRole}</span>
            {item.classId && <span className="text-primary-500">· Class specific</span>}
            <span className="flex items-center gap-1 ml-auto">
              <Clock size={11} />
              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

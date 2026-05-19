import { useEffect, useState } from 'react';
import { lmsApi, teamsApi } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  BookOpen, Plus, Trash2, Edit3, Eye, EyeOff, Save, X,
  FileText, Video, Link2, Play, Globe, GripVertical,
} from 'lucide-react';
import clsx from 'clsx';

const SUBJECTS = ['math', 'science', 'english', 'history', 'art', 'pe', 'ict', 'music'];
const TYPES = [
  { value: 'note',   label: 'Note (inline text)', icon: <FileText size={14} /> },
  { value: 'pdf',    label: 'PDF document',        icon: <FileText size={14} /> },
  { value: 'video',  label: 'Video (URL)',          icon: <Video size={14} /> },
  { value: 'link',   label: 'External link',        icon: <Link2 size={14} /> },
  { value: 'slides', label: 'Slides (URL)',          icon: <Play size={14} /> },
];

const TYPE_COLOR: Record<string, string> = {
  note: 'bg-slate-100 text-slate-600', pdf: 'bg-red-100 text-red-600',
  video: 'bg-purple-100 text-purple-600', link: 'bg-blue-100 text-blue-600',
  slides: 'bg-amber-100 text-amber-600',
};

function emptyMaterial(topicId = 0) {
  return { topicId, title: '', description: '', type: 'note', url: '', content: '', isPublished: false, estimatedMins: 10, classId: '' };
}
function emptyTopic(subject = '') {
  return { subject, name: '', description: '' };
}

export default function ContentManager() {
  const [activeTab, setActiveTab] = useState<'topics' | 'materials'>('materials');
  const [selectedSubject, setSelectedSubject] = useState('math');
  const [topics, setTopics] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showTopicForm, setShowTopicForm] = useState(false);
  const [topicForm, setTopicForm] = useState(emptyTopic('math'));
  const [editingTopic, setEditingTopic] = useState<any>(null);

  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [materialForm, setMaterialForm] = useState<any>(emptyMaterial());
  const [editingMaterial, setEditingMaterial] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  async function reload() {
    try {
      const [t, m, c] = await Promise.all([
        lmsApi.getTopics(),
        lmsApi.getMaterials(),
        teamsApi.list(),
      ]);
      setTopics(t);
      setMaterials(m);
      setClasses(c);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); }, []);

  const filteredTopics = topics.filter(t => t.subject === selectedSubject);
  const filteredMaterials = materials.filter(m => m.topicSubject === selectedSubject);

  const handleSaveTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingTopic) {
        await lmsApi.updateTopic(editingTopic.id, topicForm);
      } else {
        await lmsApi.createTopic({ ...topicForm, subject: selectedSubject });
      }
      await reload();
      setShowTopicForm(false);
      setEditingTopic(null);
      setTopicForm(emptyTopic(selectedSubject));
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleDeleteTopic = async (id: number) => {
    if (!confirm('Delete this topic and all its materials?')) return;
    await lmsApi.deleteTopic(id);
    await reload();
  };

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...materialForm,
        topicId: parseInt(materialForm.topicId),
        classId: materialForm.classId ? parseInt(materialForm.classId) : null,
        estimatedMins: parseInt(materialForm.estimatedMins),
      };
      if (editingMaterial) {
        await lmsApi.updateMaterial(editingMaterial.id, payload);
      } else {
        await lmsApi.createMaterial(payload);
      }
      await reload();
      setShowMaterialForm(false);
      setEditingMaterial(null);
      setMaterialForm(emptyMaterial());
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleDeleteMaterial = async (id: number) => {
    if (!confirm('Delete this material?')) return;
    await lmsApi.deleteMaterial(id);
    await reload();
  };

  const handleTogglePublish = async (m: any) => {
    await lmsApi.updateMaterial(m.id, { ...m, isPublished: !m.isPublished });
    await reload();
  };

  const openEditMaterial = (m: any) => {
    setMaterialForm({
      topicId: m.topicId, title: m.title, description: m.description ?? '',
      type: m.type, url: m.url ?? '', content: m.content ?? '',
      isPublished: m.isPublished, estimatedMins: m.estimatedMins ?? 10,
      classId: m.classId ?? '',
    });
    setEditingMaterial(m);
    setShowMaterialForm(true);
  };

  const openEditTopic = (t: any) => {
    setTopicForm({ subject: t.subject, name: t.name, description: t.description ?? '' });
    setEditingTopic(t);
    setShowTopicForm(true);
  };

  if (loading) return <LoadingSpinner text="Loading content manager..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Content Manager</h1>
          <p className="text-slate-500 text-sm mt-1">Manage topics and learning materials for your students</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'topics' ? (
            <button
              onClick={() => { setTopicForm(emptyTopic(selectedSubject)); setEditingTopic(null); setShowTopicForm(true); }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} /> New Topic
            </button>
          ) : (
            <button
              onClick={() => {
                const firstTopic = filteredTopics[0];
                setMaterialForm(emptyMaterial(firstTopic?.id ?? 0));
                setEditingMaterial(null);
                setShowMaterialForm(true);
              }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} /> New Material
            </button>
          )}
        </div>
      </div>

      {/* Subject + Tab bar */}
      <div className="card p-4 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Subject:</span>
          <div className="flex gap-1 flex-wrap">
            {SUBJECTS.map(s => (
              <button
                key={s}
                onClick={() => setSelectedSubject(s)}
                className={clsx(
                  'px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all',
                  selectedSubject === s ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >{s}</button>
            ))}
          </div>
        </div>
        <div className="flex gap-1 ml-auto">
          {(['topics', 'materials'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all',
                activeTab === tab ? 'bg-primary-100 text-primary-700' : 'text-slate-600 hover:bg-slate-100'
              )}
            >{tab}</button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Topics', value: filteredTopics.length, color: 'text-primary-600' },
          { label: 'Materials', value: filteredMaterials.length, color: 'text-slate-700' },
          { label: 'Published', value: filteredMaterials.filter(m => m.isPublished).length, color: 'text-emerald-600' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Topics tab */}
      {activeTab === 'topics' && (
        <div className="space-y-2">
          {filteredTopics.length === 0 ? (
            <div className="empty-state">
              <BookOpen size={36} className="mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500 font-medium">No topics for {selectedSubject} yet.</p>
              <button onClick={() => { setTopicForm(emptyTopic(selectedSubject)); setEditingTopic(null); setShowTopicForm(true); }}
                className="mt-3 btn-primary text-sm">Create First Topic</button>
            </div>
          ) : filteredTopics.map(t => (
            <div key={t.id} className="card p-4 flex items-start gap-3">
              <GripVertical size={16} className="text-slate-300 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900">{t.name}</div>
                {t.description && <p className="text-sm text-slate-500 mt-0.5">{t.description}</p>}
                <div className="text-xs text-slate-400 mt-1">
                  {materials.filter(m => m.topicId === t.id).length} material(s)
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEditTopic(t)} className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-all">
                  <Edit3 size={14} />
                </button>
                <button onClick={() => handleDeleteTopic(t.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Materials tab */}
      {activeTab === 'materials' && (
        <div className="space-y-2">
          {filteredMaterials.length === 0 ? (
            <div className="empty-state">
              <FileText size={36} className="mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500 font-medium">No materials for {selectedSubject} yet.</p>
              <button onClick={() => { const t = filteredTopics[0]; setMaterialForm(emptyMaterial(t?.id ?? 0)); setEditingMaterial(null); setShowMaterialForm(true); }}
                className="mt-3 btn-primary text-sm">Add First Material</button>
            </div>
          ) : filteredMaterials.map(m => (
            <div key={m.id} className={clsx('card p-4 flex items-start gap-3 transition-all', !m.isPublished && 'opacity-70 border-dashed')}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', TYPE_COLOR[m.type] ?? 'bg-slate-100 text-slate-600')}>
                    {TYPES.find(t => t.value === m.type)?.label ?? m.type}
                  </span>
                  <span className="font-semibold text-slate-900 text-sm">{m.title}</span>
                  {!m.isPublished && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Draft</span>
                  )}
                </div>
                {m.description && <p className="text-xs text-slate-500 mt-1">{m.description}</p>}
                <div className="text-xs text-slate-400 mt-1">
                  Topic: <span className="text-slate-600">{m.topicName}</span> · {m.estimatedMins} min
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleTogglePublish(m)}
                  className={clsx(
                    'p-1.5 rounded-lg transition-all',
                    m.isPublished ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                  )}
                  title={m.isPublished ? 'Unpublish' : 'Publish'}
                >
                  {m.isPublished ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button onClick={() => openEditMaterial(m)} className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-all">
                  <Edit3 size={14} />
                </button>
                <button onClick={() => handleDeleteMaterial(m.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Topic form modal */}
      {showTopicForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowTopicForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">{editingTopic ? 'Edit Topic' : 'New Topic'}</h3>
              <button onClick={() => setShowTopicForm(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveTopic} className="p-6 space-y-4">
              <div>
                <label className="label">Subject</label>
                <select value={topicForm.subject} onChange={e => setTopicForm(p => ({ ...p, subject: e.target.value }))} className="input" required>
                  {SUBJECTS.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Topic Name</label>
                <input value={topicForm.name} onChange={e => setTopicForm(p => ({ ...p, name: e.target.value }))} className="input" placeholder="e.g. Algebra Fundamentals" required />
              </div>
              <div>
                <label className="label">Description <span className="text-slate-400 font-normal">(optional)</span></label>
                <textarea value={topicForm.description} onChange={e => setTopicForm(p => ({ ...p, description: e.target.value }))} className="input resize-none" rows={2} placeholder="What students will learn..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowTopicForm(false)} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary flex items-center justify-center gap-2">
                  <Save size={14} /> {saving ? 'Saving...' : 'Save Topic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Material form modal */}
      {showMaterialForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowMaterialForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-fade-in overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">{editingMaterial ? 'Edit Material' : 'New Material'}</h3>
              <button onClick={() => setShowMaterialForm(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveMaterial} className="p-6 space-y-4">
              <div>
                <label className="label">Topic</label>
                <select value={materialForm.topicId} onChange={e => setMaterialForm((p: any) => ({ ...p, topicId: e.target.value }))} className="input" required>
                  <option value="">Select a topic...</option>
                  {topics.map(t => <option key={t.id} value={t.id}>{t.subject} — {t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Title</label>
                <input value={materialForm.title} onChange={e => setMaterialForm((p: any) => ({ ...p, title: e.target.value }))} className="input" placeholder="Material title" required />
              </div>
              <div>
                <label className="label">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {TYPES.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setMaterialForm((p: any) => ({ ...p, type: t.value }))}
                      className={clsx(
                        'flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all',
                        materialForm.type === t.value ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      )}
                    >
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>
              {materialForm.type !== 'note' && (
                <div>
                  <label className="label">URL</label>
                  <input value={materialForm.url} onChange={e => setMaterialForm((p: any) => ({ ...p, url: e.target.value }))} className="input" type="url" placeholder="https://..." />
                </div>
              )}
              {materialForm.type === 'note' && (
                <div>
                  <label className="label">Content</label>
                  <textarea value={materialForm.content} onChange={e => setMaterialForm((p: any) => ({ ...p, content: e.target.value }))} className="input resize-none font-mono text-sm" rows={5} placeholder="Write your note content here..." />
                </div>
              )}
              <div>
                <label className="label">Description <span className="text-slate-400 font-normal">(optional)</span></label>
                <input value={materialForm.description} onChange={e => setMaterialForm((p: any) => ({ ...p, description: e.target.value }))} className="input" placeholder="Brief description..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Estimated Time (min)</label>
                  <input value={materialForm.estimatedMins} onChange={e => setMaterialForm((p: any) => ({ ...p, estimatedMins: e.target.value }))} className="input" type="number" min={1} />
                </div>
                <div>
                  <label className="label">Class <span className="text-slate-400 font-normal">(leave blank for all)</span></label>
                  <select value={materialForm.classId} onChange={e => setMaterialForm((p: any) => ({ ...p, classId: e.target.value }))} className="input">
                    <option value="">All classes</option>
                    {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={materialForm.isPublished} onChange={e => setMaterialForm((p: any) => ({ ...p, isPublished: e.target.checked }))} className="w-4 h-4 accent-primary-600" />
                  <Globe size={14} className="text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">Publish immediately</span>
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowMaterialForm(false)} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary flex items-center justify-center gap-2">
                  <Save size={14} /> {saving ? 'Saving...' : 'Save Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

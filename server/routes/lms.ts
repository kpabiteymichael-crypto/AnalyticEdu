import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../db/index';
import {
  topics, learningMaterials, lessonProgress, students, activityLogs,
} from '../db/schema';
import { eq, and, asc, desc } from 'drizzle-orm';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../public/uploads'),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'text/plain', 'text/markdown', 'image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

const router = Router();

// ─── File Upload ─────────────────────────────────────────

router.post('/upload', authenticate, authorize('admin', 'teacher'), upload.single('file'), (req: AuthRequest, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded or file type not allowed' });
  const url = `/uploads/${req.file.filename}`;
  return res.json({ url, filename: req.file.originalname, size: req.file.size });
});

// ─── Topics ──────────────────────────────────────────────

router.get('/topics', authenticate, async (req: AuthRequest, res) => {
  try {
    const { subject } = req.query;
    const rows = await db.select().from(topics)
      .orderBy(asc(topics.orderIndex), asc(topics.name));
    const result = subject ? rows.filter(t => t.subject === subject) : rows;
    return res.json(result);
  } catch {
    return res.status(500).json({ error: 'Failed to fetch topics' });
  }
});

router.post('/topics', authenticate, authorize('admin', 'teacher'), async (req: AuthRequest, res) => {
  try {
    const { subject, name, description, orderIndex } = req.body;
    if (!subject || !name) return res.status(400).json({ error: 'subject and name are required' });
    const [topic] = await db.insert(topics).values({
      subject, name, description, orderIndex: orderIndex ?? 0, createdBy: req.user!.id,
    }).returning();
    return res.status(201).json(topic);
  } catch {
    return res.status(500).json({ error: 'Failed to create topic' });
  }
});

router.put('/topics/:id', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, orderIndex } = req.body;
    const [updated] = await db.update(topics)
      .set({ name, description, orderIndex })
      .where(eq(topics.id, id)).returning();
    if (!updated) return res.status(404).json({ error: 'Topic not found' });
    return res.json(updated);
  } catch {
    return res.status(500).json({ error: 'Failed to update topic' });
  }
});

router.delete('/topics/:id', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    await db.delete(topics).where(eq(topics.id, parseInt(req.params.id)));
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Failed to delete topic' });
  }
});

// ─── Materials ───────────────────────────────────────────

router.get('/materials', authenticate, async (req: AuthRequest, res) => {
  try {
    const { topicId, subject } = req.query;
    const user = req.user!;

    const rows = await db.select({
      id: learningMaterials.id,
      topicId: learningMaterials.topicId,
      classId: learningMaterials.classId,
      createdBy: learningMaterials.createdBy,
      title: learningMaterials.title,
      description: learningMaterials.description,
      type: learningMaterials.type,
      url: learningMaterials.url,
      content: learningMaterials.content,
      isPublished: learningMaterials.isPublished,
      estimatedMins: learningMaterials.estimatedMins,
      orderIndex: learningMaterials.orderIndex,
      createdAt: learningMaterials.createdAt,
      updatedAt: learningMaterials.updatedAt,
      topicName: topics.name,
      topicSubject: topics.subject,
    })
      .from(learningMaterials)
      .innerJoin(topics, eq(learningMaterials.topicId, topics.id))
      .orderBy(asc(learningMaterials.orderIndex), desc(learningMaterials.createdAt));

    let result = rows;
    if (topicId) result = result.filter(r => r.topicId === parseInt(topicId as string));
    if (subject) result = result.filter(r => r.topicSubject === subject);
    if (user.role === 'student') result = result.filter(r => r.isPublished);

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch materials' });
  }
});

router.post('/materials', authenticate, authorize('admin', 'teacher'), async (req: AuthRequest, res) => {
  try {
    const { topicId, classId, title, description, type, url, content, isPublished, estimatedMins, orderIndex } = req.body;
    if (!topicId || !title) return res.status(400).json({ error: 'topicId and title are required' });
    const [material] = await db.insert(learningMaterials).values({
      topicId,
      classId: classId || null,
      createdBy: req.user!.id,
      title, description,
      type: type ?? 'note',
      url: url || null,
      content: content || null,
      isPublished: isPublished ?? false,
      estimatedMins: estimatedMins ?? 10,
      orderIndex: orderIndex ?? 0,
    }).returning();
    return res.status(201).json(material);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create material' });
  }
});

router.put('/materials/:id', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, description, type, url, content, isPublished, estimatedMins, orderIndex, classId } = req.body;
    const [updated] = await db.update(learningMaterials)
      .set({
        title, description, type,
        url: url || null,
        content: content || null,
        isPublished, estimatedMins, orderIndex,
        classId: classId ?? null,
        updatedAt: new Date(),
      })
      .where(eq(learningMaterials.id, id)).returning();
    if (!updated) return res.status(404).json({ error: 'Material not found' });
    return res.json(updated);
  } catch {
    return res.status(500).json({ error: 'Failed to update material' });
  }
});

router.delete('/materials/:id', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    await db.delete(learningMaterials).where(eq(learningMaterials.id, parseInt(req.params.id)));
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Failed to delete material' });
  }
});

// ─── Progress ────────────────────────────────────────────

router.get('/my-progress', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    if (user.role !== 'student') return res.json([]);
    const [student] = await db.select().from(students).where(eq(students.userId, user.id)).limit(1);
    if (!student) return res.json([]);
    const result = await db.select().from(lessonProgress)
      .where(eq(lessonProgress.studentId, student.id));
    return res.json(result);
  } catch {
    return res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

router.post('/progress/:materialId', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    if (user.role !== 'student') return res.status(403).json({ error: 'Students only' });

    const materialId = parseInt(req.params.materialId);
    const { action, timeSpentMins } = req.body;

    const [student] = await db.select().from(students).where(eq(students.userId, user.id)).limit(1);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const [existing] = await db.select().from(lessonProgress)
      .where(and(eq(lessonProgress.studentId, student.id), eq(lessonProgress.materialId, materialId)))
      .limit(1);

    const isFirstComplete = action === 'complete' && (!existing || !existing.completedAt);

    let result;
    if (existing) {
      const updates: Record<string, unknown> = {};
      if (action === 'complete' && !existing.completedAt) {
        updates.completedAt = new Date();
        updates.timeSpentMins = timeSpentMins ?? existing.timeSpentMins;
      }
      if (action === 'bookmark') updates.isBookmarked = true;
      if (action === 'unbookmark') updates.isBookmarked = false;
      [result] = await db.update(lessonProgress).set(updates)
        .where(eq(lessonProgress.id, existing.id)).returning();
    } else {
      [result] = await db.insert(lessonProgress).values({
        studentId: student.id,
        materialId,
        completedAt: action === 'complete' ? new Date() : undefined,
        timeSpentMins: timeSpentMins ?? 0,
        isBookmarked: action === 'bookmark',
      }).returning();
    }

    if (isFirstComplete) {
      const XP = 20;
      await db.update(students).set({ xp: student.xp + XP }).where(eq(students.id, student.id));
      await db.insert(activityLogs).values({
        studentId: student.id,
        activityType: 'lesson_completed',
        description: 'Completed a learning material',
        xpEarned: XP,
      });
    }

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update progress' });
  }
});

export default router;

import { Router } from 'express';
import { db } from '../db/index';
import { announcements, users } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { classId } = req.query;
    const rows = await db.select({
      id: announcements.id,
      classId: announcements.classId,
      authorId: announcements.authorId,
      title: announcements.title,
      body: announcements.body,
      isPinned: announcements.isPinned,
      createdAt: announcements.createdAt,
      updatedAt: announcements.updatedAt,
      authorName: users.name,
      authorRole: users.role,
    })
      .from(announcements)
      .innerJoin(users, eq(announcements.authorId, users.id))
      .orderBy(desc(announcements.isPinned), desc(announcements.createdAt))
      .limit(50);

    const result = classId
      ? rows.filter(a => a.classId === parseInt(classId as string) || a.classId === null)
      : rows;

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

router.post('/', authenticate, authorize('admin', 'teacher'), async (req: AuthRequest, res) => {
  try {
    const { classId, title, body, isPinned } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'title and body are required' });
    const [announcement] = await db.insert(announcements).values({
      classId: classId || null,
      authorId: req.user!.id,
      title,
      body,
      isPinned: isPinned ?? false,
    }).returning();
    return res.status(201).json(announcement);
  } catch {
    return res.status(500).json({ error: 'Failed to create announcement' });
  }
});

router.put('/:id', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, body, isPinned } = req.body;
    const [updated] = await db.update(announcements)
      .set({ title, body, isPinned, updatedAt: new Date() })
      .where(eq(announcements.id, id)).returning();
    if (!updated) return res.status(404).json({ error: 'Announcement not found' });
    return res.json(updated);
  } catch {
    return res.status(500).json({ error: 'Failed to update announcement' });
  }
});

router.delete('/:id', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    await db.delete(announcements).where(eq(announcements.id, parseInt(req.params.id)));
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

export default router;

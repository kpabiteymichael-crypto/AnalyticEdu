import { Router } from 'express';
import { db } from '../db/index';
import { notifications } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await db.select().from(notifications)
      .where(eq(notifications.userId, req.user!.id))
      .orderBy(desc(notifications.createdAt))
      .limit(20);
    return res.json(result);
  } catch {
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, parseInt(req.params.id)));
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Failed to mark notification' });
  }
});

router.patch('/read-all', authenticate, async (req: AuthRequest, res) => {
  try {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, req.user!.id));
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Failed to mark all notifications' });
  }
});

export default router;

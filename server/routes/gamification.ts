import { Router } from 'express';
import { db } from '../db/index';
import { badges, studentBadges, students, activityLogs } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { authenticate, authorize } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// GET /api/gamification/badges - List all available badges
router.get('/badges', authenticate, async (_req, res) => {
  try {
    const allBadges = await db.select().from(badges).orderBy(badges.category);
    return res.json(allBadges);
  } catch {
    return res.status(500).json({ error: 'Failed to fetch badges' });
  }
});

// GET /api/gamification/badges/student/:studentId - Badges earned by student
router.get('/badges/student/:studentId', authenticate, async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const earned = await db
      .select({ badge: badges, earnedAt: studentBadges.earnedAt })
      .from(studentBadges)
      .innerJoin(badges, eq(studentBadges.badgeId, badges.id))
      .where(eq(studentBadges.studentId, studentId))
      .orderBy(desc(studentBadges.earnedAt));
    return res.json(earned);
  } catch {
    return res.status(500).json({ error: 'Failed to fetch student badges' });
  }
});

// POST /api/gamification/badges/award - Award badge manually
router.post('/badges/award', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { studentId, badgeId } = z.object({ studentId: z.number(), badgeId: z.number() }).parse(req.body);

    const [badge] = await db.select().from(badges).where(eq(badges.id, badgeId)).limit(1);
    if (!badge) return res.status(404).json({ error: 'Badge not found' });

    const exists = await db.select().from(studentBadges)
      .where(and(eq(studentBadges.studentId, studentId), eq(studentBadges.badgeId, badgeId)))
      .limit(1);
    if (exists.length > 0) return res.status(400).json({ error: 'Badge already awarded' });

    await db.insert(studentBadges).values({ studentId, badgeId });

    // Add XP for badge
    const [student] = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
    if (student) {
      await db.update(students).set({ xp: student.xp + badge.xpReward }).where(eq(students.id, studentId));
      await db.insert(activityLogs).values({
        studentId,
        activityType: 'badge_earned',
        description: `Earned the "${badge.name}" badge`,
        xpEarned: badge.xpReward,
      });
    }

    return res.json({ success: true, badge });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    return res.status(500).json({ error: 'Failed to award badge' });
  }
});

// GET /api/gamification/activity/:studentId
router.get('/activity/:studentId', authenticate, async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const activity = await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.studentId, studentId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(30);
    return res.json(activity);
  } catch {
    return res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

export default router;

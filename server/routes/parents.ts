import { Router } from 'express';
import { db } from '../db/index';
import { parentLinks, students, users, scores, studentBadges, badges, predictions } from '../db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// POST /api/parents/link - Link parent to student
router.post('/link', authenticate, authorize('admin', 'parent'), async (req: AuthRequest, res) => {
  try {
    const { studentCode, relationship } = z.object({
      studentCode: z.string(),
      relationship: z.string().default('parent'),
    }).parse(req.body);

    const [student] = await db.select().from(students).where(eq(students.studentCode, studentCode)).limit(1);
    if (!student) return res.status(404).json({ error: 'Student not found with that code' });

    const [link] = await db.insert(parentLinks).values({
      parentId: req.user!.id,
      studentId: student.id,
      relationship,
    }).returning();

    return res.status(201).json(link);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    if (err.code === '23505') return res.status(400).json({ error: 'Already linked to this student' });
    return res.status(500).json({ error: 'Failed to link student' });
  }
});

// GET /api/parents/my-children - Get parent's linked students
router.get('/my-children', authenticate, authorize('parent', 'admin'), async (req: AuthRequest, res) => {
  try {
    const links = await db
      .select({
        linkId: parentLinks.id,
        relationship: parentLinks.relationship,
        studentId: students.id,
        studentCode: students.studentCode,
        grade: students.grade,
        xp: students.xp,
        level: students.level,
        streakDays: students.streakDays,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        lastActiveAt: students.lastActiveAt,
      })
      .from(parentLinks)
      .innerJoin(students, eq(parentLinks.studentId, students.id))
      .innerJoin(users, eq(students.userId, users.id))
      .where(eq(parentLinks.parentId, req.user!.id));

    return res.json(links);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch children' });
  }
});

// GET /api/parents/child/:studentId/report
router.get('/child/:studentId/report', authenticate, authorize('parent', 'admin'), async (req: AuthRequest, res) => {
  try {
    const studentId = parseInt(req.params.studentId);

    // Verify parent has access
    if (req.user!.role === 'parent') {
      const [link] = await db.select().from(parentLinks)
        .where(eq(parentLinks.parentId, req.user!.id))
        .limit(1);
      if (!link) return res.status(403).json({ error: 'No access to this student' });
    }

    const [student] = await db.select({
      id: students.id,
      name: users.name,
      grade: students.grade,
      xp: students.xp,
      level: students.level,
      streakDays: students.streakDays,
      studentCode: students.studentCode,
    }).from(students).innerJoin(users, eq(students.userId, users.id))
      .where(eq(students.id, studentId)).limit(1);

    const recentScores = await db.select().from(scores)
      .where(eq(scores.studentId, studentId))
      .orderBy(desc(scores.recordedAt))
      .limit(10);

    const subjectAvgs = await db.select({
      subject: scores.subject,
      avgScore: sql<number>`ROUND(AVG(score / max_score * 100), 1)`,
      count: sql<number>`COUNT(*)`,
    }).from(scores).where(eq(scores.studentId, studentId)).groupBy(scores.subject);

    const earnedBadges = await db.select({ badge: badges, earnedAt: studentBadges.earnedAt })
      .from(studentBadges).innerJoin(badges, eq(studentBadges.badgeId, badges.id))
      .where(eq(studentBadges.studentId, studentId)).orderBy(desc(studentBadges.earnedAt)).limit(5);

    const latestPredictions = await db.select().from(predictions)
      .where(eq(predictions.studentId, studentId)).orderBy(desc(predictions.generatedAt)).limit(8);

    return res.json({ student, recentScores, subjectAverages: subjectAvgs, badges: earnedBadges, predictions: latestPredictions });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch child report' });
  }
});

export default router;

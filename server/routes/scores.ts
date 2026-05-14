import { Router } from 'express';
import { db } from '../db/index';
import { scores, students, activityLogs, badges, studentBadges } from '../db/schema';
import { eq, desc, sql, and } from 'drizzle-orm';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { getLevel } from '../lib/xp';
import { getSettingJson, DEFAULT_XP_REWARDS, DEFAULT_LEVEL_THRESHOLDS, calculateScoreXPFromRewards, getLevelFromThresholds } from './settings';
import { z } from 'zod';

const router = Router();

const scoreSchema = z.object({
  studentId: z.number(),
  subject: z.enum(['math', 'science', 'english', 'history', 'art', 'pe', 'ict', 'music']),
  score: z.number().min(0),
  maxScore: z.number().min(1).default(100),
  assessmentType: z.enum(['quiz', 'exam', 'homework', 'project', 'participation']).default('quiz'),
  assessmentName: z.string().min(1),
  semester: z.number().default(1),
  academicYear: z.string().default('2024-2025'),
});

// POST /api/scores - Record a new score
router.post('/', authenticate, authorize('admin', 'teacher'), async (req: AuthRequest, res) => {
  try {
    const data = scoreSchema.parse(req.body);

    const [student] = await db.select().from(students).where(eq(students.id, data.studentId)).limit(1);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const [score] = await db.insert(scores).values({
      ...data,
      recordedBy: req.user!.id,
    }).returning();

    // Award XP using current settings
    const [xpRewards, levelThresholds] = await Promise.all([
      getSettingJson('xp_rewards', DEFAULT_XP_REWARDS),
      getSettingJson('level_thresholds', DEFAULT_LEVEL_THRESHOLDS),
    ]);
    const xpEarned = calculateScoreXPFromRewards(data.score, data.maxScore, xpRewards);
    const newXp = student.xp + xpEarned;
    const newLevel = getLevelFromThresholds(newXp, levelThresholds);

    await db.update(students)
      .set({ xp: newXp, level: newLevel, lastActiveAt: new Date() })
      .where(eq(students.id, student.id));

    // Log activity
    await db.insert(activityLogs).values({
      studentId: student.id,
      activityType: 'score_recorded',
      description: `Scored ${data.score}/${data.maxScore} on ${data.assessmentName} (${data.subject})`,
      xpEarned,
    });

    // Check for badge eligibility
    const percentage = (data.score / data.maxScore) * 100;
    if (percentage >= 100) {
      const [perfectBadge] = await db.select().from(badges).where(eq(badges.name, 'Perfect Score')).limit(1);
      if (perfectBadge) {
        const exists = await db.select().from(studentBadges)
          .where(and(eq(studentBadges.studentId, student.id), eq(studentBadges.badgeId, perfectBadge.id)))
          .limit(1);
        if (!exists.length) {
          await db.insert(studentBadges).values({ studentId: student.id, badgeId: perfectBadge.id });
        }
      }
    }

    return res.status(201).json({ score, xpEarned, newXp, newLevel });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    console.error(err);
    return res.status(500).json({ error: 'Failed to record score' });
  }
});

// DELETE /api/scores/:id - Delete a score (with XP reversal)
router.delete('/:id', authenticate, authorize('admin', 'teacher'), async (_req, res) => {
  try {
    const scoreId = parseInt(_req.params.id);
    const [score] = await db.select().from(scores).where(eq(scores.id, scoreId)).limit(1);
    if (!score) return res.status(404).json({ error: 'Score not found' });

    const [student] = await db.select().from(students).where(eq(students.id, score.studentId)).limit(1);
    if (student) {
      const [xpRewards, levelThresholds] = await Promise.all([
        getSettingJson('xp_rewards', DEFAULT_XP_REWARDS),
        getSettingJson('level_thresholds', DEFAULT_LEVEL_THRESHOLDS),
      ]);
      const xpToReverse = calculateScoreXPFromRewards(score.score, score.maxScore, xpRewards);
      const newXp = Math.max(0, student.xp - xpToReverse);
      const newLevel = getLevelFromThresholds(newXp, levelThresholds);
      await db.update(students).set({ xp: newXp, level: newLevel }).where(eq(students.id, student.id));
    }

    await db.delete(scores).where(eq(scores.id, scoreId));
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete score' });
  }
});

// GET /api/scores/student/:studentId
router.get('/student/:studentId', authenticate, async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const result = await db.select().from(scores)
      .where(eq(scores.studentId, studentId))
      .orderBy(desc(scores.recordedAt));
    return res.json(result);
  } catch {
    return res.status(500).json({ error: 'Failed to fetch scores' });
  }
});

// GET /api/scores/student/:studentId/trends
router.get('/student/:studentId/trends', authenticate, async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const result = await db
      .select({
        subject: scores.subject,
        month: sql<string>`TO_CHAR(recorded_at, 'Mon')`,
        monthNum: sql<number>`EXTRACT(MONTH FROM recorded_at)`,
        avgScore: sql<number>`AVG(score / max_score * 100)`,
      })
      .from(scores)
      .where(eq(scores.studentId, studentId))
      .groupBy(scores.subject, sql`TO_CHAR(recorded_at, 'Mon')`, sql`EXTRACT(MONTH FROM recorded_at)`)
      .orderBy(sql`EXTRACT(MONTH FROM recorded_at)`);
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

// GET /api/scores/analytics/subject-breakdown
router.get('/analytics/subject-breakdown', authenticate, authorize('admin', 'teacher'), async (_req, res) => {
  try {
    const result = await db
      .select({
        subject: scores.subject,
        avgScore: sql<number>`AVG(score / max_score * 100)`,
        count: sql<number>`COUNT(*)`,
        minScore: sql<number>`MIN(score / max_score * 100)`,
        maxScore: sql<number>`MAX(score / max_score * 100)`,
      })
      .from(scores)
      .groupBy(scores.subject)
      .orderBy(sql`AVG(score / max_score * 100) DESC`);
    return res.json(result);
  } catch {
    return res.status(500).json({ error: 'Failed to fetch breakdown' });
  }
});

// GET /api/scores/analytics/monthly-trend
router.get('/analytics/monthly-trend', authenticate, authorize('admin', 'teacher'), async (_req, res) => {
  try {
    const result = await db
      .select({
        month: sql<string>`TO_CHAR(recorded_at, 'Mon YYYY')`,
        monthOrder: sql<number>`EXTRACT(YEAR FROM recorded_at) * 12 + EXTRACT(MONTH FROM recorded_at)`,
        avgScore: sql<number>`AVG(score / max_score * 100)`,
        totalAssessments: sql<number>`COUNT(*)`,
      })
      .from(scores)
      .groupBy(sql`TO_CHAR(recorded_at, 'Mon YYYY')`, sql`EXTRACT(YEAR FROM recorded_at) * 12 + EXTRACT(MONTH FROM recorded_at)`)
      .orderBy(sql`EXTRACT(YEAR FROM recorded_at) * 12 + EXTRACT(MONTH FROM recorded_at)`);
    return res.json(result);
  } catch {
    return res.status(500).json({ error: 'Failed to fetch monthly trend' });
  }
});

export default router;

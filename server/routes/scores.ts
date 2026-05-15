import { Router } from 'express';
import { db } from '../db/index';
import { scores, students, activityLogs, badges, studentBadges, users, classes } from '../db/schema';
import { eq, desc, sql, and, inArray } from 'drizzle-orm';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { getLevel } from '../lib/xp';
import { getSettingJson, DEFAULT_XP_REWARDS, DEFAULT_LEVEL_THRESHOLDS, calculateScoreXPFromRewards, getLevelFromThresholds, getRankBadgeBonusMultiplier } from './settings';
import { z } from 'zod';

const router = Router();

// ── Badge award helper ────────────────────────────────────────────────────────
// Awards any newly-unlocked badges after a score is recorded.
// Returns the total badge XP added so the caller can reflect it.
async function checkAndAwardBadges(params: {
  studentId: number;
  subject: string;
  score: number;
  maxScore: number;
  currentLevel: number;
  currentXp: number;
  levelThresholds: number[];
}): Promise<number> {
  const { studentId, subject, score, maxScore, currentLevel, currentXp, levelThresholds } = params;
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;

  // Load all badges and already-earned badge ids for this student in one go
  const [allBadges, earnedRows] = await Promise.all([
    db.select().from(badges),
    db.select({ badgeId: studentBadges.badgeId }).from(studentBadges).where(eq(studentBadges.studentId, studentId)),
  ]);
  const earned = new Set(earnedRows.map(r => r.badgeId));

  // Aggregate data needed for multi-criteria checks
  const [allScores] = await Promise.all([
    db.select({ subject: scores.subject, score: scores.score, maxScore: scores.maxScore, recordedAt: scores.recordedAt })
      .from(scores).where(eq(scores.studentId, studentId)),
  ]);

  const totalAssessments = allScores.length;

  // Subject-specific helpers
  const mathScores = allScores.filter(s => s.subject === 'math');
  const scienceScores = allScores.filter(s => s.subject === 'science');
  const subjectScores = allScores.filter(s => s.subject === subject).sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());

  const math90Plus = mathScores.filter(s => s.maxScore > 0 && (s.score / s.maxScore) * 100 >= 90).length;
  const science90Plus = scienceScores.filter(s => s.maxScore > 0 && (s.score / s.maxScore) * 100 >= 90).length;

  // Fast Learner: current score is ≥20 raw points higher than the previous score in same subject
  const prevScore = subjectScores.length >= 2 ? subjectScores[subjectScores.length - 2] : null;
  const improvement = prevScore ? score - prevScore.score : 0;

  const toBadge = (name: string) => allBadges.find(b => b.name === name);

  // Collect badges to award
  const toAward: typeof allBadges = [];

  const tryAward = (badge: typeof allBadges[0] | undefined) => {
    if (badge && !earned.has(badge.id)) toAward.push(badge);
  };

  // ── Criteria ───────────────────────────────────────────
  if (pct >= 100)           tryAward(toBadge('Perfect Score'));
  if (math90Plus >= 3)      tryAward(toBadge('Math Wizard'));
  if (science90Plus >= 1)   tryAward(toBadge('Science Star'));
  if (totalAssessments >= 20) tryAward(toBadge('Bookworm'));
  if (improvement >= 20)    tryAward(toBadge('Fast Learner'));
  if (currentLevel >= 5)    tryAward(toBadge('Level Up!'));

  if (toAward.length === 0) return 0;

  // Award all eligible badges and accumulate XP
  let totalBadgeXp = 0;
  for (const badge of toAward) {
    try {
      await db.insert(studentBadges).values({ studentId, badgeId: badge.id });
      totalBadgeXp += badge.xpReward;
      await db.insert(activityLogs).values({
        studentId,
        activityType: 'badge_earned',
        description: `Earned the "${badge.name}" badge`,
        xpEarned: badge.xpReward,
      });
    } catch {
      // Unique constraint violation = already awarded concurrently, skip
    }
  }

  if (totalBadgeXp > 0) {
    // Fetch latest XP (may have changed mid-request) and add badge bonus
    const [fresh] = await db.select({ xp: students.xp }).from(students).where(eq(students.id, studentId)).limit(1);
    const updatedXp = (fresh?.xp ?? currentXp) + totalBadgeXp;
    const updatedLevel = getLevelFromThresholds(updatedXp, levelThresholds);
    await db.update(students).set({ xp: updatedXp, level: updatedLevel }).where(eq(students.id, studentId));
  }

  return totalBadgeXp;
}

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
    const baseXp = calculateScoreXPFromRewards(data.score, data.maxScore, xpRewards);

    // Apply rank badge XP bonus based on student's current average score
    const [avgResult] = await db.select({
      avgPct: sql<number>`COALESCE(AVG(score / max_score * 100), 0)`,
    }).from(scores).where(eq(scores.studentId, student.id));
    const currentAvgPct = avgResult?.avgPct ?? 0;
    const bonusMultiplier = getRankBadgeBonusMultiplier(currentAvgPct);
    const bonusXp = Math.round(baseXp * bonusMultiplier);
    const xpEarned = baseXp + bonusXp;

    const newXp = student.xp + xpEarned;
    const newLevel = getLevelFromThresholds(newXp, levelThresholds);

    await db.update(students)
      .set({ xp: newXp, level: newLevel, lastActiveAt: new Date() })
      .where(eq(students.id, student.id));

    // Log activity
    const bonusNote = bonusXp > 0 ? ` (+${bonusXp} rank bonus)` : '';
    await db.insert(activityLogs).values({
      studentId: student.id,
      activityType: 'score_recorded',
      description: `Scored ${data.score}/${data.maxScore} on ${data.assessmentName} (${data.subject})${bonusNote}`,
      xpEarned,
    });

    // ── Comprehensive badge check + XP award ─────────────
    const badgeXp = await checkAndAwardBadges({
      studentId: student.id,
      subject: data.subject,
      score: data.score,
      maxScore: data.maxScore,
      currentLevel: newLevel,
      currentXp: newXp,
      levelThresholds,
    });

    // If any badges awarded, the student's XP was already updated inside checkAndAwardBadges
    const finalXp = badgeXp > 0
      ? (await db.select({ xp: students.xp, level: students.level }).from(students).where(eq(students.id, student.id)).limit(1))[0]?.xp ?? newXp
      : newXp;

    return res.status(201).json({ score, xpEarned, newXp: finalXp, newLevel, badgeXp });
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

// ─── Reset Endpoints ──────────────────────────────────────

// POST /api/scores/reset/student/:id  — delete all scores + reset XP/level for one student
router.post('/reset/student/:id', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const [student] = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const [levelThresholds] = await Promise.all([
      getSettingJson('level_thresholds', DEFAULT_LEVEL_THRESHOLDS),
    ]);

    await db.delete(scores).where(eq(scores.studentId, studentId));
    await db.update(students).set({ xp: 0, level: getLevelFromThresholds(0, levelThresholds) }).where(eq(students.id, studentId));
    await db.insert(activityLogs).values({
      studentId,
      activityType: 'reset',
      description: 'All scores and XP reset to zero',
      xpEarned: 0,
    });

    return res.json({ success: true, message: 'Student scores and XP reset to zero' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to reset student' });
  }
});

// POST /api/scores/reset/subject/:subject — delete all scores for a subject (across all students), recalc XP
router.post('/reset/subject/:subject', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const subject = req.params.subject;
    const levelThresholds = await getSettingJson('level_thresholds', DEFAULT_LEVEL_THRESHOLDS);
    const xpRewards = await getSettingJson('xp_rewards', DEFAULT_XP_REWARDS);

    // Get all students who have scores for this subject
    const affected = await db.selectDistinct({ studentId: scores.studentId }).from(scores).where(eq(scores.subject, subject as any));

    // Delete all scores for the subject
    await db.delete(scores).where(eq(scores.subject, subject as any));

    // Recalculate XP for each affected student from remaining scores
    for (const { studentId } of affected) {
      const remaining = await db.select().from(scores).where(eq(scores.studentId, studentId));
      const newXp = remaining.reduce((sum, s) => sum + calculateScoreXPFromRewards(s.score, s.maxScore, xpRewards), 0);
      const newLevel = getLevelFromThresholds(newXp, levelThresholds);
      await db.update(students).set({ xp: newXp, level: newLevel }).where(eq(students.id, studentId));
    }

    return res.json({ success: true, message: `All ${subject} scores deleted, XP recalculated for ${affected.length} students` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to reset subject scores' });
  }
});

// POST /api/scores/reset/class/:classId — delete all scores for all students in a class, reset XP
router.post('/reset/class/:classId', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const classId = parseInt(req.params.classId);
    const levelThresholds = await getSettingJson('level_thresholds', DEFAULT_LEVEL_THRESHOLDS);

    const classStudents = await db.select({ id: students.id }).from(students).where(eq(students.classId, classId));
    if (classStudents.length === 0) return res.json({ success: true, message: 'No students in class', count: 0 });

    const ids = classStudents.map(s => s.id);
    await db.delete(scores).where(inArray(scores.studentId, ids));
    await db.update(students).set({ xp: 0, level: getLevelFromThresholds(0, levelThresholds) }).where(inArray(students.id, ids));

    for (const { id } of classStudents) {
      await db.insert(activityLogs).values({
        studentId: id,
        activityType: 'reset',
        description: 'Class bulk reset — all scores and XP reset to zero',
        xpEarned: 0,
      });
    }

    return res.json({ success: true, message: `Reset ${ids.length} students in class`, count: ids.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to reset class' });
  }
});

export default router;

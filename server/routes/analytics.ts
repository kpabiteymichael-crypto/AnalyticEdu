import { Router } from 'express';
import { db } from '../db/index';
import { students, scores, studentBadges, badges, rankings } from '../db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// GET /api/analytics/overview
router.get('/overview', authenticate, authorize('admin', 'teacher'), async (_req, res) => {
  try {
    const [studentStats] = await db.select({
      total: sql<number>`COUNT(*)`,
      avgXp: sql<number>`AVG(xp)`,
      avgLevel: sql<number>`AVG(level)`,
      highAchievers: sql<number>`COUNT(CASE WHEN xp > 2000 THEN 1 END)`,
      atRisk: sql<number>`COUNT(CASE WHEN xp < 300 THEN 1 END)`,
    }).from(students);

    const [scoreStats] = await db.select({
      avgScore: sql<number>`AVG(score / max_score * 100)`,
      totalAssessments: sql<number>`COUNT(*)`,
      passingRate: sql<number>`COUNT(CASE WHEN (score / max_score * 100) >= 60 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)`,
    }).from(scores);

    const subjectBreakdown = await db.select({
      subject: scores.subject,
      avgScore: sql<number>`ROUND(AVG(score / max_score * 100), 1)`,
      assessmentCount: sql<number>`COUNT(*)`,
    }).from(scores).groupBy(scores.subject).orderBy(sql`AVG(score / max_score * 100) DESC`);

    const gradeDistribution = await db.select({
      grade: students.grade,
      count: sql<number>`COUNT(*)`,
      avgXp: sql<number>`ROUND(AVG(xp), 0)`,
    }).from(students).groupBy(students.grade).orderBy(students.grade);

    const monthlyTrend = await db.select({
      month: sql<string>`TO_CHAR(recorded_at, 'Mon')`,
      monthOrder: sql<number>`EXTRACT(MONTH FROM recorded_at)`,
      avgScore: sql<number>`ROUND(AVG(score / max_score * 100), 1)`,
      count: sql<number>`COUNT(*)`,
    }).from(scores)
      .groupBy(sql`TO_CHAR(recorded_at, 'Mon')`, sql`EXTRACT(MONTH FROM recorded_at)`)
      .orderBy(sql`EXTRACT(MONTH FROM recorded_at)`);

    const topBadges = await db.select({
      badgeName: badges.name,
      badgeIcon: badges.icon,
      badgeColor: badges.color,
      count: sql<number>`COUNT(*)`,
    }).from(studentBadges)
      .innerJoin(badges, eq(studentBadges.badgeId, badges.id))
      .groupBy(badges.name, badges.icon, badges.color)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(5);

    return res.json({
      students: {
        total: studentStats.total,
        avgXp: Math.round(studentStats.avgXp),
        avgLevel: Math.round(studentStats.avgLevel * 10) / 10,
        highAchievers: studentStats.highAchievers,
        atRisk: studentStats.atRisk,
      },
      scores: {
        avgScore: Math.round(scoreStats.avgScore * 10) / 10,
        totalAssessments: scoreStats.totalAssessments,
        passingRate: Math.round(scoreStats.passingRate * 10) / 10,
      },
      subjectBreakdown,
      gradeDistribution,
      monthlyTrend,
      topBadges,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// GET /api/analytics/performance-distribution
router.get('/performance-distribution', authenticate, authorize('admin', 'teacher'), async (_req, res) => {
  try {
    const result = await db.select({
      bucket: sql<string>`CASE 
        WHEN (score / max_score * 100) >= 90 THEN 'A (90-100)'
        WHEN (score / max_score * 100) >= 80 THEN 'B (80-89)'
        WHEN (score / max_score * 100) >= 70 THEN 'C (70-79)'
        WHEN (score / max_score * 100) >= 60 THEN 'D (60-69)'
        ELSE 'F (<60)'
      END`,
      count: sql<number>`COUNT(*)`,
    }).from(scores)
      .groupBy(sql`CASE 
        WHEN (score / max_score * 100) >= 90 THEN 'A (90-100)'
        WHEN (score / max_score * 100) >= 80 THEN 'B (80-89)'
        WHEN (score / max_score * 100) >= 70 THEN 'C (70-79)'
        WHEN (score / max_score * 100) >= 60 THEN 'D (60-69)'
        ELSE 'F (<60)'
      END`)
      .orderBy(sql`MIN(score / max_score * 100) DESC`);
    return res.json(result);
  } catch {
    return res.status(500).json({ error: 'Failed to fetch distribution' });
  }
});

export default router;

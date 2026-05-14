import { Router } from 'express';
import { db } from '../db/index';
import { students, scores, users, studentBadges, badges, rankings } from '../db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// GET /api/reports/class-performance
router.get('/class-performance', authenticate, authorize('admin', 'teacher'), async (_req, res) => {
  try {
    const result = await db
      .select({
        studentId: students.id,
        name: users.name,
        studentCode: students.studentCode,
        grade: students.grade,
        xp: students.xp,
        level: students.level,
        streakDays: students.streakDays,
        avgScore: sql<number>`COALESCE(ROUND(AVG(scores.score / scores.max_score * 100), 1), 0)`,
        totalAssessments: sql<number>`COUNT(scores.id)`,
        badgeCount: sql<number>`(SELECT COUNT(*) FROM student_badges WHERE student_id = students.id)`,
      })
      .from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .leftJoin(scores, eq(scores.studentId, students.id))
      .groupBy(students.id, users.name, users.email)
      .orderBy(sql`AVG(scores.score / scores.max_score * 100) DESC NULLS LAST`);

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to generate report' });
  }
});

// GET /api/reports/student/:studentId/full
router.get('/student/:studentId/full', authenticate, async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);

    const [student] = await db.select({
      id: students.id,
      name: users.name,
      email: users.email,
      studentCode: students.studentCode,
      grade: students.grade,
      xp: students.xp,
      level: students.level,
      streakDays: students.streakDays,
      lastActiveAt: students.lastActiveAt,
      createdAt: students.createdAt,
    }).from(students).innerJoin(users, eq(students.userId, users.id)).where(eq(students.id, studentId)).limit(1);

    if (!student) return res.status(404).json({ error: 'Student not found' });

    const allScores = await db.select().from(scores)
      .where(eq(scores.studentId, studentId)).orderBy(desc(scores.recordedAt));

    const subjectSummary = await db.select({
      subject: scores.subject,
      avgScore: sql<number>`ROUND(AVG(score / max_score * 100), 1)`,
      highest: sql<number>`MAX(score / max_score * 100)`,
      lowest: sql<number>`MIN(score / max_score * 100)`,
      count: sql<number>`COUNT(*)`,
    }).from(scores).where(eq(scores.studentId, studentId)).groupBy(scores.subject);

    const earnedBadges = await db.select({ badge: badges, earnedAt: studentBadges.earnedAt })
      .from(studentBadges).innerJoin(badges, eq(studentBadges.badgeId, badges.id))
      .where(eq(studentBadges.studentId, studentId)).orderBy(desc(studentBadges.earnedAt));

    const [ranking] = await db.select().from(rankings)
      .where(eq(rankings.studentId, studentId)).orderBy(desc(rankings.calculatedAt)).limit(1);

    const monthlyProgress = await db.select({
      month: sql<string>`TO_CHAR(recorded_at, 'Mon YYYY')`,
      monthOrder: sql<number>`EXTRACT(YEAR FROM recorded_at) * 12 + EXTRACT(MONTH FROM recorded_at)`,
      avgScore: sql<number>`ROUND(AVG(score / max_score * 100), 1)`,
      assessments: sql<number>`COUNT(*)`,
    }).from(scores).where(eq(scores.studentId, studentId))
      .groupBy(sql`TO_CHAR(recorded_at, 'Mon YYYY')`, sql`EXTRACT(YEAR FROM recorded_at) * 12 + EXTRACT(MONTH FROM recorded_at)`)
      .orderBy(sql`EXTRACT(YEAR FROM recorded_at) * 12 + EXTRACT(MONTH FROM recorded_at)`);

    return res.json({ student, scores: allScores, subjectSummary, badges: earnedBadges, ranking, monthlyProgress });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to generate student report' });
  }
});

// GET /api/reports/export-summary - CSV-ready data
router.get('/export-summary', authenticate, authorize('admin', 'teacher'), async (_req, res) => {
  try {
    const result = await db.select({
      name: users.name,
      email: users.email,
      studentCode: students.studentCode,
      grade: students.grade,
      xp: students.xp,
      level: students.level,
      avgScore: sql<number>`COALESCE(ROUND(AVG(scores.score / scores.max_score * 100), 1), 0)`,
    })
      .from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .leftJoin(scores, eq(scores.studentId, students.id))
      .groupBy(students.id, users.name, users.email)
      .orderBy(desc(students.xp));

    // Return as CSV text
    const csv = [
      'Name,Email,Student Code,Grade,XP,Level,Avg Score',
      ...result.map(r => `${r.name},${r.email},${r.studentCode},${r.grade},${r.xp},${r.level},${r.avgScore}`),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="student-report.csv"');
    return res.send(csv);
  } catch {
    return res.status(500).json({ error: 'Failed to export report' });
  }
});

export default router;

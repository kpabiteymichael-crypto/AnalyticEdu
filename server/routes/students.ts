import { Router } from 'express';
import { db } from '../db/index';
import { students, users, scores, studentBadges, badges, activityLogs, classes } from '../db/schema';
import { eq, desc, sql, and } from 'drizzle-orm';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { getXpProgress } from '../lib/xp';

const router = Router();

// GET /api/students - List all students (admin/teacher)
router.get('/', authenticate, authorize('admin', 'teacher'), async (_req, res) => {
  try {
    const result = await db
      .select({
        id: students.id,
        userId: students.userId,
        studentCode: students.studentCode,
        grade: students.grade,
        xp: students.xp,
        level: students.level,
        streakDays: students.streakDays,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        classId: students.classId,
        className: classes.name,
        lastActiveAt: students.lastActiveAt,
        createdAt: students.createdAt,
      })
      .from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .leftJoin(classes, eq(students.classId, classes.id))
      .orderBy(desc(students.xp));

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// GET /api/students/me - Get own student profile
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const [student] = await db
      .select()
      .from(students)
      .where(eq(students.userId, req.user!.id))
      .limit(1);

    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    const xpProgress = getXpProgress(student.xp);
    const recentBadges = await db
      .select({ badge: badges, earnedAt: studentBadges.earnedAt })
      .from(studentBadges)
      .innerJoin(badges, eq(studentBadges.badgeId, badges.id))
      .where(eq(studentBadges.studentId, student.id))
      .orderBy(desc(studentBadges.earnedAt))
      .limit(5);

    const recentActivity = await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.studentId, student.id))
      .orderBy(desc(activityLogs.createdAt))
      .limit(10);

    return res.json({ ...student, xpProgress, recentBadges, recentActivity });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch student profile' });
  }
});

// GET /api/students/:id - Get specific student
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const [student] = await db
      .select({
        id: students.id,
        userId: students.userId,
        studentCode: students.studentCode,
        grade: students.grade,
        xp: students.xp,
        level: students.level,
        streakDays: students.streakDays,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        classId: students.classId,
        lastActiveAt: students.lastActiveAt,
      })
      .from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .where(eq(students.id, studentId))
      .limit(1);

    if (!student) return res.status(404).json({ error: 'Student not found' });

    const xpProgress = getXpProgress(student.xp);
    const recentBadges = await db
      .select({ badge: badges, earnedAt: studentBadges.earnedAt })
      .from(studentBadges)
      .innerJoin(badges, eq(studentBadges.badgeId, badges.id))
      .where(eq(studentBadges.studentId, studentId))
      .orderBy(desc(studentBadges.earnedAt))
      .limit(6);

    const subjectAvgs = await db
      .select({
        subject: scores.subject,
        avgScore: sql<number>`AVG(score / max_score * 100)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(scores)
      .where(eq(scores.studentId, studentId))
      .groupBy(scores.subject);

    return res.json({ ...student, xpProgress, recentBadges, subjectAverages: subjectAvgs });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch student' });
  }
});

// GET /api/students/:id/activity
router.get('/:id/activity', authenticate, async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const activity = await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.studentId, studentId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(20);
    return res.json(activity);
  } catch {
    return res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// GET /api/students/summary/overview - Admin dashboard summary
router.get('/summary/overview', authenticate, authorize('admin', 'teacher'), async (_req, res) => {
  try {
    const [totals] = await db.select({
      totalStudents: sql<number>`COUNT(*)`,
      avgXp: sql<number>`AVG(xp)`,
      avgLevel: sql<number>`AVG(level)`,
    }).from(students);

    const [scoreStats] = await db.select({
      avgScore: sql<number>`AVG(score / max_score * 100)`,
      totalAssessments: sql<number>`COUNT(*)`,
    }).from(scores);

    const [atRiskCount] = await db.select({
      count: sql<number>`COUNT(*)`,
    }).from(students).where(sql`xp < 200`);

    return res.json({
      totalStudents: totals.totalStudents,
      averageXp: Math.round(totals.avgXp),
      averageLevel: Math.round(totals.avgLevel * 10) / 10,
      averageScore: Math.round(scoreStats.avgScore),
      totalAssessments: scoreStats.totalAssessments,
      atRiskStudents: atRiskCount.count,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch overview' });
  }
});

export default router;

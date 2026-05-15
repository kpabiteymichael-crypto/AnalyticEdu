import { Router } from 'express';
import { db } from '../db/index';
import { students, users, scores, studentBadges, badges, activityLogs, classes, rankings, predictions, parentLinks, notifications } from '../db/schema';
import { eq, desc, sql, and } from 'drizzle-orm';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { getXpProgress, getLevel } from '../lib/xp';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

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

// POST /api/students - Create a new student
router.post('/', authenticate, authorize('admin', 'teacher'), async (req: AuthRequest, res) => {
  try {
    const data = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      grade: z.number().int().min(1).max(13),
      classId: z.number().int().optional(),
    }).parse(req.body);

    // Check email uniqueness
    const [existing] = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
    if (existing) return res.status(400).json({ error: 'Email already in use' });

    const passwordHash = await bcrypt.hash(data.password, 10);

    // Create user
    const [user] = await db.insert(users).values({
      name: data.name,
      email: data.email,
      passwordHash,
      role: 'student',
    }).returning();

    // Generate unique student code
    const [maxCode] = await db.execute(sql`SELECT MAX(CAST(SUBSTRING(student_code, 4) AS INTEGER)) AS maxnum FROM students WHERE student_code LIKE 'STU%'`) as any;
    const rows = (maxCode as any)?.rows ?? maxCode;
    const maxNum = parseInt((rows[0] as any)?.maxnum ?? '0') || 0;
    const studentCode = `STU${String(maxNum + 1).padStart(3, '0')}`;

    const [student] = await db.insert(students).values({
      userId: user.id,
      classId: data.classId,
      studentCode,
      grade: data.grade,
      xp: 0,
      level: 1,
      streakDays: 0,
    }).returning();

    return res.status(201).json({ ...student, name: user.name, email: user.email });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    console.error(err);
    return res.status(500).json({ error: 'Failed to create student' });
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

// PUT /api/students/:id - Edit a student
router.put('/:id', authenticate, authorize('admin', 'teacher'), async (_req, res) => {
  try {
    const studentId = parseInt(_req.params.id);
    const data = z.object({
      name: z.string().min(2).optional(),
      grade: z.number().int().min(1).max(13).optional(),
      classId: z.number().int().nullable().optional(),
      xp: z.number().int().min(0).optional(),
      streakDays: z.number().int().min(0).optional(),
    }).parse(_req.body);

    const [student] = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    if (data.name) {
      await db.update(users).set({ name: data.name, updatedAt: new Date() }).where(eq(users.id, student.userId));
    }

    const studentUpdate: Record<string, any> = {};
    if (data.grade !== undefined) studentUpdate.grade = data.grade;
    if (data.classId !== undefined) studentUpdate.classId = data.classId;
    if (data.streakDays !== undefined) studentUpdate.streakDays = data.streakDays;
    if (data.xp !== undefined) {
      studentUpdate.xp = data.xp;
      studentUpdate.level = getLevel(data.xp);
    }

    if (Object.keys(studentUpdate).length > 0) {
      await db.update(students).set(studentUpdate).where(eq(students.id, studentId));
    }

    const [updated] = await db
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
        classId: students.classId,
      })
      .from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .where(eq(students.id, studentId))
      .limit(1);

    return res.json(updated);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    console.error(err);
    return res.status(500).json({ error: 'Failed to update student' });
  }
});

// DELETE /api/students/:id - Delete a student (admin/teacher)
router.delete('/:id', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const [student] = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    // Delete all related records in order
    await db.delete(activityLogs).where(eq(activityLogs.studentId, studentId));
    await db.delete(studentBadges).where(eq(studentBadges.studentId, studentId));
    await db.delete(scores).where(eq(scores.studentId, studentId));
    await db.delete(rankings).where(eq(rankings.studentId, studentId));
    await db.delete(predictions).where(eq(predictions.studentId, studentId));
    await db.delete(parentLinks).where(eq(parentLinks.studentId, studentId));
    await db.delete(notifications).where(eq(notifications.userId, student.userId));
    await db.delete(students).where(eq(students.id, studentId));
    await db.delete(users).where(eq(users.id, student.userId));

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete student' });
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

// POST /api/students/bulk-import
router.post('/bulk-import', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const rows = z.array(z.object({
      name: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(4),
      grade: z.number().int().min(1).max(13),
      classId: z.number().int().optional().nullable(),
    })).min(1).max(200).parse(req.body);

    const results: { success: boolean; name: string; email: string; error?: string }[] = [];

    for (const row of rows) {
      try {
        const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, row.email)).limit(1);
        if (existing.length > 0) {
          results.push({ success: false, name: row.name, email: row.email, error: 'Email already exists' });
          continue;
        }
        const passwordHash = await bcrypt.hash(row.password, 10);
        const [newUser] = await db.insert(users).values({
          name: row.name,
          email: row.email,
          passwordHash,
          role: 'student',
        }).returning();

        const studentCode = `STU${String(newUser.id).padStart(4, '0')}`;
        await db.insert(students).values({
          userId: newUser.id,
          studentCode,
          grade: row.grade,
          classId: row.classId ?? null,
          xp: 0,
          level: 1,
        });

        results.push({ success: true, name: row.name, email: row.email });
      } catch (err: any) {
        results.push({ success: false, name: row.name, email: row.email, error: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    return res.status(201).json({ imported: successCount, total: rows.length, results });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    console.error(err);
    return res.status(500).json({ error: 'Bulk import failed' });
  }
});

export default router;

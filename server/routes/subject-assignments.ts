import { Router } from 'express';
import { db } from '../db/index';
import { studentSubjects, teacherSubjects, students, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { getSettingJson, DEFAULT_SUBJECT_LABELS } from './settings';

async function getValidSubjectKeys(): Promise<string[]> {
  const labels = await getSettingJson('subject_labels', DEFAULT_SUBJECT_LABELS);
  return Object.keys(labels as Record<string, string>);
}

const router = Router();

// GET /api/subject-assignments/my-subjects
router.get('/my-subjects', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;

    if (user.role === 'student') {
      const [student] = await db.select().from(students).where(eq(students.userId, user.id)).limit(1);
      if (!student) return res.json([]);
      const rows = await db.select({ subject: studentSubjects.subject })
        .from(studentSubjects)
        .where(eq(studentSubjects.studentId, student.id));
      return res.json(rows.map(r => r.subject));
    }

    if (user.role === 'teacher') {
      const rows = await db.select({ subject: teacherSubjects.subject })
        .from(teacherSubjects)
        .where(eq(teacherSubjects.userId, user.id));
      return res.json(rows.map(r => r.subject));
    }

    return res.json(await getValidSubjectKeys());
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch subjects' });
  }
});

// GET /api/subject-assignments/students
router.get('/students', authenticate, authorize('admin', 'teacher'), async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT
        s.id,
        s.user_id,
        u.name,
        u.email,
        COALESCE(
          json_agg(ss.subject ORDER BY ss.subject) FILTER (WHERE ss.subject IS NOT NULL),
          '[]'::json
        ) AS subjects
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN student_subjects ss ON ss.student_id = s.id
      GROUP BY s.id, s.user_id, u.name, u.email
      ORDER BY u.name
    `);
    return res.json(rows.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch student subjects' });
  }
});

// GET /api/subject-assignments/teachers
router.get('/teachers', authenticate, authorize('admin'), async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        COALESCE(
          json_agg(ts.subject ORDER BY ts.subject) FILTER (WHERE ts.subject IS NOT NULL),
          '[]'::json
        ) AS subjects
      FROM users u
      LEFT JOIN teacher_subjects ts ON ts.user_id = u.id
      WHERE u.role IN ('teacher', 'admin')
      GROUP BY u.id, u.name, u.email, u.role
      ORDER BY u.name
    `);
    return res.json(rows.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch teacher subjects' });
  }
});

// POST /api/subject-assignments/student/:studentId/add
router.post('/student/:studentId/add', authenticate, authorize('admin'), async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const { subject } = req.body;
    const validKeys = await getValidSubjectKeys();
    if (!subject || !validKeys.includes(subject)) {
      return res.status(400).json({ error: 'Invalid subject' });
    }
    await db.insert(studentSubjects).values({ studentId, subject }).onConflictDoNothing();
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to add subject' });
  }
});

// DELETE /api/subject-assignments/student/:studentId/:subject
router.delete('/student/:studentId/:subject', authenticate, authorize('admin'), async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const { subject } = req.params;
    await db.delete(studentSubjects).where(
      and(eq(studentSubjects.studentId, studentId), eq(studentSubjects.subject, subject))
    );
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to remove subject' });
  }
});

// POST /api/subject-assignments/teacher/:userId/add
router.post('/teacher/:userId/add', authenticate, authorize('admin'), async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { subject } = req.body;
    const validKeys = await getValidSubjectKeys();
    if (!subject || !validKeys.includes(subject)) {
      return res.status(400).json({ error: 'Invalid subject' });
    }
    await db.insert(teacherSubjects).values({ userId, subject }).onConflictDoNothing();
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to add subject' });
  }
});

// DELETE /api/subject-assignments/teacher/:userId/:subject
router.delete('/teacher/:userId/:subject', authenticate, authorize('admin'), async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { subject } = req.params;
    await db.delete(teacherSubjects).where(
      and(eq(teacherSubjects.userId, userId), eq(teacherSubjects.subject, subject))
    );
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to remove subject' });
  }
});

export default router;

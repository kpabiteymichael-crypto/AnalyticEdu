import { Router } from 'express';
import { db } from '../db/index';
import { classes, students, users } from '../db/schema';
import { eq, sql, isNull } from 'drizzle-orm';
import { authenticate, authorize } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// GET /api/classes — list all classes with stats
router.get('/', authenticate, authorize('admin', 'teacher'), async (_req, res) => {
  try {
    const allClasses = await db
      .select({
        id: classes.id,
        name: classes.name,
        grade: classes.grade,
        teacherId: classes.teacherId,
        academicYear: classes.academicYear,
        teacherName: users.name,
        studentCount: sql<number>`COUNT(students.id)`,
        avgXp: sql<number>`COALESCE(AVG(students.xp), 0)`,
        avgLevel: sql<number>`COALESCE(AVG(students.level), 0)`,
      })
      .from(classes)
      .leftJoin(students, eq(students.classId, classes.id))
      .leftJoin(users, eq(classes.teacherId, users.id))
      .groupBy(classes.id, users.name)
      .orderBy(classes.grade, classes.name);

    return res.json(allClasses);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// GET /api/classes/unassigned — students not in any class
router.get('/unassigned', authenticate, authorize('admin', 'teacher'), async (_req, res) => {
  try {
    const result = await db
      .select({
        id: students.id,
        name: users.name,
        studentCode: students.studentCode,
        grade: students.grade,
        xp: students.xp,
        level: students.level,
      })
      .from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .where(isNull(students.classId))
      .orderBy(users.name);
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch unassigned students' });
  }
});

// GET /api/classes/:id/students — students in a class
router.get('/:id/students', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const classId = parseInt(req.params.id);
    const result = await db
      .select({
        id: students.id,
        name: users.name,
        studentCode: students.studentCode,
        grade: students.grade,
        xp: students.xp,
        level: students.level,
        streakDays: students.streakDays,
      })
      .from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .where(eq(students.classId, classId))
      .orderBy(sql`students.xp DESC`);
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch class students' });
  }
});

// POST /api/classes — create a class
router.post('/', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const data = z.object({
      name: z.string().min(2).max(100),
      grade: z.number().int().min(1).max(13),
      teacherId: z.number().int().optional(),
      academicYear: z.string().default('2024-2025'),
    }).parse(req.body);

    // If no teacherId, use a default teacher (first teacher user)
    let teacherId = data.teacherId;
    if (!teacherId) {
      const [teacher] = await db.select({ id: users.id }).from(users)
        .where(eq(users.role, 'teacher')).limit(1);
      teacherId = teacher?.id ?? 1;
    }

    const [newClass] = await db.insert(classes).values({
      name: data.name,
      grade: data.grade,
      teacherId,
      academicYear: data.academicYear,
    }).returning();

    return res.status(201).json(newClass);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    console.error(err);
    return res.status(500).json({ error: 'Failed to create class' });
  }
});

// PUT /api/classes/:id — update a class
router.put('/:id', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const classId = parseInt(req.params.id);
    const data = z.object({
      name: z.string().min(2).max(100).optional(),
      grade: z.number().int().min(1).max(13).optional(),
      teacherId: z.number().int().optional(),
      academicYear: z.string().optional(),
    }).parse(req.body);

    const [updated] = await db.update(classes)
      .set(data)
      .where(eq(classes.id, classId))
      .returning();

    if (!updated) return res.status(404).json({ error: 'Class not found' });
    return res.json(updated);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    console.error(err);
    return res.status(500).json({ error: 'Failed to update class' });
  }
});

// DELETE /api/classes/:id — delete a class (unassigns all students)
router.delete('/:id', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const classId = parseInt(req.params.id);
    // Unassign all students from this class
    await db.update(students).set({ classId: null }).where(eq(students.classId, classId));
    await db.delete(classes).where(eq(classes.id, classId));
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete class' });
  }
});

// POST /api/classes/:id/assign — assign a student to a class
router.post('/:id/assign', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const classId = parseInt(req.params.id);
    const { studentId } = z.object({ studentId: z.number().int() }).parse(req.body);

    const [existing] = await db.select().from(classes).where(eq(classes.id, classId)).limit(1);
    if (!existing) return res.status(404).json({ error: 'Class not found' });

    await db.update(students).set({ classId }).where(eq(students.id, studentId));
    return res.json({ success: true });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    console.error(err);
    return res.status(500).json({ error: 'Failed to assign student' });
  }
});

// DELETE /api/classes/:id/students/:studentId — remove student from class
router.delete('/:id/students/:studentId', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    await db.update(students).set({ classId: null }).where(eq(students.id, studentId));
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to remove student from class' });
  }
});

export default router;

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/index';
import { users, students, classes } from '../db/schema';
import { eq } from 'drizzle-orm';
import { generateToken, authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'teacher', 'student', 'parent']).default('student'),
  grade: z.number().optional(),
  classId: z.number().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    const exists = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
    if (exists.length > 0) return res.status(400).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(data.password, 12);
    const [user] = await db.insert(users).values({
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
    }).returning();

    if (data.role === 'student') {
      const studentCode = `STU-${String(user.id).padStart(5, '0')}`;
      await db.insert(students).values({
        userId: user.id,
        classId: data.classId ?? null,
        studentCode,
        grade: data.grade ?? 1,
        xp: 0,
        level: 1,
        streakDays: 0,
      });
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role, name: user.name });
    return res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    return res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);
    const [user] = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = generateToken({ id: user.id, email: user.email, role: user.role, name: user.name });
    return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    return res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.user!.id)).limit(1);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let studentData = null;
    if (user.role === 'student') {
      const [s] = await db.select().from(students).where(eq(students.userId, user.id)).limit(1);
      studentData = s;
    }

    return res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl }, student: studentData });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.get('/classes', authenticate, async (_req, res) => {
  try {
    const allClasses = await db.select().from(classes);
    return res.json(allClasses);
  } catch {
    return res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

export default router;

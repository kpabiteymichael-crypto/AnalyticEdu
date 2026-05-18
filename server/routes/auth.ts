import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { db } from '../db/index';
import { users, students, classes, passwordResetTokens } from '../db/schema';
import { eq, and, gt } from 'drizzle-orm';
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

// PUT /api/auth/profile — update own name, email, password
router.put('/profile', authenticate, async (req: AuthRequest, res) => {
  try {
    const data = z.object({
      name: z.string().min(2).optional(),
      email: z.string().email().optional(),
      currentPassword: z.string().optional(),
      newPassword: z.string().min(6).optional(),
    }).parse(req.body);

    const [user] = await db.select().from(users).where(eq(users.id, req.user!.id)).limit(1);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Verify current password if changing password or email
    if (data.newPassword || data.email) {
      if (!data.currentPassword) return res.status(400).json({ error: 'Current password required to change email or password' });
      const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
      if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Check email uniqueness if changing email
    if (data.email && data.email !== user.email) {
      const exists = await db.select({ id: users.id }).from(users).where(eq(users.email, data.email)).limit(1);
      if (exists.length > 0) return res.status(400).json({ error: 'Email already in use' });
    }

    const updates: any = {};
    if (data.name) updates.name = data.name;
    if (data.email) updates.email = data.email;
    if (data.newPassword) updates.passwordHash = await bcrypt.hash(data.newPassword, 12);

    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No changes provided' });

    const [updated] = await db.update(users).set(updates).where(eq(users.id, req.user!.id)).returning();
    const newToken = generateToken({ id: updated.id, email: updated.email, role: updated.role, name: updated.name });
    return res.json({ user: { id: updated.id, name: updated.name, email: updated.email, role: updated.role }, token: newToken });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    console.error(err);
    return res.status(500).json({ error: 'Failed to update profile' });
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

// ── Forgot Password ──────────────────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);

    const [user] = await db.select({ id: users.id, name: users.name, email: users.email })
      .from(users).where(eq(users.email, email)).limit(1);

    // Always return success to prevent user enumeration
    if (!user) {
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    }

    // Invalidate any existing tokens for this user
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.insert(passwordResetTokens).values({ userId: user.id, token, expiresAt });

    const appUrl = process.env.APP_URL || 'http://localhost:5000';
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    // Send email if SMTP is configured, otherwise return link (demo mode)
    if (process.env.SMTP_HOST) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"EduAnalytics" <no-reply@eduanalytics.com>`,
        to: user.email,
        subject: 'Reset your EduAnalytics password',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto">
            <h2 style="color:#4f46e5">Password Reset</h2>
            <p>Hi ${user.name},</p>
            <p>Click the button below to reset your password. This link expires in <strong>1 hour</strong>.</p>
            <a href="${resetLink}" style="display:inline-block;padding:12px 28px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
              Reset Password
            </a>
            <p style="color:#64748b;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
            <p style="color:#94a3b8;font-size:12px">Link: ${resetLink}</p>
          </div>`,
      });
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    }

    // Demo mode — return the link directly so it works without email config
    return res.json({ success: true, message: 'Reset link generated (demo mode — no email configured).', resetLink });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    return res.status(500).json({ error: 'Failed to process request' });
  }
});

// ── Reset Password ───────────────────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = z.object({
      token: z.string().min(1),
      password: z.string().min(6),
    }).parse(req.body);

    const now = new Date();
    const [record] = await db.select().from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.token, token),
        gt(passwordResetTokens.expiresAt, now),
      )).limit(1);

    if (!record) return res.status(400).json({ error: 'Invalid or expired reset link.' });
    if (record.usedAt) return res.status(400).json({ error: 'This reset link has already been used.' });

    const passwordHash = await bcrypt.hash(password, 12);
    await db.update(users).set({ passwordHash, updatedAt: now }).where(eq(users.id, record.userId));
    await db.update(passwordResetTokens).set({ usedAt: now }).where(eq(passwordResetTokens.id, record.id));

    return res.json({ success: true, message: 'Password updated successfully. You can now log in.' });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    return res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;

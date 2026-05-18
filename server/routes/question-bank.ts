import { Router } from 'express';
import { db } from '../db/index';
import { questionBank, questions, questionOptions } from '../db/schema';
import { eq, and, ilike, or, desc, inArray } from 'drizzle-orm';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// ── List / search ─────────────────────────────────────────────────────────────
router.get('/', authenticate, authorize('admin', 'teacher'), async (req: AuthRequest, res) => {
  try {
    const { subject, type, q } = req.query as Record<string, string>;

    let rows = await db.select().from(questionBank).orderBy(desc(questionBank.createdAt));

    if (subject) rows = rows.filter(r => r.subject.toLowerCase() === subject.toLowerCase());
    if (type)    rows = rows.filter(r => r.type === type);
    if (q)       rows = rows.filter(r => r.text.toLowerCase().includes(q.toLowerCase())
                          || (r.tags ?? '').toLowerCase().includes(q.toLowerCase()));

    const parsed = rows.map(r => ({
      ...r,
      options: r.options ? JSON.parse(r.options) : [],
    }));

    return res.json(parsed);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch question bank' });
  }
});

// ── Create single question ────────────────────────────────────────────────────
router.post('/', authenticate, authorize('admin', 'teacher'), async (req: AuthRequest, res) => {
  try {
    const data = z.object({
      subject: z.string().min(1),
      type: z.string().default('mcq'),
      text: z.string().min(1),
      options: z.array(z.object({ text: z.string(), isCorrect: z.boolean() })).optional(),
      correctAnswer: z.string().optional().nullable(),
      explanation: z.string().optional().nullable(),
      points: z.number().default(1),
      tags: z.string().optional().nullable(),
    }).parse(req.body);

    const [entry] = await db.insert(questionBank).values({
      subject: data.subject,
      type: data.type,
      text: data.text,
      options: data.options ? JSON.stringify(data.options) : null,
      correctAnswer: data.correctAnswer ?? null,
      explanation: data.explanation ?? null,
      points: data.points,
      tags: data.tags ?? null,
      createdBy: req.user!.id,
    }).returning();

    return res.status(201).json({ ...entry, options: data.options ?? [] });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    console.error(err);
    return res.status(500).json({ error: 'Failed to save question' });
  }
});

// ── Bulk save ─────────────────────────────────────────────────────────────────
router.post('/bulk', authenticate, authorize('admin', 'teacher'), async (req: AuthRequest, res) => {
  try {
    const { subject, questions: qs } = z.object({
      subject: z.string().min(1),
      questions: z.array(z.object({
        type: z.string().default('mcq'),
        text: z.string().min(1),
        options: z.array(z.object({ text: z.string(), isCorrect: z.boolean() })).optional(),
        correctAnswer: z.string().optional().nullable(),
        explanation: z.string().optional().nullable(),
        points: z.number().default(1),
        tags: z.string().optional().nullable(),
      })).min(1),
    }).parse(req.body);

    const rows = await db.insert(questionBank).values(
      qs.map(q => ({
        subject,
        type: q.type,
        text: q.text,
        options: q.options ? JSON.stringify(q.options) : null,
        correctAnswer: q.correctAnswer ?? null,
        explanation: q.explanation ?? null,
        points: q.points,
        tags: q.tags ?? null,
        createdBy: req.user!.id,
      }))
    ).returning();

    return res.status(201).json(rows.map(r => ({ ...r, options: r.options ? JSON.parse(r.options) : [] })));
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    console.error(err);
    return res.status(500).json({ error: 'Failed to bulk save questions' });
  }
});

// ── Import all questions from an assessment ───────────────────────────────────
router.post('/import-assessment/:assessmentId', authenticate, authorize('admin', 'teacher'), async (req: AuthRequest, res) => {
  try {
    const assessmentId = parseInt(req.params.assessmentId);
    const { subject } = z.object({ subject: z.string().min(1) }).parse(req.body);

    const qs = await db.select().from(questions).where(eq(questions.assessmentId, assessmentId));
    if (qs.length === 0) return res.status(400).json({ error: 'No questions in this assessment' });

    const opts = await db.select().from(questionOptions)
      .where(inArray(questionOptions.questionId, qs.map(q => q.id)));

    const rows = await db.insert(questionBank).values(
      qs.map(q => ({
        subject,
        type: q.type,
        text: q.text,
        options: JSON.stringify(opts.filter(o => o.questionId === q.id).map(o => ({ text: o.text, isCorrect: o.isCorrect }))),
        correctAnswer: q.correctAnswer ?? null,
        explanation: q.explanation ?? null,
        points: q.points,
        createdBy: req.user!.id,
      }))
    ).returning();

    return res.status(201).json({ imported: rows.length });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    console.error(err);
    return res.status(500).json({ error: 'Failed to import questions' });
  }
});

// ── Delete ────────────────────────────────────────────────────────────────────
router.delete('/:id', authenticate, authorize('admin', 'teacher'), async (req: AuthRequest, res) => {
  try {
    await db.delete(questionBank).where(eq(questionBank.id, parseInt(req.params.id)));
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete question' });
  }
});

export default router;

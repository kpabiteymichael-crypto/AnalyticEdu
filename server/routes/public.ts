import { Router } from 'express';
import { db } from '../db/index';
import {
  assessments, questions, questionOptions, submissions, submissionAnswers,
  students, scores, activityLogs,
} from '../db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

const SUBJECT_ENUM_MAP: Record<string, string> = {
  mathematics: 'math', math: 'math',
  chemistry: 'science', physics: 'science', biology: 'science',
  'integrated science': 'science', science: 'science',
  english: 'english', 'english language': 'english', literature: 'english',
  history: 'history', 'social studies': 'history',
  art: 'art', 'visual arts': 'art',
  pe: 'pe', 'physical education': 'pe',
  ict: 'ict', 'information technology': 'ict', computing: 'ict',
  music: 'music',
};

function mapSubject(subject: string): string | null {
  return SUBJECT_ENUM_MAP[subject.toLowerCase().trim()] ?? null;
}

// ── GET /api/public/assessment/:token  — load by public token ────────────────
router.get('/assessment/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const [assessment] = await db.select().from(assessments)
      .where(and(eq(assessments.publicToken, token), eq(assessments.isPublic, true)))
      .limit(1);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found or not public' });
    if (assessment.status !== 'published') return res.status(400).json({ error: 'This assessment is not currently available' });

    const qs = await db.select().from(questions)
      .where(eq(questions.assessmentId, assessment.id))
      .orderBy(questions.orderIndex);

    const opts = qs.length > 0
      ? await db.select().from(questionOptions)
          .where(inArray(questionOptions.questionId, qs.map(q => q.id)))
          .orderBy(questionOptions.orderIndex)
      : [];

    const questionsWithOptions = qs.map(q => ({
      ...q,
      options: opts
        .filter(o => o.questionId === q.id)
        .map(o => ({ id: o.id, text: o.text, orderIndex: o.orderIndex })),
    }));

    return res.json({ ...assessment, questions: questionsWithOptions });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load assessment' });
  }
});

// ── POST /api/public/assessment/:token/start  — create guest submission ───────
router.post('/assessment/:token/start', async (req, res) => {
  try {
    const { token } = req.params;
    const { participantName } = z.object({ participantName: z.string().min(1) }).parse(req.body);

    const [assessment] = await db.select().from(assessments)
      .where(and(eq(assessments.publicToken, token), eq(assessments.isPublic, true)))
      .limit(1);
    if (!assessment || assessment.status !== 'published') {
      return res.status(404).json({ error: 'Assessment not available' });
    }

    const [submission] = await db.insert(submissions).values({
      assessmentId: assessment.id,
      studentId: null,
      participantName: participantName.trim(),
      isGuest: true,
      attemptNumber: 1,
    }).returning();

    return res.status(201).json(submission);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    console.error(err);
    return res.status(500).json({ error: 'Failed to start assessment' });
  }
});

// ── PATCH /api/public/assessment/:token/save-progress  — autosave ─────────────
router.patch('/assessment/:token/save-progress', async (req, res) => {
  try {
    const { submissionId, answers } = z.object({
      submissionId: z.number().int(),
      answers: z.array(z.object({
        questionId: z.number().int(),
        selectedOptionId: z.number().int().optional().nullable(),
        answerText: z.string().optional().nullable(),
      })),
    }).parse(req.body);

    const [sub] = await db.select().from(submissions).where(eq(submissions.id, submissionId)).limit(1);
    if (!sub || sub.status !== 'in_progress') {
      return res.status(400).json({ error: 'Submission not in progress' });
    }

    for (const ans of answers) {
      const existing = await db.select().from(submissionAnswers)
        .where(and(eq(submissionAnswers.submissionId, submissionId), eq(submissionAnswers.questionId, ans.questionId)))
        .limit(1);
      if (existing.length > 0) {
        await db.update(submissionAnswers)
          .set({ selectedOptionId: ans.selectedOptionId ?? null, answerText: ans.answerText ?? null })
          .where(eq(submissionAnswers.id, existing[0].id));
      } else {
        await db.insert(submissionAnswers).values({
          submissionId,
          questionId: ans.questionId,
          selectedOptionId: ans.selectedOptionId ?? null,
          answerText: ans.answerText ?? null,
        });
      }
    }
    return res.json({ success: true });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    console.error(err);
    return res.status(500).json({ error: 'Failed to save progress' });
  }
});

// ── POST /api/public/assessment/:token/submit  — submit + auto-mark ───────────
router.post('/assessment/:token/submit', async (req, res) => {
  try {
    const { token } = req.params;
    const { submissionId, answers, timeTakenSecs } = z.object({
      submissionId: z.number().int(),
      timeTakenSecs: z.number().int().optional(),
      answers: z.array(z.object({
        questionId: z.number().int(),
        selectedOptionId: z.number().int().optional().nullable(),
        answerText: z.string().optional().nullable(),
      })),
    }).parse(req.body);

    const [sub] = await db.select().from(submissions).where(eq(submissions.id, submissionId)).limit(1);
    if (!sub || sub.status !== 'in_progress') {
      return res.status(400).json({ error: 'Submission not in progress' });
    }

    const [assessment] = await db.select().from(assessments)
      .where(and(eq(assessments.publicToken, token), eq(assessments.isPublic, true)))
      .limit(1);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });

    const qs = await db.select().from(questions).where(eq(questions.assessmentId, assessment.id));
    const allOptions = qs.length > 0
      ? await db.select().from(questionOptions).where(inArray(questionOptions.questionId, qs.map(q => q.id)))
      : [];

    const markedAnswers: any[] = [];
    let totalScore = 0;
    const maxScore = qs.reduce((s, q) => s + q.points, 0);

    for (const ans of answers) {
      const question = qs.find(q => q.id === ans.questionId);
      if (!question) continue;

      let isCorrect: boolean | null = null;
      let pointsAwarded = 0;

      if (question.type === 'mcq' || question.type === 'true_false') {
        if (ans.selectedOptionId) {
          const opt = allOptions.find(o => o.id === ans.selectedOptionId);
          isCorrect = opt?.isCorrect ?? false;
          pointsAwarded = isCorrect ? question.points : 0;
        }
      } else if (question.type === 'short_answer') {
        if (ans.answerText && question.correctAnswer) {
          isCorrect = ans.answerText.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
          pointsAwarded = isCorrect ? question.points : 0;
        }
      }

      totalScore += pointsAwarded;
      markedAnswers.push({
        questionId: ans.questionId,
        selectedOptionId: ans.selectedOptionId ?? null,
        answerText: ans.answerText ?? null,
        isCorrect,
        pointsAwarded,
        submissionId,
      });
    }

    await db.delete(submissionAnswers).where(eq(submissionAnswers.submissionId, submissionId));
    if (markedAnswers.length > 0) {
      await db.insert(submissionAnswers).values(markedAnswers);
    }

    const [updated] = await db.update(submissions)
      .set({ status: 'submitted', submittedAt: new Date(), totalScore, maxScore, timeTakenSecs: timeTakenSecs ?? null })
      .where(eq(submissions.id, submissionId))
      .returning();

    const pct = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    return res.json({ ...updated, percentage: Math.round(pct * 10) / 10 });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    console.error(err);
    return res.status(500).json({ error: 'Failed to submit' });
  }
});

// ── GET /api/public/assessment/:token/result/:subId  — guest result ────────────
router.get('/assessment/:token/result/:subId', async (req, res) => {
  try {
    const subId = parseInt(req.params.subId);

    const [sub] = await db.select().from(submissions).where(eq(submissions.id, subId)).limit(1);
    if (!sub || sub.status === 'in_progress') return res.status(404).json({ error: 'Result not found' });

    const [assessment] = await db.select().from(assessments).where(eq(assessments.id, sub.assessmentId)).limit(1);
    const qs = await db.select().from(questions).where(eq(questions.assessmentId, sub.assessmentId)).orderBy(questions.orderIndex);
    const allOptions = qs.length > 0
      ? await db.select().from(questionOptions).where(inArray(questionOptions.questionId, qs.map(q => q.id))).orderBy(questionOptions.orderIndex)
      : [];
    const answers = await db.select().from(submissionAnswers).where(eq(submissionAnswers.submissionId, subId));

    const questionsWithResult = qs.map(q => ({
      ...q,
      options: allOptions.filter(o => o.questionId === q.id),
      answer: answers.find(a => a.questionId === q.id),
    }));

    return res.json({ submission: sub, assessment, questions: questionsWithResult });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch result' });
  }
});

export default router;

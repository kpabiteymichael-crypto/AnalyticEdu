import { Router } from 'express';
import { db } from '../db/index';
import {
  assessments, questions, questionOptions, submissions, submissionAnswers,
  students, scores, activityLogs, classes, users,
} from '../db/schema';
import { eq, desc, and, sql, inArray } from 'drizzle-orm';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Maps free-text subject to the existing scores subject enum
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

// ── Assessment list ──────────────────────────────────────────────────────────
// GET /api/assessments
// Teacher/Admin: their own assessments with question + submission counts
// Student: published assessments for their class
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { role, id: userId } = req.user!;

    if (role === 'admin' || role === 'teacher') {
      const rows = await db.execute(sql`
        SELECT
          a.*,
          COUNT(DISTINCT q.id)::int  AS question_count,
          COUNT(DISTINCT s.id)::int  AS submission_count
        FROM assessments a
        LEFT JOIN questions q ON q.assessment_id = a.id
        LEFT JOIN submissions s ON s.assessment_id = a.id AND s.status <> 'in_progress'
        WHERE a.created_by = ${userId}
        GROUP BY a.id
        ORDER BY a.created_at DESC
      `);
      return res.json(rows.rows);
    }

    if (role === 'student') {
      const [student] = await db.select().from(students).where(eq(students.userId, userId)).limit(1);
      if (!student) return res.json([]);

      const rows = await db.execute(sql`
        SELECT
          a.*,
          COUNT(DISTINCT q.id)::int           AS question_count,
          sub.status                           AS my_status,
          sub.total_score                      AS my_score,
          sub.max_score                        AS my_max_score,
          sub.id                               AS my_submission_id,
          sub.submitted_at                     AS my_submitted_at
        FROM assessments a
        LEFT JOIN questions q ON q.assessment_id = a.id
        LEFT JOIN submissions sub
          ON sub.assessment_id = a.id AND sub.student_id = ${student.id} AND sub.attempt_number = (
            SELECT MAX(s2.attempt_number) FROM submissions s2
            WHERE s2.assessment_id = a.id AND s2.student_id = ${student.id}
          )
        WHERE a.status = 'published'
          AND (a.class_id IS NULL OR a.class_id = ${student.classId ?? 0})
        GROUP BY a.id, sub.status, sub.total_score, sub.max_score, sub.id, sub.submitted_at
        ORDER BY a.created_at DESC
      `);
      return res.json(rows.rows);
    }

    return res.json([]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch assessments' });
  }
});

// ── Create assessment ────────────────────────────────────────────────────────
const assessmentSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  subject: z.string().min(1),
  type: z.enum(['quiz', 'exam', 'homework', 'practice', 'wassce']).default('quiz'),
  timeLimitMins: z.number().int().positive().optional().nullable(),
  maxAttempts: z.number().int().min(1).default(1),
  passingScore: z.number().min(0).max(100).default(50),
  classId: z.number().int().optional().nullable(),
  instructions: z.string().optional().nullable(),
  shuffleQuestions: z.boolean().default(false),
  shuffleOptions: z.boolean().default(false),
  scheduledAt: z.string().optional().nullable(),
  closesAt: z.string().optional().nullable(),
  semester: z.number().int().default(1),
  academicYear: z.string().default('2024-2025'),
});

router.post('/', authenticate, authorize('admin', 'teacher'), async (req: AuthRequest, res) => {
  try {
    const data = assessmentSchema.parse(req.body);
    const [assessment] = await db.insert(assessments).values({
      ...data,
      createdBy: req.user!.id,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      closesAt: data.closesAt ? new Date(data.closesAt) : null,
    }).returning();
    return res.status(201).json(assessment);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    console.error(err);
    return res.status(500).json({ error: 'Failed to create assessment' });
  }
});

// ── Get assessment with questions ────────────────────────────────────────────
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const [assessment] = await db.select().from(assessments).where(eq(assessments.id, id)).limit(1);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });

    const isTeacher = req.user!.role === 'admin' || req.user!.role === 'teacher';

    const qs = await db.select().from(questions)
      .where(eq(questions.assessmentId, id))
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
        .map(o => isTeacher ? o : { id: o.id, text: o.text, orderIndex: o.orderIndex }),
    }));

    return res.json({ ...assessment, questions: questionsWithOptions });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch assessment' });
  }
});

// ── Update assessment ────────────────────────────────────────────────────────
router.put('/:id', authenticate, authorize('admin', 'teacher'), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const [assessment] = await db.select().from(assessments).where(eq(assessments.id, id)).limit(1);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });
    if (assessment.createdBy !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const data = assessmentSchema.partial().parse(req.body);
    const [updated] = await db.update(assessments)
      .set({ ...data, updatedAt: new Date(),
        scheduledAt: data.scheduledAt !== undefined ? (data.scheduledAt ? new Date(data.scheduledAt) : null) : assessment.scheduledAt,
        closesAt: data.closesAt !== undefined ? (data.closesAt ? new Date(data.closesAt) : null) : assessment.closesAt,
      })
      .where(eq(assessments.id, id))
      .returning();
    return res.json(updated);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    console.error(err);
    return res.status(500).json({ error: 'Failed to update assessment' });
  }
});

// ── Delete assessment ────────────────────────────────────────────────────────
router.delete('/:id', authenticate, authorize('admin', 'teacher'), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const [assessment] = await db.select().from(assessments).where(eq(assessments.id, id)).limit(1);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });
    if (assessment.createdBy !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await db.delete(assessments).where(eq(assessments.id, id));
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete assessment' });
  }
});

// ── Change status ────────────────────────────────────────────────────────────
router.patch('/:id/status', authenticate, authorize('admin', 'teacher'), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = z.object({ status: z.enum(['draft', 'published', 'closed']) }).parse(req.body);

    const [assessment] = await db.select().from(assessments).where(eq(assessments.id, id)).limit(1);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });
    if (assessment.createdBy !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Must have at least one question to publish
    if (status === 'published') {
      const [{ count }] = await db.select({ count: sql<number>`COUNT(*)::int` })
        .from(questions).where(eq(questions.assessmentId, id));
      if (count < 1) return res.status(400).json({ error: 'Add at least one question before publishing' });
    }

    const [updated] = await db.update(assessments)
      .set({ status, updatedAt: new Date() })
      .where(eq(assessments.id, id))
      .returning();
    return res.json(updated);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    console.error(err);
    return res.status(500).json({ error: 'Failed to update status' });
  }
});

// ── Add question ─────────────────────────────────────────────────────────────
const questionSchema = z.object({
  type: z.enum(['mcq', 'true_false', 'short_answer', 'essay']),
  text: z.string().min(1),
  points: z.number().min(0.5).default(1),
  explanation: z.string().optional().nullable(),
  correctAnswer: z.string().optional().nullable(),
  options: z.array(z.object({
    text: z.string().min(1),
    isCorrect: z.boolean(),
    orderIndex: z.number().int(),
  })).optional(),
});

router.post('/:id/questions', authenticate, authorize('admin', 'teacher'), async (req: AuthRequest, res) => {
  try {
    const assessmentId = parseInt(req.params.id);
    const [assessment] = await db.select().from(assessments).where(eq(assessments.id, assessmentId)).limit(1);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });

    const data = questionSchema.parse(req.body);

    const [{ maxOrder }] = await db.select({ maxOrder: sql<number>`COALESCE(MAX(order_index), -1)::int` })
      .from(questions).where(eq(questions.assessmentId, assessmentId));

    const [question] = await db.insert(questions).values({
      assessmentId,
      type: data.type,
      text: data.text,
      points: data.points,
      orderIndex: maxOrder + 1,
      explanation: data.explanation ?? null,
      correctAnswer: data.correctAnswer ?? null,
    }).returning();

    let opts: typeof questionOptions.$inferSelect[] = [];
    if (data.options && data.options.length > 0) {
      opts = await db.insert(questionOptions).values(
        data.options.map((o, i) => ({
          questionId: question.id,
          text: o.text,
          isCorrect: o.isCorrect,
          orderIndex: o.orderIndex ?? i,
        }))
      ).returning();
    } else if (data.type === 'true_false') {
      opts = await db.insert(questionOptions).values([
        { questionId: question.id, text: 'True',  isCorrect: data.correctAnswer === 'True',  orderIndex: 0 },
        { questionId: question.id, text: 'False', isCorrect: data.correctAnswer === 'False', orderIndex: 1 },
      ]).returning();
    }

    return res.status(201).json({ ...question, options: opts });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    console.error(err);
    return res.status(500).json({ error: 'Failed to add question' });
  }
});

// ── Update question ──────────────────────────────────────────────────────────
router.put('/:id/questions/:qid', authenticate, authorize('admin', 'teacher'), async (req: AuthRequest, res) => {
  try {
    const qid = parseInt(req.params.qid);
    const data = questionSchema.parse(req.body);

    const [question] = await db.update(questions)
      .set({ type: data.type, text: data.text, points: data.points, explanation: data.explanation ?? null, correctAnswer: data.correctAnswer ?? null })
      .where(eq(questions.id, qid))
      .returning();

    // Replace options
    if (data.options !== undefined || data.type === 'true_false') {
      await db.delete(questionOptions).where(eq(questionOptions.questionId, qid));
      let newOpts: typeof questionOptions.$inferSelect[] = [];

      if (data.type === 'true_false') {
        newOpts = await db.insert(questionOptions).values([
          { questionId: qid, text: 'True',  isCorrect: data.correctAnswer === 'True',  orderIndex: 0 },
          { questionId: qid, text: 'False', isCorrect: data.correctAnswer === 'False', orderIndex: 1 },
        ]).returning();
      } else if (data.options && data.options.length > 0) {
        newOpts = await db.insert(questionOptions).values(
          data.options.map((o, i) => ({ questionId: qid, text: o.text, isCorrect: o.isCorrect, orderIndex: o.orderIndex ?? i }))
        ).returning();
      }
      return res.json({ ...question, options: newOpts });
    }

    const opts = await db.select().from(questionOptions).where(eq(questionOptions.questionId, qid)).orderBy(questionOptions.orderIndex);
    return res.json({ ...question, options: opts });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    console.error(err);
    return res.status(500).json({ error: 'Failed to update question' });
  }
});

// ── Delete question ──────────────────────────────────────────────────────────
router.delete('/:id/questions/:qid', authenticate, authorize('admin', 'teacher'), async (_req, res) => {
  try {
    const qid = parseInt(_req.params.qid);
    await db.delete(questions).where(eq(questions.id, qid));
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete question' });
  }
});

// ── Student: Start or resume assessment ─────────────────────────────────────
router.post('/:id/start', authenticate, authorize('student'), async (req: AuthRequest, res) => {
  try {
    const assessmentId = parseInt(req.params.id);
    const [assessment] = await db.select().from(assessments).where(eq(assessments.id, assessmentId)).limit(1);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });
    if (assessment.status !== 'published') return res.status(400).json({ error: 'Assessment is not available' });

    const [student] = await db.select().from(students).where(eq(students.userId, req.user!.id)).limit(1);
    if (!student) return res.status(400).json({ error: 'Student profile not found' });

    // Check existing in-progress submission
    const [existing] = await db.select().from(submissions)
      .where(and(eq(submissions.assessmentId, assessmentId), eq(submissions.studentId, student.id), eq(submissions.status, 'in_progress')))
      .limit(1);
    if (existing) return res.json(existing);

    // Check attempt limit
    const [{ attempts }] = await db.select({ attempts: sql<number>`COUNT(*)::int` })
      .from(submissions)
      .where(and(eq(submissions.assessmentId, assessmentId), eq(submissions.studentId, student.id)));
    if (attempts >= assessment.maxAttempts) {
      return res.status(400).json({ error: 'Maximum attempts reached' });
    }

    const [submission] = await db.insert(submissions).values({
      assessmentId,
      studentId: student.id,
      attemptNumber: attempts + 1,
    }).returning();

    return res.status(201).json(submission);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to start assessment' });
  }
});

// ── Student: Auto-save progress ──────────────────────────────────────────────
router.patch('/:id/save-progress', authenticate, authorize('student'), async (req: AuthRequest, res) => {
  try {
    const assessmentId = parseInt(req.params.id);
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

    // Upsert each answer
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

// ── Student: Submit assessment ───────────────────────────────────────────────
router.post('/:id/submit', authenticate, authorize('student'), async (req: AuthRequest, res) => {
  try {
    const assessmentId = parseInt(req.params.id);
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

    const [assessment] = await db.select().from(assessments).where(eq(assessments.id, assessmentId)).limit(1);
    const qs = await db.select().from(questions).where(eq(questions.assessmentId, assessmentId));
    const allOptions = qs.length > 0
      ? await db.select().from(questionOptions).where(inArray(questionOptions.questionId, qs.map(q => q.id)))
      : [];

    // Auto-mark each answer
    const markedAnswers: { questionId: number; selectedOptionId?: number | null; answerText?: string | null; isCorrect: boolean | null; pointsAwarded: number }[] = [];
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
      } else {
        // essay — leave for teacher marking
        isCorrect = null;
        pointsAwarded = 0;
      }

      totalScore += pointsAwarded;
      markedAnswers.push({
        questionId: ans.questionId,
        selectedOptionId: ans.selectedOptionId ?? null,
        answerText: ans.answerText ?? null,
        isCorrect,
        pointsAwarded,
      });
    }

    // Delete old saves, insert marked answers
    await db.delete(submissionAnswers).where(eq(submissionAnswers.submissionId, submissionId));
    if (markedAnswers.length > 0) {
      await db.insert(submissionAnswers).values(markedAnswers.map(a => ({ ...a, submissionId })));
    }

    // Update submission
    const [updated] = await db.update(submissions)
      .set({ status: 'submitted', submittedAt: new Date(), totalScore, maxScore, timeTakenSecs: timeTakenSecs ?? null })
      .where(eq(submissions.id, submissionId))
      .returning();

    // Auto-write to scores table so analytics picks it up
    const pct = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    const mappedSubject = mapSubject(assessment.subject);
    if (mappedSubject) {
      const [student] = await db.select().from(students).where(eq(students.id, sub.studentId)).limit(1);
      if (student) {
        await db.insert(scores).values({
          studentId: student.id,
          subject: mappedSubject as any,
          score: Math.round(pct * 10) / 10,
          maxScore: 100,
          assessmentType: assessment.type,
          assessmentName: assessment.title,
          recordedBy: assessment.createdBy,
          semester: assessment.semester,
          academicYear: assessment.academicYear,
        }).onConflictDoNothing();

        await db.insert(activityLogs).values({
          studentId: student.id,
          activityType: 'assessment_submitted',
          description: `Submitted "${assessment.title}" — scored ${Math.round(pct)}%`,
          xpEarned: 0,
        });
      }
    }

    return res.json({ ...updated, percentage: Math.round(pct * 10) / 10 });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    console.error(err);
    return res.status(500).json({ error: 'Failed to submit assessment' });
  }
});

// ── Student: My result ───────────────────────────────────────────────────────
router.get('/:id/my-result', authenticate, authorize('student'), async (req: AuthRequest, res) => {
  try {
    const assessmentId = parseInt(req.params.id);
    const [student] = await db.select().from(students).where(eq(students.userId, req.user!.id)).limit(1);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const [sub] = await db.select().from(submissions)
      .where(and(eq(submissions.assessmentId, assessmentId), eq(submissions.studentId, student.id)))
      .orderBy(desc(submissions.attemptNumber))
      .limit(1);
    if (!sub) return res.status(404).json({ error: 'No submission found' });

    const answers = await db.select().from(submissionAnswers).where(eq(submissionAnswers.submissionId, sub.id));
    const [assessment] = await db.select().from(assessments).where(eq(assessments.id, assessmentId)).limit(1);
    const qs = await db.select().from(questions).where(eq(questions.assessmentId, assessmentId)).orderBy(questions.orderIndex);
    const allOptions = qs.length > 0
      ? await db.select().from(questionOptions).where(inArray(questionOptions.questionId, qs.map(q => q.id))).orderBy(questionOptions.orderIndex)
      : [];

    const questionsWithResult = qs.map(q => {
      const answer = answers.find(a => a.questionId === q.id);
      return {
        ...q,
        options: allOptions.filter(o => o.questionId === q.id),
        answer,
      };
    });

    return res.json({ submission: sub, assessment, questions: questionsWithResult });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch result' });
  }
});

// ── Teacher: All results for an assessment ───────────────────────────────────
router.get('/:id/results', authenticate, authorize('admin', 'teacher'), async (req: AuthRequest, res) => {
  try {
    const assessmentId = parseInt(req.params.id);

    const rows = await db.execute(sql`
      SELECT
        sub.id,
        sub.student_id,
        sub.status,
        sub.total_score,
        sub.max_score,
        sub.time_taken_secs,
        sub.submitted_at,
        sub.attempt_number,
        u.name AS student_name,
        st.student_code
      FROM submissions sub
      JOIN students st ON st.id = sub.student_id
      JOIN users u ON u.id = st.user_id
      WHERE sub.assessment_id = ${assessmentId}
        AND sub.status <> 'in_progress'
      ORDER BY sub.total_score DESC NULLS LAST
    `);

    const [assessment] = await db.select().from(assessments).where(eq(assessments.id, assessmentId)).limit(1);
    return res.json({ assessment, submissions: rows.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch results' });
  }
});

export default router;

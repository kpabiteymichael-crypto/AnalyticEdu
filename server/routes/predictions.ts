import { Router } from 'express';
import { db } from '../db/index';
import { predictions, students, scores } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { predictStudentPerformance } from '../lib/prediction';

const router = Router();

// POST /api/predictions/generate/:studentId
router.post('/generate/:studentId', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const [student] = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const subjects = ['math', 'science', 'english', 'history', 'art', 'pe', 'ict', 'music'] as const;
    const generated = [];

    for (const subject of subjects) {
      const subjectScores = await db.select().from(scores)
        .where(eq(scores.studentId, studentId))
        .orderBy(desc(scores.recordedAt));

      const subjectHistory = subjectScores.filter(s => s.subject === subject);
      const prediction = predictStudentPerformance(subjectHistory.map(s => ({
        score: s.score,
        maxScore: s.maxScore,
        recordedAt: s.recordedAt,
      })));

      const [saved] = await db.insert(predictions).values({
        studentId,
        subject,
        predictedScore: Math.round(prediction.predictedScore * 10) / 10,
        confidenceScore: prediction.confidenceScore,
        riskLevel: prediction.riskLevel,
        riskFactors: prediction.riskFactors,
        recommendations: prediction.recommendations,
      }).returning();

      generated.push(saved);
    }

    return res.json(generated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to generate predictions' });
  }
});

// GET /api/predictions/student/:studentId
router.get('/student/:studentId', authenticate, async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const result = await db.select().from(predictions)
      .where(eq(predictions.studentId, studentId))
      .orderBy(desc(predictions.generatedAt));
    return res.json(result);
  } catch {
    return res.status(500).json({ error: 'Failed to fetch predictions' });
  }
});

// GET /api/predictions/at-risk - Students flagged as at-risk
router.get('/at-risk', authenticate, authorize('admin', 'teacher'), async (_req, res) => {
  try {
    const atRiskStudents = await db
      .select({
        studentId: predictions.studentId,
        subject: predictions.subject,
        predictedScore: predictions.predictedScore,
        riskLevel: predictions.riskLevel,
        riskFactors: predictions.riskFactors,
        recommendations: predictions.recommendations,
        generatedAt: predictions.generatedAt,
      })
      .from(predictions)
      .where(eq(predictions.riskLevel, 'high'))
      .orderBy(desc(predictions.generatedAt));

    const critical = await db.select({
      studentId: predictions.studentId,
      subject: predictions.subject,
      predictedScore: predictions.predictedScore,
      riskLevel: predictions.riskLevel,
      riskFactors: predictions.riskFactors,
      recommendations: predictions.recommendations,
    }).from(predictions).where(eq(predictions.riskLevel, 'critical'));

    return res.json({ high: atRiskStudents, critical });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch at-risk students' });
  }
});

// GET /api/predictions/study-plan/:studentId
router.get('/study-plan/:studentId', authenticate, async (req: AuthRequest, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const user = req.user!;

    if (user.role === 'student') {
      const [student] = await db.select().from(students).where(eq(students.userId, user.id)).limit(1);
      if (!student || student.id !== studentId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const preds = await db.select().from(predictions)
      .where(eq(predictions.studentId, studentId))
      .orderBy(desc(predictions.generatedAt));

    const latestBySubject: Record<string, typeof preds[0]> = {};
    for (const p of preds) {
      if (!latestBySubject[p.subject]) latestBySubject[p.subject] = p;
    }

    const riskOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    const subjectData = Object.values(latestBySubject)
      .sort((a, b) => (riskOrder[a.riskLevel] ?? 3) - (riskOrder[b.riskLevel] ?? 3));

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const plan: { day: string; subject: string; focusArea: string; durationMins: number; riskLevel: string }[] = [];

    const critical = subjectData.filter(s => s.riskLevel === 'critical');
    const high = subjectData.filter(s => s.riskLevel === 'high');
    const medium = subjectData.filter(s => s.riskLevel === 'medium');
    const low = subjectData.filter(s => s.riskLevel === 'low');

    let dayIndex = 0;
    const addSlot = (subject: string, riskLevel: string, recs: string[] | null, mins: number) => {
      if (dayIndex >= 7) return;
      plan.push({
        day: days[dayIndex++],
        subject,
        focusArea: recs?.[0] ?? `Review and practice ${subject}`,
        durationMins: mins,
        riskLevel,
      });
    };

    for (const s of critical) { addSlot(s.subject, 'critical', s.recommendations, 90); addSlot(s.subject, 'critical', s.recommendations, 60); }
    for (const s of high)     { addSlot(s.subject, 'high', s.recommendations, 60); }
    for (const s of medium)   { addSlot(s.subject, 'medium', s.recommendations, 45); }
    for (const s of low.slice(0, 2)) { addSlot(s.subject, 'low', s.recommendations, 30); }

    let fill = 0;
    while (dayIndex < 7 && subjectData.length > 0) {
      const s = subjectData[fill++ % subjectData.length];
      addSlot(s.subject, s.riskLevel, s.recommendations, 45);
    }

    return res.json({
      studentId,
      generatedAt: new Date().toISOString(),
      weekPlan: plan,
      summary: {
        totalSubjects: subjectData.length,
        criticalSubjects: critical.length,
        highRiskSubjects: high.length,
        totalStudyMinutes: plan.reduce((acc, p) => acc + p.durationMins, 0),
        topPriority: subjectData[0]?.subject ?? null,
      },
      subjectBreakdown: subjectData.map(s => ({
        subject: s.subject,
        predictedScore: s.predictedScore,
        riskLevel: s.riskLevel,
        recommendations: s.recommendations ?? [],
      })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to generate study plan' });
  }
});

export default router;

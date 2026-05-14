import { Router } from 'express';
import { db } from '../db/index';
import { predictions, students, scores } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { authenticate, authorize } from '../middleware/auth';
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

export default router;

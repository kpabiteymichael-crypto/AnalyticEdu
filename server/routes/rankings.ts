import { Router } from 'express';
import { db } from '../db/index';
import { rankings, students, users, classes, scores } from '../db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { authenticate } from '../middleware/auth';
import { getSettingJson, DEFAULT_SUBJECT_MAX_MARKS } from './settings';

const router = Router();

async function recalculateRankings() {
  const period = '2024-2025-S1';
  const studentData = await db
    .select({
      id: students.id,
      xp: students.xp,
      classId: students.classId,
      avgScore: sql<number>`COALESCE((
        SELECT AVG(score / max_score * 100) 
        FROM scores 
        WHERE student_id = students.id
      ), 0)`,
      totalScore: sql<number>`COALESCE((
        SELECT SUM(score)
        FROM scores
        WHERE student_id = students.id
      ), 0)`,
      totalMaxScore: sql<number>`COALESCE((
        SELECT SUM(max_score)
        FROM scores
        WHERE student_id = students.id
      ), 0)`,
    })
    .from(students)
    .orderBy(desc(students.xp));

  for (let i = 0; i < studentData.length; i++) {
    const s = studentData[i];
    const overallRank = i + 1;

    let classRank = null;
    if (s.classId) {
      const classmates = studentData
        .filter(x => x.classId === s.classId)
        .sort((a, b) => b.xp - a.xp);
      classRank = classmates.findIndex(x => x.id === s.id) + 1;
    }

    await db.insert(rankings).values({
      studentId: s.id,
      classId: s.classId,
      overallRank,
      classRank,
      averageScore: Math.round(s.avgScore * 100) / 100,
      totalXp: s.xp,
      period,
    }).onConflictDoUpdate({
      target: [rankings.studentId, rankings.period],
      set: { overallRank, classRank, averageScore: Math.round(s.avgScore * 100) / 100, totalXp: s.xp, calculatedAt: new Date() },
    });
  }
}

// GET /api/rankings/leaderboard
router.get('/leaderboard', authenticate, async (_req, res) => {
  try {
    await recalculateRankings();
    const result = await db
      .select({
        rank: rankings.overallRank,
        classRank: rankings.classRank,
        studentId: students.id,
        studentCode: students.studentCode,
        name: users.name,
        avatarUrl: users.avatarUrl,
        xp: students.xp,
        level: students.level,
        averageScore: rankings.averageScore,
        streakDays: students.streakDays,
        classId: students.classId,
        className: classes.name,
        totalScore: sql<number>`COALESCE((SELECT SUM(score) FROM scores WHERE student_id = students.id), 0)`,
        totalMaxScore: sql<number>`COALESCE((SELECT SUM(max_score) FROM scores WHERE student_id = students.id), 0)`,
        scoreCount: sql<number>`COALESCE((SELECT COUNT(*) FROM scores WHERE student_id = students.id), 0)`,
      })
      .from(rankings)
      .innerJoin(students, eq(rankings.studentId, students.id))
      .innerJoin(users, eq(students.userId, users.id))
      .leftJoin(classes, eq(students.classId, classes.id))
      .where(eq(rankings.period, '2024-2025-S1'))
      .orderBy(rankings.overallRank)
      .limit(100);

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// GET /api/rankings/leaderboard/subject/:subject
router.get('/leaderboard/subject/:subject', authenticate, async (req, res) => {
  try {
    const subject = req.params.subject;
    const subjectMaxMarks = await getSettingJson('subject_max_marks', DEFAULT_SUBJECT_MAX_MARKS);
    const maxForSubject = subjectMaxMarks[subject] ?? 100;

    const result = await db
      .select({
        studentId: students.id,
        studentCode: students.studentCode,
        name: users.name,
        xp: students.xp,
        level: students.level,
        streakDays: students.streakDays,
        classId: students.classId,
        className: classes.name,
        totalScore: sql<number>`COALESCE(SUM(CASE WHEN s.subject = ${subject} THEN s.score ELSE 0 END), 0)`,
        totalMaxScore: sql<number>`COALESCE(SUM(CASE WHEN s.subject = ${subject} THEN s.max_score ELSE 0 END), 0)`,
        avgScore: sql<number>`COALESCE(AVG(CASE WHEN s.subject = ${subject} THEN s.score / s.max_score * 100 END), 0)`,
        assessmentCount: sql<number>`COUNT(CASE WHEN s.subject = ${subject} THEN 1 END)`,
      })
      .from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .leftJoin(classes, eq(students.classId, classes.id))
      .leftJoin(scores.as('s' as never), eq(sql`s.student_id`, students.id))
      .groupBy(students.id, users.name, classes.name)
      .orderBy(sql`COALESCE(AVG(CASE WHEN s.subject = ${subject} THEN s.score / s.max_score * 100 END), 0) DESC`);

    const ranked = result.map((s, i) => ({
      ...s,
      rank: i + 1,
      averageScore: Math.round((s.avgScore ?? 0) * 100) / 100,
      subjectMaxMarks: maxForSubject,
    }));

    return res.json(ranked);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch subject leaderboard' });
  }
});

// GET /api/rankings/student/:studentId
router.get('/student/:studentId', authenticate, async (req, res) => {
  try {
    await recalculateRankings();
    const studentId = parseInt(req.params.studentId);
    const [ranking] = await db.select().from(rankings)
      .where(eq(rankings.studentId, studentId))
      .orderBy(desc(rankings.calculatedAt))
      .limit(1);
    return res.json(ranking ?? null);
  } catch {
    return res.status(500).json({ error: 'Failed to fetch ranking' });
  }
});

export default router;

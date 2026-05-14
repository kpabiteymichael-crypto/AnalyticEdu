import { Router } from 'express';
import { db } from '../db/index';
import { rankings, students, users } from '../db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { authenticate } from '../middleware/auth';

const router = Router();

// Recalculate and update rankings
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
    })
    .from(students)
    .orderBy(desc(students.xp));

  // Assign overall ranks
  for (let i = 0; i < studentData.length; i++) {
    const s = studentData[i];
    const overallRank = i + 1;

    // Calculate class rank
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
        studentId: students.id,
        studentCode: students.studentCode,
        name: users.name,
        avatarUrl: users.avatarUrl,
        xp: students.xp,
        level: students.level,
        averageScore: rankings.averageScore,
        streakDays: students.streakDays,
        classId: students.classId,
      })
      .from(rankings)
      .innerJoin(students, eq(rankings.studentId, students.id))
      .innerJoin(users, eq(students.userId, users.id))
      .where(eq(rankings.period, '2024-2025-S1'))
      .orderBy(rankings.overallRank)
      .limit(50);

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch leaderboard' });
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

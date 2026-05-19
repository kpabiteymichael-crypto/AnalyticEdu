import { Router } from 'express';
import { db } from '../db/index';
import { mentorRequests, mentorSessions, mentorRatings, students, users, activityLogs } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import {
  getSettingJson, DEFAULT_MENTOR_RATING_XP, DEFAULT_LEVEL_THRESHOLDS, getLevelFromThresholds,
} from './settings';

const router = Router();

// Helper: get student record for a user
async function getStudent(userId: number) {
  const [s] = await db.select().from(students).where(eq(students.userId, userId)).limit(1);
  return s ?? null;
}

// ─── GET /api/mentors/requests ────────────────────────────
// Student: their own requests  |  Teacher/Admin: all requests
router.get('/requests', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;

    if (user.role === 'student') {
      const student = await getStudent(user.id);
      if (!student) return res.json([]);

      const rows = await db.execute(sql`
        SELECT
          mr.id, mr.subject, mr.message, mr.status, mr.created_at,
          ms.id          AS session_id,
          ms.scheduled_at,
          ms.notes,
          ms.is_completed,
          ms.completed_at,
          mu.name        AS mentor_name,
          mu.email       AS mentor_email,
          mrat.rating,
          mrat.comment   AS rating_comment
        FROM mentor_requests mr
        LEFT JOIN mentor_sessions ms ON ms.request_id = mr.id
        LEFT JOIN users mu            ON ms.mentor_id  = mu.id
        LEFT JOIN mentor_ratings mrat ON mrat.session_id = ms.id
        WHERE mr.student_id = ${student.id}
        ORDER BY mr.created_at DESC
      `);
      return res.json(rows.rows);
    }

    // Teacher / Admin
    const rows = await db.execute(sql`
      SELECT
        mr.id, mr.student_id, mr.subject, mr.message, mr.status, mr.created_at,
        su.name        AS student_name,
        ms.id          AS session_id,
        ms.scheduled_at,
        ms.notes,
        ms.is_completed,
        ms.completed_at,
        mu.name        AS mentor_name,
        mrat.rating,
        mrat.comment   AS rating_comment
      FROM mentor_requests mr
      JOIN students s               ON mr.student_id  = s.id
      JOIN users su                 ON s.user_id       = su.id
      LEFT JOIN mentor_sessions ms  ON ms.request_id   = mr.id
      LEFT JOIN users mu            ON ms.mentor_id    = mu.id
      LEFT JOIN mentor_ratings mrat ON mrat.session_id = ms.id
      ORDER BY mr.created_at DESC
      LIMIT 200
    `);
    return res.json(rows.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch mentor requests' });
  }
});

// ─── POST /api/mentors/request ────────────────────────────
// Student creates a help request
router.post('/request', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    if (user.role !== 'student') return res.status(403).json({ error: 'Students only' });

    const student = await getStudent(user.id);
    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    const { subject, message } = req.body;
    if (!subject) return res.status(400).json({ error: 'Subject is required' });

    const [request] = await db.insert(mentorRequests).values({
      studentId: student.id,
      subject,
      message: message || null,
      status: 'pending',
    }).returning();

    return res.status(201).json(request);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create mentor request' });
  }
});

// ─── PUT /api/mentors/requests/:id/accept ─────────────────
// Teacher/Admin accepts a request and creates a session
router.put('/requests/:id/accept', authenticate, authorize('admin', 'teacher'), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { scheduledAt, notes } = req.body;

    const [request] = await db.select().from(mentorRequests).where(eq(mentorRequests.id, id)).limit(1);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Request is not pending' });

    await db.update(mentorRequests)
      .set({ status: 'accepted', updatedAt: new Date() })
      .where(eq(mentorRequests.id, id));

    const [session] = await db.insert(mentorSessions).values({
      requestId: id,
      mentorId: req.user!.id,
      studentId: request.studentId,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      notes: notes || null,
    }).returning();

    return res.json({ request: { ...request, status: 'accepted' }, session });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to accept request' });
  }
});

// ─── PUT /api/mentors/requests/:id/decline ────────────────
router.put('/requests/:id/decline', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [updated] = await db.update(mentorRequests)
      .set({ status: 'declined', updatedAt: new Date() })
      .where(and(eq(mentorRequests.id, id), eq(mentorRequests.status, 'pending')))
      .returning();
    if (!updated) return res.status(404).json({ error: 'Request not found or not pending' });
    return res.json(updated);
  } catch {
    return res.status(500).json({ error: 'Failed to decline request' });
  }
});

// ─── PUT /api/mentors/sessions/:id/complete ───────────────
router.put('/sessions/:id/complete', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const [session] = await db.update(mentorSessions)
      .set({ isCompleted: true, completedAt: new Date() })
      .where(eq(mentorSessions.id, id))
      .returning();

    if (!session) return res.status(404).json({ error: 'Session not found' });

    await db.update(mentorRequests)
      .set({ status: 'completed', updatedAt: new Date() })
      .where(eq(mentorRequests.id, session.requestId));

    return res.json(session);
  } catch {
    return res.status(500).json({ error: 'Failed to complete session' });
  }
});

// ─── POST /api/mentors/sessions/:id/rate ─────────────────
// Student rates a completed mentor session
router.post('/sessions/:id/rate', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    if (user.role !== 'student') return res.status(403).json({ error: 'Students only' });

    const sessionId = parseInt(req.params.id);
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const student = await getStudent(user.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const [session] = await db.select().from(mentorSessions)
      .where(and(eq(mentorSessions.id, sessionId), eq(mentorSessions.studentId, student.id)))
      .limit(1);

    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (!session.isCompleted) return res.status(400).json({ error: 'Session is not yet completed' });

    const existing = await db.select().from(mentorRatings)
      .where(eq(mentorRatings.sessionId, sessionId)).limit(1);

    let result;
    if (existing[0]) {
      [result] = await db.update(mentorRatings)
        .set({ rating, comment: comment || null })
        .where(eq(mentorRatings.sessionId, sessionId))
        .returning();
    } else {
      [result] = await db.insert(mentorRatings).values({
        sessionId,
        studentId: student.id,
        mentorId: session.mentorId,
        rating,
        comment: comment || null,
      }).returning();
    }

    // Award XP to student based on their rating (only on new ratings, not updates)
    if (!existing[0]) {
      const [mentorRatingXp, levelThresholds] = await Promise.all([
        getSettingJson('mentor_rating_xp', DEFAULT_MENTOR_RATING_XP),
        getSettingJson('level_thresholds', DEFAULT_LEVEL_THRESHOLDS),
      ]);
      const xpEarned = mentorRatingXp[rating.toString()] ?? 0;
      if (xpEarned > 0) {
        const [fresh] = await db.select().from(students).where(eq(students.id, student.id)).limit(1);
        const newXp = fresh.xp + xpEarned;
        const newLevel = getLevelFromThresholds(newXp, levelThresholds);
        await db.update(students)
          .set({ xp: newXp, level: newLevel, lastActiveAt: new Date() })
          .where(eq(students.id, student.id));
        await db.insert(activityLogs).values({
          studentId: student.id,
          activityType: 'mentor_session_rated',
          description: `Rated mentor session ${rating}★ — earned +${xpEarned} XP`,
          xpEarned,
        });
      }
    }

    return res.status(201).json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to submit rating' });
  }
});

// ─── GET /api/mentors/stats ───────────────────────────────
// Average rating + session count per mentor (teacher/admin)
router.get('/stats', authenticate, authorize('admin', 'teacher'), async (req: AuthRequest, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT
        u.id      AS mentor_id,
        u.name    AS mentor_name,
        COUNT(DISTINCT ms.id)  AS total_sessions,
        COUNT(DISTINCT CASE WHEN ms.is_completed THEN ms.id END) AS completed_sessions,
        ROUND(AVG(mrat.rating)::numeric, 1) AS avg_rating,
        COUNT(mrat.id) AS total_ratings
      FROM users u
      LEFT JOIN mentor_sessions ms   ON ms.mentor_id = u.id
      LEFT JOIN mentor_ratings mrat  ON mrat.mentor_id = u.id
      WHERE u.role IN ('teacher', 'admin')
      GROUP BY u.id, u.name
      HAVING COUNT(ms.id) > 0
      ORDER BY avg_rating DESC NULLS LAST
    `);
    return res.json(rows.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch mentor stats' });
  }
});

export default router;

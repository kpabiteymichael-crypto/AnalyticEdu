import { Router } from 'express';
import { db } from '../db/index';
import { sql } from 'drizzle-orm';
import { authenticate, authorize } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

export const DEFAULT_LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 850, 1300, 1900, 2650, 3600, 4800,
  6300, 8150, 10400, 13100, 16300, 20050, 24400, 29400, 35100, 41550,
];

export const DEFAULT_XP_REWARDS = [
  { minPct: 95, xp: 100 },
  { minPct: 85, xp: 75 },
  { minPct: 75, xp: 50 },
  { minPct: 65, xp: 30 },
  { minPct: 50, xp: 15 },
  { minPct: 0, xp: 5 },
];

export const DEFAULT_SUBJECT_LABELS: Record<string, string> = {
  math: 'Mathematics',
  science: 'Science',
  english: 'English',
  history: 'History',
  art: 'Art',
  pe: 'Physical Education',
  ict: 'ICT',
  music: 'Music',
};

export const SUBJECT_KEYS = ['math', 'science', 'english', 'history', 'art', 'pe', 'ict', 'music'] as const;

export const DEFAULT_SUBJECT_MAX_MARKS: Record<string, number> = {
  math: 100, science: 100, english: 100, history: 100,
  art: 100, pe: 100, ict: 100, music: 100,
};

// Rank badge XP bonus percentages (fixed per spec)
export const RANK_BADGE_BONUSES = {
  diamond: 0.10, // ≥95% → +10% XP
  gold: 0.05,    // ≥85% → +5% XP
  ticket: 0.03,  // ≥70% → +3% XP
  star: 0.02,    // ≥50% → +2% XP
  none: 0,
};

export function getRankBadgeBonusMultiplier(avgPct: number): number {
  if (avgPct >= 95) return RANK_BADGE_BONUSES.diamond;
  if (avgPct >= 85) return RANK_BADGE_BONUSES.gold;
  if (avgPct >= 70) return RANK_BADGE_BONUSES.ticket;
  if (avgPct >= 50) return RANK_BADGE_BONUSES.star;
  return RANK_BADGE_BONUSES.none;
}

export async function getSetting(key: string): Promise<string | null> {
  const result = await db.execute(sql`SELECT value FROM settings WHERE key = ${key}`);
  const rows = (result as any).rows ?? result;
  return (rows[0] as any)?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.execute(sql`
    INSERT INTO settings (key, value, updated_at) VALUES (${key}, ${value}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `);
}

export async function getSettingJson<T>(key: string, defaultValue: T): Promise<T> {
  const raw = await getSetting(key);
  if (!raw) return defaultValue;
  try { return JSON.parse(raw); } catch { return defaultValue; }
}

export function calculateScoreXPFromRewards(score: number, maxScore: number, rewards: typeof DEFAULT_XP_REWARDS): number {
  const pct = (score / maxScore) * 100;
  const sorted = [...rewards].sort((a, b) => b.minPct - a.minPct);
  for (const tier of sorted) {
    if (pct >= tier.minPct) return tier.xp;
  }
  return 5;
}

export function getLevelFromThresholds(xp: number, thresholds: number[]): number {
  let level = 1;
  for (let i = 0; i < thresholds.length; i++) {
    if (xp >= thresholds[i]) level = i + 1;
    else break;
  }
  return level;
}

// GET /api/settings
router.get('/', authenticate, authorize('admin', 'teacher'), async (_req, res) => {
  try {
    const [levelThresholds, xpRewards, subjectLabels, subjectMaxMarks] = await Promise.all([
      getSettingJson('level_thresholds', DEFAULT_LEVEL_THRESHOLDS),
      getSettingJson('xp_rewards', DEFAULT_XP_REWARDS),
      getSettingJson('subject_labels', DEFAULT_SUBJECT_LABELS),
      getSettingJson('subject_max_marks', DEFAULT_SUBJECT_MAX_MARKS),
    ]);
    return res.json({ levelThresholds, xpRewards, subjectLabels, subjectMaxMarks, rankBadgeBonuses: RANK_BADGE_BONUSES });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /api/settings/level-thresholds
router.put('/level-thresholds', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { thresholds } = z.object({
      thresholds: z.array(z.number().min(0)).min(2).max(30),
    }).parse(req.body);
    await setSetting('level_thresholds', JSON.stringify(thresholds));
    return res.json({ success: true, thresholds });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    return res.status(500).json({ error: 'Failed to update level thresholds' });
  }
});

// PUT /api/settings/xp-rewards
router.put('/xp-rewards', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { rewards } = z.object({
      rewards: z.array(z.object({ minPct: z.number().min(0).max(100), xp: z.number().min(0) })).min(1),
    }).parse(req.body);
    await setSetting('xp_rewards', JSON.stringify(rewards));
    return res.json({ success: true, rewards });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    return res.status(500).json({ error: 'Failed to update XP rewards' });
  }
});

// PUT /api/settings/subject-labels
router.put('/subject-labels', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { labels } = z.object({ labels: z.record(z.string()) }).parse(req.body);
    await setSetting('subject_labels', JSON.stringify(labels));
    return res.json({ success: true, labels });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    return res.status(500).json({ error: 'Failed to update subject labels' });
  }
});

// PUT /api/settings/subject-max-marks
router.put('/subject-max-marks', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { marks } = z.object({ marks: z.record(z.number().min(1)) }).parse(req.body);
    await setSetting('subject_max_marks', JSON.stringify(marks));
    return res.json({ success: true, marks });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    return res.status(500).json({ error: 'Failed to update subject max marks' });
  }
});

export default router;

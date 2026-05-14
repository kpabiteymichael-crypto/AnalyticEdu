// XP & Level calculation engine
export const XP_THRESHOLDS = [
  0, 100, 250, 500, 850, 1300, 1900, 2650, 3600, 4800,
  6300, 8150, 10400, 13100, 16300, 20050, 24400, 29400, 35100, 41550,
];

export function getLevel(xp: number): number {
  let level = 1;
  for (let i = 0; i < XP_THRESHOLDS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return level;
}

export function getXpForNextLevel(level: number): number {
  return XP_THRESHOLDS[level] ?? XP_THRESHOLDS[XP_THRESHOLDS.length - 1] * 2;
}

export function getXpProgress(xp: number): { level: number; currentXp: number; nextLevelXp: number; progress: number } {
  const level = getLevel(xp);
  const currentLevelXp = XP_THRESHOLDS[level - 1] ?? 0;
  const nextLevelXp = XP_THRESHOLDS[level] ?? XP_THRESHOLDS[XP_THRESHOLDS.length - 1] * 2;
  const currentXp = xp - currentLevelXp;
  const needed = nextLevelXp - currentLevelXp;
  return {
    level,
    currentXp,
    nextLevelXp: needed,
    progress: Math.min(100, Math.round((currentXp / needed) * 100)),
  };
}

export function calculateScoreXP(score: number, maxScore: number): number {
  const percentage = (score / maxScore) * 100;
  if (percentage >= 95) return 100;
  if (percentage >= 85) return 75;
  if (percentage >= 75) return 50;
  if (percentage >= 65) return 30;
  if (percentage >= 50) return 15;
  return 5;
}

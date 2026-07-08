export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export const DIFFICULTY_REWARDS: Record<Difficulty, { xp: number; coins: number }> = {
  EASY: { xp: 10, coins: 5 },
  MEDIUM: { xp: 25, coins: 15 },
  HARD: { xp: 50, coins: 30 },
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  EASY: "Fácil",
  MEDIUM: "Media",
  HARD: "Difícil",
};

export function rewardsForDifficulty(difficulty: Difficulty) {
  return DIFFICULTY_REWARDS[difficulty];
}

// XP acumulada necesaria para alcanzar el nivel n (nivel 1 = 0 XP).
export function xpToReachLevel(n: number): number {
  if (n <= 1) return 0;
  return Math.round(100 * Math.pow(n - 1, 1.5));
}

export function levelForXp(xp: number): number {
  let level = 1;
  while (xpToReachLevel(level + 1) <= xp) level++;
  return level;
}

// Progreso dentro del nivel actual: current/needed XP y porcentaje 0-100.
export function levelProgress(xp: number) {
  const level = levelForXp(xp);
  const floor = xpToReachLevel(level);
  const ceil = xpToReachLevel(level + 1);
  const current = xp - floor;
  const needed = ceil - floor;
  return { level, current, needed, pct: Math.round((current / needed) * 100) };
}

export interface PenaltySettings {
  penaltyXp: number;
  penaltyCoins: number;
}

export const DEFAULT_PENALTY: PenaltySettings = { penaltyXp: 25, penaltyCoins: 50 };

// Deltas de penalización recortados para no dejar saldos negativos:
// lo que registra el ledger coincide siempre con lo que pierde el usuario.
export function computePenalty(
  user: { xp: number; coins: number },
  failedCriticalCount: number,
  settings: PenaltySettings,
) {
  // El "+ 0" evita devolver -0 cuando no hay nada que restar.
  const xpDelta = -Math.min(user.xp, settings.penaltyXp * failedCriticalCount) + 0;
  const coinDelta = -Math.min(user.coins, settings.penaltyCoins * failedCriticalCount) + 0;
  return { xpDelta, coinDelta };
}

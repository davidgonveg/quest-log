import { rewardsForDifficulty, sanitizeDifficulty, type Difficulty } from "./gamification";
import { coinsWithStreak } from "./streak";
import { dayIndex } from "./week-logic";

// Lógica pura de hábitos con meta semanal (objetivos con targetDays): un
// check diario es una Task ya completada; el día se deriva de completedAt,
// nunca se almacena.

export interface HabitCheckTask {
  completedAt: Date | null;
}

export interface HabitProgress {
  done: number; // días distintos con check; sin recortar (los extras se ven)
  target: number;
  met: boolean;
  days: boolean[]; // 7 posiciones, lunes=0
}

export function habitCheckDays(tasks: HabitCheckTask[]): Set<number> {
  return new Set(
    tasks.filter((t) => t.completedAt !== null).map((t) => dayIndex(t.completedAt as Date)),
  );
}

export function habitProgress(tasks: HabitCheckTask[], targetDays: number): HabitProgress {
  const checkDays = habitCheckDays(tasks);
  return {
    done: checkDays.size,
    target: targetDays,
    met: checkDays.size >= targetDays,
    days: Array.from({ length: 7 }, (_, d) => checkDays.has(d)),
  };
}

const sameCalendarDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

// Id de la task-check de hoy (la única marcable/desmarcable), o null.
export function todaysCheck(
  tasks: { id: string; completedAt: Date | null }[],
  now: Date,
): string | null {
  const today = tasks.find((t) => t.completedAt !== null && sameCalendarDay(t.completedAt, now));
  return today?.id ?? null;
}

export interface HabitGoalRow {
  id: string;
  title: string;
  targetDays: number;
  habitDifficulty: string | null;
  isGym: boolean;
  tasks: { id: string; completedAt: Date | null }[];
}

export interface HabitItemData {
  id: string; // weeklyGoalId
  title: string;
  difficulty: Difficulty;
  xpReward: number;
  coinReward: number;
  done: number;
  target: number;
  days: boolean[];
  checkedToday: boolean;
  streakBonus: number; // monedas extra del próximo check con la racha actual
  isGym: boolean;
}

// Fila de hábito lista para la UI, derivada del objetivo y sus checks.
export function habitItemFrom(
  goal: HabitGoalRow,
  streakIfCompletedNow: number,
  now: Date,
): HabitItemData {
  const difficulty = sanitizeDifficulty(goal.habitDifficulty);
  const rewards = rewardsForDifficulty(difficulty);
  const progress = habitProgress(goal.tasks, goal.targetDays);
  return {
    id: goal.id,
    title: goal.title,
    difficulty,
    xpReward: rewards.xp,
    coinReward: rewards.coins,
    done: progress.done,
    target: progress.target,
    days: progress.days,
    checkedToday: todaysCheck(goal.tasks, now) !== null,
    streakBonus: coinsWithStreak(rewards.coins, streakIfCompletedNow) - rewards.coins,
    isGym: goal.isGym,
  };
}

// Conteos para la tarjeta de progreso semanal: cada hábito aporta su meta al
// total y sus checks recortados a la meta al hecho (los extras no inflan el %).
export function weekCounts(input: {
  normalTasks: HabitCheckTask[];
  habits: { checkDays: number; targetDays: number }[];
}): { done: number; total: number } {
  const normalDone = input.normalTasks.filter((t) => t.completedAt !== null).length;
  const habitDone = input.habits.reduce((s, h) => s + Math.min(h.checkDays, h.targetDays), 0);
  const habitTotal = input.habits.reduce((s, h) => s + h.targetDays, 0);
  return { done: normalDone + habitDone, total: input.normalTasks.length + habitTotal };
}

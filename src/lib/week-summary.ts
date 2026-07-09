// Resumen "Wrapped" de una semana cerrada: se deriva en lectura del ledger y
// del estado de los objetivos (patrón streak.ts / goalXpFrom), sin almacenar
// nada. Convierte el cierre en un ritual en vez de un simple banner.

import { dayIndex } from "./week-logic";

export interface SummaryLedgerEntry {
  reason: string;
  xpDelta: number;
  coinDelta: number;
  createdAt: Date;
}

export interface WeekSummaryInput {
  week: { startDate: Date; endDate: Date; penaltyMsg: string | null };
  entries: SummaryLedgerEntry[];
  weeklyGoals: { isCritical: boolean; status: string }[];
}

export interface WeekSummary {
  xpGained: number;
  coinsGained: number;
  coinsSpent: number;
  tasksCompleted: number; // completadas netas (menos las desmarcadas)
  bestDay: { day: number; count: number } | null; // día con más compleciones
  goalsCompleted: number;
  goalsFailed: number;
  criticalsFailed: number;
  xpLost: number; // penalización de la semana (0 si limpia)
  coinsLost: number;
  penaltyMessage: string | null;
}

export function weekSummaryFrom(input: WeekSummaryInput): WeekSummary {
  const { startDate, endDate } = input.week;
  const inWeek = input.entries.filter(
    (e) => e.createdAt >= startDate && e.createdAt <= endDate,
  );

  let xpGained = 0;
  let coinsGained = 0;
  let coinsSpent = 0;
  let completed = 0;
  let uncompleted = 0;
  let xpLost = 0;
  let coinsLost = 0;
  const perDay = new Map<number, number>();

  for (const e of inWeek) {
    if (e.xpDelta > 0) xpGained += e.xpDelta;
    if (e.coinDelta > 0) coinsGained += e.coinDelta;
    if (e.reason === "REDEMPTION") coinsSpent += -e.coinDelta;
    if (e.reason === "PENALTY") {
      xpLost += -e.xpDelta;
      coinsLost += -e.coinDelta;
    }
    if (e.reason === "TASK_COMPLETED") {
      completed++;
      const d = dayIndex(e.createdAt);
      perDay.set(d, (perDay.get(d) ?? 0) + 1);
    }
    if (e.reason === "TASK_UNCOMPLETED") uncompleted++;
  }

  let bestDay: WeekSummary["bestDay"] = null;
  for (const [day, count] of perDay) {
    if (!bestDay || count > bestDay.count) bestDay = { day, count };
  }

  const goalsCompleted = input.weeklyGoals.filter((g) => g.status === "COMPLETED").length;
  const goalsFailed = input.weeklyGoals.filter((g) => g.status === "FAILED").length;
  const criticalsFailed = input.weeklyGoals.filter(
    (g) => g.isCritical && g.status === "FAILED",
  ).length;

  return {
    xpGained,
    coinsGained,
    coinsSpent,
    tasksCompleted: Math.max(0, completed - uncompleted),
    bestDay,
    goalsCompleted,
    goalsFailed,
    criticalsFailed,
    xpLost,
    coinsLost,
    penaltyMessage: input.week.penaltyMsg,
  };
}

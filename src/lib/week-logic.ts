import { computePenalty, type PenaltySettings } from "./gamification";
import { habitCheckDays } from "./habits";
import { pickPenaltyMessage } from "./messages";

// Lógica pura de semanas (sin base de datos), testeable de forma aislada.
// La semana es lunes 00:00 → domingo 23:59:59.999 en hora local del servidor.

export function getWeekBounds(date: Date): { start: Date; end: Date } {
  const day = dayIndex(date);
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() - day);
  const end = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() + 6,
    23, 59, 59, 999,
  );
  return { start, end };
}

// Lunes=0 … domingo=6
export function dayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export const DAY_NAMES = [
  "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo",
] as const;

interface CloseWeekInput {
  weeklyGoals: {
    id: string;
    isCritical: boolean;
    status: string;
    targetDays?: number | null; // hábito: meta de días/semana; null = objetivo normal
    tasks: { completedAt: Date | null }[];
  }[];
  user: { xp: number; coins: number };
  settings: PenaltySettings;
}

export interface CloseWeekPlan {
  goalUpdates: { id: string; status: "COMPLETED" | "FAILED" }[];
  failedCritical: number;
  xpDelta: number;
  coinDelta: number;
  message: string | null;
}

// Decide el resultado del cierre de semana: qué objetivos quedan COMPLETED
// o FAILED, la penalización por críticos fallidos y el mensaje de decepción.
// Un objetivo ACTIVE se completa solo si tiene tareas y todas están hechas;
// un hábito (targetDays), si tiene checks en al menos esos días distintos.
export function closeWeekPlan(input: CloseWeekInput): CloseWeekPlan {
  const goalUpdates: CloseWeekPlan["goalUpdates"] = [];
  let failedCritical = 0;

  for (const g of input.weeklyGoals) {
    if (g.status !== "ACTIVE") continue;
    const done =
      g.targetDays != null
        ? habitCheckDays(g.tasks).size >= g.targetDays
        : g.tasks.length > 0 && g.tasks.every((t) => t.completedAt !== null);
    goalUpdates.push({ id: g.id, status: done ? "COMPLETED" : "FAILED" });
    if (!done && g.isCritical) failedCritical++;
  }

  const { xpDelta, coinDelta } = computePenalty(input.user, failedCritical, input.settings);
  return {
    goalUpdates,
    failedCritical,
    xpDelta,
    coinDelta,
    message: failedCritical > 0 ? pickPenaltyMessage() : null,
  };
}

// Racha diaria derivada del ledger, sin estado almacenado (patrón goalXpFrom):
// desmarcar o borrar nunca deja contadores desincronizados.

export interface StreakLedgerEntry {
  reason: string; // solo cuentan TASK_COMPLETED / TASK_UNCOMPLETED
  refId: string | null;
  createdAt: Date;
}

export interface StreakInfo {
  current: number; // días consecutivos terminando hoy o ayer; 0 = rota
  lost: number; // longitud de la racha anterior cuando current === 0
}

export const STREAK_BONUS_PER_DAY = 0.1;
export const STREAK_MULTIPLIER_CAP = 2;

const DAY_MS = 24 * 60 * 60 * 1000;

// Nº de día en hora local; round absorbe el desfase de ±1h del cambio horario.
export function dayNumber(date: Date): number {
  return Math.round(
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / DAY_MS,
  );
}

// Fechas de los completados que sobreviven: cada TASK_UNCOMPLETED cancela el
// completado aún vivo más reciente de su misma tarea (emparejado por refId).
// Base tanto de la racha como del heatmap de actividad (history.ts).
export function survivingCompletions(entries: StreakLedgerEntry[]): Date[] {
  const chronological = entries
    .filter((e) => e.reason === "TASK_COMPLETED" || e.reason === "TASK_UNCOMPLETED")
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const alive = new Map<string, Date[]>();
  for (const e of chronological) {
    const key = e.refId ?? "";
    if (e.reason === "TASK_COMPLETED") {
      alive.set(key, [...(alive.get(key) ?? []), e.createdAt]);
    } else {
      alive.get(key)?.pop();
    }
  }
  return [...alive.values()].flat();
}

// Días con al menos un completado superviviente.
function survivingCompletionDays(entries: StreakLedgerEntry[]): Set<number> {
  return new Set(survivingCompletions(entries).map(dayNumber));
}

function runLengthEndingAt(days: Set<number>, end: number): number {
  let len = 0;
  while (days.has(end - len)) len++;
  return len;
}

export function streakFrom(entries: StreakLedgerEntry[], now: Date): StreakInfo {
  const days = survivingCompletionDays(entries);
  const today = dayNumber(now);
  const current = runLengthEndingAt(days, days.has(today) ? today : today - 1);
  if (current > 0 || days.size === 0) return { current, lost: 0 };
  return { current: 0, lost: runLengthEndingAt(days, Math.max(...days)) };
}

// Racha que quedaría si se completase una tarea ahora mismo: es la que fija el
// multiplicador al completar (el propio completado ya cuenta) y la que
// previsualiza el bonus en tareas pendientes.
export function streakIfCompleted(entries: StreakLedgerEntry[], now: Date): number {
  const hypothetical: StreakLedgerEntry = {
    reason: "TASK_COMPLETED",
    refId: "hypothetical",
    createdAt: now,
  };
  return streakFrom([...entries, hypothetical], now).current;
}

export function streakMultiplier(streakDays: number): number {
  return Math.min(STREAK_MULTIPLIER_CAP, 1 + STREAK_BONUS_PER_DAY * Math.max(0, streakDays));
}

export function coinsWithStreak(base: number, streakDays: number): number {
  return Math.round(base * streakMultiplier(streakDays));
}

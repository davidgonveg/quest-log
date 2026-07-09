// Heatmap de actividad estilo GitHub: compleciones supervivientes por día,
// derivadas del ledger en lectura. Reutiliza el emparejado de streak.ts para
// que desmarcar una tarea reste también de su casilla del historial.

import { dayNumber, survivingCompletions, type StreakLedgerEntry } from "./streak";

// Nº de tareas completadas (vivas) por día, keyeadas por número de día local.
export function activityByDay(entries: StreakLedgerEntry[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const d of survivingCompletions(entries)) {
    const n = dayNumber(d);
    counts.set(n, (counts.get(n) ?? 0) + 1);
  }
  return counts;
}

// Nivel de intensidad 0-4 para colorear la casilla (0 = sin actividad).
export function intensity(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

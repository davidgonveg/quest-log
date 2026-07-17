import { dayIndex } from "./week-logic";

// Lógica pura del módulo de gym: agrupación semanal y progresión por
// ejercicio. Tracking puro — nada de esto toca XP, monedas ni el ledger.

export interface GymEntryRow {
  id: string;
  date: Date;
  sets: number;
  reps: number;
  weightKg: number | null; // null = peso corporal
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Entradas de la semana [weekStart, weekStart+7d) agrupadas por día; solo
// aparecen los días con sesión.
export function groupEntriesByDay<T extends { date: Date }>(
  entries: T[],
  weekStart: Date,
): { day: number; entries: T[] }[] {
  const weekEnd = new Date(weekStart.getTime() + 7 * DAY_MS);
  const inWeek = entries.filter((e) => e.date >= weekStart && e.date < weekEnd);
  return Array.from({ length: 7 }, (_, day) => ({
    day,
    entries: inWeek.filter((e) => dayIndex(e.date) === day),
  })).filter((g) => g.entries.length > 0);
}

export interface ProgressionRow {
  date: Date; // día de la sesión, 00:00 hora local
  topWeight: number | null; // mejor peso del día; null si todo fue corporal
  volume: number; // Σ sets·reps·peso (el peso corporal no aporta)
}

// Una fila por día con sesión, en orden cronológico.
export function progressionFor(entries: GymEntryRow[]): ProgressionRow[] {
  const byDay = new Map<number, GymEntryRow[]>();
  for (const e of entries) {
    const key = new Date(e.date.getFullYear(), e.date.getMonth(), e.date.getDate()).getTime();
    byDay.set(key, [...(byDay.get(key) ?? []), e]);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a - b)
    .map(([key, dayEntries]) => {
      const weights = dayEntries
        .map((e) => e.weightKg)
        .filter((w): w is number => w !== null);
      return {
        date: new Date(key),
        topWeight: weights.length > 0 ? Math.max(...weights) : null,
        volume: dayEntries.reduce((s, e) => s + e.sets * e.reps * (e.weightKg ?? 0), 0),
      };
    });
}

// Puntos "x,y x,y…" de un polyline SVG normalizado al ancho/alto dados.
// Serie plana (o un solo valor) → línea/punto a media altura.
export function sparklinePoints(values: number[], width: number, height: number): string {
  if (values.length === 0) return "";
  if (values.length === 1) return `${width / 2},${height / 2}`;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const round = (n: number) => Math.round(n * 10) / 10;

  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = range === 0 ? height / 2 : height - ((v - min) / range) * height;
      return `${round(x)},${round(y)}`;
    })
    .join(" ");
}

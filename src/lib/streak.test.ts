import { describe, expect, it } from "vitest";
import {
  coinsWithStreak,
  streakFrom,
  streakIfCompleted,
  streakMultiplier,
  type StreakLedgerEntry,
} from "./streak";

// "Hoy" fijo a mediodía (miércoles) para esquivar bordes de medianoche.
const NOW = new Date(2026, 6, 8, 12, 0, 0);
const daysAgo = (n: number, hour = 12) => new Date(2026, 6, 8 - n, hour);

let seq = 0;
const completed = (createdAt: Date, refId = `t${++seq}`): StreakLedgerEntry => ({
  reason: "TASK_COMPLETED",
  refId,
  createdAt,
});
const uncompleted = (createdAt: Date, refId: string): StreakLedgerEntry => ({
  reason: "TASK_UNCOMPLETED",
  refId,
  createdAt,
});

describe("streakFrom", () => {
  it("ledger vacío → sin racha ni pérdida", () => {
    expect(streakFrom([], NOW)).toEqual({ current: 0, lost: 0 });
  });

  it("un completado hoy → racha 1", () => {
    expect(streakFrom([completed(daysAgo(0))], NOW).current).toBe(1);
  });

  it("solo ayer → racha 1 (viva, en riesgo)", () => {
    expect(streakFrom([completed(daysAgo(1))], NOW).current).toBe(1);
  });

  it("tres días consecutivos terminando hoy → 3", () => {
    const entries = [completed(daysAgo(2)), completed(daysAgo(1)), completed(daysAgo(0))];
    expect(streakFrom(entries, NOW).current).toBe(3);
  });

  it("varios completados el mismo día cuentan una vez", () => {
    const entries = [completed(daysAgo(1)), completed(daysAgo(0), "a"), completed(daysAgo(0), "b")];
    expect(streakFrom(entries, NOW).current).toBe(2);
  });

  it("último completado hace 2 días → rota, con la racha perdida", () => {
    const entries = [completed(daysAgo(3)), completed(daysAgo(2))];
    expect(streakFrom(entries, NOW)).toEqual({ current: 0, lost: 2 });
  });

  it("completar y desmarcar la única tarea de hoy → hoy no cuenta", () => {
    const entries = [completed(daysAgo(0), "x"), uncompleted(daysAgo(0, 13), "x")];
    expect(streakFrom(entries, NOW).current).toBe(0);
  });

  it("dos completados hoy y un desmarcado → hoy sigue contando", () => {
    const entries = [
      completed(daysAgo(0, 9), "x"),
      completed(daysAgo(0, 10), "y"),
      uncompleted(daysAgo(0, 11), "x"),
    ];
    expect(streakFrom(entries, NOW).current).toBe(1);
  });

  it("desmarcar hoy una tarea de anteayer borra aquel día (retroactivo)", () => {
    const entries = [
      completed(daysAgo(2), "x"),
      completed(daysAgo(1), "y"),
      completed(daysAgo(0), "z"),
      uncompleted(daysAgo(0, 13), "x"),
    ];
    expect(streakFrom(entries, NOW).current).toBe(2);
  });

  it("ignora asientos con otras reasons", () => {
    const entries: StreakLedgerEntry[] = [
      { reason: "PENALTY", refId: null, createdAt: daysAgo(0) },
      completed(daysAgo(0)),
    ];
    expect(streakFrom(entries, NOW).current).toBe(1);
  });
});

describe("streakIfCompleted", () => {
  it("sin historial, completar ahora arranca racha 1", () => {
    expect(streakIfCompleted([], NOW)).toBe(1);
  });

  it("racha viva terminando ayer → completar ahora la extiende", () => {
    expect(streakIfCompleted([completed(daysAgo(1))], NOW)).toBe(2);
  });

  it("si hoy ya cuenta, completar otra no la alarga", () => {
    const entries = [completed(daysAgo(1)), completed(daysAgo(0))];
    expect(streakIfCompleted(entries, NOW)).toBe(2);
  });
});

describe("streakMultiplier", () => {
  it("sin racha no multiplica", () => expect(streakMultiplier(0)).toBe(1));
  it("+10 % por día", () => expect(streakMultiplier(3)).toBeCloseTo(1.3));
  it("tope ×2 en el día 10", () => expect(streakMultiplier(10)).toBe(2));
  it("no pasa del tope", () => expect(streakMultiplier(15)).toBe(2));
});

describe("coinsWithStreak", () => {
  it("base intacta sin racha", () => expect(coinsWithStreak(5, 0)).toBe(5));
  it("redondea hacia arriba el .5 (5 → 6)", () => expect(coinsWithStreak(5, 1)).toBe(6));
  it("15 con racha 1 → 17", () => expect(coinsWithStreak(15, 1)).toBe(17));
  it("15 con racha 3 → 20", () => expect(coinsWithStreak(15, 3)).toBe(20));
  it("tope: 30 con racha 10 → 60", () => expect(coinsWithStreak(30, 10)).toBe(60));
});

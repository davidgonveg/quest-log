import { describe, expect, it } from "vitest";
import { weekSummaryFrom, type SummaryLedgerEntry } from "./week-summary";

// Semana lunes 2026-07-06 → domingo 2026-07-12.
const WEEK = {
  startDate: new Date(2026, 6, 6, 0, 0, 0),
  endDate: new Date(2026, 6, 12, 23, 59, 59, 999),
  penaltyMsg: null as string | null,
};
const at = (dayOffset: number, hour = 12) => new Date(2026, 6, 6 + dayOffset, hour);

const entry = (
  reason: string,
  xpDelta: number,
  coinDelta: number,
  createdAt: Date,
): SummaryLedgerEntry => ({ reason, xpDelta, coinDelta, createdAt });

describe("weekSummaryFrom", () => {
  it("semana vacía → todo a cero, sin mejor día", () => {
    const s = weekSummaryFrom({ week: WEEK, entries: [], weeklyGoals: [] });
    expect(s).toMatchObject({
      xpGained: 0,
      coinsGained: 0,
      coinsSpent: 0,
      tasksCompleted: 0,
      bestDay: null,
    });
  });

  it("suma XP y monedas ganadas, ignora deltas negativos como ganancia", () => {
    const entries = [
      entry("TASK_COMPLETED", 25, 15, at(0)),
      entry("LOOT", 0, 20, at(0)),
      entry("PENALTY", -25, -50, at(6)),
    ];
    const s = weekSummaryFrom({ week: WEEK, entries, weeklyGoals: [] });
    expect(s.xpGained).toBe(25);
    expect(s.coinsGained).toBe(35);
  });

  it("registra lo perdido por la penalización de la semana", () => {
    const entries = [entry("PENALTY", -25, -50, at(6))];
    const s = weekSummaryFrom({ week: WEEK, entries, weeklyGoals: [] });
    expect(s).toMatchObject({ xpLost: 25, coinsLost: 50 });
  });

  it("monedas gastadas = canjes de la tienda", () => {
    const entries = [entry("REDEMPTION", 0, -30, at(1)), entry("REDEMPTION", 0, -60, at(2))];
    expect(weekSummaryFrom({ week: WEEK, entries, weeklyGoals: [] }).coinsSpent).toBe(90);
  });

  it("tareas completadas netas descuentan las desmarcadas", () => {
    const entries = [
      entry("TASK_COMPLETED", 25, 15, at(0)),
      entry("TASK_COMPLETED", 25, 15, at(1)),
      entry("TASK_UNCOMPLETED", -25, -15, at(1, 14)),
    ];
    expect(weekSummaryFrom({ week: WEEK, entries, weeklyGoals: [] }).tasksCompleted).toBe(1);
  });

  it("mejor día = el de más compleciones (lunes=0)", () => {
    const entries = [
      entry("TASK_COMPLETED", 10, 5, at(2, 9)),
      entry("TASK_COMPLETED", 10, 5, at(2, 10)),
      entry("TASK_COMPLETED", 10, 5, at(4)),
    ];
    expect(weekSummaryFrom({ week: WEEK, entries, weeklyGoals: [] }).bestDay).toEqual({
      day: 2,
      count: 2,
    });
  });

  it("descarta asientos fuera del rango de la semana", () => {
    const entries = [
      entry("TASK_COMPLETED", 25, 15, at(-1)), // semana anterior
      entry("TASK_COMPLETED", 25, 15, at(7)), // semana siguiente
      entry("TASK_COMPLETED", 25, 15, at(3)),
    ];
    expect(weekSummaryFrom({ week: WEEK, entries, weeklyGoals: [] }).tasksCompleted).toBe(1);
  });

  it("cuenta objetivos completados, fallidos y críticos fallidos", () => {
    const weeklyGoals = [
      { isCritical: true, status: "FAILED" },
      { isCritical: false, status: "FAILED" },
      { isCritical: true, status: "COMPLETED" },
      { isCritical: false, status: "ACTIVE" },
    ];
    const s = weekSummaryFrom({ week: WEEK, entries: [], weeklyGoals });
    expect(s).toMatchObject({ goalsCompleted: 1, goalsFailed: 2, criticalsFailed: 1 });
  });

  it("arrastra el mensaje de penalización de la semana", () => {
    const s = weekSummaryFrom({
      week: { ...WEEK, penaltyMsg: "Fallaste." },
      entries: [],
      weeklyGoals: [],
    });
    expect(s.penaltyMessage).toBe("Fallaste.");
  });
});

import { describe, expect, it } from "vitest";
import { activityByDay, intensity } from "./history";
import { dayNumber, type StreakLedgerEntry } from "./streak";

const at = (dayOffset: number, hour = 12) => new Date(2026, 6, 8 - dayOffset, hour);
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

describe("activityByDay", () => {
  it("ledger vacío → mapa vacío", () => {
    expect(activityByDay([]).size).toBe(0);
  });

  it("cuenta varias compleciones el mismo día", () => {
    const counts = activityByDay([completed(at(0, 9)), completed(at(0, 10))]);
    expect(counts.get(dayNumber(at(0)))).toBe(2);
  });

  it("separa por día", () => {
    const counts = activityByDay([completed(at(0)), completed(at(1)), completed(at(1))]);
    expect(counts.get(dayNumber(at(0)))).toBe(1);
    expect(counts.get(dayNumber(at(1)))).toBe(2);
  });

  it("un desmarcado descuenta su casilla", () => {
    const counts = activityByDay([
      completed(at(0, 9), "x"),
      completed(at(0, 10), "y"),
      uncompleted(at(0, 11), "x"),
    ]);
    expect(counts.get(dayNumber(at(0)))).toBe(1);
  });
});

describe("intensity", () => {
  it("0 sin actividad", () => expect(intensity(0)).toBe(0));
  it("escala por tramos", () => {
    expect(intensity(1)).toBe(1);
    expect(intensity(3)).toBe(2);
    expect(intensity(5)).toBe(3);
    expect(intensity(9)).toBe(4);
  });
});

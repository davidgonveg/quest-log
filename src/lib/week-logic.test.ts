import { describe, expect, it } from "vitest";
import { closeWeekPlan, dayIndex, getWeekBounds } from "./week-logic";

describe("getWeekBounds", () => {
  it("la semana va de lunes 00:00 a domingo 23:59:59.999", () => {
    // Miércoles 8 de julio de 2026
    const { start, end } = getWeekBounds(new Date(2026, 6, 8, 15, 30));
    expect(start).toEqual(new Date(2026, 6, 6, 0, 0, 0, 0)); // lunes 6
    expect(end).toEqual(new Date(2026, 6, 12, 23, 59, 59, 999)); // domingo 12
  });

  it("un domingo pertenece a la semana que empezó el lunes anterior", () => {
    const { start } = getWeekBounds(new Date(2026, 6, 12, 10, 0));
    expect(start).toEqual(new Date(2026, 6, 6, 0, 0, 0, 0));
  });

  it("un lunes a las 00:00 empieza su propia semana", () => {
    const { start } = getWeekBounds(new Date(2026, 6, 13, 0, 0));
    expect(start).toEqual(new Date(2026, 6, 13, 0, 0, 0, 0));
  });
});

describe("dayIndex", () => {
  it("lunes=0 … domingo=6", () => {
    expect(dayIndex(new Date(2026, 6, 6))).toBe(0); // lunes
    expect(dayIndex(new Date(2026, 6, 8))).toBe(2); // miércoles
    expect(dayIndex(new Date(2026, 6, 12))).toBe(6); // domingo
  });
});

function goal(over: Partial<Parameters<typeof closeWeekPlan>[0]["weeklyGoals"][number]> = {}) {
  return {
    id: "g1",
    isCritical: false,
    status: "ACTIVE",
    tasks: [{ completedAt: new Date() }],
    ...over,
  };
}

const settings = { penaltyXp: 25, penaltyCoins: 50 };
const user = { xp: 500, coins: 200 };

describe("closeWeekPlan", () => {
  it("completa objetivos activos con todas sus tareas hechas", () => {
    const plan = closeWeekPlan({ weeklyGoals: [goal()], user, settings });
    expect(plan.goalUpdates).toEqual([{ id: "g1", status: "COMPLETED" }]);
    expect(plan.failedCritical).toBe(0);
    expect(plan.message).toBeNull();
  });

  it("marca FAILED los objetivos con tareas pendientes o sin tareas", () => {
    const plan = closeWeekPlan({
      weeklyGoals: [
        goal({ id: "a", tasks: [{ completedAt: null }] }),
        goal({ id: "b", tasks: [] }),
      ],
      user,
      settings,
    });
    expect(plan.goalUpdates).toEqual([
      { id: "a", status: "FAILED" },
      { id: "b", status: "FAILED" },
    ]);
  });

  it("no toca objetivos ya COMPLETED", () => {
    const plan = closeWeekPlan({
      weeklyGoals: [goal({ status: "COMPLETED", tasks: [] })],
      user,
      settings,
    });
    expect(plan.goalUpdates).toEqual([]);
  });

  it("los críticos fallidos generan penalización y mensaje duro", () => {
    const plan = closeWeekPlan({
      weeklyGoals: [
        goal({ id: "a", isCritical: true, tasks: [{ completedAt: null }] }),
        goal({ id: "b", isCritical: true, tasks: [] }),
      ],
      user,
      settings,
    });
    expect(plan.failedCritical).toBe(2);
    expect(plan.xpDelta).toBe(-50);
    expect(plan.coinDelta).toBe(-100);
    expect(plan.message).toBeTruthy();
  });

  it("los no críticos fallidos no penalizan", () => {
    const plan = closeWeekPlan({
      weeklyGoals: [goal({ tasks: [{ completedAt: null }] })],
      user,
      settings,
    });
    expect(plan.failedCritical).toBe(0);
    expect(plan.xpDelta).toBe(0);
    expect(plan.coinDelta).toBe(0);
    expect(plan.message).toBeNull();
  });
});

// Checks de hábito: tasks ya completadas en días distintos de la semana
// (lunes 13 – domingo 19 de julio de 2026).
const checksOnDays = (...days: number[]) =>
  days.map((d) => ({ completedAt: new Date(2026, 6, 13 + d, 12, 0) }));

describe("closeWeekPlan con hábitos (targetDays)", () => {
  it("completa el hábito con checks en al menos targetDays días distintos", () => {
    const plan = closeWeekPlan({
      weeklyGoals: [goal({ targetDays: 3, tasks: checksOnDays(0, 2, 4) })],
      user,
      settings,
    });
    expect(plan.goalUpdates).toEqual([{ id: "g1", status: "COMPLETED" }]);
  });

  it("falla el hábito por debajo de la meta aunque todos sus checks estén completos", () => {
    // Con la regla de tareas normales (todas hechas) esto sería COMPLETED.
    const plan = closeWeekPlan({
      weeklyGoals: [goal({ targetDays: 3, tasks: checksOnDays(0, 2) })],
      user,
      settings,
    });
    expect(plan.goalUpdates).toEqual([{ id: "g1", status: "FAILED" }]);
  });

  it("los días extra por encima de la meta también completan", () => {
    const plan = closeWeekPlan({
      weeklyGoals: [goal({ targetDays: 3, tasks: checksOnDays(0, 1, 2, 3, 4) })],
      user,
      settings,
    });
    expect(plan.goalUpdates).toEqual([{ id: "g1", status: "COMPLETED" }]);
  });

  it("un hábito sin checks falla", () => {
    const plan = closeWeekPlan({
      weeklyGoals: [goal({ targetDays: 2, tasks: [] })],
      user,
      settings,
    });
    expect(plan.goalUpdates).toEqual([{ id: "g1", status: "FAILED" }]);
  });

  it("un hábito crítico incumplido penaliza como cualquier crítico", () => {
    const plan = closeWeekPlan({
      weeklyGoals: [goal({ targetDays: 4, isCritical: true, tasks: checksOnDays(0) })],
      user,
      settings,
    });
    expect(plan.failedCritical).toBe(1);
    expect(plan.xpDelta).toBe(-25);
    expect(plan.coinDelta).toBe(-50);
  });

  it("targetDays null mantiene la regla de tareas normales", () => {
    const plan = closeWeekPlan({
      weeklyGoals: [goal({ targetDays: null, tasks: [{ completedAt: new Date() }] })],
      user,
      settings,
    });
    expect(plan.goalUpdates).toEqual([{ id: "g1", status: "COMPLETED" }]);
  });
});

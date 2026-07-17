import { describe, expect, it } from "vitest";
import {
  habitCheckDays,
  habitItemFrom,
  habitProgress,
  todaysCheck,
  weekCounts,
} from "./habits";

// Semana del lunes 13 al domingo 19 de julio de 2026.
const mon = new Date(2026, 6, 13, 8, 0);
const tue = new Date(2026, 6, 14, 21, 30);
const fri = new Date(2026, 6, 17, 12, 0);

const check = (completedAt: Date | null, id = "t1") => ({ id, completedAt });

describe("habitCheckDays", () => {
  it("deriva el día de cada check vivo de su completedAt (lunes=0)", () => {
    expect(habitCheckDays([check(mon), check(fri, "t2")])).toEqual(new Set([0, 4]));
  });

  it("dos checks el mismo día cuentan como un solo día", () => {
    expect(habitCheckDays([check(mon), check(new Date(2026, 6, 13, 22, 0), "t2")])).toEqual(
      new Set([0]),
    );
  });

  it("ignora tasks sin completar", () => {
    expect(habitCheckDays([check(null)])).toEqual(new Set());
  });
});

describe("habitProgress", () => {
  it("cuenta días distintos y marca met al llegar al objetivo", () => {
    const p = habitProgress([check(mon), check(tue, "t2")], 2);
    expect(p).toEqual({
      done: 2,
      target: 2,
      met: true,
      days: [true, true, false, false, false, false, false],
    });
  });

  it("por debajo del objetivo, met es false", () => {
    const p = habitProgress([check(mon)], 3);
    expect(p.done).toBe(1);
    expect(p.met).toBe(false);
  });

  it("los días extra por encima del objetivo siguen sumando en done", () => {
    const p = habitProgress([check(mon), check(tue, "t2"), check(fri, "t3")], 2);
    expect(p.done).toBe(3);
    expect(p.met).toBe(true);
  });
});

describe("todaysCheck", () => {
  it("devuelve el id del check de hoy", () => {
    expect(todaysCheck([check(mon), check(fri, "t2")], new Date(2026, 6, 17, 18, 0))).toBe("t2");
  });

  it("null si no hay check de hoy", () => {
    expect(todaysCheck([check(mon)], new Date(2026, 6, 17, 18, 0))).toBeNull();
    expect(todaysCheck([], new Date(2026, 6, 17, 18, 0))).toBeNull();
  });

  it("compara por día de calendario, no por día de la semana", () => {
    // Un check del viernes pasado no es el check de este viernes.
    expect(todaysCheck([check(new Date(2026, 6, 10, 12, 0))], new Date(2026, 6, 17, 18, 0))).toBeNull();
  });
});

describe("weekCounts", () => {
  it("suma tareas normales y metas de hábitos", () => {
    const counts = weekCounts({
      normalTasks: [{ completedAt: mon }, { completedAt: null }],
      habits: [{ checkDays: 1, targetDays: 3 }],
    });
    expect(counts).toEqual({ done: 2, total: 5 });
  });

  it("los checks extra por encima del objetivo no inflan el progreso", () => {
    const counts = weekCounts({
      normalTasks: [],
      habits: [{ checkDays: 5, targetDays: 3 }],
    });
    expect(counts).toEqual({ done: 3, total: 3 });
  });
});

describe("habitItemFrom", () => {
  const goal = {
    id: "g1",
    title: "Entrenar",
    targetDays: 4,
    habitDifficulty: "EASY",
    tasks: [check(mon), check(fri, "t2")],
  };

  it("arma la fila del hábito: recompensas por dificultad, progreso y check de hoy", () => {
    // Viernes con racha 1 si se completa ahora: 5 × 1.1 = 6 → bonus 1.
    const item = habitItemFrom(goal, 1, new Date(2026, 6, 17, 18, 0));
    expect(item).toEqual({
      id: "g1",
      title: "Entrenar",
      difficulty: "EASY",
      xpReward: 10,
      coinReward: 5,
      done: 2,
      target: 4,
      days: [true, false, false, false, true, false, false],
      checkedToday: true,
      streakBonus: 1,
    });
  });

  it("sanea una habitDifficulty desconocida o null a MEDIUM", () => {
    const item = habitItemFrom({ ...goal, habitDifficulty: null }, 0, mon);
    expect(item.difficulty).toBe("MEDIUM");
    expect(item.xpReward).toBe(25);
  });
});

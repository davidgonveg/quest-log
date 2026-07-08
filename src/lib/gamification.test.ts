import { describe, expect, it } from "vitest";
import {
  computePenalty,
  goalXpFrom,
  levelForXp,
  levelProgress,
  rewardsForDifficulty,
  xpToReachLevel,
} from "./gamification";

describe("xpToReachLevel", () => {
  it("el nivel 1 empieza en 0 XP", () => {
    expect(xpToReachLevel(1)).toBe(0);
  });

  it("el nivel 2 requiere 100 XP y el 5 requiere 800", () => {
    expect(xpToReachLevel(2)).toBe(100);
    expect(xpToReachLevel(5)).toBe(800);
  });

  it("es estrictamente creciente", () => {
    for (let n = 1; n < 20; n++) {
      expect(xpToReachLevel(n + 1)).toBeGreaterThan(xpToReachLevel(n));
    }
  });
});

describe("levelForXp", () => {
  it("0 XP es nivel 1", () => {
    expect(levelForXp(0)).toBe(1);
  });

  it("justo en el umbral sube de nivel", () => {
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
  });

  it("es consistente con xpToReachLevel", () => {
    expect(levelForXp(xpToReachLevel(7))).toBe(7);
    expect(levelForXp(xpToReachLevel(7) - 1)).toBe(6);
  });
});

describe("levelProgress", () => {
  it("calcula el progreso hacia el siguiente nivel", () => {
    // Nivel 1: 0 → 100. Con 50 XP: 50%.
    const p = levelProgress(50);
    expect(p.level).toBe(1);
    expect(p.current).toBe(50);
    expect(p.needed).toBe(100);
    expect(p.pct).toBe(50);
  });
});

describe("rewardsForDifficulty", () => {
  it("devuelve las recompensas por defecto", () => {
    expect(rewardsForDifficulty("EASY")).toEqual({ xp: 10, coins: 5 });
    expect(rewardsForDifficulty("MEDIUM")).toEqual({ xp: 25, coins: 15 });
    expect(rewardsForDifficulty("HARD")).toEqual({ xp: 50, coins: 30 });
  });
});

describe("computePenalty", () => {
  it("resta por cada objetivo crítico fallido", () => {
    const p = computePenalty(
      { xp: 500, coins: 200 },
      2,
      { penaltyXp: 25, penaltyCoins: 50 },
    );
    expect(p.xpDelta).toBe(-50);
    expect(p.coinDelta).toBe(-100);
  });

  it("nunca deja las monedas ni la XP por debajo de 0 (delta recortado)", () => {
    const p = computePenalty(
      { xp: 10, coins: 30 },
      2,
      { penaltyXp: 25, penaltyCoins: 50 },
    );
    expect(p.xpDelta).toBe(-10);
    expect(p.coinDelta).toBe(-30);
  });

  it("sin fallos críticos no hay penalización", () => {
    const p = computePenalty(
      { xp: 100, coins: 100 },
      0,
      { penaltyXp: 25, penaltyCoins: 50 },
    );
    expect(p.xpDelta).toBe(0);
    expect(p.coinDelta).toBe(0);
  });
});

describe("goalXpFrom", () => {
  it("objetivo sin nada = 0 XP (nivel 1)", () => {
    expect(goalXpFrom([])).toBe(0);
  });

  it("suma la xpReward de tareas completadas, ignora las pendientes", () => {
    const weeklyGoals = [
      {
        status: "ACTIVE",
        tasks: [
          { completedAt: new Date(), xpReward: 25 },
          { completedAt: null, xpReward: 50 },
        ],
      },
    ];
    expect(goalXpFrom(weeklyGoals)).toBe(25);
  });

  it("añade 40 XP por cada objetivo semanal COMPLETED", () => {
    const weeklyGoals = [
      { status: "COMPLETED", tasks: [{ completedAt: new Date(), xpReward: 10 }] },
      { status: "FAILED", tasks: [] },
    ];
    expect(goalXpFrom(weeklyGoals)).toBe(50);
  });
});

import { describe, expect, it } from "vitest";
import { LOOT_MAX, LOOT_MIN, rollLoot } from "./loot";

// rng determinista a partir de una cola de valores.
const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++] ?? 0;
};

describe("rollLoot", () => {
  it("por encima de la probabilidad → sin botín", () => {
    expect(rollLoot(seq(0.15))).toBe(0); // el umbral es exclusivo
    expect(rollLoot(seq(0.99))).toBe(0);
  });

  it("bajo la probabilidad, roll mínimo → LOOT_MIN", () => {
    expect(rollLoot(seq(0.0, 0.0))).toBe(LOOT_MIN);
  });

  it("bajo la probabilidad, roll máximo → LOOT_MAX", () => {
    expect(rollLoot(seq(0.1, 0.999))).toBe(LOOT_MAX);
  });

  it("el botín siempre cae en el rango [LOOT_MIN, LOOT_MAX]", () => {
    for (let r = 0; r < 1; r += 0.017) {
      const coins = rollLoot(seq(0.0, r));
      expect(coins).toBeGreaterThanOrEqual(LOOT_MIN);
      expect(coins).toBeLessThanOrEqual(LOOT_MAX);
    }
  });
});

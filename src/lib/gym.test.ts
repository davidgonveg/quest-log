import { describe, expect, it } from "vitest";
import { groupEntriesByDay, progressionFor, repsLowerBound, sparklinePoints } from "./gym";

// Semana del lunes 13 al domingo 19 de julio de 2026.
const weekStart = new Date(2026, 6, 13, 0, 0, 0, 0);

const entry = (
  date: Date,
  over: Partial<{ id: string; sets: number; reps: number; weightKg: number | null }> = {},
) => ({ id: "e1", date, sets: 4, reps: 8, weightKg: 60 as number | null, ...over });

describe("groupEntriesByDay", () => {
  it("agrupa las entradas de la semana por día (lunes=0), solo días con sesión", () => {
    const groups = groupEntriesByDay(
      [
        entry(new Date(2026, 6, 13)), // lunes
        entry(new Date(2026, 6, 15), { id: "e2" }), // miércoles
        entry(new Date(2026, 6, 15), { id: "e3" }),
      ],
      weekStart,
    );
    expect(groups.map((g) => g.day)).toEqual([0, 2]);
    expect(groups[0].entries).toHaveLength(1);
    expect(groups[1].entries).toHaveLength(2);
  });

  it("descarta entradas de otras semanas", () => {
    // Viernes de la semana anterior y lunes de la siguiente.
    const groups = groupEntriesByDay(
      [entry(new Date(2026, 6, 10)), entry(new Date(2026, 6, 20), { id: "e2" })],
      weekStart,
    );
    expect(groups).toEqual([]);
  });
});

describe("progressionFor", () => {
  it("una fila por día de sesión con topWeight y volumen, en orden cronológico", () => {
    const rows = progressionFor([
      entry(new Date(2026, 6, 15), { id: "e2", sets: 3, reps: 10, weightKg: 35 }),
      entry(new Date(2026, 6, 8), { weightKg: 57.5 }),
      entry(new Date(2026, 6, 15), { id: "e3", sets: 4, reps: 8, weightKg: 60 }),
    ]);
    expect(rows).toEqual([
      { date: new Date(2026, 6, 8), topWeight: 57.5, volume: 4 * 8 * 57.5 },
      { date: new Date(2026, 6, 15), topWeight: 60, volume: 3 * 10 * 35 + 4 * 8 * 60 },
    ]);
  });

  it("el peso corporal (null) no aporta volumen y deja topWeight null", () => {
    const rows = progressionFor([entry(new Date(2026, 6, 8), { weightKg: null })]);
    expect(rows).toEqual([{ date: new Date(2026, 6, 8), topWeight: null, volume: 0 }]);
  });
});

describe("sparklinePoints", () => {
  it("normaliza los valores al alto y reparte el ancho", () => {
    expect(sparklinePoints([0, 10], 100, 30)).toBe("0,30 100,0");
  });

  it("una serie plana queda a media altura", () => {
    expect(sparklinePoints([5, 5, 5], 100, 30)).toBe("0,15 50,15 100,15");
  });

  it("con un único valor devuelve un punto centrado", () => {
    expect(sparklinePoints([7], 100, 30)).toBe("50,15");
  });

  it("sin valores devuelve cadena vacía", () => {
    expect(sparklinePoints([], 100, 30)).toBe("");
  });
});

describe("repsLowerBound", () => {
  it("toma el primer número del objetivo de reps", () => {
    expect(repsLowerBound("6-8")).toBe(6);
    expect(repsLowerBound("20-30 seg")).toBe(20);
    expect(repsLowerBound("12")).toBe(12);
  });

  it("null o texto sin número devuelven null", () => {
    expect(repsLowerBound(null)).toBeNull();
    expect(repsLowerBound("al fallo")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { isPerfectDay } from "./perfect-day";

const TODAY = 2; // miércoles
const done = (dueDay: number | null) => ({ dueDay, completedAt: new Date() });
const pending = (dueDay: number | null) => ({ dueDay, completedAt: null });

describe("isPerfectDay", () => {
  it("sin tareas → no hay día perfecto", () => {
    expect(isPerfectDay([], TODAY)).toBe(false);
  });

  it("única tarea de hoy hecha → día perfecto", () => {
    expect(isPerfectDay([done(TODAY)], TODAY)).toBe(true);
  });

  it("una tarea de hoy pendiente → no", () => {
    expect(isPerfectDay([done(TODAY), pending(TODAY)], TODAY)).toBe(false);
  });

  it("las de cualquier día (dueDay null) no cuentan", () => {
    expect(isPerfectDay([done(TODAY), pending(null)], TODAY)).toBe(true);
  });

  it("solo tareas sin fecha → no dispara el bonus", () => {
    expect(isPerfectDay([done(null)], TODAY)).toBe(false);
  });

  it("ignora tareas de otros días", () => {
    expect(isPerfectDay([done(TODAY), pending(5)], TODAY)).toBe(true);
  });
});

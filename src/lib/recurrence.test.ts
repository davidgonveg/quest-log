import { describe, expect, it } from "vitest";
import {
  planRecurrence,
  type RecurringGoalTemplate,
  type RecurringTaskTemplate,
} from "./recurrence";

const taskTpl = (over: Partial<RecurringTaskTemplate> = {}): RecurringTaskTemplate => ({
  id: "rt1",
  title: "Entrenamiento A",
  dueDay: 0,
  difficulty: "HARD",
  active: true,
  ...over,
});

const goalTpl = (over: Partial<RecurringGoalTemplate> = {}): RecurringGoalTemplate => ({
  id: "rg1",
  title: "Entrenar 4 días",
  isCritical: true,
  longTermGoalId: "lt1",
  targetDays: null,
  habitDifficulty: null,
  isGym: false,
  active: true,
  tasks: [],
  ...over,
});

const empty = { existingGoalSourceIds: [], existingTaskSourceIds: [] };

describe("planRecurrence", () => {
  it("instancia un objetivo activo con sus tareas y recompensas por dificultad", () => {
    const plan = planRecurrence({
      goals: [goalTpl({ tasks: [taskTpl()] })],
      standaloneTasks: [],
      ...empty,
    });
    expect(plan.goals).toHaveLength(1);
    expect(plan.goals[0]).toMatchObject({
      sourceRecurringId: "rg1",
      title: "Entrenar 4 días",
      isCritical: true,
      longTermGoalId: "lt1",
    });
    expect(plan.goals[0].tasks[0]).toEqual({
      sourceRecurringId: "rt1",
      title: "Entrenamiento A",
      dueDay: 0,
      difficulty: "HARD",
      xpReward: 50,
      coinReward: 30,
    });
  });

  it("es idempotente: un objetivo ya instanciado no genera nada, ni sus tareas", () => {
    const plan = planRecurrence({
      goals: [goalTpl({ tasks: [taskTpl()] })],
      standaloneTasks: [],
      existingGoalSourceIds: ["rg1"],
      existingTaskSourceIds: [],
    });
    expect(plan.goals).toHaveLength(0);
    expect(plan.standaloneTasks).toHaveLength(0);
  });

  it("ignora las plantillas en pausa (objetivo y tarea suelta)", () => {
    const plan = planRecurrence({
      goals: [goalTpl({ active: false, tasks: [taskTpl()] })],
      standaloneTasks: [taskTpl({ id: "rt2", active: false })],
      ...empty,
    });
    expect(plan.goals).toHaveLength(0);
    expect(plan.standaloneTasks).toHaveLength(0);
  });

  it("una tarea de plantilla en pausa no se instancia aunque su objetivo esté activo", () => {
    const plan = planRecurrence({
      goals: [goalTpl({ tasks: [taskTpl(), taskTpl({ id: "rt2", active: false })] })],
      standaloneTasks: [],
      ...empty,
    });
    expect(plan.goals[0].tasks).toHaveLength(1);
    expect(plan.goals[0].tasks[0].sourceRecurringId).toBe("rt1");
  });

  it("instancia tareas sueltas con idempotencia propia", () => {
    const plan = planRecurrence({
      goals: [],
      standaloneTasks: [
        taskTpl({ id: "rt1", title: "Preparar comidas", dueDay: 6, difficulty: "MEDIUM" }),
        taskTpl({ id: "rt2" }),
      ],
      existingGoalSourceIds: [],
      existingTaskSourceIds: ["rt2"],
    });
    expect(plan.standaloneTasks).toHaveLength(1);
    expect(plan.standaloneTasks[0]).toMatchObject({
      sourceRecurringId: "rt1",
      title: "Preparar comidas",
      dueDay: 6,
      xpReward: 25,
      coinReward: 15,
    });
  });

  it("propaga targetDays, habitDifficulty e isGym de los objetivos-hábito", () => {
    const plan = planRecurrence({
      goals: [goalTpl({ targetDays: 4, habitDifficulty: "EASY", isGym: true })],
      standaloneTasks: [],
      ...empty,
    });
    expect(plan.goals[0]).toMatchObject({ targetDays: 4, habitDifficulty: "EASY", isGym: true });
  });

  it("los objetivos normales se instancian con targetDays y habitDifficulty null", () => {
    const plan = planRecurrence({ goals: [goalTpl()], standaloneTasks: [], ...empty });
    expect(plan.goals[0]).toMatchObject({ targetDays: null, habitDifficulty: null });
  });

  it("una habitDifficulty desconocida cae a MEDIUM", () => {
    const plan = planRecurrence({
      goals: [goalTpl({ targetDays: 3, habitDifficulty: "LEGENDARY" })],
      standaloneTasks: [],
      ...empty,
    });
    expect(plan.goals[0].habitDifficulty).toBe("MEDIUM");
  });

  it("una dificultad desconocida cae a MEDIUM", () => {
    const plan = planRecurrence({
      goals: [],
      standaloneTasks: [taskTpl({ difficulty: "LEGENDARY" })],
      ...empty,
    });
    expect(plan.standaloneTasks[0]).toMatchObject({
      difficulty: "MEDIUM",
      xpReward: 25,
      coinReward: 15,
    });
  });
});

import { rewardsForDifficulty, type Difficulty } from "./gamification";

// Plantillas de recurrencia → qué instanciar en una semana concreta.
// Lógica pura (sin BD): la capa Prisma la aplica en week.ts (applyRecurrence).

export interface RecurringTaskTemplate {
  id: string;
  title: string;
  dueDay: number | null;
  difficulty: string;
  active: boolean;
}

export interface RecurringGoalTemplate {
  id: string;
  title: string;
  isCritical: boolean;
  longTermGoalId: string | null;
  active: boolean;
  tasks: RecurringTaskTemplate[];
}

export interface PlannedTask {
  sourceRecurringId: string;
  title: string;
  dueDay: number | null;
  difficulty: Difficulty;
  xpReward: number;
  coinReward: number;
}

export interface PlannedGoal {
  sourceRecurringId: string;
  title: string;
  isCritical: boolean;
  longTermGoalId: string | null;
  tasks: PlannedTask[];
}

export interface RecurrencePlan {
  goals: PlannedGoal[];
  standaloneTasks: PlannedTask[];
}

const DIFFICULTIES: Difficulty[] = ["EASY", "MEDIUM", "HARD"];

function toPlannedTask(t: RecurringTaskTemplate): PlannedTask {
  // La plantilla guarda difficulty como String (SQLite sin enums): saneamos aquí.
  const difficulty = DIFFICULTIES.includes(t.difficulty as Difficulty)
    ? (t.difficulty as Difficulty)
    : "MEDIUM";
  const rewards = rewardsForDifficulty(difficulty);
  return {
    sourceRecurringId: t.id,
    title: t.title,
    dueDay: t.dueDay,
    difficulty,
    xpReward: rewards.xp,
    coinReward: rewards.coins,
  };
}

// Decide qué instancias crear en la semana. Idempotente: una plantilla cuyo
// sourceRecurringId ya figura en la semana no genera nada.
export function planRecurrence(input: {
  goals: RecurringGoalTemplate[];
  standaloneTasks: RecurringTaskTemplate[];
  existingGoalSourceIds: string[];
  existingTaskSourceIds: string[];
}): RecurrencePlan {
  const existingGoals = new Set(input.existingGoalSourceIds);
  const existingTasks = new Set(input.existingTaskSourceIds);

  const goals = input.goals
    .filter((g) => g.active && !existingGoals.has(g.id))
    .map((g) => ({
      sourceRecurringId: g.id,
      title: g.title,
      isCritical: g.isCritical,
      longTermGoalId: g.longTermGoalId,
      tasks: g.tasks.filter((t) => t.active).map(toPlannedTask),
    }));

  const standaloneTasks = input.standaloneTasks
    .filter((t) => t.active && !existingTasks.has(t.id))
    .map(toPlannedTask);

  return { goals, standaloneTasks };
}

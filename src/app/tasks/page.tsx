import Link from "next/link";
import { prisma } from "@/lib/db";
import { ensureCurrentWeek, getStreakInfo } from "@/lib/week";
import { DAY_NAMES, dayIndex } from "@/lib/week-logic";
import type { Difficulty } from "@/lib/gamification";
import { habitItemFrom } from "@/lib/habits";
import { coinsWithStreak } from "@/lib/streak";
import { createTask } from "@/actions/tasks";
import { WeekTasks } from "@/components/tasks/WeekTasks";
import { HabitList } from "@/components/tasks/HabitList";
import type { TaskItemData } from "@/components/tasks/TaskRow";
import { AddDisclosure, Label, PrimaryButton, Select, TextInput } from "@/components/ui/Form";
import { GoalPickerWithRecurring } from "@/components/tasks/GoalPickerWithRecurring";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const week = await ensureCurrentWeek();
  const [tasks, weeklyGoals, habitGoals, streak] = await Promise.all([
    // Sin las tasks-check de hábitos: se ven en su fila de hábito, no sueltas.
    prisma.task.findMany({
      where: {
        weekId: week.id,
        OR: [{ weeklyGoalId: null }, { weeklyGoal: { targetDays: null } }],
      },
      include: { weeklyGoal: { select: { title: true } } },
      orderBy: { title: "asc" },
    }),
    // A los hábitos no se les cuelgan tareas manuales: fuera del selector.
    prisma.weeklyGoal.findMany({
      where: { weekId: week.id, targetDays: null },
      orderBy: { title: "asc" },
    }),
    prisma.weeklyGoal.findMany({
      where: { weekId: week.id, targetDays: { not: null } },
      include: { tasks: { select: { id: true, completedAt: true } } },
      orderBy: { title: "asc" },
    }),
    getStreakInfo(),
  ]);
  const now = new Date();
  const habits = habitGoals.map((g) =>
    habitItemFrom({ ...g, targetDays: g.targetDays as number }, streak.ifCompletedNow, now),
  );

  const items: TaskItemData[] = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    difficulty: t.difficulty as Difficulty,
    xpReward: t.xpReward,
    coinReward: t.coinReward,
    completed: t.completedAt !== null,
    goalTitle: t.weeklyGoal?.title ?? null,
    weeklyGoalId: t.weeklyGoalId,
    dueDay: t.dueDay,
    streakBonus: coinsWithStreak(t.coinReward, streak.ifCompletedNow) - t.coinReward,
  }));

  const assignableGoals = weeklyGoals.map((g) => ({ id: g.id, title: g.title }));

  return (
    <div className="space-y-4">
      <Link href="/" className="inline-flex min-h-11 items-center text-sm text-violet">
        ← Inicio
      </Link>
      <h1 className="font-display text-2xl font-bold">Semana completa</h1>

      <HabitList habits={habits} today={dayIndex(now)} />

      <WeekTasks tasks={items} goals={assignableGoals} />

      <AddDisclosure label="Añadir tarea">
        <form action={createTask} className="space-y-3">
          <Label>
            Tarea
            <TextInput name="title" required placeholder="Ej. Entrenar 45 min" />
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <Label>
              Día
              <Select name="dueDay" defaultValue="">
                <option value="">Cualquier día</option>
                {DAY_NAMES.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </Select>
            </Label>
            <Label>
              Dificultad
              <Select name="difficulty" defaultValue="MEDIUM">
                <option value="EASY">Fácil (+10 XP)</option>
                <option value="MEDIUM">Media (+25 XP)</option>
                <option value="HARD">Difícil (+50 XP)</option>
              </Select>
            </Label>
          </div>
          <GoalPickerWithRecurring
            goals={weeklyGoals.map((g) => ({
              id: g.id,
              title: g.title,
              isRecurring: g.sourceRecurringId !== null,
            }))}
          />
          <PrimaryButton type="submit">Añadir tarea</PrimaryButton>
        </form>
      </AddDisclosure>
    </div>
  );
}

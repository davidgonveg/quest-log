import { prisma } from "@/lib/db";
import { ensureCurrentWeek } from "@/lib/week";
import { DAY_NAMES } from "@/lib/week-logic";
import type { Difficulty } from "@/lib/gamification";
import { createTask } from "@/actions/tasks";
import { WeekTasks } from "@/components/tasks/WeekTasks";
import type { TaskItemData } from "@/components/tasks/TaskRow";
import { AddDisclosure, Label, PrimaryButton, Select, TextInput } from "@/components/ui/Form";
import { GoalPickerWithRecurring } from "@/components/tasks/GoalPickerWithRecurring";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const week = await ensureCurrentWeek();
  const [tasks, weeklyGoals] = await Promise.all([
    prisma.task.findMany({
      where: { weekId: week.id },
      include: { weeklyGoal: { select: { title: true } } },
      orderBy: { title: "asc" },
    }),
    prisma.weeklyGoal.findMany({ where: { weekId: week.id }, orderBy: { title: "asc" } }),
  ]);

  const items: TaskItemData[] = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    difficulty: t.difficulty as Difficulty,
    xpReward: t.xpReward,
    coinReward: t.coinReward,
    completed: t.completedAt !== null,
    goalTitle: t.weeklyGoal?.title ?? null,
    dueDay: t.dueDay,
  }));

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Semana completa</h1>

      <WeekTasks tasks={items} />

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

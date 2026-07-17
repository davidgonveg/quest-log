import { prisma } from "@/lib/db";
import { ensureCurrentWeek, getPendingSummary, getStreakInfo, getUser } from "@/lib/week";
import { dayIndex } from "@/lib/week-logic";
import type { Difficulty } from "@/lib/gamification";
import { habitCheckDays, habitItemFrom, weekCounts } from "@/lib/habits";
import { coinsWithStreak } from "@/lib/streak";
import { PlayerHeader } from "@/components/dashboard/PlayerHeader";
import { WeekProgress } from "@/components/dashboard/WeekProgress";
import { TodayTasks } from "@/components/dashboard/TodayTasks";
import { HabitList } from "@/components/tasks/HabitList";
import type { TaskItemData } from "@/components/tasks/TaskRow";
import { WeekSummary } from "@/components/dashboard/WeekSummary";

// La página depende de la BD y de la fecha actual: nunca prerenderizar.
export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const week = await ensureCurrentWeek();
  const [user, pendingSummary, fullWeek, streak] = await Promise.all([
    getUser(),
    getPendingSummary(),
    prisma.week.findUniqueOrThrow({
      where: { id: week.id },
      include: {
        weeklyGoals: { include: { tasks: { select: { id: true, completedAt: true } } } },
        tasks: { include: { weeklyGoal: { select: { title: true, targetDays: true } } } },
      },
    }),
    getStreakInfo(),
  ]);

  const now = new Date();
  const today = dayIndex(now);
  const daysLeft = 6 - today;

  const habitGoals = fullWeek.weeklyGoals.filter((g) => g.targetDays !== null);
  const habits = habitGoals.map((g) =>
    habitItemFrom({ ...g, targetDays: g.targetDays as number }, streak.ifCompletedNow, now),
  );

  // Las tasks-check de los hábitos no son tareas de la lista: se cuentan
  // a través de su hábito (recortadas a la meta) y nunca se listan sueltas.
  const normalTasks = fullWeek.tasks.filter((t) => t.weeklyGoal?.targetDays == null);
  const counts = weekCounts({
    normalTasks,
    habits: habitGoals.map((g) => ({
      checkDays: habitCheckDays(g.tasks).size,
      targetDays: g.targetDays as number,
    })),
  });
  const donePct = counts.total === 0 ? 0 : Math.round((counts.done / counts.total) * 100);

  const todayTasks: TaskItemData[] = normalTasks
    .filter((t) => t.dueDay === null || t.dueDay === today)
    .sort((a, b) => Number(!!a.completedAt) - Number(!!b.completedAt))
    .map((t) => ({
      id: t.id,
      title: t.title,
      difficulty: t.difficulty as Difficulty,
      xpReward: t.xpReward,
      coinReward: t.coinReward,
      completed: t.completedAt !== null,
      goalTitle: t.weeklyGoal?.title ?? null,
      dueDay: t.dueDay,
      streakBonus: coinsWithStreak(t.coinReward, streak.ifCompletedNow) - t.coinReward,
    }));

  const goals = fullWeek.weeklyGoals.map((g) => ({
    id: g.id,
    title: g.title,
    isCritical: g.isCritical,
    status: g.status,
    done:
      g.targetDays !== null
        ? Math.min(habitCheckDays(g.tasks).size, g.targetDays)
        : g.tasks.filter((t) => t.completedAt).length,
    total: g.targetDays ?? g.tasks.length,
  }));

  return (
    <div className="space-y-4">
      {pendingSummary && (
        <WeekSummary weekId={pendingSummary.weekId} summary={pendingSummary.summary} />
      )}

      <PlayerHeader
        name={user.name}
        xp={user.xp}
        coins={user.coins}
        streak={streak.current}
        lostStreak={streak.lost}
      />

      <WeekProgress
        donePct={donePct}
        doneCount={counts.done}
        totalCount={counts.total}
        daysLeft={daysLeft}
        goals={goals}
      />

      <HabitList habits={habits} today={today} />

      <TodayTasks tasks={todayTasks} today={today} />
    </div>
  );
}

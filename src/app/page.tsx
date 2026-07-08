import { prisma } from "@/lib/db";
import { ensureCurrentWeek, getPendingPenalty, getUser } from "@/lib/week";
import { dayIndex } from "@/lib/week-logic";
import type { Difficulty } from "@/lib/gamification";
import { PlayerHeader } from "@/components/dashboard/PlayerHeader";
import { WeekProgress } from "@/components/dashboard/WeekProgress";
import { TodayTasks } from "@/components/dashboard/TodayTasks";
import type { TaskItemData } from "@/components/tasks/TaskRow";
import { PenaltyBanner } from "@/components/dashboard/PenaltyBanner";

// La página depende de la BD y de la fecha actual: nunca prerenderizar.
export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const week = await ensureCurrentWeek();
  const [user, penaltyWeek, fullWeek] = await Promise.all([
    getUser(),
    getPendingPenalty(),
    prisma.week.findUniqueOrThrow({
      where: { id: week.id },
      include: {
        weeklyGoals: { include: { tasks: { select: { completedAt: true } } } },
        tasks: { include: { weeklyGoal: { select: { title: true } } } },
      },
    }),
  ]);

  const penaltyEntry = penaltyWeek
    ? await prisma.pointsEntry.findFirst({
        where: { reason: "PENALTY", refId: penaltyWeek.id },
      })
    : null;

  const today = dayIndex(new Date());
  const daysLeft = 6 - today;

  const doneCount = fullWeek.tasks.filter((t) => t.completedAt).length;
  const totalCount = fullWeek.tasks.length;
  const donePct = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  const todayTasks: TaskItemData[] = fullWeek.tasks
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
    }));

  const goals = fullWeek.weeklyGoals.map((g) => ({
    id: g.id,
    title: g.title,
    isCritical: g.isCritical,
    status: g.status,
    done: g.tasks.filter((t) => t.completedAt).length,
    total: g.tasks.length,
  }));

  return (
    <div className="space-y-4">
      {penaltyWeek?.penaltyMsg && (
        <PenaltyBanner
          weekId={penaltyWeek.id}
          message={penaltyWeek.penaltyMsg}
          xpLost={Math.abs(penaltyEntry?.xpDelta ?? 0)}
          coinsLost={Math.abs(penaltyEntry?.coinDelta ?? 0)}
        />
      )}

      <PlayerHeader name={user.name} xp={user.xp} coins={user.coins} />

      <WeekProgress
        donePct={donePct}
        doneCount={doneCount}
        totalCount={totalCount}
        daysLeft={daysLeft}
        goals={goals}
      />

      <TodayTasks tasks={todayTasks} />
    </div>
  );
}

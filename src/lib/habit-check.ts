import { prisma } from "./db";
import { levelForXp, rewardsForDifficulty, sanitizeDifficulty } from "./gamification";
import { habitCheckDays, todaysCheck } from "./habits";
import { rollLoot } from "./loot";
import { coinsWithStreak, streakIfCompleted } from "./streak";
import { getUser } from "./week";
import type { ToggleResult } from "@/actions/tasks";

// Crea el check de un hábito para el día de `when` (hoy al marcar, o un día
// pasado de la semana al registrar una sesión de gym olvidada). El check es
// una Task real ya completada con completedAt=`when` (de ahí sale su día);
// las recompensas se conceden ahora, con la racha actual — la racha deriva
// de la fecha del asiento y no se reescribe hacia atrás.
// Devuelve null (sin efecto) si el objetivo no es hábito, la semana está
// cerrada, `when` cae fuera de la semana o ese día ya tiene check.
export async function completeHabitCheck(
  weeklyGoalId: string,
  when: Date,
): Promise<ToggleResult | null> {
  const goal = await prisma.weeklyGoal.findUniqueOrThrow({
    where: { id: weeklyGoalId },
    include: { tasks: true, week: { select: { closedAt: true, startDate: true, endDate: true } } },
  });
  if (goal.targetDays === null || goal.week.closedAt !== null) return null;
  if (when < goal.week.startDate || when > goal.week.endDate || when > new Date()) return null;
  if (todaysCheck(goal.tasks, when) !== null) return null;

  const user = await getUser();
  const difficulty = sanitizeDifficulty(goal.habitDifficulty);
  const rewards = rewardsForDifficulty(difficulty);

  const streakEntries = await prisma.pointsEntry.findMany({
    where: { reason: { in: ["TASK_COMPLETED", "TASK_UNCOMPLETED"] } },
    select: { reason: true, refId: true, createdAt: true },
  });
  const baseCoins = coinsWithStreak(rewards.coins, streakIfCompleted(streakEntries, new Date()));
  const loot = rollLoot(Math.random);
  const levelBefore = levelForXp(user.xp);
  const levelAfter = levelForXp(user.xp + rewards.xp);

  await prisma.$transaction(async (tx) => {
    // El asiento necesita el id de la task-check como refId: se crea dentro.
    const task = await tx.task.create({
      data: {
        weekId: goal.weekId,
        weeklyGoalId: goal.id,
        title: goal.title,
        dueDay: null,
        difficulty,
        xpReward: rewards.xp,
        coinReward: rewards.coins,
        completedAt: when,
      },
    });
    await tx.user.update({
      where: { id: user.id },
      data: { xp: { increment: rewards.xp }, coins: { increment: baseCoins + loot } },
    });
    await tx.pointsEntry.create({
      data: { xpDelta: rewards.xp, coinDelta: baseCoins, reason: "TASK_COMPLETED", refId: task.id },
    });
    if (loot > 0) {
      await tx.pointsEntry.create({
        data: { xpDelta: 0, coinDelta: loot, reason: "LOOT", refId: task.id },
      });
    }
  });

  // Celebrar solo al alcanzar justo la meta (los checks extra no repiten toast).
  const daysAfter = habitCheckDays([...goal.tasks, { completedAt: when }]).size;
  return {
    completed: true,
    loot,
    perfectDay: false,
    levelUp: levelAfter > levelBefore ? levelAfter : null,
    habitCompleted: daysAfter === goal.targetDays,
  };
}

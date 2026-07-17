"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { levelForXp, rewardsForDifficulty, sanitizeDifficulty } from "@/lib/gamification";
import { habitCheckDays, todaysCheck } from "@/lib/habits";
import { rollLoot } from "@/lib/loot";
import { coinsWithStreak, streakIfCompleted } from "@/lib/streak";
import { ensureCurrentWeek, getUser } from "@/lib/week";
import type { ToggleResult } from "@/actions/tasks";

function revalidateHabitPages() {
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/goals");
}

export async function createHabitGoal(formData: FormData): Promise<void> {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const targetDaysRaw = parseInt(String(formData.get("targetDays") ?? ""), 10);
  if (!Number.isInteger(targetDaysRaw) || targetDaysRaw < 1 || targetDaysRaw > 7) return;
  const habitDifficulty = sanitizeDifficulty(String(formData.get("habitDifficulty") ?? ""));
  const longTermGoalId = String(formData.get("longTermGoalId") ?? "") || null;
  const isCritical = formData.get("isCritical") === "on";
  const isGym = formData.get("isGym") === "on";

  const week = await ensureCurrentWeek();
  const data = {
    title,
    isCritical,
    longTermGoalId,
    targetDays: targetDaysRaw,
    habitDifficulty,
    isGym,
  };

  if (formData.get("recurring") === "on") {
    // Plantilla + instancia juntas: si algo falla no queda plantilla huérfana.
    await prisma.$transaction(async (tx) => {
      const tpl = await tx.recurringGoal.create({ data });
      await tx.weeklyGoal.create({
        data: { ...data, weekId: week.id, sourceRecurringId: tpl.id },
      });
    });
  } else {
    await prisma.weeklyGoal.create({ data: { ...data, weekId: week.id } });
  }
  revalidateHabitPages();
}

const sumCoins = (rows: { coinDelta: number }[]) =>
  rows.reduce((s, e) => s + e.coinDelta, 0);

// Marca o desmarca el check de HOY de un hábito. Un check es una Task real ya
// completada (dueDay null: ni bloquea ni dispara el día perfecto), así que
// racha, botín y heatmap funcionan como con cualquier tarea. Solo el check de
// hoy es alterable: rectificar días pasados no tiene camino honesto en el
// ledger de racha. Desmarcar devuelve lo del asiento y borra la task.
export async function toggleHabitCheck(weeklyGoalId: string): Promise<ToggleResult> {
  const noop: ToggleResult = { completed: false, loot: 0, perfectDay: false, levelUp: null };
  const goal = await prisma.weeklyGoal.findUniqueOrThrow({
    where: { id: weeklyGoalId },
    include: { tasks: true, week: { select: { closedAt: true, startDate: true, endDate: true } } },
  });
  const now = new Date();
  if (goal.targetDays === null || goal.week.closedAt !== null) return noop;
  if (now < goal.week.startDate || now > goal.week.endDate) return noop;

  const user = await getUser();
  const existingId = todaysCheck(goal.tasks, now);

  if (existingId) {
    // --- DESMARCAR ---
    const task = goal.tasks.find((t) => t.id === existingId)!;
    const entry = await prisma.pointsEntry.findFirst({
      where: { reason: "TASK_COMPLETED", refId: existingId },
      orderBy: { createdAt: "desc" },
    });
    const lootSum = entry
      ? sumCoins(
          await prisma.pointsEntry.findMany({
            where: { reason: "LOOT", refId: existingId, createdAt: { gte: entry.createdAt } },
            select: { coinDelta: true },
          }),
        )
      : 0;

    // Devoluciones recortadas en cadena al saldo (mismo patrón que toggleTask).
    let availCoins = user.coins;
    const baseXp = -Math.min(user.xp, entry?.xpDelta ?? task.xpReward);
    const baseCoins = -Math.min(availCoins, entry?.coinDelta ?? task.coinReward);
    availCoins += baseCoins;
    const lootCoins = -Math.min(availCoins, lootSum);

    await prisma.$transaction([
      prisma.task.delete({ where: { id: existingId } }),
      prisma.user.update({
        where: { id: user.id },
        data: { xp: { increment: baseXp }, coins: { increment: baseCoins + lootCoins } },
      }),
      prisma.pointsEntry.create({
        data: { xpDelta: baseXp, coinDelta: baseCoins, reason: "TASK_UNCOMPLETED", refId: existingId },
      }),
      ...(lootCoins !== 0
        ? [
            prisma.pointsEntry.create({
              data: { xpDelta: 0, coinDelta: lootCoins, reason: "LOOT", refId: existingId },
            }),
          ]
        : []),
    ]);

    revalidateHabitPages();
    return noop;
  }

  // --- MARCAR ---
  const difficulty = sanitizeDifficulty(goal.habitDifficulty);
  const rewards = rewardsForDifficulty(difficulty);

  const streakEntries = await prisma.pointsEntry.findMany({
    where: { reason: { in: ["TASK_COMPLETED", "TASK_UNCOMPLETED"] } },
    select: { reason: true, refId: true, createdAt: true },
  });
  const baseCoins = coinsWithStreak(rewards.coins, streakIfCompleted(streakEntries, now));
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
        completedAt: now,
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
  const daysAfter = habitCheckDays([...goal.tasks, { completedAt: now }]).size;
  revalidateHabitPages();
  return {
    completed: true,
    loot,
    perfectDay: false,
    levelUp: levelAfter > levelBefore ? levelAfter : null,
    habitCompleted: daysAfter === goal.targetDays,
  };
}

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { rewardsForDifficulty, type Difficulty } from "@/lib/gamification";
import { ensureCurrentWeek, getUser } from "@/lib/week";

const DIFFICULTIES: Difficulty[] = ["EASY", "MEDIUM", "HARD"];

export async function createTask(formData: FormData): Promise<void> {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const rawDifficulty = String(formData.get("difficulty") ?? "MEDIUM") as Difficulty;
  const difficulty = DIFFICULTIES.includes(rawDifficulty) ? rawDifficulty : "MEDIUM";
  const rewards = rewardsForDifficulty(difficulty);
  const dueDayRaw = String(formData.get("dueDay") ?? "");
  const dueDay = dueDayRaw === "" ? null : parseInt(dueDayRaw, 10);
  const weeklyGoalId = String(formData.get("weeklyGoalId") ?? "");

  const week = await ensureCurrentWeek();
  const data = {
    weekId: week.id,
    title,
    difficulty,
    dueDay: dueDay !== null && dueDay >= 0 && dueDay <= 6 ? dueDay : null,
    weeklyGoalId: weeklyGoalId || null,
    xpReward: rewards.xp,
    coinReward: rewards.coins,
  };

  // undefined = sin recurrencia; null = plantilla suelta; string = colgada
  // del objetivo recurrente. Con objetivo no recurrente el flag se ignora
  // (la UI ya oculta el toggle en ese caso).
  let recurringGoalId: string | null | undefined;
  if (formData.get("recurring") === "on") {
    if (!weeklyGoalId) {
      recurringGoalId = null;
    } else {
      const goal = await prisma.weeklyGoal.findUnique({ where: { id: weeklyGoalId } });
      if (goal?.sourceRecurringId) recurringGoalId = goal.sourceRecurringId;
    }
  }

  if (recurringGoalId !== undefined) {
    await prisma.$transaction(async (tx) => {
      const tpl = await tx.recurringTask.create({
        data: { recurringGoalId, title, dueDay: data.dueDay, difficulty },
      });
      await tx.task.create({ data: { ...data, sourceRecurringId: tpl.id } });
    });
  } else {
    await prisma.task.create({ data });
  }
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/goals");
}

export async function deleteTask(taskId: string): Promise<void> {
  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/goals");
}

// Marca o desmarca una tarea. Al completar suma XP/monedas; al desmarcar las
// devuelve (las monedas sin bajar de 0, por si ya se gastaron en la tienda).
export async function toggleTask(taskId: string): Promise<void> {
  const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  const user = await getUser();

  if (task.completedAt) {
    const coinDelta = -Math.min(user.coins, task.coinReward);
    const xpDelta = -Math.min(user.xp, task.xpReward);
    await prisma.$transaction([
      prisma.task.update({ where: { id: taskId }, data: { completedAt: null } }),
      prisma.user.update({
        where: { id: user.id },
        data: { xp: { increment: xpDelta }, coins: { increment: coinDelta } },
      }),
      prisma.pointsEntry.create({
        data: { xpDelta, coinDelta, reason: "TASK_UNCOMPLETED", refId: taskId },
      }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.task.update({ where: { id: taskId }, data: { completedAt: new Date() } }),
      prisma.user.update({
        where: { id: user.id },
        data: { xp: { increment: task.xpReward }, coins: { increment: task.coinReward } },
      }),
      prisma.pointsEntry.create({
        data: {
          xpDelta: task.xpReward,
          coinDelta: task.coinReward,
          reason: "TASK_COMPLETED",
          refId: taskId,
        },
      }),
    ]);
  }

  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/goals");
}

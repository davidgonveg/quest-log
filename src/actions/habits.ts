"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { sanitizeDifficulty } from "@/lib/gamification";
import { completeHabitCheck } from "@/lib/habit-check";
import { todaysCheck } from "@/lib/habits";
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
  const result = await completeHabitCheck(goal.id, now);
  revalidateHabitPages();
  return result ?? noop;
}

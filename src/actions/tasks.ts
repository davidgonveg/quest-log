"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { levelForXp, rewardsForDifficulty, type Difficulty } from "@/lib/gamification";
import { rollLoot } from "@/lib/loot";
import { PERFECT_DAY_BONUS, isPerfectDay } from "@/lib/perfect-day";
import { coinsWithStreak, streakIfCompleted } from "@/lib/streak";
import { dayIndex } from "@/lib/week-logic";
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

// Lo que ocurrió al alternar, para que la UI celebre (botín, día perfecto,
// subida de nivel). Todo lo demás ya lo refleja la revalidación.
export interface ToggleResult {
  completed: boolean;
  loot: number; // monedas de botín concedidas (0 si no cayó)
  perfectDay: boolean; // se cerró el día perfecto en esta acción
  levelUp: number | null; // nuevo nivel de jugador si subió, si no null
}

const perfectDayRefId = (weekId: string, day: number) => `perfect:${weekId}:${day}`;

const sumCoins = (rows: { coinDelta: number }[]) =>
  rows.reduce((s, e) => s + e.coinDelta, 0);

// Marca o desmarca una tarea. Al completar, la racha (incluyendo el día de
// hoy) multiplica las monedas base y el asiento las registra ya multiplicadas;
// además puede caer botín (LOOT) y cerrarse el día perfecto (PERFECT_DAY),
// cada uno con su asiento. Al desmarcar se devuelve fielmente lo que dio cada
// asiento —nunca se recalcula— recortado al saldo para no dejarlo negativo.
export async function toggleTask(taskId: string): Promise<ToggleResult> {
  const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  const user = await getUser();
  const now = new Date();

  if (task.completedAt) {
    const entry = await prisma.pointsEntry.findFirst({
      where: { reason: "TASK_COMPLETED", refId: taskId },
      orderBy: { createdAt: "desc" },
    });

    // Botín concedido en esta misma compleción: asientos LOOT desde entonces.
    const lootSum = entry
      ? sumCoins(
          await prisma.pointsEntry.findMany({
            where: { reason: "LOOT", refId: taskId, createdAt: { gte: entry.createdAt } },
            select: { coinDelta: true },
          }),
        )
      : 0;

    // ¿Rompe esta tarea un día perfecto que sigue vivo en el ledger? Se keyea
    // por el día de vencimiento de la tarea, no por hoy (pudo ser un día pasado).
    let perfectRefund = 0;
    let perfectRefId: string | null = null;
    if (task.dueDay !== null) {
      perfectRefId = perfectDayRefId(task.weekId, task.dueDay);
      const net = sumCoins(
        await prisma.pointsEntry.findMany({
          where: { reason: "PERFECT_DAY", refId: perfectRefId },
          select: { coinDelta: true },
        }),
      );
      if (net > 0) {
        const dayTasks = await prisma.task.findMany({
          where: { weekId: task.weekId, dueDay: task.dueDay },
          select: { id: true, dueDay: true, completedAt: true },
        });
        const afterUndo = dayTasks.map((t) =>
          t.id === taskId ? { ...t, completedAt: null } : t,
        );
        if (!isPerfectDay(afterUndo, task.dueDay)) perfectRefund = net;
      }
    }

    // Devoluciones recortadas en cadena al saldo disponible: aunque coincidan
    // base + botín + día perfecto, las monedas nunca bajan de 0.
    let availXp = user.xp;
    let availCoins = user.coins;
    const baseXp = -Math.min(availXp, entry?.xpDelta ?? task.xpReward);
    const baseCoins = -Math.min(availCoins, entry?.coinDelta ?? task.coinReward);
    availXp += baseXp;
    availCoins += baseCoins;
    const lootCoins = -Math.min(availCoins, lootSum);
    availCoins += lootCoins;
    const perfectCoins = -Math.min(availCoins, perfectRefund);

    await prisma.$transaction([
      prisma.task.update({ where: { id: taskId }, data: { completedAt: null } }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          xp: { increment: baseXp },
          coins: { increment: baseCoins + lootCoins + perfectCoins },
        },
      }),
      prisma.pointsEntry.create({
        data: { xpDelta: baseXp, coinDelta: baseCoins, reason: "TASK_UNCOMPLETED", refId: taskId },
      }),
      ...(lootCoins !== 0
        ? [
            prisma.pointsEntry.create({
              data: { xpDelta: 0, coinDelta: lootCoins, reason: "LOOT", refId: taskId },
            }),
          ]
        : []),
      ...(perfectCoins !== 0 && perfectRefId
        ? [
            prisma.pointsEntry.create({
              data: { xpDelta: 0, coinDelta: perfectCoins, reason: "PERFECT_DAY", refId: perfectRefId },
            }),
          ]
        : []),
    ]);

    revalidatePath("/");
    revalidatePath("/tasks");
    revalidatePath("/goals");
    return { completed: false, loot: 0, perfectDay: false, levelUp: null };
  }

  // --- COMPLETAR ---
  const streakEntries = await prisma.pointsEntry.findMany({
    where: { reason: { in: ["TASK_COMPLETED", "TASK_UNCOMPLETED"] } },
    select: { reason: true, refId: true, createdAt: true },
  });
  const baseCoins = coinsWithStreak(task.coinReward, streakIfCompleted(streakEntries, now));
  const loot = rollLoot(Math.random);

  // Día perfecto: solo al terminar una tarea que vence HOY, y una sola vez
  // (mientras no haya un asiento PERFECT_DAY vivo para el día).
  const today = dayIndex(now);
  let perfectBonus = 0;
  let perfectRefId: string | null = null;
  if (task.dueDay === today) {
    perfectRefId = perfectDayRefId(task.weekId, today);
    const net = sumCoins(
      await prisma.pointsEntry.findMany({
        where: { reason: "PERFECT_DAY", refId: perfectRefId },
        select: { coinDelta: true },
      }),
    );
    if (net <= 0) {
      const dayTasks = await prisma.task.findMany({
        where: { weekId: task.weekId, dueDay: today },
        select: { id: true, dueDay: true, completedAt: true },
      });
      const afterComplete = dayTasks.map((t) =>
        t.id === taskId ? { ...t, completedAt: now } : t,
      );
      if (isPerfectDay(afterComplete, today)) perfectBonus = PERFECT_DAY_BONUS;
    }
  }

  const levelBefore = levelForXp(user.xp);
  const levelAfter = levelForXp(user.xp + task.xpReward);

  await prisma.$transaction([
    prisma.task.update({ where: { id: taskId }, data: { completedAt: now } }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        xp: { increment: task.xpReward },
        coins: { increment: baseCoins + loot + perfectBonus },
      },
    }),
    prisma.pointsEntry.create({
      data: { xpDelta: task.xpReward, coinDelta: baseCoins, reason: "TASK_COMPLETED", refId: taskId },
    }),
    ...(loot > 0
      ? [
          prisma.pointsEntry.create({
            data: { xpDelta: 0, coinDelta: loot, reason: "LOOT", refId: taskId },
          }),
        ]
      : []),
    ...(perfectBonus > 0 && perfectRefId
      ? [
          prisma.pointsEntry.create({
            data: { xpDelta: 0, coinDelta: perfectBonus, reason: "PERFECT_DAY", refId: perfectRefId },
          }),
        ]
      : []),
  ]);

  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/goals");
  return {
    completed: true,
    loot,
    perfectDay: perfectBonus > 0,
    levelUp: levelAfter > levelBefore ? levelAfter : null,
  };
}

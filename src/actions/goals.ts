"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { GOAL_COMPLETION_BONUS_XP } from "@/lib/gamification";
import { ensureCurrentWeek, getUser } from "@/lib/week";

function revalidateGoalPages() {
  revalidatePath("/");
  revalidatePath("/goals");
  revalidatePath("/tasks");
}

export async function createLongTermGoal(formData: FormData): Promise<void> {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  await prisma.longTermGoal.create({
    data: {
      title,
      icon: String(formData.get("icon") ?? "").trim() || null,
      description: String(formData.get("description") ?? "").trim() || null,
    },
  });
  revalidateGoalPages();
}

export async function archiveLongTermGoal(id: string): Promise<void> {
  await prisma.longTermGoal.update({ where: { id }, data: { status: "ARCHIVED" } });
  revalidateGoalPages();
}

// "Conseguido": retira el objetivo a la vitrina con su nivel final.
// Sin recompensa de puntos: el trofeo es la recompensa (y evita farmeo).
export async function completeLongTermGoal(id: string): Promise<void> {
  await prisma.longTermGoal.update({
    where: { id },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
  revalidateGoalPages();
}

export async function createWeeklyGoal(formData: FormData): Promise<void> {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const week = await ensureCurrentWeek();
  const longTermGoalId = String(formData.get("longTermGoalId") ?? "");
  await prisma.weeklyGoal.create({
    data: {
      weekId: week.id,
      title,
      isCritical: formData.get("isCritical") === "on",
      longTermGoalId: longTermGoalId || null,
    },
  });
  revalidateGoalPages();
}

export async function deleteWeeklyGoal(id: string): Promise<void> {
  await prisma.weeklyGoal.delete({ where: { id } });
  revalidateGoalPages();
}

// Cierre manual de un objetivo sin tareas (o que se da por hecho).
// Otorga una recompensa fija por objetivo cumplido. La XP debe coincidir con
// GOAL_COMPLETION_BONUS_XP: goalXpFrom() la asume al calcular niveles de objetivo.
const GOAL_BONUS = { xp: GOAL_COMPLETION_BONUS_XP, coins: 20 };

export async function completeWeeklyGoal(id: string): Promise<void> {
  const goal = await prisma.weeklyGoal.findUniqueOrThrow({ where: { id } });
  if (goal.status !== "ACTIVE") return;
  const user = await getUser();
  await prisma.$transaction([
    prisma.weeklyGoal.update({ where: { id }, data: { status: "COMPLETED" } }),
    prisma.user.update({
      where: { id: user.id },
      data: { xp: { increment: GOAL_BONUS.xp }, coins: { increment: GOAL_BONUS.coins } },
    }),
    prisma.pointsEntry.create({
      data: {
        xpDelta: GOAL_BONUS.xp,
        coinDelta: GOAL_BONUS.coins,
        reason: "GOAL_COMPLETED",
        refId: id,
      },
    }),
  ]);
  revalidateGoalPages();
}

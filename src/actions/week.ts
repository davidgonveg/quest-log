"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { closeWeek, ensureCurrentWeek } from "@/lib/week";

// "Asumido": descarta el banner de penalización del dashboard.
export async function dismissPenalty(weekId: string): Promise<void> {
  await prisma.week.update({ where: { id: weekId }, data: { msgSeen: true } });
  revalidatePath("/");
}

// Cierre manual anticipado de la semana actual (también existe el cierre
// automático perezoso cuando la semana vence).
export async function closeCurrentWeek(): Promise<void> {
  const week = await ensureCurrentWeek();
  await closeWeek(week.id);
  revalidatePath("/");
  revalidatePath("/goals");
  revalidatePath("/settings");
}

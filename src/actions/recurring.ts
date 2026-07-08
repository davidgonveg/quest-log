"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { applyRecurrence, ensureCurrentWeek } from "@/lib/week";

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/goals");
  revalidatePath("/tasks");
}

// Reanudar instancia en la semana en curso (idempotente); pausar no toca
// las instancias ya creadas — si esta semana no se quiere, se borra la normal.
export async function toggleRecurringGoal(id: string): Promise<void> {
  const tpl = await prisma.recurringGoal.findUniqueOrThrow({ where: { id } });
  await prisma.recurringGoal.update({ where: { id }, data: { active: !tpl.active } });
  if (!tpl.active) {
    const week = await ensureCurrentWeek();
    await applyRecurrence(week.id);
  }
  revalidateAll();
}

export async function toggleRecurringTask(id: string): Promise<void> {
  const tpl = await prisma.recurringTask.findUniqueOrThrow({ where: { id } });
  await prisma.recurringTask.update({ where: { id }, data: { active: !tpl.active } });
  if (!tpl.active) {
    const week = await ensureCurrentWeek();
    await applyRecurrence(week.id);
  }
  revalidateAll();
}

// Borra solo la plantilla: las instancias de todas las semanas quedan (SetNull).
export async function deleteRecurringGoal(id: string): Promise<void> {
  await prisma.recurringGoal.delete({ where: { id } });
  revalidateAll();
}

export async function deleteRecurringTask(id: string): Promise<void> {
  await prisma.recurringTask.delete({ where: { id } });
  revalidateAll();
}

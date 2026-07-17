"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { applyRecurrence, ensureCurrentWeek } from "@/lib/week";

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/goals");
  revalidatePath("/tasks");
}

// Editar la meta de días/semana de un hábito recurrente. Aplica también a la
// instancia ACTIVE de la semana en curso (para que el cambio se vea ya); las
// semanas cerradas no se tocan. targetDays fuera de 1-7 se ignora.
export async function updateRecurringHabitDays(id: string, targetDays: number): Promise<void> {
  if (!Number.isInteger(targetDays) || targetDays < 1 || targetDays > 7) return;
  const tpl = await prisma.recurringGoal.findUniqueOrThrow({ where: { id } });
  if (tpl.targetDays === null) return; // solo hábitos
  const week = await ensureCurrentWeek();
  await prisma.$transaction([
    prisma.recurringGoal.update({ where: { id }, data: { targetDays } }),
    prisma.weeklyGoal.updateMany({
      where: { sourceRecurringId: id, weekId: week.id, status: "ACTIVE" },
      data: { targetDays },
    }),
  ]);
  revalidateAll();
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

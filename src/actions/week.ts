"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { closeWeek, ensureCurrentWeek } from "@/lib/week";

// Cierra el resumen "Wrapped" de la semana; marca también el mensaje de
// penalización como visto, ya que va integrado en el propio resumen.
export async function dismissSummary(weekId: string): Promise<void> {
  await prisma.week.update({
    where: { id: weekId },
    data: { summarySeen: true, msgSeen: true },
  });
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

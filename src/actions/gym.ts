"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { completeHabitCheck } from "@/lib/habit-check";
import { ensureCurrentWeek } from "@/lib/week";
import { dayIndex, getWeekBounds } from "@/lib/week-logic";
import type { ToggleResult } from "@/actions/tasks";

// El registro en sí es tracking puro (sin XP, monedas ni ledger), con una
// excepción deliberada: registrar una sesión marca el check de ese día en el
// hábito de gym si aún no lo tenía — apuntar el entreno de ayer cuenta como
// que ayer entrenaste.

export async function createExercise(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const targetSetsRaw = parseInt(String(formData.get("targetSets") ?? ""), 10);
  await prisma.exercise.create({
    data: {
      name,
      muscleGroup: String(formData.get("muscleGroup") ?? "").trim() || null,
      targetSets: Number.isInteger(targetSetsRaw) && targetSetsRaw > 0 ? targetSetsRaw : null,
      targetReps: String(formData.get("targetReps") ?? "").trim() || null,
    },
  });
  revalidatePath("/gym");
}

export async function toggleExerciseArchived(id: string): Promise<void> {
  const exercise = await prisma.exercise.findUniqueOrThrow({ where: { id } });
  await prisma.exercise.update({ where: { id }, data: { archived: !exercise.archived } });
  revalidatePath("/gym");
}

export async function logGymEntry(formData: FormData): Promise<ToggleResult | null> {
  const exerciseId = String(formData.get("exerciseId") ?? "");
  if (!exerciseId) return null;

  // Solo días de la semana actual hasta hoy: no se registra el futuro.
  const now = new Date();
  const today = dayIndex(now);
  const day = parseInt(String(formData.get("day") ?? ""), 10);
  if (!Number.isInteger(day) || day < 0 || day > today) return null;

  const sets = parseInt(String(formData.get("sets") ?? ""), 10);
  const reps = parseInt(String(formData.get("reps") ?? ""), 10);
  if (!Number.isInteger(sets) || sets < 1 || !Number.isInteger(reps) || reps < 1) return null;

  const weightRaw = String(formData.get("weightKg") ?? "").trim().replace(",", ".");
  const weightKg = weightRaw === "" ? null : parseFloat(weightRaw);
  if (weightKg !== null && (!Number.isFinite(weightKg) || weightKg < 0)) return null;

  const { start } = getWeekBounds(now);
  const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + day);

  await prisma.gymEntry.create({
    data: {
      exerciseId,
      date,
      sets,
      reps,
      weightKg,
      note: String(formData.get("note") ?? "").trim() || null,
    },
  });

  // Marcar el día en el hábito de gym (si existe, está activo y ese día aún
  // no tiene check). Para hoy se usa la hora real; para días pasados, mediodía.
  const week = await ensureCurrentWeek();
  const habit = await prisma.weeklyGoal.findFirst({
    where: { weekId: week.id, targetDays: { not: null }, isGym: true, status: "ACTIVE" },
  });
  let result: ToggleResult | null = null;
  if (habit) {
    const when =
      day === today
        ? now
        : new Date(start.getFullYear(), start.getMonth(), start.getDate() + day, 12);
    result = await completeHabitCheck(habit.id, when);
  }

  revalidatePath("/gym");
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/goals");
  return result;
}

// "Editar" en v1 = borrar y volver a registrar: una fila es barata de reescribir.
export async function deleteGymEntry(id: string): Promise<void> {
  await prisma.gymEntry.delete({ where: { id } });
  revalidatePath("/gym");
}

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { dayIndex, getWeekBounds } from "@/lib/week-logic";

// Tracking puro: ninguna action de gym toca XP, monedas ni el ledger
// (el hábito de entrenar ya recompensa el día de gym).

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

export async function logGymEntry(formData: FormData): Promise<void> {
  const exerciseId = String(formData.get("exerciseId") ?? "");
  if (!exerciseId) return;

  // Solo días de la semana actual hasta hoy: no se registra el futuro.
  const now = new Date();
  const today = dayIndex(now);
  const day = parseInt(String(formData.get("day") ?? ""), 10);
  if (!Number.isInteger(day) || day < 0 || day > today) return;

  const sets = parseInt(String(formData.get("sets") ?? ""), 10);
  const reps = parseInt(String(formData.get("reps") ?? ""), 10);
  if (!Number.isInteger(sets) || sets < 1 || !Number.isInteger(reps) || reps < 1) return;

  const weightRaw = String(formData.get("weightKg") ?? "").trim().replace(",", ".");
  const weightKg = weightRaw === "" ? null : parseFloat(weightRaw);
  if (weightKg !== null && (!Number.isFinite(weightKg) || weightKg < 0)) return;

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
  revalidatePath("/gym");
}

// "Editar" en v1 = borrar y volver a registrar: una fila es barata de reescribir.
export async function deleteGymEntry(id: string): Promise<void> {
  await prisma.gymEntry.delete({ where: { id } });
  revalidatePath("/gym");
}

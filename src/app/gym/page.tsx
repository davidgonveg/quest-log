import Link from "next/link";
import { prisma } from "@/lib/db";
import { ensureCurrentWeek } from "@/lib/week";
import { groupEntriesByDay, progressionFor } from "@/lib/gym";
import { dayIndex } from "@/lib/week-logic";
import { createExercise, toggleExerciseArchived } from "@/actions/gym";
import { GymWeek } from "@/components/gym/GymWeek";
import { GymLogForm } from "@/components/gym/GymLogForm";
import { ExerciseProgress } from "@/components/gym/ExerciseProgress";
import { SectionTitle } from "@/components/ui/Card";
import { AddDisclosure, Label, PrimaryButton, TextInput } from "@/components/ui/Form";

export const dynamic = "force-dynamic";

export default async function GymPage() {
  const week = await ensureCurrentWeek();
  const [exercises, weekEntries, allEntries] = await Promise.all([
    prisma.exercise.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.gymEntry.findMany({
      where: { date: { gte: week.startDate, lte: week.endDate } },
      include: { exercise: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.gymEntry.findMany({ orderBy: { date: "asc" } }),
  ]);

  const today = dayIndex(new Date());
  const groups = groupEntriesByDay(weekEntries, week.startDate);
  const available = exercises.filter((e) => !e.archived);
  const progressions = exercises
    .map((e) => ({
      ...e,
      rows: progressionFor(allEntries.filter((en) => en.exerciseId === e.id)),
    }))
    .filter((e) => e.rows.length > 0);

  return (
    <div className="space-y-4">
      <Link href="/goals" className="inline-flex min-h-11 items-center text-sm text-violet">
        ← Objetivos
      </Link>
      <h1 className="font-display text-2xl font-bold">Gimnasio</h1>

      <GymWeek groups={groups} />

      <AddDisclosure label="Registrar sesión">
        {available.length === 0 ? (
          <p className="text-sm text-muted">
            Primero crea un ejercicio en «Gestionar ejercicios», aquí abajo.
          </p>
        ) : (
          <GymLogForm
            exercises={available.map((e) => ({
              id: e.id,
              name: e.name,
              muscleGroup: e.muscleGroup,
              targetSets: e.targetSets,
              targetReps: e.targetReps,
            }))}
            today={today}
          />
        )}
      </AddDisclosure>

      {progressions.length > 0 && (
        <section className="space-y-2">
          <SectionTitle>Progresión</SectionTitle>
          {progressions.map((e) => (
            <ExerciseProgress
              key={e.id}
              name={e.name}
              muscleGroup={e.muscleGroup}
              targetSets={e.targetSets}
              targetReps={e.targetReps}
              rows={e.rows}
            />
          ))}
        </section>
      )}

      <AddDisclosure label="Gestionar ejercicios">
        <div className="space-y-3">
          {exercises.length > 0 && (
            <ul className="divide-y divide-edge">
              {exercises.map((e) => (
                <li key={e.id} className="flex min-h-11 items-center justify-between gap-2">
                  <p className={`min-w-0 truncate text-sm ${e.archived ? "text-muted" : ""}`}>
                    {e.name}
                    {e.muscleGroup && <span className="text-muted"> · {e.muscleGroup}</span>}
                    {e.targetSets != null && (
                      <span className="text-muted">
                        {" "}
                        · {e.targetSets}×{e.targetReps ?? "—"}
                      </span>
                    )}
                  </p>
                  <form action={toggleExerciseArchived.bind(null, e.id)}>
                    <button className="min-h-11 shrink-0 px-2 text-xs font-medium text-violet">
                      {e.archived ? "Reactivar" : "Archivar"}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <form action={createExercise} className="space-y-3">
            <div className="grid grid-cols-[1fr_8rem] gap-3">
              <Label>
                Nombre
                <TextInput name="name" required placeholder="Ej. Press banca" />
              </Label>
              <Label>
                Grupo (opcional)
                <TextInput name="muscleGroup" placeholder="Torso A" />
              </Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Label>
                Series objetivo (opcional)
                <TextInput name="targetSets" type="number" min={1} placeholder="4" />
              </Label>
              <Label>
                Reps objetivo (opcional)
                <TextInput name="targetReps" placeholder="6-8" />
              </Label>
            </div>
            <PrimaryButton type="submit">Crear ejercicio</PrimaryButton>
          </form>
        </div>
      </AddDisclosure>
    </div>
  );
}

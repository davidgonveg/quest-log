import Link from "next/link";
import { prisma } from "@/lib/db";
import { ensureCurrentWeek } from "@/lib/week";
import { groupEntriesByDay, progressionFor } from "@/lib/gym";
import { DAY_NAMES, dayIndex } from "@/lib/week-logic";
import { createExercise, logGymEntry, toggleExerciseArchived } from "@/actions/gym";
import { GymWeek } from "@/components/gym/GymWeek";
import { ExerciseProgress } from "@/components/gym/ExerciseProgress";
import { SectionTitle } from "@/components/ui/Card";
import { AddDisclosure, Label, PrimaryButton, Select, TextInput } from "@/components/ui/Form";

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
          <form action={logGymEntry} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Label>
                Ejercicio
                <Select name="exerciseId" required defaultValue="">
                  <option value="" disabled>
                    Elegir…
                  </option>
                  {available.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </Select>
              </Label>
              <Label>
                Día
                <Select name="day" defaultValue={today}>
                  {DAY_NAMES.slice(0, today + 1).map((d, i) => (
                    <option key={d} value={i}>
                      {i === today ? `Hoy (${d})` : d}
                    </option>
                  ))}
                </Select>
              </Label>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Label>
                Series
                <TextInput name="sets" type="number" min={1} required placeholder="4" />
              </Label>
              <Label>
                Reps
                <TextInput name="reps" type="number" min={1} required placeholder="8" />
              </Label>
              <Label>
                Peso (kg)
                <TextInput name="weightKg" inputMode="decimal" placeholder="60" />
              </Label>
            </div>
            <Label>
              Nota (opcional)
              <TextInput name="note" placeholder="Ej. subí 2,5 kg, PR" />
            </Label>
            <PrimaryButton type="submit">Registrar sesión</PrimaryButton>
          </form>
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
                <TextInput name="muscleGroup" placeholder="Pecho" />
              </Label>
            </div>
            <PrimaryButton type="submit">Crear ejercicio</PrimaryButton>
          </form>
        </div>
      </AddDisclosure>
    </div>
  );
}

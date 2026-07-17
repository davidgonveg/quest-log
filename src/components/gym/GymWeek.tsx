import { deleteGymEntry } from "@/actions/gym";
import { DAY_NAMES } from "@/lib/week-logic";
import { Card, SectionTitle } from "@/components/ui/Card";

export interface GymWeekEntry {
  id: string;
  sets: number;
  reps: number;
  weightKg: number | null;
  note: string | null;
  exercise: { name: string };
}

export function formatWeight(weightKg: number | null): string {
  return weightKg === null ? "corporal" : `${weightKg.toLocaleString("es-ES")} kg`;
}

// Sesiones de la semana en curso, agrupadas por día.
export function GymWeek({ groups }: { groups: { day: number; entries: GymWeekEntry[] }[] }) {
  return (
    <Card className="rise-in">
      <SectionTitle>Esta semana</SectionTitle>
      {groups.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Sin sesiones esta semana.</p>
      ) : (
        <div className="mt-2 space-y-3">
          {groups.map((g) => (
            <div key={g.day}>
              <p className="font-display text-xs font-semibold uppercase text-muted">
                {DAY_NAMES[g.day]}
              </p>
              <ul className="mt-1 divide-y divide-edge">
                {g.entries.map((e) => (
                  <li key={e.id} className="flex min-h-11 items-center justify-between gap-2">
                    <p className="min-w-0 text-sm">
                      <span className="font-medium">{e.exercise.name}</span>
                      <span className="text-muted">
                        {" "}
                        · {e.sets}×{e.reps} · {formatWeight(e.weightKg)}
                      </span>
                      {e.note && <span className="text-muted"> · 📝 {e.note}</span>}
                    </p>
                    <form action={deleteGymEntry.bind(null, e.id)}>
                      <button
                        className="flex h-11 w-8 shrink-0 items-center justify-center text-muted transition-colors hover:text-red active:text-red"
                        aria-label={`Eliminar ${e.exercise.name} ${e.sets}×${e.reps}`}
                      >
                        ✕
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

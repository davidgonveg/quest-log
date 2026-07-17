import {
  deleteRecurringGoal,
  deleteRecurringTask,
  toggleRecurringGoal,
  toggleRecurringTask,
} from "@/actions/recurring";
import { DIFFICULTY_LABELS, type Difficulty } from "@/lib/gamification";
import { DAY_NAMES } from "@/lib/week-logic";
import { Card, SectionTitle } from "@/components/ui/Card";
import { HabitDaysEditor } from "./HabitDaysEditor";

interface TplTask {
  id: string;
  title: string;
  dueDay: number | null;
  difficulty: string;
  active: boolean;
}

interface TplGoal {
  id: string;
  title: string;
  isCritical: boolean;
  targetDays: number | null;
  habitDifficulty: string | null;
  active: boolean;
  longTermGoal: { title: string; icon: string | null } | null;
  tasks: TplTask[];
}

function taskMeta(t: TplTask) {
  const day = t.dueDay !== null ? DAY_NAMES[t.dueDay] : "Cualquier día";
  return `${day} · ${DIFFICULTY_LABELS[t.difficulty as Difficulty] ?? t.difficulty}`;
}

function PauseButton({
  active,
  action,
  title,
}: {
  active: boolean;
  action: () => Promise<void>;
  title: string;
}) {
  return (
    <form action={action}>
      <button
        className="min-h-11 px-2 text-base"
        title={active ? `Pausar ${title}` : `Reanudar ${title}`}
        aria-label={active ? `Pausar ${title}` : `Reanudar ${title}`}
      >
        {active ? "⏸" : "▶"}
      </button>
    </form>
  );
}

function DeleteButton({ action, title }: { action: () => Promise<void>; title: string }) {
  return (
    <form action={action}>
      <button
        className="min-h-11 px-2 text-muted hover:text-red"
        aria-label={`Eliminar recurrencia ${title}`}
      >
        ✕
      </button>
    </form>
  );
}

function PausedBadge() {
  return (
    <span className="hud-chamfer-sm shrink-0 bg-surface-2 px-1.5 py-0.5 font-display text-[10px] font-semibold uppercase text-muted">
      En pausa
    </span>
  );
}

// Plantillas de recurrencia: qué se creará solo cada semana nueva.
// Borrar o pausar aquí nunca toca las instancias de semanas ya creadas.
export function RecurringSection({ goals, tasks }: { goals: TplGoal[]; tasks: TplTask[] }) {
  if (goals.length === 0 && tasks.length === 0) return null;
  return (
    <section className="space-y-3">
      <SectionTitle>🔁 Recurrentes</SectionTitle>
      <p className="text-xs text-muted">
        Se crean solos cada semana nueva. Pausar o borrar no afecta a las semanas pasadas.
      </p>
      {goals.map((g) => (
        <Card key={g.id} className={g.active ? "" : "opacity-60"}>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-medium">
                <span className="truncate">{g.title}</span>
                {!g.active && <PausedBadge />}
              </p>
              <p className="mt-1 text-xs text-muted">
                {g.targetDays !== null
                  ? `Hábito · ${g.targetDays} días/semana · ${
                      DIFFICULTY_LABELS[g.habitDifficulty as Difficulty] ?? "Media"
                    } · `
                  : ""}
                {g.isCritical ? "Crítico · " : ""}
                {g.longTermGoal
                  ? `${g.longTermGoal.icon ? `${g.longTermGoal.icon} ` : ""}${g.longTermGoal.title}`
                  : "Sin objetivo a largo plazo"}
              </p>
            </div>
            <div className="flex shrink-0 items-center">
              <PauseButton
                active={g.active}
                action={toggleRecurringGoal.bind(null, g.id)}
                title={g.title}
              />
              <DeleteButton action={deleteRecurringGoal.bind(null, g.id)} title={g.title} />
            </div>
          </div>
          {g.targetDays !== null && (
            <div className="mt-2 border-t border-edge pt-2">
              <HabitDaysEditor id={g.id} targetDays={g.targetDays} />
            </div>
          )}
          {g.tasks.length > 0 && (
            <ul className="mt-2 space-y-1 border-t border-edge pt-2">
              {g.tasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-xs">
                    {t.title} <span className="text-muted">· {taskMeta(t)}</span>
                  </p>
                  <DeleteButton action={deleteRecurringTask.bind(null, t.id)} title={t.title} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}
      {tasks.map((t) => (
        <Card key={t.id} className={t.active ? "" : "opacity-60"}>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-medium">
                <span className="truncate">{t.title}</span>
                {!t.active && <PausedBadge />}
              </p>
              <p className="mt-1 text-xs text-muted">Tarea suelta · {taskMeta(t)}</p>
            </div>
            <div className="flex shrink-0 items-center">
              <PauseButton
                active={t.active}
                action={toggleRecurringTask.bind(null, t.id)}
                title={t.title}
              />
              <DeleteButton action={deleteRecurringTask.bind(null, t.id)} title={t.title} />
            </div>
          </div>
        </Card>
      ))}
    </section>
  );
}

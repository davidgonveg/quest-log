import { prisma } from "@/lib/db";
import { ensureCurrentWeek } from "@/lib/week";
import { goalXpFrom, levelForXp, levelProgress } from "@/lib/gamification";
import {
  archiveLongTermGoal,
  completeLongTermGoal,
  completeWeeklyGoal,
  createLongTermGoal,
  createWeeklyGoal,
  deleteWeeklyGoal,
} from "@/actions/goals";
import { Card, SectionTitle } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { AddDisclosure, Label, PrimaryButton, Select, TextInput } from "@/components/ui/Form";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  ACTIVE: { text: "En curso", cls: "text-muted" },
  COMPLETED: { text: "✓ Cumplido", cls: "text-green" },
  FAILED: { text: "✕ Fallido", cls: "text-red" },
};

export default async function GoalsPage() {
  // Las tareas de cada weeklyGoal se necesitan para calcular la XP del objetivo.
  const goalInclude = {
    weeklyGoals: {
      select: {
        status: true,
        tasks: { select: { completedAt: true, xpReward: true } },
      },
    },
  } as const;

  const week = await ensureCurrentWeek();
  const [longTerm, trophies, weekly] = await Promise.all([
    prisma.longTermGoal.findMany({
      where: { status: "ACTIVE" },
      include: goalInclude,
      orderBy: { createdAt: "asc" },
    }),
    prisma.longTermGoal.findMany({
      where: { status: "COMPLETED" },
      include: goalInclude,
      orderBy: { completedAt: "desc" },
    }),
    prisma.weeklyGoal.findMany({
      where: { weekId: week.id },
      include: { tasks: { select: { completedAt: true } }, longTermGoal: true },
      orderBy: { isCritical: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Objetivos</h1>

      <section className="space-y-3">
        <SectionTitle>A largo plazo</SectionTitle>
        {longTerm.length === 0 && (
          <p className="text-sm text-muted">
            Define hacia dónde vas: los objetivos semanales colgarán de aquí.
          </p>
        )}
        {longTerm.map((g) => {
          const p = levelProgress(goalXpFrom(g.weeklyGoals));
          const weeksDone = g.weeklyGoals.filter((w) => w.status === "COMPLETED").length;
          return (
            <Card key={g.id} className="rise-in">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-display text-base font-semibold">
                    {g.icon ? `${g.icon} ` : ""}
                    {g.title}
                    <span className="ml-2 text-violet">Nv. {p.level}</span>
                  </p>
                  {g.description && (
                    <p className="mt-0.5 text-xs text-muted">{g.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center">
                  <form action={completeLongTermGoal.bind(null, g.id)}>
                    <button
                      className="min-h-11 px-2 text-xs font-medium text-green"
                      title="Conseguido: retirar a la vitrina con su nivel final"
                    >
                      Conseguido
                    </button>
                  </form>
                  <form action={archiveLongTermGoal.bind(null, g.id)}>
                    <button
                      className="min-h-11 px-2 text-xs text-muted hover:text-red"
                      title="Archivar objetivo (abandono, sin trofeo)"
                    >
                      Archivar
                    </button>
                  </form>
                </div>
              </div>
              <div className="mt-3">
                <ProgressBar pct={p.pct} />
                <p className="mt-1 text-xs text-muted">
                  {p.current}/{p.needed} XP · {weeksDone}{" "}
                  {weeksDone === 1 ? "semana cumplida" : "semanas cumplidas"}
                </p>
              </div>
            </Card>
          );
        })}
        <AddDisclosure label="Nuevo objetivo a largo plazo">
          <form action={createLongTermGoal} className="space-y-3">
            <div className="grid grid-cols-[1fr_4.5rem] gap-3">
              <Label>
                Objetivo
                <TextInput name="title" required placeholder="Ej. Ponerme en forma" />
              </Label>
              <Label>
                Icono
                <TextInput name="icon" placeholder="💪" maxLength={4} />
              </Label>
            </div>
            <Label>
              Descripción (opcional)
              <TextInput name="description" placeholder="¿Qué significa conseguirlo?" />
            </Label>
            <PrimaryButton type="submit">Crear objetivo</PrimaryButton>
          </form>
        </AddDisclosure>
      </section>

      <section className="space-y-3">
        <SectionTitle>Esta semana</SectionTitle>
        {weekly.map((g) => {
          const done = g.tasks.filter((t) => t.completedAt).length;
          const status = STATUS_LABEL[g.status] ?? STATUS_LABEL.ACTIVE;
          return (
            <Card key={g.id} className="rise-in">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {g.isCritical && (
                      <span className="hud-chamfer-sm shrink-0 bg-red-soft px-1.5 py-0.5 font-display text-[10px] font-semibold uppercase text-red">
                        Crítico
                      </span>
                    )}
                    <span className="truncate">{g.title}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {g.longTermGoal ? `${g.longTermGoal.title} · ` : ""}
                    {g.tasks.length > 0
                      ? `${done}/${g.tasks.length} tareas`
                      : "Sin tareas"}{" "}
                    · <span className={status.cls}>{status.text}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center">
                  {g.status === "ACTIVE" && (
                    <form action={completeWeeklyGoal.bind(null, g.id)}>
                      <button
                        className="min-h-11 px-2 text-xs font-medium text-green"
                        title="Marcar como cumplido (+40 XP, +20 monedas)"
                      >
                        Cumplido
                      </button>
                    </form>
                  )}
                  <form action={deleteWeeklyGoal.bind(null, g.id)}>
                    <button
                      className="min-h-11 px-2 text-muted hover:text-red"
                      aria-label={`Eliminar ${g.title}`}
                    >
                      ✕
                    </button>
                  </form>
                </div>
              </div>
            </Card>
          );
        })}
        <AddDisclosure label="Nuevo objetivo semanal">
          <form action={createWeeklyGoal} className="space-y-3">
            <Label>
              Objetivo
              <TextInput name="title" required placeholder="Ej. Entrenar 3 días" />
            </Label>
            <Label>
              Objetivo a largo plazo (opcional)
              <Select name="longTermGoalId" defaultValue="">
                <option value="">Ninguno</option>
                {longTerm.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </Select>
            </Label>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isCritical"
                className="h-5 w-5 accent-[var(--red)]"
              />
              Crítico: si no se cumple, hay penalización
            </label>
            <PrimaryButton type="submit">Crear objetivo semanal</PrimaryButton>
          </form>
        </AddDisclosure>
      </section>

      {trophies.length > 0 && (
        <section className="space-y-3">
          <SectionTitle>🏆 Vitrina</SectionTitle>
          {trophies.map((g) => (
            <Card key={g.id} className="flex items-center justify-between opacity-90">
              <p className="text-sm font-medium">
                {g.icon ? `${g.icon} ` : ""}
                {g.title}
                <span className="ml-2 font-display font-semibold text-violet">
                  Nv. {levelForXp(goalXpFrom(g.weeklyGoals))}
                </span>
              </p>
              <p className="shrink-0 text-xs text-muted">
                {g.completedAt?.toLocaleDateString("es-ES", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}

import { Card, SectionTitle } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface GoalChip {
  id: string;
  title: string;
  isCritical: boolean;
  done: number;
  total: number;
  status: string;
}

export function WeekProgress({
  donePct,
  doneCount,
  totalCount,
  daysLeft,
  goals,
}: {
  donePct: number;
  doneCount: number;
  totalCount: number;
  daysLeft: number;
  goals: GoalChip[];
}) {
  return (
    <Card className="rise-in">
      <div className="flex items-baseline justify-between">
        <SectionTitle>Esta semana</SectionTitle>
        <span className="text-xs text-muted">
          {daysLeft === 0 ? "Último día" : `Quedan ${daysLeft} días`}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <p className="font-display text-3xl font-bold text-violet">{donePct}%</p>
        <div className="flex-1">
          <ProgressBar pct={donePct} />
          <p className="mt-1 text-xs text-muted">
            {doneCount} de {totalCount} tareas completadas
          </p>
        </div>
      </div>

      {goals.length > 0 && (
        <ul className="mt-4 space-y-2">
          {goals.map((g) => {
            const complete = g.status === "COMPLETED" || (g.total > 0 && g.done === g.total);
            return (
              <li
                key={g.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {g.isCritical && (
                    <span
                      className="hud-chamfer-sm shrink-0 bg-red-soft px-1.5 py-0.5 font-display text-[10px] font-semibold uppercase text-red"
                      title="Objetivo crítico: penaliza si no se cumple"
                    >
                      Crítico
                    </span>
                  )}
                  <span className="truncate">{g.title}</span>
                </span>
                <span
                  className={`font-display text-xs font-semibold ${
                    complete ? "text-green" : "text-muted"
                  }`}
                >
                  {complete ? "✓ Hecho" : `${g.done}/${g.total}`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

import { getHistory } from "@/lib/week";
import { Card, SectionTitle } from "@/components/ui/Card";
import { ActivityHeatmap } from "@/components/history/ActivityHeatmap";

// Depende de la BD y de la fecha actual: nunca prerenderizar.
export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" });

export default async function HistoryPage() {
  const { activity, pastWeeks } = await getHistory();

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Historial</h1>

      <Card className="rise-in">
        <SectionTitle>Actividad</SectionTitle>
        <p className="mb-3 mt-1 text-xs text-muted">
          Tareas completadas por día. La constancia se ve de un vistazo.
        </p>
        <ActivityHeatmap activity={activity} />
      </Card>

      <Card className="rise-in">
        <SectionTitle>Semanas cerradas</SectionTitle>
        {pastWeeks.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Aún no hay semanas cerradas. La primera se cerrará sola al terminar el domingo.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-edge">
            {pastWeeks.map((w) => {
              const failed = w.goalsFailed > 0;
              return (
                <li key={w.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {fmt.format(w.startDate)} – {fmt.format(w.endDate)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {w.goalsCompleted} logrados · {w.goalsFailed} fallados · +{w.xpGained} XP
                    </p>
                  </div>
                  <span
                    className={`hud-chamfer-sm px-2 py-1 font-display text-xs font-semibold ${
                      failed ? "bg-red-soft text-red" : "bg-green-soft text-green"
                    }`}
                  >
                    {failed ? "Fallada" : "Limpia"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

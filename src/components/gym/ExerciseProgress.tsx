import { sparklinePoints, type ProgressionRow } from "@/lib/gym";
import { formatWeight } from "./GymWeek";

const W = 260;
const H = 40;

// Progresión de un ejercicio: sparkline del mejor peso por sesión (decorativo,
// sin animación; la lista de sesiones de abajo es la vista accesible).
export function ExerciseProgress({
  name,
  muscleGroup,
  rows,
}: {
  name: string;
  muscleGroup: string | null;
  rows: ProgressionRow[];
}) {
  const series = rows
    .map((r) => r.topWeight)
    .filter((w): w is number => w !== null);
  const points = sparklinePoints(series, W, H);
  const last = points.split(" ").at(-1)?.split(",");

  return (
    <details className="group rounded-lg border border-edge">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 truncate">
          {name}
          {muscleGroup && <span className="text-muted"> · {muscleGroup}</span>}
        </span>
        <span className="shrink-0 text-xs text-muted">
          {rows.length} {rows.length === 1 ? "sesión" : "sesiones"}
        </span>
      </summary>
      <div className="space-y-3 border-t border-edge p-4">
        {series.length >= 2 && (
          <div>
            {/* Margen en el viewBox para que el trazo de 2px no se recorte. */}
            <svg viewBox={`-4 -4 ${W + 8} ${H + 8}`} className="h-12 w-full" aria-hidden>
              <polyline
                points={points}
                fill="none"
                stroke="var(--violet)"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {last && <circle cx={last[0]} cy={last[1]} r="3" fill="var(--violet)" />}
            </svg>
            <p className="mt-1 text-xs text-muted">Mejor peso por sesión</p>
          </div>
        )}
        <ul className="divide-y divide-edge">
          {[...rows].reverse().map((r) => (
            <li key={r.date.getTime()} className="flex min-h-11 items-center justify-between gap-2 text-sm">
              <span className="text-muted">
                {r.date.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
              </span>
              <span>
                {formatWeight(r.topWeight)}
                {r.volume > 0 && (
                  <span className="text-muted"> · {r.volume.toLocaleString("es-ES")} kg vol</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

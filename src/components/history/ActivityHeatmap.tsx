import { intensity } from "@/lib/history";
import { dayNumber } from "@/lib/streak";
import { getWeekBounds } from "@/lib/week-logic";

const WEEKS = 26; // ~medio año visible; se desplaza en horizontal si no cabe
const DAY_INITIALS = ["L", "M", "X", "J", "V", "S", "D"] as const;

// Color por intensidad, siempre vía tokens (0 = sin actividad).
const LEVEL_CLASS = [
  "bg-surface-2",
  "bg-green/25",
  "bg-green/50",
  "bg-green/75",
  "bg-green",
] as const;

// Heatmap estilo GitHub: columnas = semanas, filas = días (lunes arriba).
// Componente de servidor: solo pinta datos ya derivados.
export function ActivityHeatmap({ activity }: { activity: Map<number, number> }) {
  const now = new Date();
  const todayNum = dayNumber(now);
  const monday = getWeekBounds(now).start;
  const first = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - (WEEKS - 1) * 7);

  const columns = Array.from({ length: WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = new Date(first.getFullYear(), first.getMonth(), first.getDate() + w * 7 + d);
      const num = dayNumber(date);
      return { num, future: num > todayNum, count: activity.get(num) ?? 0 };
    }),
  );

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-[3px]">
        <div className="mr-1 flex flex-col gap-[3px]">
          {DAY_INITIALS.map((d) => (
            <span key={d} className="h-2.5 w-3 text-[8px] leading-[10px] text-muted">
              {d}
            </span>
          ))}
        </div>
        {columns.map((col, w) => (
          <div key={w} className="flex flex-col gap-[3px]">
            {col.map((cell) => (
              <span
                key={cell.num}
                title={cell.future ? undefined : `${cell.count} tareas`}
                className={`h-2.5 w-2.5 rounded-[2px] ${
                  cell.future ? "bg-transparent" : LEVEL_CLASS[intensity(cell.count)]
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

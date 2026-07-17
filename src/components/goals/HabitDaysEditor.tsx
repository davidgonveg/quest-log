"use client";

import { useTransition } from "react";
import { updateRecurringHabitDays } from "@/actions/recurring";

// Selector inline para cambiar la meta de días/semana de un hábito recurrente.
// El cambio se guarda al soltar el desplegable (sin botón aparte).
export function HabitDaysEditor({ id, targetDays }: { id: string; targetDays: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <label className="flex items-center gap-1 text-xs text-muted">
      <span>Días/semana</span>
      <select
        defaultValue={targetDays}
        disabled={pending}
        aria-label="Días por semana del hábito"
        onChange={(e) =>
          startTransition(() => updateRecurringHabitDays(id, parseInt(e.target.value, 10)))
        }
        className="min-h-11 rounded-md border border-edge bg-surface-2 px-2 py-1 text-sm text-ink focus:border-violet focus:outline-none disabled:opacity-50"
      >
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );
}

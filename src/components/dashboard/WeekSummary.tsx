"use client";

import { useTransition } from "react";
import { dismissSummary } from "@/actions/week";
import { DAY_NAMES } from "@/lib/week-logic";
import type { WeekSummary as Summary } from "@/lib/week-summary";

// Ritual de cierre de semana: el "Wrapped". Aparece sobre el dashboard tras
// cerrarse una semana y permanece hasta que se descarta. Si la semana falló,
// el mensaje duro va integrado aquí (ya no hay banner aparte).
export function WeekSummary({ weekId, summary }: { weekId: string; summary: Summary }) {
  const [pending, startTransition] = useTransition();
  const failed = summary.criticalsFailed > 0;

  const stats: { label: string; value: string }[] = [
    { label: "XP ganada", value: `+${summary.xpGained}` },
    { label: "Monedas", value: `+${summary.coinsGained} 🪙` },
    { label: "Tareas hechas", value: String(summary.tasksCompleted) },
    {
      label: "Mejor día",
      value: summary.bestDay ? `${DAY_NAMES[summary.bestDay.day]} (${summary.bestDay.count})` : "—",
    },
    { label: "Objetivos logrados", value: String(summary.goalsCompleted) },
    { label: "Objetivos fallados", value: String(summary.goalsFailed) },
  ];

  return (
    <section
      className={`hud-chamfer rise-in border p-4 ${
        failed ? "border-red/40 bg-red-soft" : "border-gold/40 bg-gold-soft"
      }`}
    >
      <p
        className={`font-display text-xs font-bold uppercase tracking-[0.2em] ${
          failed ? "text-red" : "text-gold"
        }`}
      >
        {failed ? "Semana fallida" : "Semana cerrada"}
      </p>
      <p className="mt-1 font-display text-lg font-bold">Resumen de la semana</p>

      <dl className="mt-3 grid grid-cols-2 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="hud-chamfer-sm bg-surface/60 px-3 py-2">
            <dt className="text-xs text-muted">{s.label}</dt>
            <dd className="font-display text-lg font-semibold">{s.value}</dd>
          </div>
        ))}
      </dl>

      {summary.coinsSpent > 0 && (
        <p className="mt-2 text-xs text-muted">Gastaste {summary.coinsSpent} 🪙 en la tienda.</p>
      )}

      {summary.penaltyMessage && (
        <div className="mt-3 border-t border-red/30 pt-3">
          <p className="text-sm leading-relaxed">{summary.penaltyMessage}</p>
          <p className="mt-2 font-display text-sm font-semibold text-red">
            −{summary.xpLost} XP · −{summary.coinsLost} 🪙
          </p>
        </div>
      )}

      <button
        onClick={() => startTransition(() => dismissSummary(weekId))}
        disabled={pending}
        className={`hud-chamfer-sm mt-3 min-h-11 w-full px-4 font-display text-sm font-semibold text-white transition-opacity active:opacity-70 disabled:opacity-50 ${
          failed ? "bg-red" : "bg-gold"
        }`}
      >
        {failed ? "Asumido" : "Cerrar resumen"}
      </button>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { DIFFICULTY_LABELS } from "@/lib/gamification";
import type { HabitItemData } from "@/lib/habits";

const DAY_INITIALS = ["L", "M", "X", "J", "V", "S", "D"] as const;

// Fila de hábito: los 7 días de la semana como puntos, progreso "3/4 días" y
// un único check (el de hoy). Los días pasados son solo lectura: rectificarlos
// no tiene camino honesto en el ledger de racha.
export function HabitRow({
  habit,
  today,
  onToggle,
}: {
  habit: HabitItemData;
  today: number;
  onToggle: (id: string) => void;
}) {
  // Cambia en cada marcado para relanzar el pop del check (como en TaskRow).
  const [burst, setBurst] = useState(0);
  const met = habit.done >= habit.target;

  return (
    <div>
      <button
        onClick={() => {
          if (!habit.checkedToday) setBurst(Date.now());
          onToggle(habit.id);
        }}
        className="flex min-h-14 w-full min-w-0 items-center gap-3 py-2 text-left transition-opacity active:opacity-60"
      >
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-medium">
          <span className="truncate">{habit.title}</span>
          <span
            className={`shrink-0 font-display text-xs font-semibold ${
              met ? "text-green" : "text-muted"
            }`}
          >
            {habit.done}/{habit.target} días
          </span>
        </p>
        <div className="mt-1.5 flex items-center gap-1" aria-hidden>
          {DAY_INITIALS.map((d, i) => (
            <span
              key={d}
              className={`flex h-5 w-5 items-center justify-center rounded-sm font-display text-[9px] font-semibold ${
                habit.days[i]
                  ? "bg-green-soft text-green"
                  : i === today
                    ? "border border-violet text-violet"
                    : "border border-edge text-muted"
              }`}
            >
              {d}
            </span>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted">
          {DIFFICULTY_LABELS[habit.difficulty]} · +{habit.xpReward} XP · +{habit.coinReward} 🪙
          {!habit.checkedToday && habit.streakBonus > 0 && (
            <span className="text-flame"> · 🔥 +{habit.streakBonus}</span>
          )}
        </p>
      </div>
      <span
        key={burst}
        aria-hidden
        className={`hud-chamfer-sm relative flex h-11 w-11 shrink-0 items-center justify-center border text-lg transition-colors ${
          habit.checkedToday
            ? "border-green bg-green-soft text-green"
            : "border-edge bg-surface-2 text-transparent"
        } ${burst > 0 ? "check-pop" : ""}`}
      >
        ✓
        {burst > 0 && (
          <span
            key={`reward-${burst}`}
            aria-hidden
            className="reward-float pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 whitespace-nowrap font-display text-xs font-bold text-gold"
          >
            +{habit.xpReward} XP · +{habit.coinReward + habit.streakBonus} 🪙
          </span>
        )}
      </span>
        <span className="sr-only">
          {habit.checkedToday ? "Desmarcar hoy" : "Completar hoy"} {habit.title}
        </span>
      </button>
      {/* El momento "acabo de entrenar" lleva directo al registro de la sesión. */}
      {habit.isGym && habit.checkedToday && (
        <Link
          href="/gym"
          className="-mt-1 mb-1 inline-flex min-h-11 items-center text-xs font-medium text-violet"
        >
          🏋️ Registrar sesión →
        </Link>
      )}
    </div>
  );
}

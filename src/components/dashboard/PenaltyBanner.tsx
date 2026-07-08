"use client";

import { useTransition } from "react";
import { dismissPenalty } from "@/actions/week";

// Sello de semana fallida: el mensaje duro del cierre + lo que costó.
// Permanece hasta que el usuario lo asume explícitamente.
export function PenaltyBanner({
  weekId,
  message,
  xpLost,
  coinsLost,
}: {
  weekId: string;
  message: string;
  xpLost: number;
  coinsLost: number;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <aside className="hud-chamfer rise-in border border-red/40 bg-red-soft p-4">
      <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-red">
        Semana fallida
      </p>
      <p className="mt-2 text-sm leading-relaxed">{message}</p>
      <div className="mt-3 flex items-center justify-between">
        <p className="font-display text-sm font-semibold text-red">
          −{xpLost} XP · −{coinsLost} 🪙
        </p>
        <button
          onClick={() => startTransition(() => dismissPenalty(weekId))}
          disabled={pending}
          className="hud-chamfer-sm min-h-11 bg-red px-4 font-display text-sm font-semibold text-white transition-opacity active:opacity-70 disabled:opacity-50"
        >
          Asumido
        </button>
      </div>
    </aside>
  );
}

"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { ToggleResult } from "@/actions/tasks";
import { PERFECT_DAY_BONUS } from "@/lib/perfect-day";
import { rankFor } from "@/lib/gamification";

interface Toast {
  id: number;
  text: string;
  tone: "loot" | "perfect";
}

// Contexto imperativo: las listas de tareas llaman a celebrate() con lo que
// devolvió toggleTask. Vive por encima de la app (en el layout) para que el
// overlay y los avisos se dibujen sobre cualquier pantalla.
const CelebrationContext = createContext<(result: ToggleResult) => void>(() => {});

export function useCelebrate() {
  return useContext(CelebrationContext);
}

export function CelebrationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [levelUp, setLevelUp] = useState<number | null>(null);

  const celebrate = useCallback((result: ToggleResult) => {
    if (!result.completed) return;

    const fresh: Toast[] = [];
    if (result.loot > 0) {
      fresh.push({ id: Date.now(), text: `¡Botín! +${result.loot} 🪙`, tone: "loot" });
    }
    if (result.perfectDay) {
      fresh.push({
        id: Date.now() + 1,
        text: `¡Día perfecto! +${PERFECT_DAY_BONUS} 🪙`,
        tone: "perfect",
      });
    }
    if (fresh.length > 0) {
      setToasts((prev) => [...prev, ...fresh]);
      for (const t of fresh) {
        setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 2600);
      }
    }

    if (result.levelUp !== null) {
      setLevelUp(result.levelUp);
      // Vibración solo en móviles que lo soporten; es un guiño, no esencial.
      navigator.vibrate?.([40, 30, 90]);
    }
  }, []);

  return (
    <CelebrationContext.Provider value={celebrate}>
      {children}

      <div className="pointer-events-none fixed inset-x-0 top-4 z-40 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`celebrate-toast hud-chamfer-sm px-4 py-2 font-display text-sm font-semibold shadow-lg ${
              t.tone === "loot" ? "bg-gold-soft text-gold" : "bg-violet-soft text-violet"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>

      {levelUp !== null && (
        <button
          type="button"
          onClick={() => setLevelUp(null)}
          aria-label="Cerrar aviso de subida de nivel"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-bg/85 backdrop-blur-sm"
        >
          <p className="font-display text-sm uppercase tracking-[0.3em] text-muted">
            Subes de nivel
          </p>
          <div className="levelup-badge hud-chamfer flex h-32 w-32 items-center justify-center border-2 border-gold bg-gold-soft">
            <span className="font-display text-6xl font-bold text-gold">{levelUp}</span>
          </div>
          <p className="font-display text-lg font-semibold uppercase tracking-[0.18em] text-gold">
            {rankFor(levelUp).name}
          </p>
          <p className="text-xs text-muted">Toca para continuar</p>
        </button>
      )}
    </CelebrationContext.Provider>
  );
}

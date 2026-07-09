"use client";

import { useState } from "react";
import { DIFFICULTY_LABELS, type Difficulty } from "@/lib/gamification";

// Direcciones fijas de las partículas del fogonazo al marcar (px).
const BURST = [
  [-14, -10], [14, -10], [-16, 6], [16, 6], [0, -18], [0, 16],
] as const;

export interface TaskItemData {
  id: string;
  title: string;
  difficulty: Difficulty;
  xpReward: number;
  coinReward: number;
  completed: boolean;
  goalTitle: string | null;
  dueDay: number | null;
  streakBonus: number; // monedas extra si se completa ahora; 0 sin racha
}

export function TaskRow({
  task,
  onToggle,
  onDelete,
}: {
  task: TaskItemData;
  onToggle: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  // Cambia en cada compleción para relanzar la animación de partículas.
  const [burst, setBurst] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {/* Toda la fila es pulsable; el check queda a la derecha,
          en la zona natural del pulgar. */}
      <button
        onClick={() => {
          if (!task.completed) setBurst(Date.now());
          onToggle(task.id);
        }}
        className="flex min-h-14 w-full min-w-0 flex-1 items-center gap-3 py-2 text-left transition-opacity active:opacity-60"
      >
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-medium transition-colors ${
              task.completed ? "text-muted line-through" : ""
            }`}
          >
            {task.title}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {task.goalTitle ? `${task.goalTitle} · ` : ""}
            {DIFFICULTY_LABELS[task.difficulty]} · +{task.xpReward} XP · +
            {task.coinReward} 🪙
            {!task.completed && task.streakBonus > 0 && (
              <span className="text-flame"> · 🔥 +{task.streakBonus}</span>
            )}
          </p>
        </div>
        <span
          aria-hidden
          className={`hud-chamfer-sm relative flex h-11 w-11 shrink-0 items-center justify-center border text-lg transition-colors ${
            task.completed
              ? "border-green bg-green-soft text-green"
              : "border-edge bg-surface-2 text-transparent"
          }`}
        >
          ✓
          {burst > 0 && (
            <span key={burst} className="pointer-events-none absolute inset-0">
              {BURST.map(([dx, dy], i) => (
                <span
                  key={i}
                  className="check-particle absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-green"
                  style={{ "--dx": `${dx}px`, "--dy": `${dy}px` } as React.CSSProperties}
                />
              ))}
            </span>
          )}
        </span>
        <span className="sr-only">
          {task.completed ? "Desmarcar" : "Completar"} {task.title}
        </span>
      </button>
      {onDelete && (
        <button
          onClick={() => onDelete(task.id)}
          aria-label={`Eliminar ${task.title}`}
          className="flex h-11 w-8 shrink-0 items-center justify-center text-muted transition-colors hover:text-red active:text-red"
        >
          ✕
        </button>
      )}
    </div>
  );
}

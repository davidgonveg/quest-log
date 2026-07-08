"use client";

import { DIFFICULTY_LABELS, type Difficulty } from "@/lib/gamification";

export interface TaskItemData {
  id: string;
  title: string;
  difficulty: Difficulty;
  xpReward: number;
  coinReward: number;
  completed: boolean;
  goalTitle: string | null;
  dueDay: number | null;
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
  return (
    <div className="flex items-center gap-1">
      {/* Toda la fila es pulsable; el check queda a la derecha,
          en la zona natural del pulgar. */}
      <button
        onClick={() => onToggle(task.id)}
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
          </p>
        </div>
        <span
          aria-hidden
          className={`hud-chamfer-sm flex h-11 w-11 shrink-0 items-center justify-center border text-lg transition-colors ${
            task.completed
              ? "border-green bg-green-soft text-green"
              : "border-edge bg-surface-2 text-transparent"
          }`}
        >
          ✓
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

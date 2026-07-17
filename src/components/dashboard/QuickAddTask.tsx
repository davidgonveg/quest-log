"use client";

import { useRef, useState } from "react";
import { createTask } from "@/actions/tasks";
import { Select, TextInput } from "@/components/ui/Form";

export interface GoalOption {
  id: string;
  title: string;
}

// Alta mínima desde el dashboard: solo el título; el resto son valores por
// defecto (vence hoy, dificultad media). Opcionalmente se puede colgar de un
// objetivo semanal desplegando "Más opciones"; para el caso completo (día,
// dificultad) está el formulario de /tasks.
export function QuickAddTask({ today, goals }: { today: number; goals: GoalOption[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [showGoal, setShowGoal] = useState(false);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await createTask(formData);
        formRef.current?.reset();
        setShowGoal(false);
      }}
      className="mt-3 space-y-2"
    >
      <div className="flex gap-2">
        <input type="hidden" name="dueDay" value={today} />
        <input type="hidden" name="difficulty" value="MEDIUM" />
        <TextInput
          name="title"
          required
          placeholder="Tarea rápida para hoy…"
          aria-label="Tarea rápida para hoy"
          className="min-h-11 flex-1"
        />
        <button
          type="submit"
          aria-label="Añadir tarea rápida"
          className="hud-chamfer-sm min-h-11 w-11 shrink-0 bg-violet font-display text-lg font-semibold text-white transition-opacity active:opacity-70"
        >
          ＋
        </button>
      </div>
      {goals.length > 0 &&
        (showGoal ? (
          <Select name="weeklyGoalId" defaultValue="" aria-label="Objetivo semanal">
            <option value="">Sin objetivo</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </Select>
        ) : (
          <button
            type="button"
            onClick={() => setShowGoal(true)}
            className="min-h-11 text-xs text-violet"
          >
            + Asignar a un objetivo
          </button>
        ))}
    </form>
  );
}

"use client";

import { useRef } from "react";
import { updateTask } from "@/actions/tasks";
import { DAY_NAMES } from "@/lib/week-logic";
import { Label, PrimaryButton, Select, TextInput } from "@/components/ui/Form";
import type { TaskItemData } from "./TaskRow";

export interface GoalOption {
  id: string;
  title: string;
}

// Diálogo modal para editar una tarea. La dificultad solo es editable si la
// tarea sigue pendiente: una vez completada, sus recompensas están cobradas y
// cambiarlas descuadraría el ledger (la action también lo ignora).
export function EditTaskDialog({
  task,
  goals,
  onClose,
}: {
  task: TaskItemData;
  goals: GoalOption[];
  onClose: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-bg/80 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="hud-panel w-full max-w-md rounded-t-2xl p-4 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Editar tarea</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-11 w-11 items-center justify-center text-muted hover:text-ink"
          >
            ✕
          </button>
        </div>
        <form
          ref={formRef}
          action={async (formData) => {
            await updateTask(formData);
            onClose();
          }}
          className="space-y-3"
        >
          <input type="hidden" name="taskId" value={task.id} />
          <Label>
            Tarea
            <TextInput name="title" required defaultValue={task.title} />
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <Label>
              Día
              <Select name="dueDay" defaultValue={task.dueDay ?? ""}>
                <option value="">Cualquier día</option>
                {DAY_NAMES.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </Select>
            </Label>
            <Label>
              Dificultad
              <Select
                name="difficulty"
                defaultValue={task.difficulty}
                disabled={task.completed}
                title={task.completed ? "No editable en tareas ya completadas" : undefined}
              >
                <option value="EASY">Fácil (+10 XP)</option>
                <option value="MEDIUM">Media (+25 XP)</option>
                <option value="HARD">Difícil (+50 XP)</option>
              </Select>
            </Label>
          </div>
          <Label>
            Objetivo semanal (opcional)
            <Select name="weeklyGoalId" defaultValue={task.weeklyGoalId ?? ""}>
              <option value="">Sin objetivo</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </Select>
          </Label>
          <PrimaryButton type="submit">Guardar cambios</PrimaryButton>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useRef } from "react";
import { createTask } from "@/actions/tasks";
import { TextInput } from "@/components/ui/Form";

// Alta mínima desde el dashboard: solo el título; el resto son valores por
// defecto (vence hoy, dificultad media, sin objetivo). Para el caso completo
// está el formulario de /tasks.
export function QuickAddTask({ today }: { today: number }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await createTask(formData);
        formRef.current?.reset();
      }}
      className="mt-3 flex gap-2"
    >
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
    </form>
  );
}

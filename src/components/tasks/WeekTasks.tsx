"use client";

import { useState, useOptimistic, useTransition } from "react";
import { deleteTask, toggleTask } from "@/actions/tasks";
import { Card, SectionTitle } from "@/components/ui/Card";
import { useCelebrate } from "@/components/celebration/CelebrationProvider";
import { DAY_NAMES } from "@/lib/week-logic";
import { EditTaskDialog, type GoalOption } from "./EditTaskDialog";
import { TaskRow, type TaskItemData } from "./TaskRow";

// Lista completa de la semana agrupada por día, con toggle, edición y borrado.
export function WeekTasks({ tasks, goals }: { tasks: TaskItemData[]; goals: GoalOption[] }) {
  const celebrate = useCelebrate();
  const [, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useOptimistic(
    tasks,
    (state, action: { type: "toggle" | "delete"; id: string }) =>
      action.type === "delete"
        ? state.filter((t) => t.id !== action.id)
        : state.map((t) =>
            t.id === action.id ? { ...t, completed: !t.completed } : t,
          ),
  );

  const editing = optimistic.find((t) => t.id === editingId) ?? null;

  const groups: { label: string; items: TaskItemData[] }[] = [
    ...DAY_NAMES.map((label, day) => ({
      label,
      items: optimistic.filter((t) => t.dueDay === day),
    })),
    { label: "Cualquier día", items: optimistic.filter((t) => t.dueDay === null) },
  ].filter((g) => g.items.length > 0);

  if (groups.length === 0) {
    return (
      <Card>
        <p className="text-sm text-muted">
          Semana vacía. Añade tu primera tarea abajo.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <Card key={g.label} className="rise-in">
          <SectionTitle>{g.label}</SectionTitle>
          <ul className="mt-1 divide-y divide-edge">
            {g.items.map((t) => (
              <li key={t.id}>
                <TaskRow
                  task={t}
                  onToggle={(id) =>
                    startTransition(async () => {
                      setOptimistic({ type: "toggle", id });
                      celebrate(await toggleTask(id));
                    })
                  }
                  onEdit={(id) => setEditingId(id)}
                  onDelete={(id) =>
                    startTransition(async () => {
                      setOptimistic({ type: "delete", id });
                      await deleteTask(id);
                    })
                  }
                />
              </li>
            ))}
          </ul>
        </Card>
      ))}
      {editing && (
        <EditTaskDialog task={editing} goals={goals} onClose={() => setEditingId(null)} />
      )}
    </div>
  );
}

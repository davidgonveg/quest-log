"use client";

import Link from "next/link";
import { useState, useOptimistic, useTransition } from "react";
import { deleteTask, toggleTask } from "@/actions/tasks";
import { Card, SectionTitle } from "@/components/ui/Card";
import { useCelebrate } from "@/components/celebration/CelebrationProvider";
import { QuickAddTask, type GoalOption } from "@/components/dashboard/QuickAddTask";
import { EditTaskDialog } from "@/components/tasks/EditTaskDialog";
import { TaskRow, type TaskItemData } from "@/components/tasks/TaskRow";

export function TodayTasks({
  tasks,
  today,
  goals,
}: {
  tasks: TaskItemData[];
  today: number;
  goals: GoalOption[];
}) {
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

  return (
    <Card className="rise-in">
      <div className="flex items-baseline justify-between">
        <SectionTitle>Tareas de hoy</SectionTitle>
        <Link href="/tasks" className="text-xs text-violet">
          Ver semana →
        </Link>
      </div>

      {optimistic.length === 0 ? (
        <p className="mt-3 text-sm text-muted">
          Nada para hoy. Apúntala aquí abajo o revisa la semana completa.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-edge">
          {optimistic.map((t) => (
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
      )}

      <QuickAddTask today={today} goals={goals} />

      {editing && (
        <EditTaskDialog task={editing} goals={goals} onClose={() => setEditingId(null)} />
      )}
    </Card>
  );
}

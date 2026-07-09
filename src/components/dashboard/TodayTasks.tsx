"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { toggleTask } from "@/actions/tasks";
import { Card, SectionTitle } from "@/components/ui/Card";
import { useCelebrate } from "@/components/celebration/CelebrationProvider";
import { TaskRow, type TaskItemData } from "@/components/tasks/TaskRow";

export function TodayTasks({ tasks }: { tasks: TaskItemData[] }) {
  const celebrate = useCelebrate();
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(
    tasks,
    (state, taskId: string) =>
      state.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t)),
  );

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
          Nada para hoy. Añade tareas desde la pestaña Objetivos.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-edge">
          {optimistic.map((t) => (
            <li key={t.id}>
              <TaskRow
                task={t}
                onToggle={(id) =>
                  startTransition(async () => {
                    setOptimistic(id);
                    celebrate(await toggleTask(id));
                  })
                }
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

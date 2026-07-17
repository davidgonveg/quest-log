"use client";

import { useOptimistic, useTransition } from "react";
import { toggleHabitCheck } from "@/actions/habits";
import type { HabitItemData } from "@/lib/habits";
import { Card, SectionTitle } from "@/components/ui/Card";
import { useCelebrate } from "@/components/celebration/CelebrationProvider";
import { HabitRow } from "./HabitRow";

// Tarjeta "Hábitos" con toggle optimista del check de hoy.
export function HabitList({ habits, today }: { habits: HabitItemData[]; today: number }) {
  const celebrate = useCelebrate();
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(habits, (state, id: string) =>
    state.map((h) => {
      if (h.id !== id) return h;
      const checked = !h.checkedToday;
      return {
        ...h,
        checkedToday: checked,
        done: h.done + (checked ? 1 : -1),
        days: h.days.map((v, i) => (i === today ? checked : v)),
      };
    }),
  );

  if (optimistic.length === 0) return null;

  return (
    <Card className="rise-in">
      <SectionTitle>Hábitos</SectionTitle>
      <ul className="mt-2 divide-y divide-edge">
        {optimistic.map((h) => (
          <li key={h.id}>
            <HabitRow
              habit={h}
              today={today}
              onToggle={(id) =>
                startTransition(async () => {
                  setOptimistic(id);
                  celebrate(await toggleHabitCheck(id));
                })
              }
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { Label, Select } from "@/components/ui/Form";

interface GoalOption {
  id: string;
  title: string;
  isRecurring: boolean;
}

// El toggle 🔁 solo se muestra sin objetivo o con un objetivo recurrente:
// con uno normal la action lo ignoraría y el usuario creería haber creado
// una recurrencia que no existe.
export function GoalPickerWithRecurring({ goals }: { goals: GoalOption[] }) {
  const [goalId, setGoalId] = useState("");
  const selected = goals.find((g) => g.id === goalId);
  const showRecurring = goalId === "" || selected?.isRecurring === true;
  return (
    <>
      <Label>
        Objetivo semanal (opcional)
        <Select name="weeklyGoalId" value={goalId} onChange={(e) => setGoalId(e.target.value)}>
          <option value="">Sin objetivo</option>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </Select>
      </Label>
      {showRecurring && (
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" name="recurring" className="h-5 w-5 accent-[var(--violet)]" />
          🔁 Repetir cada semana
        </label>
      )}
    </>
  );
}

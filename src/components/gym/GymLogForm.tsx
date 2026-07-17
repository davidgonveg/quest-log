"use client";

import { useRef, useState } from "react";
import { logGymEntry } from "@/actions/gym";
import { repsLowerBound } from "@/lib/gym";
import { DAY_NAMES } from "@/lib/week-logic";
import { Label, PrimaryButton, Select, TextInput } from "@/components/ui/Form";

export interface ExerciseOption {
  id: string;
  name: string;
  muscleGroup: string | null;
  targetSets: number | null;
  targetReps: string | null;
}

// Registro rápido: elegir el ejercicio precarga series y reps con el objetivo
// de la rutina — solo queda poner el peso y guardar.
export function GymLogForm({ exercises, today }: { exercises: ExerciseOption[]; today: number }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [selected, setSelected] = useState<ExerciseOption | null>(null);
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");

  // Selector agrupado por bloque de rutina, en el orden del catálogo.
  const groups = new Map<string, ExerciseOption[]>();
  for (const e of exercises) {
    const key = e.muscleGroup ?? "Otros";
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }

  const pick = (id: string) => {
    const ex = exercises.find((e) => e.id === id) ?? null;
    setSelected(ex);
    setSets(ex?.targetSets?.toString() ?? "");
    setReps(repsLowerBound(ex?.targetReps)?.toString() ?? "");
  };

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await logGymEntry(formData);
        formRef.current?.reset();
        setSelected(null);
        setSets("");
        setReps("");
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-2 gap-3">
        <Label>
          Ejercicio
          <Select
            name="exerciseId"
            required
            value={selected?.id ?? ""}
            onChange={(e) => pick(e.target.value)}
          >
            <option value="" disabled>
              Elegir…
            </option>
            {[...groups.entries()].map(([block, items]) => (
              <optgroup key={block} label={block}>
                {items.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </Label>
        <Label>
          Día
          <Select name="day" defaultValue={today}>
            {DAY_NAMES.slice(0, today + 1).map((d, i) => (
              <option key={d} value={i}>
                {i === today ? `Hoy (${d})` : d}
              </option>
            ))}
          </Select>
        </Label>
      </div>
      {selected?.targetSets != null && (
        <p className="text-xs text-muted">
          Objetivo: {selected.targetSets}×{selected.targetReps ?? "—"}
        </p>
      )}
      <div className="grid grid-cols-3 gap-3">
        <Label>
          Series
          <TextInput
            name="sets"
            type="number"
            min={1}
            required
            placeholder="4"
            value={sets}
            onChange={(e) => setSets(e.target.value)}
          />
        </Label>
        <Label>
          Reps
          <TextInput
            name="reps"
            type="number"
            min={1}
            required
            placeholder="8"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
          />
        </Label>
        <Label>
          Peso (kg)
          <TextInput name="weightKg" inputMode="decimal" placeholder="60" />
        </Label>
      </div>
      <Label>
        Nota (opcional)
        <TextInput name="note" placeholder="Ej. subí 2,5 kg, PR" />
      </Label>
      <PrimaryButton type="submit">Registrar sesión</PrimaryButton>
    </form>
  );
}

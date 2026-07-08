# Recurrencia semanal — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Plantillas de objetivos semanales y tareas recurrentes que se instancian solas al crear cada semana (spec: `docs/superpowers/specs/2026-07-08-recurrencia-semanal-design.md`).

**Architecture:** Dos modelos plantilla (`RecurringGoal`, `RecurringTask`) + columna `sourceRecurringId` en las instancias para idempotencia. Función pura `planRecurrence()` (Vitest) decide qué crear; `applyRecurrence(weekId)` en la capa Prisma la aplica, llamada al crear la semana en `ensureCurrentWeek()` y al crear/reactivar plantillas. UI: toggle "🔁 Repetir cada semana" en los formularios existentes + sección "Recurrentes" en /goals.

**Tech Stack:** Next.js 16 (App Router, Server Actions + RSC), Prisma 6 + SQLite, Tailwind 4, Vitest, Playwright (e2e).

## Global Constraints

- Texto visible por el usuario en **español**; código e identificadores en inglés.
- SQLite sin enums: estados/dificultad como `String` + validación en actions.
- Colores solo vía tokens (`bg-surface`, `text-violet`…), nunca hex sueltos; chaflanes `.hud-chamfer(-sm)` en elementos HUD.
- Zonas táctiles ≥ 44px (`min-h-11`/`min-h-12`).
- Migraciones de Prisma **aditivas** (la BD vive en un volumen Docker).
- Comentarios: el porqué, no el qué.
- Todo movimiento de puntos pasa por el ledger `PointsEntry` (esta feature no mueve puntos: las instancias son tareas/objetivos normales).
- Shell del entorno: PowerShell en Windows (los comandos de abajo funcionan tal cual en PowerShell).

---

### Task 1: Schema y migración

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/*_recurring_templates/` (generada)

**Interfaces:**
- Produces: modelos Prisma `RecurringGoal` (con `tasks`, `instances`), `RecurringTask` (con `instances`), y columnas `WeeklyGoal.sourceRecurringId`, `Task.sourceRecurringId` — nombres exactos usados por Tasks 2-6.

- [ ] **Step 1: Añadir modelos y columnas al schema**

En `prisma/schema.prisma`, añadir a `LongTermGoal` la relación inversa (tras `weeklyGoals WeeklyGoal[]`):

```prisma
  recurringGoals RecurringGoal[]
```

Añadir a `WeeklyGoal` (tras `status`):

```prisma
  sourceRecurringId String? // plantilla origen: idempotencia al instanciar
  sourceRecurring   RecurringGoal? @relation(fields: [sourceRecurringId], references: [id], onDelete: SetNull)
```

Añadir a `Task` (tras `difficulty`):

```prisma
  sourceRecurringId String? // plantilla origen: idempotencia al instanciar
  sourceRecurring   RecurringTask? @relation(fields: [sourceRecurringId], references: [id], onDelete: SetNull)
```

Añadir al final del fichero:

```prisma
// Plantilla de objetivo semanal recurrente. Nunca se muestra como trabajo
// pendiente: cada semana nueva se instancia como WeeklyGoal normal.
// active=false = en pausa (no se instancia, las instancias pasadas quedan).
model RecurringGoal {
  id             String          @id @default(cuid())
  title          String
  isCritical     Boolean         @default(false)
  longTermGoalId String?
  longTermGoal   LongTermGoal?   @relation(fields: [longTermGoalId], references: [id], onDelete: SetNull)
  active         Boolean         @default(true)
  createdAt      DateTime        @default(now())
  tasks          RecurringTask[]
  instances      WeeklyGoal[]
}

// Plantilla de tarea. recurringGoalId null = tarea suelta recurrente.
// active solo se gestiona en sueltas; en tareas de objetivo se borra en su lugar.
model RecurringTask {
  id              String         @id @default(cuid())
  recurringGoalId String?
  recurringGoal   RecurringGoal? @relation(fields: [recurringGoalId], references: [id], onDelete: Cascade)
  title           String
  dueDay          Int? // 0-6 (lunes-domingo), null = cualquier día
  difficulty      String         @default("MEDIUM")
  active          Boolean        @default(true)
  createdAt       DateTime       @default(now())
  instances       Task[]
}
```

- [ ] **Step 2: Generar la migración**

Run: `npx prisma migrate dev --name recurring_templates`
Expected: "Your database is now in sync with your schema" y carpeta nueva en `prisma/migrations/`. La migración solo contiene `CREATE TABLE` y columnas nuevas nullable (aditiva).

- [ ] **Step 3: Comprobar que compila**

Run: `npm run build`
Expected: build OK (el cliente Prisma regenerado expone los modelos nuevos).

- [ ] **Step 4: Commit**

```bash
git add prisma/
git commit -m "feat: modelos de plantillas recurrentes (RecurringGoal/RecurringTask)"
```

---

### Task 2: Lógica pura `planRecurrence` (TDD)

**Files:**
- Create: `src/lib/recurrence.ts`
- Test: `src/lib/recurrence.test.ts`

**Interfaces:**
- Consumes: `rewardsForDifficulty`, `type Difficulty` de `src/lib/gamification.ts`.
- Produces: `planRecurrence(input): RecurrencePlan` y los tipos `RecurringGoalTemplate`, `RecurringTaskTemplate`, `PlannedGoal`, `PlannedTask`, `RecurrencePlan` — usados por Task 3.

- [ ] **Step 1: Escribir los tests (fallan)**

`src/lib/recurrence.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  planRecurrence,
  type RecurringGoalTemplate,
  type RecurringTaskTemplate,
} from "./recurrence";

const taskTpl = (over: Partial<RecurringTaskTemplate> = {}): RecurringTaskTemplate => ({
  id: "rt1",
  title: "Entrenamiento A",
  dueDay: 0,
  difficulty: "HARD",
  active: true,
  ...over,
});

const goalTpl = (over: Partial<RecurringGoalTemplate> = {}): RecurringGoalTemplate => ({
  id: "rg1",
  title: "Entrenar 4 días",
  isCritical: true,
  longTermGoalId: "lt1",
  active: true,
  tasks: [],
  ...over,
});

const empty = { existingGoalSourceIds: [], existingTaskSourceIds: [] };

describe("planRecurrence", () => {
  it("instancia un objetivo activo con sus tareas y recompensas por dificultad", () => {
    const plan = planRecurrence({
      goals: [goalTpl({ tasks: [taskTpl()] })],
      standaloneTasks: [],
      ...empty,
    });
    expect(plan.goals).toHaveLength(1);
    expect(plan.goals[0]).toMatchObject({
      sourceRecurringId: "rg1",
      title: "Entrenar 4 días",
      isCritical: true,
      longTermGoalId: "lt1",
    });
    expect(plan.goals[0].tasks[0]).toEqual({
      sourceRecurringId: "rt1",
      title: "Entrenamiento A",
      dueDay: 0,
      difficulty: "HARD",
      xpReward: 50,
      coinReward: 30,
    });
  });

  it("es idempotente: un objetivo ya instanciado no genera nada, ni sus tareas", () => {
    const plan = planRecurrence({
      goals: [goalTpl({ tasks: [taskTpl()] })],
      standaloneTasks: [],
      existingGoalSourceIds: ["rg1"],
      existingTaskSourceIds: [],
    });
    expect(plan.goals).toHaveLength(0);
    expect(plan.standaloneTasks).toHaveLength(0);
  });

  it("ignora las plantillas en pausa (objetivo y tarea suelta)", () => {
    const plan = planRecurrence({
      goals: [goalTpl({ active: false, tasks: [taskTpl()] })],
      standaloneTasks: [taskTpl({ id: "rt2", active: false })],
      ...empty,
    });
    expect(plan.goals).toHaveLength(0);
    expect(plan.standaloneTasks).toHaveLength(0);
  });

  it("una tarea de plantilla en pausa no se instancia aunque su objetivo esté activo", () => {
    const plan = planRecurrence({
      goals: [goalTpl({ tasks: [taskTpl(), taskTpl({ id: "rt2", active: false })] })],
      standaloneTasks: [],
      ...empty,
    });
    expect(plan.goals[0].tasks).toHaveLength(1);
    expect(plan.goals[0].tasks[0].sourceRecurringId).toBe("rt1");
  });

  it("instancia tareas sueltas con idempotencia propia", () => {
    const plan = planRecurrence({
      goals: [],
      standaloneTasks: [
        taskTpl({ id: "rt1", title: "Preparar comidas", dueDay: 6, difficulty: "MEDIUM" }),
        taskTpl({ id: "rt2" }),
      ],
      existingGoalSourceIds: [],
      existingTaskSourceIds: ["rt2"],
    });
    expect(plan.standaloneTasks).toHaveLength(1);
    expect(plan.standaloneTasks[0]).toMatchObject({
      sourceRecurringId: "rt1",
      title: "Preparar comidas",
      dueDay: 6,
      xpReward: 25,
      coinReward: 15,
    });
  });

  it("una dificultad desconocida cae a MEDIUM", () => {
    const plan = planRecurrence({
      goals: [],
      standaloneTasks: [taskTpl({ difficulty: "LEGENDARY" })],
      ...empty,
    });
    expect(plan.standaloneTasks[0]).toMatchObject({
      difficulty: "MEDIUM",
      xpReward: 25,
      coinReward: 15,
    });
  });
});
```

- [ ] **Step 2: Verificar que fallan**

Run: `npx vitest run src/lib/recurrence.test.ts`
Expected: FAIL — "Cannot find module './recurrence'" (o equivalente).

- [ ] **Step 3: Implementar `src/lib/recurrence.ts`**

```ts
import { rewardsForDifficulty, type Difficulty } from "./gamification";

// Plantillas de recurrencia → qué instanciar en una semana concreta.
// Lógica pura (sin BD): la capa Prisma la aplica en week.ts (applyRecurrence).

export interface RecurringTaskTemplate {
  id: string;
  title: string;
  dueDay: number | null;
  difficulty: string;
  active: boolean;
}

export interface RecurringGoalTemplate {
  id: string;
  title: string;
  isCritical: boolean;
  longTermGoalId: string | null;
  active: boolean;
  tasks: RecurringTaskTemplate[];
}

export interface PlannedTask {
  sourceRecurringId: string;
  title: string;
  dueDay: number | null;
  difficulty: Difficulty;
  xpReward: number;
  coinReward: number;
}

export interface PlannedGoal {
  sourceRecurringId: string;
  title: string;
  isCritical: boolean;
  longTermGoalId: string | null;
  tasks: PlannedTask[];
}

export interface RecurrencePlan {
  goals: PlannedGoal[];
  standaloneTasks: PlannedTask[];
}

const DIFFICULTIES: Difficulty[] = ["EASY", "MEDIUM", "HARD"];

function toPlannedTask(t: RecurringTaskTemplate): PlannedTask {
  // La plantilla guarda difficulty como String (SQLite sin enums): saneamos aquí.
  const difficulty = DIFFICULTIES.includes(t.difficulty as Difficulty)
    ? (t.difficulty as Difficulty)
    : "MEDIUM";
  const rewards = rewardsForDifficulty(difficulty);
  return {
    sourceRecurringId: t.id,
    title: t.title,
    dueDay: t.dueDay,
    difficulty,
    xpReward: rewards.xp,
    coinReward: rewards.coins,
  };
}

// Decide qué instancias crear en la semana. Idempotente: una plantilla cuyo
// sourceRecurringId ya figura en la semana no genera nada.
export function planRecurrence(input: {
  goals: RecurringGoalTemplate[];
  standaloneTasks: RecurringTaskTemplate[];
  existingGoalSourceIds: string[];
  existingTaskSourceIds: string[];
}): RecurrencePlan {
  const existingGoals = new Set(input.existingGoalSourceIds);
  const existingTasks = new Set(input.existingTaskSourceIds);

  const goals = input.goals
    .filter((g) => g.active && !existingGoals.has(g.id))
    .map((g) => ({
      sourceRecurringId: g.id,
      title: g.title,
      isCritical: g.isCritical,
      longTermGoalId: g.longTermGoalId,
      tasks: g.tasks.filter((t) => t.active).map(toPlannedTask),
    }));

  const standaloneTasks = input.standaloneTasks
    .filter((t) => t.active && !existingTasks.has(t.id))
    .map(toPlannedTask);

  return { goals, standaloneTasks };
}
```

- [ ] **Step 4: Verificar que pasan**

Run: `npx vitest run src/lib/recurrence.test.ts`
Expected: 6 tests PASS. Después `npm test` completo: todo verde.

- [ ] **Step 5: Commit**

```bash
git add src/lib/recurrence.ts src/lib/recurrence.test.ts
git commit -m "feat: planRecurrence, lógica pura de instanciación de plantillas"
```

---

### Task 3: `applyRecurrence` y enganche en `ensureCurrentWeek`

**Files:**
- Modify: `src/lib/week.ts`

**Interfaces:**
- Consumes: `planRecurrence` (Task 2), modelos Prisma (Task 1).
- Produces: `applyRecurrence(weekId: string): Promise<void>` exportada de `src/lib/week.ts` — usada por Task 4.

- [ ] **Step 1: Añadir `applyRecurrence` y llamarla al crear la semana**

En `src/lib/week.ts`, añadir el import:

```ts
import { planRecurrence } from "./recurrence";
```

Añadir al final del fichero:

```ts
// Instancia en la semana las plantillas recurrentes activas que aún no estén.
// Idempotente vía sourceRecurringId; se llama al crear la semana y al
// crear/reactivar una plantilla (alta a mitad de semana = instancia inmediata).
export async function applyRecurrence(weekId: string): Promise<void> {
  const [goals, standaloneTasks, existingGoals, existingTasks] = await Promise.all([
    prisma.recurringGoal.findMany({ where: { active: true }, include: { tasks: true } }),
    prisma.recurringTask.findMany({ where: { recurringGoalId: null, active: true } }),
    prisma.weeklyGoal.findMany({
      where: { weekId, sourceRecurringId: { not: null } },
      select: { sourceRecurringId: true },
    }),
    prisma.task.findMany({
      where: { weekId, sourceRecurringId: { not: null } },
      select: { sourceRecurringId: true },
    }),
  ]);

  const plan = planRecurrence({
    goals,
    standaloneTasks,
    existingGoalSourceIds: existingGoals.map((g) => g.sourceRecurringId as string),
    existingTaskSourceIds: existingTasks.map((t) => t.sourceRecurringId as string),
  });
  if (plan.goals.length === 0 && plan.standaloneTasks.length === 0) return;

  await prisma.$transaction([
    ...plan.goals.map((g) =>
      prisma.weeklyGoal.create({
        data: {
          weekId,
          title: g.title,
          isCritical: g.isCritical,
          longTermGoalId: g.longTermGoalId,
          sourceRecurringId: g.sourceRecurringId,
          tasks: {
            create: g.tasks.map((t) => ({
              title: t.title,
              dueDay: t.dueDay,
              difficulty: t.difficulty,
              xpReward: t.xpReward,
              coinReward: t.coinReward,
              sourceRecurringId: t.sourceRecurringId,
              week: { connect: { id: weekId } },
            })),
          },
        },
      }),
    ),
    ...plan.standaloneTasks.map((t) =>
      prisma.task.create({
        data: {
          weekId,
          title: t.title,
          dueDay: t.dueDay,
          difficulty: t.difficulty,
          xpReward: t.xpReward,
          coinReward: t.coinReward,
          sourceRecurringId: t.sourceRecurringId,
        },
      }),
    ),
  ]);
}
```

En `ensureCurrentWeek()`, sustituir la última línea:

```ts
  return prisma.week.create({ data: { startDate: start, endDate: end } });
```

por:

```ts
  const week = await prisma.week.create({ data: { startDate: start, endDate: end } });
  await applyRecurrence(week.id);
  return week;
```

- [ ] **Step 2: Verificar tipos y tests**

Run: `npm run build; npm test`
Expected: build OK, tests verdes (la función es cableado fino; su lógica ya está testeada en Task 2).

- [ ] **Step 3: Commit**

```bash
git add src/lib/week.ts
git commit -m "feat: applyRecurrence puebla la semana nueva desde las plantillas"
```

---

### Task 4: Server actions

**Files:**
- Create: `src/actions/recurring.ts`
- Modify: `src/actions/goals.ts` (función `createWeeklyGoal`)
- Modify: `src/actions/tasks.ts` (función `createTask`)

**Interfaces:**
- Consumes: `applyRecurrence`, `ensureCurrentWeek` de `src/lib/week.ts`.
- Produces: actions `toggleRecurringGoal(id)`, `deleteRecurringGoal(id)`, `toggleRecurringTask(id)`, `deleteRecurringTask(id)` (usadas por Task 5); `createWeeklyGoal` y `createTask` aceptan el campo de formulario `recurring` ("on") — usado por Tasks 5-6.

- [ ] **Step 1: Crear `src/actions/recurring.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { applyRecurrence, ensureCurrentWeek } from "@/lib/week";

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/goals");
  revalidatePath("/tasks");
}

// Reanudar instancia en la semana en curso (idempotente); pausar no toca
// las instancias ya creadas — si esta semana no se quiere, se borra la normal.
export async function toggleRecurringGoal(id: string): Promise<void> {
  const tpl = await prisma.recurringGoal.findUniqueOrThrow({ where: { id } });
  await prisma.recurringGoal.update({ where: { id }, data: { active: !tpl.active } });
  if (!tpl.active) {
    const week = await ensureCurrentWeek();
    await applyRecurrence(week.id);
  }
  revalidateAll();
}

export async function toggleRecurringTask(id: string): Promise<void> {
  const tpl = await prisma.recurringTask.findUniqueOrThrow({ where: { id } });
  await prisma.recurringTask.update({ where: { id }, data: { active: !tpl.active } });
  if (!tpl.active) {
    const week = await ensureCurrentWeek();
    await applyRecurrence(week.id);
  }
  revalidateAll();
}

// Borra solo la plantilla: las instancias de todas las semanas quedan (SetNull).
export async function deleteRecurringGoal(id: string): Promise<void> {
  await prisma.recurringGoal.delete({ where: { id } });
  revalidateAll();
}

export async function deleteRecurringTask(id: string): Promise<void> {
  await prisma.recurringTask.delete({ where: { id } });
  revalidateAll();
}
```

- [ ] **Step 2: Ampliar `createWeeklyGoal` en `src/actions/goals.ts`**

Sustituir el cuerpo actual por:

```ts
export async function createWeeklyGoal(formData: FormData): Promise<void> {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const week = await ensureCurrentWeek();
  const longTermGoalId = String(formData.get("longTermGoalId") ?? "") || null;
  const isCritical = formData.get("isCritical") === "on";

  if (formData.get("recurring") === "on") {
    // Plantilla + instancia juntas: si algo falla no queda plantilla huérfana.
    await prisma.$transaction(async (tx) => {
      const tpl = await tx.recurringGoal.create({
        data: { title, isCritical, longTermGoalId },
      });
      await tx.weeklyGoal.create({
        data: { weekId: week.id, title, isCritical, longTermGoalId, sourceRecurringId: tpl.id },
      });
    });
  } else {
    await prisma.weeklyGoal.create({
      data: { weekId: week.id, title, isCritical, longTermGoalId },
    });
  }
  revalidateGoalPages();
}
```

- [ ] **Step 3: Ampliar `createTask` en `src/actions/tasks.ts`**

Sustituir desde `const week = await ensureCurrentWeek();` hasta el final del `prisma.task.create` por:

```ts
  const week = await ensureCurrentWeek();
  const data = {
    weekId: week.id,
    title,
    difficulty,
    dueDay: dueDay !== null && dueDay >= 0 && dueDay <= 6 ? dueDay : null,
    weeklyGoalId: weeklyGoalId || null,
    xpReward: rewards.xp,
    coinReward: rewards.coins,
  };

  // undefined = sin recurrencia; null = plantilla suelta; string = colgada
  // del objetivo recurrente. Con objetivo no recurrente el flag se ignora
  // (la UI ya oculta el toggle en ese caso).
  let recurringGoalId: string | null | undefined;
  if (formData.get("recurring") === "on") {
    if (!weeklyGoalId) {
      recurringGoalId = null;
    } else {
      const goal = await prisma.weeklyGoal.findUnique({ where: { id: weeklyGoalId } });
      if (goal?.sourceRecurringId) recurringGoalId = goal.sourceRecurringId;
    }
  }

  if (recurringGoalId !== undefined) {
    await prisma.$transaction(async (tx) => {
      const tpl = await tx.recurringTask.create({
        data: { recurringGoalId, title, dueDay: data.dueDay, difficulty },
      });
      await tx.task.create({ data: { ...data, sourceRecurringId: tpl.id } });
    });
  } else {
    await prisma.task.create({ data });
  }
```

(Las tres llamadas a `revalidatePath` del final se mantienen.)

- [ ] **Step 4: Verificar**

Run: `npm run build; npm run lint; npm test`
Expected: todo verde.

- [ ] **Step 5: Commit**

```bash
git add src/actions/recurring.ts src/actions/goals.ts src/actions/tasks.ts
git commit -m "feat: actions de recurrencia (crear con 🔁, pausar/reanudar, borrar)"
```

---

### Task 5: UI en /goals — checkbox 🔁 y sección "Recurrentes"

**Files:**
- Create: `src/components/goals/RecurringSection.tsx`
- Modify: `src/app/goals/page.tsx`

**Interfaces:**
- Consumes: actions de Task 4; `Card`, `SectionTitle` de `src/components/ui/Card.tsx`; `DAY_NAMES` de `src/lib/week-logic.ts`; `DIFFICULTY_LABELS` de `src/lib/gamification.ts`.
- Produces: `RecurringSection({ goals, tasks })` (server component, se autoculta si no hay plantillas).

- [ ] **Step 1: Crear `src/components/goals/RecurringSection.tsx`**

```tsx
import {
  deleteRecurringGoal,
  deleteRecurringTask,
  toggleRecurringGoal,
  toggleRecurringTask,
} from "@/actions/recurring";
import { DIFFICULTY_LABELS, type Difficulty } from "@/lib/gamification";
import { DAY_NAMES } from "@/lib/week-logic";
import { Card, SectionTitle } from "@/components/ui/Card";

interface TplTask {
  id: string;
  title: string;
  dueDay: number | null;
  difficulty: string;
  active: boolean;
}

interface TplGoal {
  id: string;
  title: string;
  isCritical: boolean;
  active: boolean;
  longTermGoal: { title: string; icon: string | null } | null;
  tasks: TplTask[];
}

function taskMeta(t: TplTask) {
  const day = t.dueDay !== null ? DAY_NAMES[t.dueDay] : "Cualquier día";
  return `${day} · ${DIFFICULTY_LABELS[t.difficulty as Difficulty] ?? t.difficulty}`;
}

function PauseButton({
  active,
  action,
  title,
}: {
  active: boolean;
  action: () => Promise<void>;
  title: string;
}) {
  return (
    <form action={action}>
      <button
        className="min-h-11 px-2 text-base"
        title={active ? `Pausar ${title}` : `Reanudar ${title}`}
        aria-label={active ? `Pausar ${title}` : `Reanudar ${title}`}
      >
        {active ? "⏸" : "▶"}
      </button>
    </form>
  );
}

function DeleteButton({ action, title }: { action: () => Promise<void>; title: string }) {
  return (
    <form action={action}>
      <button
        className="min-h-11 px-2 text-muted hover:text-red"
        aria-label={`Eliminar recurrencia ${title}`}
      >
        ✕
      </button>
    </form>
  );
}

function PausedBadge() {
  return (
    <span className="hud-chamfer-sm shrink-0 bg-surface-2 px-1.5 py-0.5 font-display text-[10px] font-semibold uppercase text-muted">
      En pausa
    </span>
  );
}

// Plantillas de recurrencia: qué se creará solo cada semana nueva.
// Borrar o pausar aquí nunca toca las instancias de semanas ya creadas.
export function RecurringSection({ goals, tasks }: { goals: TplGoal[]; tasks: TplTask[] }) {
  if (goals.length === 0 && tasks.length === 0) return null;
  return (
    <section className="space-y-3">
      <SectionTitle>🔁 Recurrentes</SectionTitle>
      <p className="text-xs text-muted">
        Se crean solos cada semana nueva. Pausar o borrar no afecta a las semanas pasadas.
      </p>
      {goals.map((g) => (
        <Card key={g.id} className={g.active ? "" : "opacity-60"}>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-medium">
                <span className="truncate">{g.title}</span>
                {!g.active && <PausedBadge />}
              </p>
              <p className="mt-1 text-xs text-muted">
                {g.isCritical ? "Crítico · " : ""}
                {g.longTermGoal
                  ? `${g.longTermGoal.icon ? `${g.longTermGoal.icon} ` : ""}${g.longTermGoal.title}`
                  : "Sin objetivo a largo plazo"}
              </p>
            </div>
            <div className="flex shrink-0 items-center">
              <PauseButton
                active={g.active}
                action={toggleRecurringGoal.bind(null, g.id)}
                title={g.title}
              />
              <DeleteButton action={deleteRecurringGoal.bind(null, g.id)} title={g.title} />
            </div>
          </div>
          {g.tasks.length > 0 && (
            <ul className="mt-2 space-y-1 border-t border-edge pt-2">
              {g.tasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-xs">
                    {t.title} <span className="text-muted">· {taskMeta(t)}</span>
                  </p>
                  <DeleteButton action={deleteRecurringTask.bind(null, t.id)} title={t.title} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}
      {tasks.map((t) => (
        <Card key={t.id} className={t.active ? "" : "opacity-60"}>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-medium">
                <span className="truncate">{t.title}</span>
                {!t.active && <PausedBadge />}
              </p>
              <p className="mt-1 text-xs text-muted">Tarea suelta · {taskMeta(t)}</p>
            </div>
            <div className="flex shrink-0 items-center">
              <PauseButton
                active={t.active}
                action={toggleRecurringTask.bind(null, t.id)}
                title={t.title}
              />
              <DeleteButton action={deleteRecurringTask.bind(null, t.id)} title={t.title} />
            </div>
          </div>
        </Card>
      ))}
    </section>
  );
}
```

- [ ] **Step 2: Cablear en `src/app/goals/page.tsx`**

Añadir import:

```tsx
import { RecurringSection } from "@/components/goals/RecurringSection";
```

Ampliar el `Promise.all` con dos consultas más (tras la de `weekly`):

```tsx
    prisma.recurringGoal.findMany({
      include: { tasks: true, longTermGoal: { select: { title: true, icon: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.recurringTask.findMany({
      where: { recurringGoalId: null },
      orderBy: { createdAt: "asc" },
    }),
```

y la desestructuración pasa a:

```tsx
  const [longTerm, trophies, weekly, recurringGoals, recurringTasks] = await Promise.all([
```

En el formulario "Nuevo objetivo semanal", añadir tras el checkbox de `isCritical`:

```tsx
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="recurring"
                className="h-5 w-5 accent-[var(--violet)]"
              />
              🔁 Repetir cada semana
            </label>
```

Insertar la sección entre la de "Esta semana" y la Vitrina:

```tsx
      <RecurringSection goals={recurringGoals} tasks={recurringTasks} />
```

- [ ] **Step 3: Verificar**

Run: `npm run build; npm run lint`
Expected: verde. Comprobación manual rápida con `npm run dev`: crear un objetivo semanal con 🔁 → aparece en "Esta semana" **y** en "🔁 Recurrentes"; pausar lo atenúa con badge "En pausa"; borrar la plantilla no borra la instancia.

- [ ] **Step 4: Commit**

```bash
git add src/components/goals/RecurringSection.tsx src/app/goals/page.tsx
git commit -m "feat: sección Recurrentes y toggle 🔁 en objetivos semanales"
```

---

### Task 6: UI en /tasks — toggle 🔁 condicionado al objetivo

**Files:**
- Create: `src/components/tasks/GoalPickerWithRecurring.tsx`
- Modify: `src/app/tasks/page.tsx`

**Interfaces:**
- Consumes: campo `recurring` de `createTask` (Task 4); `Label`, `Select` de `src/components/ui/Form.tsx`.
- Produces: `GoalPickerWithRecurring({ goals })` con `goals: { id, title, isRecurring }[]`.

- [ ] **Step 1: Crear `src/components/tasks/GoalPickerWithRecurring.tsx`**

```tsx
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
```

- [ ] **Step 2: Usarlo en `src/app/tasks/page.tsx`**

Añadir import:

```tsx
import { GoalPickerWithRecurring } from "@/components/tasks/GoalPickerWithRecurring";
```

Sustituir el bloque del selector de objetivo:

```tsx
          <Label>
            Objetivo semanal (opcional)
            <Select name="weeklyGoalId" defaultValue="">
              <option value="">Sin objetivo</option>
              {weeklyGoals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </Select>
          </Label>
```

por:

```tsx
          <GoalPickerWithRecurring
            goals={weeklyGoals.map((g) => ({
              id: g.id,
              title: g.title,
              isRecurring: g.sourceRecurringId !== null,
            }))}
          />
```

- [ ] **Step 3: Verificar**

Run: `npm run build; npm run lint`
Expected: verde. Manual en dev: con "Sin objetivo" el toggle se ve; al elegir un objetivo no recurrente desaparece; con uno recurrente reaparece.

- [ ] **Step 4: Commit**

```bash
git add src/components/tasks/GoalPickerWithRecurring.tsx src/app/tasks/page.tsx
git commit -m "feat: toggle 🔁 en tareas, condicionado al objetivo elegido"
```

---

### Task 7: E2E y verificación en contenedor limpio

**Files:**
- Modify: `scripts/e2e-drive.mjs` (insertar pasos tras el paso 3 actual)
- Docs a seguir: `.claude/skills/verify/SKILL.md`

**Interfaces:**
- Consumes: toda la feature (Tasks 1-6) desplegada en Docker.

- [ ] **Step 1: Añadir pasos e2e**

En `scripts/e2e-drive.mjs`, insertar después del bloque del paso 3 ("Objetivo semanal crítico creado") y antes del paso 4:

```js
  // 3b. Objetivo semanal RECURRENTE (no crítico, para no tocar la penalización
  // del cierre en el paso 8): instancia inmediata + plantilla en "Recurrentes"
  await page.locator("details").evaluateAll((els) => els.forEach((e) => (e.open = true)));
  const rForm = page.locator("form", { has: page.getByRole("button", { name: "Crear objetivo semanal" }) });
  await rForm.getByPlaceholder("Ej. Entrenar 3 días").fill("Leer a diario");
  await rForm.locator("input[name=recurring]").check();
  await rForm.getByRole("button", { name: "Crear objetivo semanal" }).click();
  await page.getByText("🔁 Recurrentes").waitFor({ timeout: 10000 });
  const instanceCount = await page.getByText("Leer a diario").count();
  log(
    instanceCount >= 2 ? "✅" : "❌",
    "Objetivo 🔁 creado: instancia en 'Esta semana' y plantilla en 'Recurrentes'",
  );
  await page.screenshot({ path: `${SHOT_DIR}/06-recurrentes.png` });

  // 3c. Tarea recurrente colgada del objetivo recurrente; de paso, el toggle
  // 🔁 debe ocultarse al elegir un objetivo NO recurrente
  await page.goto(`${BASE}/tasks`, { waitUntil: "networkidle" });
  await page.locator("details").evaluateAll((els) => els.forEach((e) => (e.open = true)));
  const rtForm = page.locator("form", { has: page.getByRole("button", { name: "Añadir tarea" }) });
  await rtForm.locator("select[name=weeklyGoalId]").selectOption({ label: "Entrenar 2 veces" });
  const hiddenToggle = (await rtForm.locator("input[name=recurring]").count()) === 0;
  log(hiddenToggle ? "🔍" : "❌", "El toggle 🔁 se oculta con un objetivo no recurrente");
  await rtForm.getByPlaceholder("Ej. Entrenar 45 min").fill("Leer 20 páginas");
  await rtForm.locator("select[name=weeklyGoalId]").selectOption({ label: "Leer a diario" });
  await rtForm.locator("input[name=recurring]").check();
  await rtForm.getByRole("button", { name: "Añadir tarea" }).click();
  await page.getByText("Leer 20 páginas").first().waitFor({ timeout: 10000 });
  log("✅", "Tarea 🔁 creada colgada del objetivo recurrente");

  // 3d. Tarea suelta recurrente (domingo)
  await page.locator("details").evaluateAll((els) => els.forEach((e) => (e.open = true)));
  await rtForm.getByPlaceholder("Ej. Entrenar 45 min").fill("Preparar comidas");
  await rtForm.locator("select[name=dueDay]").selectOption({ label: "Domingo" });
  await rtForm.locator("input[name=recurring]").check();
  await rtForm.getByRole("button", { name: "Añadir tarea" }).click();
  await page.getByText("Preparar comidas").first().waitFor({ timeout: 10000 });
  log("✅", "Tarea suelta recurrente creada (Preparar comidas, domingo)");

  // 3e. La plantilla de la tarea 🔁 cuelga del objetivo en "Recurrentes";
  // pausar la suelta la atenúa con badge "En pausa"
  await page.goto(`${BASE}/goals`, { waitUntil: "networkidle" });
  const tplTask = await page
    .locator("section", { hasText: "🔁 Recurrentes" })
    .getByText("Leer 20 páginas")
    .count();
  log(tplTask > 0 ? "✅" : "❌", "La plantilla de tarea aparece bajo su objetivo en 'Recurrentes'");
  await page.getByRole("button", { name: "Pausar Preparar comidas" }).click();
  await page.getByText("En pausa").waitFor({ timeout: 10000 });
  log("✅", "Pausar la tarea suelta muestra el badge 'En pausa'");
  await page.screenshot({ path: `${SHOT_DIR}/07-recurrente-pausada.png` });
```

- [ ] **Step 2: Verificación completa según la skill verify**

```bash
docker compose down -v; docker compose up -d --build
node scripts/e2e-drive.mjs
```

Expected: todos los pasos ✅/🔍 (los existentes siguen pasando: el objetivo recurrente no es crítico y no altera la penalización del paso 8). Si el puerto 3000 está ocupado: `Get-NetTCPConnection -LocalPort 3000` y matar el node huérfano.

Nota de trampas (de la skill): abrir `<details>` por JS, no con click; esperar textos que solo existan tras el commit del server action.

- [ ] **Step 3: Commit**

```bash
git add scripts/e2e-drive.mjs
git commit -m "test: e2e de recurrencia (objetivo 🔁, tareas, pausa)"
```

---

### Task 8: Documentación y push

**Files:**
- Modify: `AGENTS.md` (sección "Conceptos de dominio")
- Modify: `docs/roadmap-gamificacion.md` (§1.5 → "Hecho")
- Modify: `.claude/skills/verify/SKILL.md` (línea "Recorre:" del e2e)

**Interfaces:** ninguna (solo docs).

- [ ] **Step 1: AGENTS.md — nuevo concepto de dominio**

Añadir al final de "Conceptos de dominio":

```markdown
- **Recurrencia semanal**: plantillas `RecurringGoal`/`RecurringTask` (tarea
  suelta si `recurringGoalId` es null). `applyRecurrence(weekId)` las instancia
  como objetivos/tareas normales (idempotente vía `sourceRecurringId`) al crear
  la semana en `ensureCurrentWeek()` y al crear/reactivar una plantilla.
  Editar/pausar/borrar una plantilla nunca toca semanas ya creadas. Lógica pura
  en `recurrence.ts`.
```

- [ ] **Step 2: Roadmap — mover 1.5 a Hecho**

En `docs/roadmap-gamificacion.md`, eliminar la sección 1.5 completa (título y viñetas) y añadir bajo "## Hecho":

```markdown
- 2026-07-08 — Objetivos y tareas recurrentes
  (`docs/superpowers/specs/2026-07-08-recurrencia-semanal-design.md`).
```

- [ ] **Step 3: Skill verify — reflejar el recorrido nuevo**

En `.claude/skills/verify/SKILL.md`, ampliar la línea "Recorre: …" añadiendo: "→ objetivo y tareas recurrentes (plantillas, toggle 🔁, pausa)".

- [ ] **Step 4: Commit y push**

```bash
git add AGENTS.md docs/roadmap-gamificacion.md .claude/skills/verify/SKILL.md
git commit -m "docs: recurrencia semanal en AGENTS.md y roadmap a Hecho"
git push
```

(El push publica también los commits de las tareas anteriores.)

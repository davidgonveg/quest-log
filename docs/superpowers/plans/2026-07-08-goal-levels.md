# Niveles por objetivo — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Los objetivos a largo plazo suben de nivel con la XP de sus tareas completadas; "Conseguido" los retira a una vitrina de trofeos con su nivel final.

**Architecture:** XP de objetivo calculada en lectura (función pura en `gamification.ts`, sin columnas nuevas de contador), reutilizando la curva `levelForXp`/`levelProgress` existente. Única migración: `completedAt` en `LongTermGoal`. UI solo en la página Objetivos.

**Tech Stack:** Next.js 16 Server Actions/RSC, Prisma 6 + SQLite, Vitest, Playwright (e2e).

## Global Constraints

- Texto de UI en español; código en inglés.
- Migraciones aditivas (la BD vive en un volumen Docker).
- Nada de hex sueltos: tokens de `globals.css` (`text-violet`, `bg-gold-soft`…).
- Todo movimiento de puntos con asiento en `PointsEntry` (esta feature no crea ninguno: "Conseguido" no da recompensa, decisión del spec).
- Spec: `docs/superpowers/specs/2026-07-08-goal-levels-design.md`.

---

### Task 1: Función pura `goalXpFrom` (TDD)

**Files:**
- Modify: `src/lib/gamification.ts` (añadir al final)
- Test: `src/lib/gamification.test.ts` (añadir describe)

**Interfaces:**
- Consumes: `GOAL_BONUS` no existe en lib (está en actions); definir aquí `GOAL_COMPLETION_BONUS_XP = 40` y reutilizarla desde la action en Task 2.
- Produces: `goalXpFrom(weeklyGoals: { status: string; tasks: { completedAt: Date | null; xpReward: number }[] }[]): number`

- [ ] **Step 1: Test que falla**

```ts
describe("goalXpFrom", () => {
  it("objetivo sin nada = 0 XP (nivel 1)", () => {
    expect(goalXpFrom([])).toBe(0);
  });

  it("suma la xpReward de tareas completadas, ignora las pendientes", () => {
    const weeklyGoals = [
      {
        status: "ACTIVE",
        tasks: [
          { completedAt: new Date(), xpReward: 25 },
          { completedAt: null, xpReward: 50 },
        ],
      },
    ];
    expect(goalXpFrom(weeklyGoals)).toBe(25);
  });

  it("añade 40 XP por cada objetivo semanal COMPLETED", () => {
    const weeklyGoals = [
      { status: "COMPLETED", tasks: [{ completedAt: new Date(), xpReward: 10 }] },
      { status: "FAILED", tasks: [] },
    ];
    expect(goalXpFrom(weeklyGoals)).toBe(50);
  });
});
```

- [ ] **Step 2: `npx vitest run` → FAIL (goalXpFrom no definida)**
- [ ] **Step 3: Implementación mínima**

```ts
export const GOAL_COMPLETION_BONUS_XP = 40;

// XP de un objetivo a largo plazo: se calcula en lectura, nunca se almacena.
// Retroactiva y a prueba de desmarcados: desmarcar una tarea baja el nivel sola.
export function goalXpFrom(
  weeklyGoals: {
    status: string;
    tasks: { completedAt: Date | null; xpReward: number }[];
  }[],
): number {
  return weeklyGoals.reduce(
    (sum, g) =>
      sum +
      (g.status === "COMPLETED" ? GOAL_COMPLETION_BONUS_XP : 0) +
      g.tasks.reduce((s, t) => s + (t.completedAt ? t.xpReward : 0), 0),
    0,
  );
}
```

- [ ] **Step 4: `npx vitest run` → PASS (23 tests)**
- [ ] **Step 5: Commit** `git commit -m "feat: XP calculada por objetivo a largo plazo (goalXpFrom)"`

### Task 2: Migración `completedAt` + action `completeLongTermGoal`

**Files:**
- Modify: `prisma/schema.prisma` (modelo LongTermGoal)
- Modify: `src/actions/goals.ts`

**Interfaces:**
- Consumes: `GOAL_COMPLETION_BONUS_XP` de Task 1 (sustituye a `GOAL_BONUS.xp` local: mantener `GOAL_BONUS` para monedas o dejarlo como está — solo unificar el valor de XP importándolo).
- Produces: `completeLongTermGoal(id: string): Promise<void>` (server action), campo `LongTermGoal.completedAt: DateTime?`.

- [ ] **Step 1: Añadir a `LongTermGoal` en schema.prisma:** `completedAt DateTime?` (bajo `status`).
- [ ] **Step 2: `npx prisma migrate dev --name goal_completed_at` → migración aditiva creada, cliente regenerado.**
- [ ] **Step 3: Action en `src/actions/goals.ts`:**

```ts
// "Conseguido": retira el objetivo a la vitrina con su nivel final.
// Sin recompensa de puntos: el trofeo es la recompensa (y evita farmeo).
export async function completeLongTermGoal(id: string): Promise<void> {
  await prisma.longTermGoal.update({
    where: { id },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
  revalidateGoalPages();
}
```

- [ ] **Step 4: `npm run lint && npm test` → PASS.**
- [ ] **Step 5: Commit** `git commit -m "feat: marcar objetivo a largo plazo como conseguido"`

### Task 3: UI — tarjeta con nivel y vitrina de trofeos

**Files:**
- Modify: `src/app/goals/page.tsx`

**Interfaces:**
- Consumes: `goalXpFrom`, `levelProgress` (gamification), `completeLongTermGoal` (Task 2).
- Produces: nada para tareas posteriores.

- [ ] **Step 1: Ampliar la query** de `longTerm`: `where: { status: "ACTIVE" }` (los COMPLETED van a otra consulta) e `include: { weeklyGoals: { select: { status: true, tasks: { select: { completedAt: true, xpReward: true } } } } }`. Añadir consulta `trophies`: `findMany({ where: { status: "COMPLETED" }, orderBy: { completedAt: "desc" } })` con el mismo include (para el nivel final).
- [ ] **Step 2: Tarjeta de objetivo activo** — sustituir el bloque de progreso por:

```tsx
const xp = goalXpFrom(g.weeklyGoals);
const p = levelProgress(xp);
const weeksDone = g.weeklyGoals.filter((w) => w.status === "COMPLETED").length;
// …
<p className="font-display text-base font-semibold">
  {g.icon ? `${g.icon} ` : ""}{g.title}
  <span className="ml-2 text-violet">Nv. {p.level}</span>
</p>
// barra + pie:
<ProgressBar pct={p.pct} />
<p className="mt-1 text-xs text-muted">
  {p.current}/{p.needed} XP · {weeksDone} semanas cumplidas
</p>
```

Botones: junto a "Archivar", form con `completeLongTermGoal.bind(null, g.id)` y botón "Conseguido" (`text-green`, `min-h-11`).

- [ ] **Step 3: Sección Vitrina** al final de la página, solo si `trophies.length > 0`:

```tsx
<section className="space-y-3">
  <SectionTitle>🏆 Vitrina</SectionTitle>
  {trophies.map((g) => (
    <Card key={g.id} className="flex items-center justify-between opacity-90">
      <p className="text-sm font-medium">
        {g.icon ? `${g.icon} ` : ""}{g.title}
        <span className="ml-2 font-display text-violet">
          Nv. {levelForXp(goalXpFrom(g.weeklyGoals))}
        </span>
      </p>
      <p className="text-xs text-muted">
        {g.completedAt?.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
      </p>
    </Card>
  ))}
</section>
```

- [ ] **Step 4: `npm run lint && npm run build` → PASS. Probar en dev: crear objetivo, completar tarea vinculada → sube XP; "Conseguido" → vitrina.**
- [ ] **Step 5: Commit** `git commit -m "feat: tarjeta de objetivo con nivel y vitrina de trofeos"`

### Task 4: E2E + verificación final + push

**Files:**
- Modify: `scripts/e2e-drive.mjs`

- [ ] **Step 1: Añadir al guion, tras completar la tarea (paso 5):** ir a `/goals` y comprobar que la tarjeta muestra `Nv. 1` con XP > 0 (`10/100 XP`); y al final, pulsar "Conseguido" sobre el objetivo LP y comprobar que aparece la sección "Vitrina".
- [ ] **Step 2: `docker compose down -v && docker compose up -d --build` + `node scripts/e2e-drive.mjs` → todos los pasos ✅/🔍.**
- [ ] **Step 3: Actualizar `AGENTS.md`** (sección Conceptos de dominio): una línea sobre XP por objetivo calculada con `goalXpFrom` y la vitrina.
- [ ] **Step 4: Commit + push** `git commit -m "feat: e2e de niveles por objetivo" && git push`

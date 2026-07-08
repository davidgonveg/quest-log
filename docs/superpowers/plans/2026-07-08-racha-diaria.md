# Racha diaria con multiplicador de monedas — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Racha de días consecutivos con ≥1 tarea completada, derivada del ledger, que multiplica las monedas por tarea (+10 %/día, tope ×2) y se muestra como 🔥 en el header.

**Architecture:** Lógica pura en `src/lib/streak.ts` (patrón `goalXpFrom`: nada almacenado, todo derivado de `PointsEntry` en lectura); `getStreakInfo()` en la capa Prisma (`week.ts`); `toggleTask` escribe el asiento con las monedas ya multiplicadas y al desmarcar devuelve lo del asiento. Spec: `docs/superpowers/specs/2026-07-08-racha-diaria-design.md`.

**Tech Stack:** Next.js 16 App Router (RSC + server actions), Prisma 6 + SQLite, Vitest, Tailwind 4 (tokens en `globals.css`), Playwright e2e.

## Global Constraints

- Texto visible al usuario en **español**; código e identificadores en inglés.
- Colores solo vía tokens (`text-flame`, `bg-flame-soft`…), nunca hex en componentes.
- Todo movimiento de puntos pasa por el ledger `PointsEntry`, en la misma transacción que el saldo.
- La XP **no** se multiplica; solo las monedas.
- Sin columnas nuevas en `schema.prisma` (no hay migración).
- Comentarios: el porqué, no el qué.
- TDD: test primero en `src/lib/streak.test.ts`.

---

### Task 1: Lógica pura de racha (`src/lib/streak.ts`)

**Files:**
- Create: `src/lib/streak.test.ts`
- Create: `src/lib/streak.ts`

**Interfaces:**
- Consumes: nada (módulo puro, sin BD).
- Produces:
  - `interface StreakLedgerEntry { reason: string; refId: string | null; createdAt: Date }`
  - `interface StreakInfo { current: number; lost: number }`
  - `streakFrom(entries: StreakLedgerEntry[], now: Date): StreakInfo`
  - `streakIfCompleted(entries: StreakLedgerEntry[], now: Date): number`
  - `streakMultiplier(streakDays: number): number`
  - `coinsWithStreak(base: number, streakDays: number): number`

- [ ] **Step 1: Escribir los tests (fallan)**

```ts
// src/lib/streak.test.ts
import { describe, expect, it } from "vitest";
import {
  coinsWithStreak,
  streakFrom,
  streakIfCompleted,
  streakMultiplier,
  type StreakLedgerEntry,
} from "./streak";

// "Hoy" fijo a mediodía (miércoles) para esquivar bordes de medianoche.
const NOW = new Date(2026, 6, 8, 12, 0, 0);
const daysAgo = (n: number, hour = 12) => new Date(2026, 6, 8 - n, hour);

let seq = 0;
const completed = (createdAt: Date, refId = `t${++seq}`): StreakLedgerEntry => ({
  reason: "TASK_COMPLETED",
  refId,
  createdAt,
});
const uncompleted = (createdAt: Date, refId: string): StreakLedgerEntry => ({
  reason: "TASK_UNCOMPLETED",
  refId,
  createdAt,
});

describe("streakFrom", () => {
  it("ledger vacío → sin racha ni pérdida", () => {
    expect(streakFrom([], NOW)).toEqual({ current: 0, lost: 0 });
  });

  it("un completado hoy → racha 1", () => {
    expect(streakFrom([completed(daysAgo(0))], NOW).current).toBe(1);
  });

  it("solo ayer → racha 1 (viva, en riesgo)", () => {
    expect(streakFrom([completed(daysAgo(1))], NOW).current).toBe(1);
  });

  it("tres días consecutivos terminando hoy → 3", () => {
    const entries = [completed(daysAgo(2)), completed(daysAgo(1)), completed(daysAgo(0))];
    expect(streakFrom(entries, NOW).current).toBe(3);
  });

  it("varios completados el mismo día cuentan una vez", () => {
    const entries = [completed(daysAgo(1)), completed(daysAgo(0), "a"), completed(daysAgo(0), "b")];
    expect(streakFrom(entries, NOW).current).toBe(2);
  });

  it("último completado hace 2 días → rota, con la racha perdida", () => {
    const entries = [completed(daysAgo(3)), completed(daysAgo(2))];
    expect(streakFrom(entries, NOW)).toEqual({ current: 0, lost: 2 });
  });

  it("completar y desmarcar la única tarea de hoy → hoy no cuenta", () => {
    const entries = [completed(daysAgo(0), "x"), uncompleted(daysAgo(0, 13), "x")];
    expect(streakFrom(entries, NOW).current).toBe(0);
  });

  it("dos completados hoy y un desmarcado → hoy sigue contando", () => {
    const entries = [
      completed(daysAgo(0, 9), "x"),
      completed(daysAgo(0, 10), "y"),
      uncompleted(daysAgo(0, 11), "x"),
    ];
    expect(streakFrom(entries, NOW).current).toBe(1);
  });

  it("desmarcar hoy una tarea de anteayer borra aquel día (retroactivo)", () => {
    const entries = [
      completed(daysAgo(2), "x"),
      completed(daysAgo(1), "y"),
      completed(daysAgo(0), "z"),
      uncompleted(daysAgo(0, 13), "x"),
    ];
    expect(streakFrom(entries, NOW).current).toBe(2);
  });

  it("ignora asientos con otras reasons", () => {
    const entries: StreakLedgerEntry[] = [
      { reason: "PENALTY", refId: null, createdAt: daysAgo(0) },
      completed(daysAgo(0)),
    ];
    expect(streakFrom(entries, NOW).current).toBe(1);
  });
});

describe("streakIfCompleted", () => {
  it("sin historial, completar ahora arranca racha 1", () => {
    expect(streakIfCompleted([], NOW)).toBe(1);
  });

  it("racha viva terminando ayer → completar ahora la extiende", () => {
    expect(streakIfCompleted([completed(daysAgo(1))], NOW)).toBe(2);
  });

  it("si hoy ya cuenta, completar otra no la alarga", () => {
    const entries = [completed(daysAgo(1)), completed(daysAgo(0))];
    expect(streakIfCompleted(entries, NOW)).toBe(2);
  });
});

describe("streakMultiplier", () => {
  it("sin racha no multiplica", () => expect(streakMultiplier(0)).toBe(1));
  it("+10 % por día", () => expect(streakMultiplier(3)).toBeCloseTo(1.3));
  it("tope ×2 en el día 10", () => expect(streakMultiplier(10)).toBe(2));
  it("no pasa del tope", () => expect(streakMultiplier(15)).toBe(2));
});

describe("coinsWithStreak", () => {
  it("base intacta sin racha", () => expect(coinsWithStreak(5, 0)).toBe(5));
  it("redondea hacia arriba el .5 (5 → 6)", () => expect(coinsWithStreak(5, 1)).toBe(6));
  it("15 con racha 1 → 17", () => expect(coinsWithStreak(15, 1)).toBe(17));
  it("15 con racha 3 → 20", () => expect(coinsWithStreak(15, 3)).toBe(20));
  it("tope: 30 con racha 10 → 60", () => expect(coinsWithStreak(30, 10)).toBe(60));
});
```

- [ ] **Step 2: Verificar que fallan**

Run: `npm test`
Expected: FAIL — `Cannot find module './streak'` (o equivalente).

- [ ] **Step 3: Implementación mínima**

```ts
// src/lib/streak.ts
// Racha diaria derivada del ledger, sin estado almacenado (patrón goalXpFrom):
// desmarcar o borrar nunca deja contadores desincronizados.

export interface StreakLedgerEntry {
  reason: string; // solo cuentan TASK_COMPLETED / TASK_UNCOMPLETED
  refId: string | null;
  createdAt: Date;
}

export interface StreakInfo {
  current: number; // días consecutivos terminando hoy o ayer; 0 = rota
  lost: number; // longitud de la racha anterior cuando current === 0
}

export const STREAK_BONUS_PER_DAY = 0.1;
export const STREAK_MULTIPLIER_CAP = 2;

const DAY_MS = 24 * 60 * 60 * 1000;

// Nº de día en hora local; round absorbe el desfase de ±1h del cambio horario.
function dayNumber(date: Date): number {
  return Math.round(
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / DAY_MS,
  );
}

// Días con al menos un completado superviviente: cada TASK_UNCOMPLETED cancela
// el completado aún vivo más reciente de su misma tarea (emparejado por refId).
function survivingCompletionDays(entries: StreakLedgerEntry[]): Set<number> {
  const chronological = entries
    .filter((e) => e.reason === "TASK_COMPLETED" || e.reason === "TASK_UNCOMPLETED")
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const alive = new Map<string, Date[]>();
  for (const e of chronological) {
    const key = e.refId ?? "";
    if (e.reason === "TASK_COMPLETED") {
      alive.set(key, [...(alive.get(key) ?? []), e.createdAt]);
    } else {
      alive.get(key)?.pop();
    }
  }

  const days = new Set<number>();
  for (const dates of alive.values()) for (const d of dates) days.add(dayNumber(d));
  return days;
}

function runLengthEndingAt(days: Set<number>, end: number): number {
  let len = 0;
  while (days.has(end - len)) len++;
  return len;
}

export function streakFrom(entries: StreakLedgerEntry[], now: Date): StreakInfo {
  const days = survivingCompletionDays(entries);
  const today = dayNumber(now);
  const current = runLengthEndingAt(days, days.has(today) ? today : today - 1);
  if (current > 0 || days.size === 0) return { current, lost: 0 };
  return { current: 0, lost: runLengthEndingAt(days, Math.max(...days)) };
}

// Racha que quedaría si se completase una tarea ahora mismo: es la que fija el
// multiplicador al completar (el propio completado ya cuenta) y la que
// previsualiza el bonus en tareas pendientes.
export function streakIfCompleted(entries: StreakLedgerEntry[], now: Date): number {
  const hypothetical: StreakLedgerEntry = {
    reason: "TASK_COMPLETED",
    refId: "hypothetical",
    createdAt: now,
  };
  return streakFrom([...entries, hypothetical], now).current;
}

export function streakMultiplier(streakDays: number): number {
  return Math.min(STREAK_MULTIPLIER_CAP, 1 + STREAK_BONUS_PER_DAY * Math.max(0, streakDays));
}

export function coinsWithStreak(base: number, streakDays: number): number {
  return Math.round(base * streakMultiplier(streakDays));
}
```

- [ ] **Step 4: Verificar que pasan**

Run: `npm test`
Expected: PASS (todos, incluidos los suites existentes).

- [ ] **Step 5: Lint y commit**

Run: `npm run lint`
Expected: sin errores.

```bash
git add src/lib/streak.ts src/lib/streak.test.ts
git commit -m "feat: lógica pura de racha diaria derivada del ledger (TDD)"
```

---

### Task 2: Capa Prisma y server action

**Files:**
- Modify: `src/lib/week.ts` (añadir `getStreakInfo` al final)
- Modify: `src/actions/tasks.ts:69-107` (`toggleTask`)

**Interfaces:**
- Consumes: `streakFrom`, `streakIfCompleted`, `coinsWithStreak` de `@/lib/streak` (Task 1).
- Produces: `getStreakInfo(): Promise<{ current: number; lost: number; ifCompletedNow: number }>` en `@/lib/week` — lo usan las páginas en Task 3.

- [ ] **Step 1: `getStreakInfo` en `src/lib/week.ts`**

Añadir al final del fichero (y `import { streakFrom, streakIfCompleted } from "./streak";` arriba):

```ts
// Racha actual derivada del ledger + la racha que quedaría al completar una
// tarea ahora (previsualización del bonus en la UI). Se leen todos los
// asientos TASK_*: usuario único, volumen asumible durante años.
export async function getStreakInfo() {
  const entries = await prisma.pointsEntry.findMany({
    where: { reason: { in: ["TASK_COMPLETED", "TASK_UNCOMPLETED"] } },
    select: { reason: true, refId: true, createdAt: true },
  });
  const now = new Date();
  const { current, lost } = streakFrom(entries, now);
  return { current, lost, ifCompletedNow: streakIfCompleted(entries, now) };
}
```

- [ ] **Step 2: `toggleTask` con multiplicador y devolución por asiento**

Reemplazar la función completa en `src/actions/tasks.ts` (y añadir `import { coinsWithStreak, streakIfCompleted } from "@/lib/streak";`):

```ts
// Marca o desmarca una tarea. Al completar, la racha (incluyendo el día de
// hoy) multiplica las monedas y el asiento registra las monedas finales; al
// desmarcar se devuelve lo que dio ese asiento — nunca se recalcula el
// multiplicador, que pudo cambiar entre medias. Recortado al saldo, como antes.
export async function toggleTask(taskId: string): Promise<void> {
  const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  const user = await getUser();

  if (task.completedAt) {
    const entry = await prisma.pointsEntry.findFirst({
      where: { reason: "TASK_COMPLETED", refId: taskId },
      orderBy: { createdAt: "desc" },
    });
    // Sin asiento (completada antes de existir el ledger): recompensas base.
    const xpDelta = -Math.min(user.xp, entry?.xpDelta ?? task.xpReward);
    const coinDelta = -Math.min(user.coins, entry?.coinDelta ?? task.coinReward);
    await prisma.$transaction([
      prisma.task.update({ where: { id: taskId }, data: { completedAt: null } }),
      prisma.user.update({
        where: { id: user.id },
        data: { xp: { increment: xpDelta }, coins: { increment: coinDelta } },
      }),
      prisma.pointsEntry.create({
        data: { xpDelta, coinDelta, reason: "TASK_UNCOMPLETED", refId: taskId },
      }),
    ]);
  } else {
    const entries = await prisma.pointsEntry.findMany({
      where: { reason: { in: ["TASK_COMPLETED", "TASK_UNCOMPLETED"] } },
      select: { reason: true, refId: true, createdAt: true },
    });
    const coins = coinsWithStreak(task.coinReward, streakIfCompleted(entries, new Date()));
    await prisma.$transaction([
      prisma.task.update({ where: { id: taskId }, data: { completedAt: new Date() } }),
      prisma.user.update({
        where: { id: user.id },
        data: { xp: { increment: task.xpReward }, coins: { increment: coins } },
      }),
      prisma.pointsEntry.create({
        data: { xpDelta: task.xpReward, coinDelta: coins, reason: "TASK_COMPLETED", refId: taskId },
      }),
    ]);
  }

  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/goals");
}
```

- [ ] **Step 3: Comprobar tests, lint y build**

Run: `npm test && npm run lint && npm run build`
Expected: todo verde (no hay tests nuevos aquí: la capa BD se cubre en el e2e).

- [ ] **Step 4: Commit**

```bash
git add src/lib/week.ts src/actions/tasks.ts
git commit -m "feat: monedas multiplicadas por racha en toggleTask; devolución fiel al ledger"
```

---

### Task 3: UI — llama en el header y desglose en la tarea

**Files:**
- Modify: `src/app/globals.css` (tokens `--flame`/`--flame-soft` en ambos temas + `@theme`)
- Modify: `src/components/dashboard/PlayerHeader.tsx`
- Modify: `src/components/tasks/TaskRow.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/tasks/page.tsx`

**Interfaces:**
- Consumes: `getStreakInfo()` (Task 2); `coinsWithStreak` (Task 1).
- Produces: `TaskItemData.streakBonus: number` (monedas extra si se completa ahora; 0 sin racha) — lo rellenan ambas páginas.

- [ ] **Step 1: Tokens de color**

En `globals.css`, junto a `--gold`/`--gold-soft` de cada tema:

```css
/* tema oscuro (:root) */
--flame: #ff8a3d;
--flame-soft: #ff8a3d26;

/* tema claro (@media prefers-color-scheme: light) — más oscuro por contraste */
--flame: #cf5b0e;
--flame-soft: #cf5b0e1f;
```

Y en el bloque `@theme`:

```css
--color-flame: var(--flame);
--color-flame-soft: var(--flame-soft);
```

- [ ] **Step 2: `PlayerHeader` con chip 🔥**

Reemplazar el componente:

```tsx
import { levelProgress } from "@/lib/gamification";
import { ProgressBar } from "@/components/ui/ProgressBar";

export function PlayerHeader({
  name,
  xp,
  coins,
  streak,
  lostStreak,
}: {
  name: string;
  xp: number;
  coins: number;
  streak: number;
  lostStreak: number;
}) {
  const p = levelProgress(xp);
  const broken = streak === 0;

  return (
    <header className="hud-chamfer rise-in border border-edge bg-surface p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">{name}</p>
          <p className="font-display text-3xl font-bold leading-tight">
            Nivel <span className="text-violet">{p.level}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            aria-label={broken ? "Racha rota" : `Racha de ${streak} ${streak === 1 ? "día" : "días"}`}
            className={`hud-chamfer-sm flex items-center gap-1.5 px-3 py-2 ${
              broken ? "bg-surface-2 text-muted grayscale" : "bg-flame-soft text-flame"
            }`}
          >
            <span aria-hidden>🔥</span>
            <span className="font-display text-lg font-semibold">{streak}</span>
          </div>
          <div className="hud-chamfer-sm flex items-center gap-1.5 bg-gold-soft px-3 py-2">
            <span aria-hidden>🪙</span>
            <span className="font-display text-lg font-semibold text-gold">{coins}</span>
          </div>
        </div>
      </div>

      {broken && lostStreak >= 2 && (
        <p className="mt-2 text-xs text-muted">
          Racha de {lostStreak} días perdida. Hoy puede empezar otra.
        </p>
      )}

      <div className="mt-3">
        <ProgressBar pct={p.pct} color="var(--gold)" shine />
        <p className="mt-1.5 flex justify-between text-xs text-muted">
          <span>
            {p.current} / {p.needed} XP
          </span>
          <span>Nivel {p.level + 1} a la vista</span>
        </p>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: `TaskRow` con desglose del bonus**

En `TaskItemData` añadir `streakBonus: number;` y en la línea de metadatos (tras las monedas base):

```tsx
<p className="mt-0.5 text-xs text-muted">
  {task.goalTitle ? `${task.goalTitle} · ` : ""}
  {DIFFICULTY_LABELS[task.difficulty]} · +{task.xpReward} XP · +
  {task.coinReward} 🪙
  {!task.completed && task.streakBonus > 0 && (
    <span className="text-flame"> · 🔥 +{task.streakBonus}</span>
  )}
</p>
```

Las completadas siguen mostrando lo base (decisión D4/D5 del spec: el importe real vive en el ledger y el saldo del header).

- [ ] **Step 4: Cablear las páginas**

`src/app/page.tsx` — añadir `getStreakInfo` al import de `@/lib/week` e importar `coinsWithStreak` de `@/lib/streak`. Añadir la llamada al `Promise.all` existente:

```tsx
const [user, penaltyWeek, fullWeek, streak] = await Promise.all([
  getUser(),
  getPendingPenalty(),
  prisma.week.findUniqueOrThrow({ /* …igual que ahora… */ }),
  getStreakInfo(),
]);
```

En el mapeo de `todayTasks`, añadir:

```tsx
streakBonus: coinsWithStreak(t.coinReward, streak.ifCompletedNow) - t.coinReward,
```

Y el header:

```tsx
<PlayerHeader
  name={user.name}
  xp={user.xp}
  coins={user.coins}
  streak={streak.current}
  lostStreak={streak.lost}
/>
```

`src/app/tasks/page.tsx` — mismo patrón: `getStreakInfo()` dentro del `Promise.all` y `streakBonus` en el mapeo de `items`.

- [ ] **Step 5: Tests, lint, build y commit**

Run: `npm test && npm run lint && npm run build`
Expected: verde (TypeScript obligará a que ningún consumidor de `TaskItemData` quede sin `streakBonus`).

```bash
git add src/app/globals.css src/components/dashboard/PlayerHeader.tsx src/components/tasks/TaskRow.tsx src/app/page.tsx src/app/tasks/page.tsx
git commit -m "feat: llama de racha en el header y desglose del bonus en tareas pendientes"
```

---

### Task 4: Verificación e2e en la app real

**Files:**
- Modify: `scripts/e2e-drive.mjs` (pasos 5-7)
- Modify: `.claude/skills/verify/SKILL.md` (línea "Recorre:")

**Interfaces:**
- Consumes: la app completa en el contenedor Docker.
- Produces: recorrido e2e verde con las nuevas aserciones de racha.

- [ ] **Step 1: Actualizar los pasos 5-7 del e2e**

La primera tarea completada del día arranca racha 1 → EASY da `round(5×1.1) = 6` monedas (antes 5). Reemplazar los pasos 5, 6 y 7 por:

```js
  // 5. Completar UNA tarea desde el dashboard → racha 1: +10 XP y 5×1.1 = 6 🪙.
  // Antes, la pendiente ya anuncia el bonus (racha si se completa ahora = 1).
  await page.goto(BASE, { waitUntil: "networkidle" });
  const bonusPreview = await page.getByText("🔥 +1").count();
  log(
    bonusPreview > 0 ? "✅" : "❌",
    "La tarea pendiente muestra el desglose del bonus de racha (🔥 +1)",
  );
  await page.getByRole("button", { name: /Completar Salir a correr/ }).click();
  await page.getByText("10 / 100 XP").waitFor({ timeout: 10000 });
  const coins = await page.locator("header").getByText("6", { exact: true }).count();
  const flame = await page.getByLabel("Racha de 1 día").count();
  log(
    coins > 0 && flame > 0 ? "✅" : "❌",
    "Completar tarea → 10/100 XP, monedas ×1.1 (6) y 🔥 1 en el header",
  );
  await page.screenshot({ path: `${SHOT_DIR}/02-dash-tarea-completada.png` });

  // 🔍 6. Desmarcar devuelve lo del asiento (las 6 multiplicadas) y rompe la racha
  await page.getByRole("button", { name: /Desmarcar Salir a correr/ }).click();
  await page.getByText("0 / 100 XP").waitFor({ timeout: 10000 });
  const coinsBack = await page.locator("header").getByText("0", { exact: true }).count();
  const flameBroken = await page.getByLabel("Racha rota").count();
  log(
    coinsBack > 0 && flameBroken > 0 ? "🔍" : "❌",
    "Desmarcar devuelve las monedas multiplicadas (0 🪙) y el chip queda en 🔥 0 gris",
  );
  await page.getByRole("button", { name: /Completar Salir a correr/ }).click();
  await page.getByText("10 / 100 XP").waitFor({ timeout: 10000 });

  // 6b. El objetivo LP acumula la XP de la tarea completada (niveles por objetivo)
  await page.goto(`${BASE}/goals`, { waitUntil: "networkidle" });
  const goalCard = await page
    .locator("section", { hasText: "A largo plazo" })
    .getByText("10/100 XP")
    .count();
  log(
    goalCard > 0 ? "✅" : "❌",
    "El objetivo a largo plazo muestra Nv. 1 con 10/100 XP tras la tarea",
  );

  // 🔍 7. Tienda sin saldo: canjear debe estar deshabilitado
  await page.goto(`${BASE}/shop`, { waitUntil: "networkidle" });
  const redeemBtn = page.getByRole("button", { name: "Canjear" }).first();
  const disabled = await redeemBtn.isDisabled();
  log(
    disabled ? "🔍" : "❌",
    `Con 6 monedas, el premio de 30 tiene 'Canjear' ${disabled ? "deshabilitado" : "ACTIVO (mal)"}`,
  );
  await page.screenshot({ path: `${SHOT_DIR}/03-tienda-sin-saldo.png` });
```

(El paso 6b y 7 existentes solo cambian el texto del log de 5 → 6 monedas; el resto queda igual.)

- [ ] **Step 2: Actualizar la doc de la skill verify**

En `.claude/skills/verify/SKILL.md`, línea "Recorre:", añadir la racha:

```
Recorre: dashboard inicial → crear objetivo LP y semanal crítico → objetivo y tareas recurrentes (plantillas, toggle 🔁, pausa) → crear 2 tareas → completar/desmarcar (XP/monedas ×racha 🔥, devolución por asiento) → tienda sin saldo → cierre manual de semana → banner de penalización → "Asumido" → objetivo "✕ Fallido". Sale con código 1 y captura `99-error.png` si algo falla.
```

- [ ] **Step 3: Ejecutar la verificación completa (skill verify)**

```bash
docker compose down -v; docker compose up -d --build
node scripts/e2e-drive.mjs
```

Expected: resumen sin ❌ y exit code 0. Si el puerto 3000 está ocupado: `Get-NetTCPConnection -LocalPort 3000` y matar el node huérfano.

- [ ] **Step 4: Commit**

```bash
git add scripts/e2e-drive.mjs .claude/skills/verify/SKILL.md
git commit -m "test: e2e de racha (bonus visible, monedas ×1.1, devolución por asiento)"
```

---

### Task 5: Documentación y push

**Files:**
- Modify: `AGENTS.md` (nueva viñeta en "Conceptos de dominio")
- Modify: `docs/roadmap-gamificacion.md` (mover 1.1 a "Hecho")

**Interfaces:** ninguna (solo docs).

- [ ] **Step 1: AGENTS.md — concepto de dominio**

Añadir tras la viñeta de XP/monedas:

```markdown
- **Racha diaria** 🔥: días consecutivos con ≥1 tarea completada, derivada del
  ledger en lectura (`streak.ts`, puro: un `TASK_UNCOMPLETED` cancela el
  completado vivo más reciente de su tarea — sin contadores almacenados).
  Multiplica las **monedas** por tarea (+10 %/día contando hoy, tope ×2,
  redondeado); la XP no. El asiento `TASK_COMPLETED` guarda las monedas ya
  multiplicadas y desmarcar devuelve lo del asiento, nunca recalcula.
```

- [ ] **Step 2: Roadmap — 1.1 a "Hecho"**

Eliminar la sección `### 1.1 Racha diaria con multiplicador 🔥` y añadir en "Hecho":

```markdown
- 2026-07-08 — Racha diaria con multiplicador de monedas
  (`docs/superpowers/specs/2026-07-08-racha-diaria-design.md`).
```

- [ ] **Step 3: Commit y push**

```bash
git add AGENTS.md docs/roadmap-gamificacion.md
git commit -m "docs: racha diaria en AGENTS.md; roadmap 1.1 a Hecho"
git push
```

# Objetivos y tareas recurrentes (2026-07-08)

## Problema

Cada lunes hay que recrear a mano los mismos objetivos semanales y tareas
("Entrenar 4 días" con sus 4 entrenamientos, "Preparar comidas" el domingo).
Esa fricción es donde mueren estas apps (roadmap §1.5): la semana nueva debe
nacer ya poblada con lo que se repite.

## Decisión (validada con David)

**Tabla de plantillas** (`RecurringGoal` + `RecurringTask`), descartada la
copia de la semana anterior con flag: con plantillas, editar o borrar la
recurrencia solo afecta a semanas futuras y las pasadas quedan intactas por
construcción; con copia, la "plantilla" sería la última instancia (editar la
recurrencia = tocar histórico) y una semana sin instancia rompe la cadena en
silencio.

Semántica acordada:

- **Alta/reactivación a mitad de semana**: la plantilla se instancia también
  en la semana en curso (si no existe ya), no espera al lunes.
- **Pausar** (`active: false`) no toca la semana en curso: si esta semana no
  la quieres, borras la instancia normal.
- **UI**: toggle "🔁 Repetir cada semana" en los formularios existentes +
  sección "Recurrentes" en /goals para pausar/reanudar/borrar plantillas.

## Modelo de datos (migración aditiva)

```prisma
// Plantilla de objetivo semanal. Nunca se muestra como trabajo pendiente.
model RecurringGoal {
  id             String         @id @default(cuid())
  title          String
  isCritical     Boolean        @default(false)
  longTermGoalId String?        // FK a LongTermGoal, onDelete: SetNull
  active         Boolean        @default(true)  // false = pausada
  createdAt      DateTime       @default(now())
  tasks          RecurringTask[]
}

// Plantilla de tarea. recurringGoalId null = tarea suelta recurrente.
model RecurringTask {
  id              String   @id @default(cuid())
  recurringGoalId String?  // FK a RecurringGoal, onDelete: Cascade
  title           String
  dueDay          Int?     // 0-6 (lunes-domingo)
  difficulty      String   @default("MEDIUM")
  active          Boolean  @default(true)  // pausa de tareas sueltas
  createdAt       DateTime @default(now())
}
```

En las instancias, columna nueva `sourceRecurringId String?` en `WeeklyGoal`
y en `Task` (FK a su plantilla, `onDelete: SetNull`): da idempotencia al
instanciar y trazabilidad. Sin `xpReward` en la plantilla: las recompensas se
derivan de `difficulty` con `rewardsForDifficulty()` al instanciar, como ya
hace `createTask`.

## Lógica pura (TDD) + cableado

- **`src/lib/recurrence.ts`** — `planRecurrence(input)`, función pura con
  tests Vitest primero. Entrada: plantillas (objetivos con sus tareas +
  sueltas) y los `sourceRecurringId` ya presentes en la semana. Salida: los
  `WeeklyGoal` y `Task` exactos a crear (con recompensas resueltas).
  Reglas:
  - Solo plantillas `active` (una tarea de objetivo requiere además su
    objetivo `active`; una suelta, su propio `active`).
  - Idempotente: una plantilla cuyo `sourceRecurringId` ya está en la semana
    no genera nada (ni el objetivo ni sus tareas).
  - Copia `title`, `isCritical`, `longTermGoalId`, `dueDay`, `difficulty`;
    resuelve `xpReward`/`coinReward` desde `difficulty`.
- **`src/lib/week.ts`** — `applyRecurrence(weekId)`: lee plantillas e
  instancias existentes, aplica `planRecurrence` y crea todo en una
  transacción. Se llama en dos puntos:
  1. `ensureCurrentWeek()`, justo tras crear la semana nueva.
  2. Las actions de crear/reactivar plantilla (instanciación inmediata).

Propiedad heredada del cierre perezoso: las semanas saltadas (app sin abrir)
no se crean, así que la recurrencia **no genera fallos fantasma retroactivos**
— solo puebla la semana que sí empieza.

## Actions (`src/actions/recurring.ts` + retoques)

- `createWeeklyGoal` y `createTask` aceptan el checkbox `recurring`:
  crean plantilla + instancia (con `sourceRecurringId`) en la misma
  transacción.
- Regla para tareas con objetivo: si el `weeklyGoal` elegido es instancia
  recurrente (`sourceRecurringId != null`), la `RecurringTask` se cuelga de
  esa plantilla — así "añadir un 5º entrenamiento" es crear la tarea con 🔁.
  Si el objetivo no es recurrente, el flag se ignora en servidor y el toggle
  se oculta en la UI (evita recurrencias huérfanas).
- `toggleRecurring(id, kind)`: pausar/reanudar; al reanudar (o crear) llama a
  `applyRecurrence` sobre la semana actual.
- `deleteRecurring(id, kind)`: borra solo la plantilla; las instancias de
  todas las semanas quedan (`SetNull`).

## UI (español, tokens de `globals.css`, táctil ≥44px)

- **Formularios existentes** (/goals y /tasks): checkbox "🔁 Repetir cada
  semana". En el de tarea, visible solo con "Sin objetivo" o un objetivo
  recurrente seleccionado.
- **Sección "Recurrentes" en /goals** (solo si hay plantillas):

  ```
  🔁 RECURRENTES
  Entrenar 4 días · crítico · 💪 Ponerme en forma   [⏸] [🗑]
    ├ Entrenamiento A (lunes, media)                     [🗑]
    └ ...
  Preparar comidas · domingo · media               [⏸] [🗑]
  ```

  Pausada se muestra atenuada con badge "En pausa" y botón ▶ reanudar.
  Editar composición en v1 = añadir tareas vía 🔁 + borrar tareas de plantilla
  aquí; sin formulario de edición completo (iterable).

## Sin cambios

Cierre de semana, penalizaciones, ledger, `goalXpFrom` (las instancias son
objetivos/tareas normales; un recurrente crítico fallido penaliza como
siempre y la XP fluye al objetivo LP vía `longTermGoalId` copiado). Tienda,
dashboard.

## Verificación

- Vitest `src/lib/recurrence.test.ts`: idempotencia (segunda pasada = vacío),
  filtrado por `active` (objetivo pausado no instancia sus tareas), sueltas
  vs. con objetivo, mapeo de recompensas por dificultad, copia de `dueDay` y
  `isCritical`.
- E2E (`scripts/e2e-drive.mjs` + skill verify en contenedor limpio): crear
  objetivo recurrente con tarea 🔁 → aparecen instancia y plantilla en
  "Recurrentes"; crear tarea suelta recurrente; pausar y comprobar el badge.
  El salto de semana real se cubre en Vitest (manipular la fecha del
  contenedor no compensa).
- Después: AGENTS.md (nuevo concepto de dominio) y roadmap §1.5 → "Hecho".

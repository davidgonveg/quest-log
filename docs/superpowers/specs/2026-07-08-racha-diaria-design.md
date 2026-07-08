# Racha diaria con multiplicador de monedas 🔥 — Diseño

Fecha: 2026-07-08 · Roadmap: `docs/roadmap-gamificacion.md` § 1.1

## Qué es

Racha = días consecutivos con **al menos una tarea completada**. La racha
multiplica las monedas que da cada tarea: **+10 % por día de racha, tope ×2**.
Romperla no es perder un número bonito: es perder ingresos futuros de la
economía real de premios (aversión a la pérdida, el gancho diario del roadmap).

La XP **no** se multiplica: la progresión de niveles queda intacta; la racha
solo acelera la divisa gastable.

## Decisiones de diseño

### D1 — Semántica de la racha

- Un día "cuenta" si tiene ≥1 completado **superviviente** (ver D5).
- La racha está **viva** si el último día que cuenta es **hoy o ayer**. Si es
  ayer, la racha se muestra con su valor (está en riesgo, no rota).
- Si el último día que cuenta es anteayer o antes → **racha 0** (rota).
- Días en hora local del servidor, igual que las semanas.

### D2 — Multiplicador

```
multiplicador = min(2, 1 + 0.10 × racha)
monedas = round(base × multiplicador)
```

La racha usada al completar una tarea **incluye el día de hoy** (el completado
que se está haciendo ya cuenta): el primer día de racha ya da ×1.1, y el tope
×2 se alcanza en el día 10. Así lo que muestra el header (🔥 N) siempre casa
con el bonus (+N·10 %) — regla legible de un vistazo.

El asiento del ledger (`TASK_COMPLETED`) registra las **monedas ya
multiplicadas**: el ledger sigue siendo la única verdad de todo movimiento.

### D3 — Desmarcar devuelve lo que dio el asiento

Al desmarcar una tarea se busca su último asiento `TASK_COMPLETED`
(`refId = taskId`) y se devuelven **sus** deltas negados (recortados al saldo,
como hasta ahora). Nunca se recalcula el multiplicador al desmarcar: si la
racha cambió entre medias, recalcular devolvería una cantidad distinta de la
que se dio.

*Descartado*: recalcular multiplicador al desmarcar (devuelve mal si la racha
cambió). *Fallback*: si no existe asiento (datos anteriores al ledger), se
devuelven las recompensas base de la tarea.

### D4 — Racha rota visible

El chip 🔥 del header **siempre** está: naranja (`--flame`) con racha viva,
**gris con "🔥 0"** cuando está rota. Si la racha que murió era de ≥2 días, se
muestra debajo "Racha de N días perdida" hasta que empiece una nueva. Factual,
sin insulto: solo muestra lo que se perdió, fiel al tono del producto.

### D5 — Fuente: el ledger, sin columnas nuevas

Mismo patrón que `goalXpFrom()`: nada almacenado, todo derivado en lectura de
`PointsEntry` (`TASK_COMPLETED` / `TASK_UNCOMPLETED`).

Emparejado: una `TASK_UNCOMPLETED` **cancela el completado no cancelado más
reciente del mismo `refId`**. Solo los completados supervivientes aportan su
día a la racha. Consecuencias deliberadas:

- Completar y desmarcar la única tarea de hoy → hoy no cuenta (el caso
  señalado en el encargo).
- Desmarcar hoy una tarea completada el lunes → el lunes pierde ese
  completado (retroactivo, coherente con `goalXpFrom`).
- Borrar una tarea completada **no** borra su asiento → el día sigue contando
  (el trabajo se hizo).

Rendimiento: se leen todos los asientos `TASK_*` (solo `reason`, `refId`,
`createdAt`). Usuario único, miles de filas a años vista — aceptable; si algún
día duele, se acota por fecha con un suelo = tope de racha.

*Descartados*: contador en `User` (desnormaliza, puede derivar, contradice el
patrón del proyecto) y derivar de `Task.completedAt` (borrar una tarea
reescribiría la historia; el ledger es inmutable).

## Arquitectura

Respeta la frontera lógica pura / capa Prisma:

- **`src/lib/streak.ts`** (nuevo, puro, con `streak.test.ts` primero):
  - `streakFrom(entries, now)` → `{ current, lost }`. `entries` =
    `{ reason, refId, createdAt }[]`; `lost` = longitud de la racha anterior
    cuando `current === 0` (para D4).
  - `streakMultiplier(days)` → `min(2, 1 + 0.1 × days)`.
  - `coinsWithStreak(base, days)` → `round(base × multiplicador)`.
  - Helper interno de emparejado de asientos (D5).
- **`src/lib/week.ts`**: `getStreakInfo()` — lee los asientos y aplica
  `streakFrom`. Devuelve también la racha "si completas ahora"
  (`current` si hoy ya cuenta; `current + 1` si no) para previsualizar el
  bonus en tareas pendientes.
- **`src/actions/tasks.ts` · `toggleTask`**:
  - Completar: calcula la racha incluyendo hoy, multiplica las monedas y
    escribe usuario + asiento (monedas finales) en la misma transacción.
  - Desmarcar: devuelve según el asiento (D3).
- **UI**:
  - `PlayerHeader`: chip "🔥 N" junto a las monedas; naranja viva, gris en 0;
    línea "Racha de N días perdida" cuando aplique (D4).
  - `TaskRow`: en tareas **pendientes** con bonus (>+0 🪙), desglose
    `+15 🪙 · 🔥 +8`. Las completadas siguen mostrando lo base (el importe
    real vive en el ledger y el saldo del header; evitamos un join por fila).
  - Tokens nuevos `--flame` / `--flame-soft` en `globals.css` (ambos temas),
    nunca hex en componentes.
  - Nota: el chip y el desglose se actualizan al revalidar el server action;
    el toggle optimista solo cambia el check (como hasta ahora).

## Casos de test (Vitest, primero)

`streakFrom`: vacío → 0 · solo hoy → 1 · solo ayer → 1 (viva) · 3 días
terminando hoy/ayer → 3 · último hace 2+ días → 0 con `lost` correcto ·
completar+desmarcar hoy (única) → 0 · dos completados hoy, un desmarcado → 1 ·
desmarcado cruzado de día (lunes→martes) borra el lunes · varios completados
el mismo día cuentan una vez. `streakMultiplier`: 0→1 · 1→1.1 · 10→2 · 15→2.
`coinsWithStreak`: redondeos (15 con racha 1 → 17; 5 con racha 1 → 6).

## Verificación e2e (ampliar `scripts/e2e-drive.mjs`)

En contenedor limpio: completar una tarea → header muestra 🔥 1 y las monedas
suben `round(base × 1.1)`; una pendiente muestra el desglose `🔥 +N`;
desmarcar → las monedas vuelven exactamente al valor anterior y el chip a
"🔥 0" gris.

## Fuera de alcance

Botín aleatorio (1.2), combo del día (1.3), celebraciones (1.4), logros de
racha. Una mecánica por iteración.

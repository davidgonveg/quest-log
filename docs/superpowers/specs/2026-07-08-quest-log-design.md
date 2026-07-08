# Quest Log — Diseño (2026-07-08)

Organizador semanal gamificado, self-hosted con Docker, mobile-first (PWA instalable), un solo usuario sin login, UI en español y modo oscuro nativo.

## Decisiones

- **Stack**: Next.js 16 (App Router, TS, Tailwind v4) full-stack en un contenedor; Prisma 6 + SQLite (`/data/quest.db` en volumen Docker). Server Actions + RSC, sin API separada.
- **Jerarquía**: `LongTermGoal` → `WeeklyGoal` (por semana, con flag `isCritical`) → `Task` (con día opcional lunes-domingo y dificultad EASY/MEDIUM/HARD).
- **Gamificación**: XP permanente (nivel N a `100·(N−1)^1.5` XP) + monedas gastables. Recompensas por dificultad: 10/25/50 XP y 5/15/30 monedas. Objetivo cumplido a mano: +40 XP/+20 monedas. Todo movimiento queda en el ledger `PointsEntry`.
- **Tienda**: premios reales definidos por el usuario; canje valida saldo en servidor y queda en `Redemption`.
- **Penalización**: al cierre de semana, cada objetivo crítico incumplido resta (configurable, por defecto 25 XP / 50 monedas, recortado para no dejar saldos negativos) y se elige un mensaje duro de decepción (`src/lib/messages.ts`) que el dashboard muestra como banner "Semana fallida" hasta pulsarse "Asumido".
- **Cierre perezoso**: `ensureCurrentWeek()` en cada carga de página cierra las semanas vencidas y crea la actual; sin cron. También hay cierre manual en Ajustes.
- **Primer arranque**: si la BD está vacía la app crea el usuario y premios de ejemplo (cero configuración en Docker). `npm run db:seed` añade datos de demo en desarrollo.
- **PWA**: manifest + iconos SVG + service worker mínimo (instalable; sin offline en v1).
- **Docker**: imagen multi-stage (standalone de Next + CLI de Prisma en etapa aislada para `migrate deploy` en el entrypoint), compose con volumen `quest-data`.

## Lógica testeada (Vitest, `src/lib/*.test.ts`)

Niveles y progreso de XP, recompensas por dificultad, recorte de penalizaciones, límites de semana lunes-domingo y el plan de cierre (`closeWeekPlan`: objetivos COMPLETED/FAILED, penalización, mensaje).

## Verificación end-to-end

`scripts/e2e-drive.mjs` (Playwright + Edge del sistema) recorre contra el contenedor: alta de objetivos y tareas, completar/desmarcar tarea (XP/monedas suben y bajan), canje deshabilitado sin saldo, cierre de semana con crítico incumplido → banner con mensaje y descuento, "Asumido" lo descarta, objetivo marcado "✕ Fallido".

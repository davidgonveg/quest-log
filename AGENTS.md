# Quest Log — Guía para agentes

Organizador semanal gamificado, self-hosted, de un solo usuario. UI en español,
modo oscuro nativo, mobile-first (PWA). Stack: Next.js 16 (App Router, TS) ·
Tailwind CSS 4 · Prisma 6 + SQLite · Docker.

> Mantén este fichero al día: si cambias arquitectura, comandos o convenciones,
> actualízalo en el mismo commit. `CLAUDE.md` lo importa — no dupliques contenido.

## Comandos

```bash
npm run dev              # desarrollo (BD en prisma/dev.db)
npm test                 # Vitest: lógica de dominio (src/lib/*.test.ts)
npm run lint             # ESLint
npm run build            # build de producción (output standalone)
npx prisma migrate dev   # nueva migración tras cambiar schema.prisma
npm run db:seed          # datos de demostración (idempotente)
docker compose up -d --build   # despliegue real; BD en volumen quest-data
node scripts/e2e-drive.mjs     # e2e con Playwright (app corriendo + Edge)
node scripts/backup.mjs [dest] # snapshot consistente de la BD (VACUUM INTO)
```

### Copia de seguridad y restauración

El volumen `quest-data` es la **única copia** de los datos. Dos vías de backup,
ambas con `VACUUM INTO` (snapshot íntegro aunque la app escriba):

```bash
# Desde el contenedor a un fichero del volumen, y luego al host:
docker compose exec app node scripts/backup.mjs /data/backups/quest.db
docker cp quest-log:/data/backups/quest.db ./quest-backup.db
# O desde la app: Ajustes → "Descargar copia" (ruta GET /api/export).
```

Restaurar: `docker compose down`, copiar el backup al volumen como
`/data/quest.db` (`docker run --rm -v quest-data:/data -v "$PWD":/src alpine
cp /src/quest-backup.db /data/quest.db`), `docker compose up -d`.

> **Única ruta HTTP de la app**: `src/app/api/export/route.ts` (GET). Es la
> excepción justificada al "sin API REST": una descarga de fichero no se puede
> servir desde una Server Action. No añadir más rutas sin la misma justificación.

## Arquitectura

Un solo servicio Next.js. Sin API REST: **Server Actions + RSC**.

- `src/lib/` — dominio. **Separación clave**: `week-logic.ts` y `gamification.ts`
  son funciones **puras** (testeadas en Vitest, sin BD); `week.ts` y `db.ts`
  son la capa con Prisma que las aplica. Mantén esa frontera: la lógica nueva
  va primero como función pura + test, y luego se cablea a la BD.
- `src/actions/` — server actions por dominio (tasks, goals, shop, week,
  settings). Validan en servidor aunque la UI ya restrinja (ej. canje sin saldo).
- `src/app/` — páginas RSC con `export const dynamic = "force-dynamic"`
  (todas dependen de BD y fecha; nunca prerenderizar).
- `src/components/` — `ui/` genéricos, resto por feature. Componentes cliente
  solo cuando hay interacción (toggles con `useOptimistic`, banner).

### Conceptos de dominio

- **Semana** = lunes 00:00 → domingo 23:59:59.999 (hora local del servidor).
  `ensureCurrentWeek()` se llama al cargar cada página: **cierre perezoso** de
  semanas vencidas (no hay cron) + creación de la actual.
- **Cierre de semana**: objetivos semanales ACTIVE con todas sus tareas hechas →
  COMPLETED; el resto → FAILED. Cada crítico fallido resta XP/monedas
  (configurable, recortado para no dejar saldos negativos) y genera un mensaje
  duro de `messages.ts` que el dashboard muestra hasta pulsarse "Asumido".
  **Los mensajes son deliberadamente severos — no suavizarlos.**
- **Niveles por objetivo LP**: su XP se calcula en lectura con `goalXpFrom()`
  (tareas completadas + bonus por weeklyGoal COMPLETED), nunca se almacena.
  "Conseguido" (`completedAt`) retira el objetivo a la vitrina de trofeos.
- **XP** = progresión permanente (niveles, curva `100·(N−1)^1.5`);
  **monedas** = divisa gastable en la Tienda. Todo movimiento queda en el
  ledger `PointsEntry` — nunca modificar saldos sin su asiento correspondiente,
  dentro de la misma transacción.
- **Racha diaria** 🔥: días consecutivos con ≥1 tarea completada, derivada del
  ledger en lectura (`streak.ts`, puro: un `TASK_UNCOMPLETED` cancela el
  completado vivo más reciente de su tarea — sin contadores almacenados).
  Multiplica las **monedas** por tarea (+10 %/día contando hoy, tope ×2,
  redondeado); la XP no. El asiento `TASK_COMPLETED` guarda las monedas ya
  multiplicadas y desmarcar devuelve lo del asiento, nunca recalcula.
- **Recurrencia semanal**: plantillas `RecurringGoal`/`RecurringTask` (tarea
  suelta si `recurringGoalId` es null). `applyRecurrence(weekId)` las instancia
  como objetivos/tareas normales (idempotente vía `sourceRecurringId`) al crear
  la semana en `ensureCurrentWeek()` y al crear/reactivar una plantilla.
  Editar/pausar/borrar una plantilla nunca toca semanas ya creadas. Lógica pura
  en `recurrence.ts`.
- **Primer arranque**: `getUser()` auto-inicializa usuario y premios si la BD
  está vacía (por eso Docker no necesita seed).

## Convenciones

- Todo el texto visible por el usuario, en **español**. Código e identificadores
  en inglés.
- SQLite no soporta enums de Prisma: los estados son `String` + tipos/constantes
  TS (`Difficulty`, estados en comentarios del schema). Valida en las actions.
- Comentarios: explican el **porqué** o una restricción no evidente, no el qué.
- Tokens de diseño en `globals.css` (`@theme` de Tailwind 4): colores solo vía
  tokens (`bg-surface`, `text-gold`…), nunca hex sueltos en componentes.
  Firma visual: chaflanes `.hud-chamfer(-sm)` en elementos HUD.
- Zonas táctiles ≥ 44px (`min-h-11`/`min-h-14`); acciones principales al alcance
  del pulgar (derecha/abajo).
- TDD en dominio: test primero en `src/lib/*.test.ts` para lógica nueva.
- Migraciones de Prisma: siempre aditivas si es posible; la BD del usuario vive
  en un volumen Docker y no se puede regenerar.

## Verificación

Antes de dar por buena una feature, recórrela en la app real (no solo tests):
skill del proyecto en `.claude/skills/verify/SKILL.md` (contenedor limpio +
`scripts/e2e-drive.mjs`). Trampas conocidas de Playwright con RSC documentadas ahí.

## Trampas de entorno (Windows)

- Scripts `.sh` deben quedar en LF (cubierto por `.gitattributes`).
- "Port 3000 not available" al levantar compose → proceso `node` huérfano del
  dev server: `Get-NetTCPConnection -LocalPort 3000` y matarlo.
- Prisma está fijado a v6 (v7 exige driver adapters); no subir de major sin
  revisar el Dockerfile (etapa `prisma-cli`).

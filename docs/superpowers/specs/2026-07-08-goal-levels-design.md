# Niveles por objetivo a largo plazo (2026-07-08)

## Problema

Las tareas ya cuelgan de objetivos semanales y estos de objetivos a largo plazo,
pero el progreso del objetivo LP ("X de Y semanas cumplidas") es indirecto y no
funciona para objetivos sin final natural: "aprender inglés" no se termina con
N tareas — cada tarea suma, pero no hay línea de meta.

## Decisión (validada con David)

**Un único modelo para todos los objetivos LP: niveles infinitos, como un juego.**
Sin tipos "proyecto/práctica", sin metas configurables. Los objetivos que sí
terminan en la vida real se marcan "Conseguido" a mano y se retiran a una
vitrina de trofeos con su nivel final.

## Cómo suma la XP de un objetivo

**Calculada en lectura, nunca almacenada** (sin contadores que se desincronicen,
retroactiva para datos existentes, y desmarcar una tarea baja el nivel solo):

```
goalXp = Σ xpReward de tareas completadas cuyo weeklyGoal.longTermGoalId = goal.id
       + 40 · nº de weeklyGoals COMPLETED del goal   (mismo bonus GOAL_BONUS.xp existente)
```

Nivel y progreso: se reutiliza la curva del jugador (`levelForXp`,
`levelProgress` en `src/lib/gamification.ts`). Nueva función pura
`goalXpFrom(weeklyGoals)` en `gamification.ts` con tests Vitest (TDD).

## Modelo de datos

Migración aditiva sobre `LongTermGoal`:

- `completedAt DateTime?` — fecha de "Conseguido" (los `COMPLETED` muestran esta
  fecha en la vitrina). `status` ya soporta COMPLETED/ARCHIVED, sin cambios.

## UI (página Objetivos)

**Tarjeta de objetivo activo** — sustituye "X de Y semanas cumplidas (pct%)":

```
💪 Ponerme en forma — Nv. 3
▓▓▓▓▓░░░░░  45/117 XP
8 semanas cumplidas · [Conseguido] [Archivar]
```

- Nivel en `font-display` violeta (misma jerarquía que el nivel del jugador).
- Barra `ProgressBar` hacia el siguiente nivel.
- "Semanas cumplidas" queda como texto secundario (se conserva la métrica).
- Botón **Conseguido**: nueva action `completeLongTermGoal(id)` → `status:
  "COMPLETED"`, `completedAt: now`. Sin recompensa extra en v1 (el trofeo es la
  recompensa; evita farmear).

**Vitrina** — sección al final de la página, solo si hay objetivos COMPLETED:

```
🏆 VITRINA
🧹 Limpiar la casa — Nv. 2 · marzo 2026
```

Nivel final calculado con la misma función (los datos históricos no cambian).
Los ARCHIVED siguen sin mostrarse (abandono sin trofeo).

## Sin cambios

Dashboard, tareas, tienda, cierre de semana, penalizaciones, XP/monedas del
jugador. La consulta de la página Objetivos ya incluye los weeklyGoals; solo
amplía el `include` a las tareas.

## Verificación

- Vitest: `goalXpFrom` (tareas completas/incompletas, bonus de weekly COMPLETED,
  objetivo sin nada = 0 XP → Nv. 1).
- E2E (`scripts/e2e-drive.mjs`): tras completar una tarea vinculada, la tarjeta
  del objetivo muestra XP > 0; "Conseguido" mueve el objetivo a la vitrina.

// Botín variable 🎁: recompensa aleatoria al completar una tarea. La
// incertidumbre es el gancho — por eso solo existe al completar trabajo real,
// nunca por abrir la app. rng inyectado (0<=rng<1) para testear la lógica.

export const LOOT_CHANCE = 0.15;
export const LOOT_MIN = 5;
export const LOOT_MAX = 30;

// Devuelve las monedas de botín (LOOT_MIN..LOOT_MAX) o 0 si no toca. No se
// multiplica por racha: es un extra plano sobre la recompensa base de la tarea,
// lo que además mantiene fiel y simple la devolución al desmarcar.
export function rollLoot(rng: () => number): number {
  if (rng() >= LOOT_CHANCE) return 0;
  const span = LOOT_MAX - LOOT_MIN + 1;
  return LOOT_MIN + Math.floor(rng() * span);
}

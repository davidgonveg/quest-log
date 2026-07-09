// Día perfecto ⚡: completar todas las tareas que vencen hoy. Empuja a terminar
// la lista del día, no solo a picotear. Bonus fijo, sin multiplicador de racha.

export const PERFECT_DAY_BONUS = 20;

// ¿Están hechas todas las tareas con vencimiento hoy (y hay al menos una)?
// Las de "cualquier día" (dueDay null) NO cuentan: una tarea suelta sin fecha
// no debe bloquear el bonus indefinidamente ni dispararlo por sí sola.
// today: lunes=0 … domingo=6 (mismo criterio que dayIndex).
export function isPerfectDay(
  tasks: { dueDay: number | null; completedAt: Date | null }[],
  today: number,
): boolean {
  const dueToday = tasks.filter((t) => t.dueDay === today);
  return dueToday.length > 0 && dueToday.every((t) => t.completedAt !== null);
}

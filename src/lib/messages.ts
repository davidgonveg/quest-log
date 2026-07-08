// Mensajes duros de decepción para el cierre de semana con objetivos
// críticos incumplidos. El usuario los pidió así explícitamente: directos
// y sin paños calientes, estilo "respetarse es cumplir lo que te prometes".
export const PENALTY_MESSAGES: readonly string[] = [
  "Otra semana fallándote a ti mismo. Respetarse empieza por cumplir lo que uno se promete.",
  "Lo dijiste tú. Nadie te obligó. Y aun así no lo hiciste. ¿Cuántas semanas más?",
  "Los objetivos críticos no eran opcionales: los marcaste tú. Esto es no tomarte en serio.",
  "El tú de dentro de un año está pagando las excusas del tú de esta semana.",
  "No es falta de tiempo, es falta de palabra. Y la palabra que estás rompiendo es la tuya.",
  "Decepcionante. No por fallar, sino por fallar en lo que tú mismo llamaste crítico.",
  "Cada semana incumplida es un voto a favor de la persona que no quieres ser.",
  "Si un amigo te tratara como tú tratas tus compromisos, dejarías de fiarte de él.",
  "Las excusas de esta semana sonarán igual de vacías la próxima. Rompe el ciclo.",
  "Esto no son solo monedas perdidas: es confianza en ti mismo perdida. Se recupera cumpliendo.",
  "Prometer poco y cumplirlo: eso es respeto. Prometer y fallar: eso fue esta semana.",
  "Nadie viene a rescatarte. La semana que viene sigue siendo cosa tuya.",
  "Te pusiste el listón tú mismo y pasaste por debajo. Toca mirarse al espejo.",
  "La disciplina es recordar lo que quieres de verdad. Esta semana lo olvidaste.",
  "Perder puntos duele menos que acostumbrarse a fallarse. No te acostumbres.",
];

export function pickPenaltyMessage(): string {
  return PENALTY_MESSAGES[Math.floor(Math.random() * PENALTY_MESSAGES.length)];
}

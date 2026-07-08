import { prisma } from "./db";
import { DEFAULT_PENALTY, type PenaltySettings } from "./gamification";
import { closeWeekPlan } from "./week-logic";
import { getWeekBounds } from "./week-logic";
import { planRecurrence } from "./recurrence";

export async function getPenaltySettings(): Promise<PenaltySettings> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: ["penaltyXp", "penaltyCoins"] } },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, parseInt(r.value, 10)]));
  return {
    penaltyXp: map.penaltyXp ?? DEFAULT_PENALTY.penaltyXp,
    penaltyCoins: map.penaltyCoins ?? DEFAULT_PENALTY.penaltyCoins,
  };
}

// Devuelve el usuario único; si la BD está recién creada (primer arranque en
// Docker), inicializa un perfil y unos premios de ejemplo para no empezar
// con la tienda vacía.
export async function getUser() {
  const user = await prisma.user.findFirst();
  if (user) return user;

  if ((await prisma.reward.count()) === 0) {
    await prisma.reward.createMany({
      data: [
        { title: "Ver un capítulo de una serie", icon: "📺", cost: 30 },
        { title: "Comprar un antojo", icon: "🍫", cost: 60 },
        { title: "Tarde libre de videojuegos", icon: "🎮", cost: 100 },
      ],
    });
  }
  return prisma.user.create({ data: { name: "Aventurero" } });
}

// Cierra una semana: marca objetivos COMPLETED/FAILED, aplica la penalización
// al usuario, la registra en el ledger y guarda el mensaje de decepción.
export async function closeWeek(weekId: string): Promise<void> {
  const week = await prisma.week.findUniqueOrThrow({
    where: { id: weekId },
    include: { weeklyGoals: { include: { tasks: { select: { completedAt: true } } } } },
  });
  if (week.closedAt) return;

  const [user, settings] = await Promise.all([getUser(), getPenaltySettings()]);
  const plan = closeWeekPlan({ weeklyGoals: week.weeklyGoals, user, settings });

  await prisma.$transaction([
    ...plan.goalUpdates.map((u) =>
      prisma.weeklyGoal.update({ where: { id: u.id }, data: { status: u.status } }),
    ),
    ...(plan.failedCritical > 0
      ? [
          prisma.user.update({
            where: { id: user.id },
            data: { xp: { increment: plan.xpDelta }, coins: { increment: plan.coinDelta } },
          }),
          prisma.pointsEntry.create({
            data: {
              xpDelta: plan.xpDelta,
              coinDelta: plan.coinDelta,
              reason: "PENALTY",
              refId: week.id,
            },
          }),
        ]
      : []),
    prisma.week.update({
      where: { id: week.id },
      data: { closedAt: new Date(), penaltyMsg: plan.message },
    }),
  ]);
}

// Cierre perezoso: cierra las semanas vencidas que sigan abiertas y devuelve
// la semana actual, creándola si no existe. Se llama al cargar cada página,
// así no hace falta ningún cron dentro del contenedor.
export async function ensureCurrentWeek() {
  const now = new Date();

  const expired = await prisma.week.findMany({
    where: { closedAt: null, endDate: { lt: now } },
    orderBy: { startDate: "asc" },
    select: { id: true },
  });
  for (const w of expired) await closeWeek(w.id);

  const { start, end } = getWeekBounds(now);
  const existing = await prisma.week.findFirst({
    where: { startDate: { lte: now }, endDate: { gte: now } },
  });
  if (existing) return existing;

  const week = await prisma.week.create({ data: { startDate: start, endDate: end } });
  await applyRecurrence(week.id);
  return week;
}

// Instancia en la semana las plantillas recurrentes activas que aún no estén.
// Idempotente vía sourceRecurringId; se llama al crear la semana y al
// crear/reactivar una plantilla (alta a mitad de semana = instancia inmediata).
export async function applyRecurrence(weekId: string): Promise<void> {
  const [goals, standaloneTasks, existingGoals, existingTasks] = await Promise.all([
    prisma.recurringGoal.findMany({ where: { active: true }, include: { tasks: true } }),
    prisma.recurringTask.findMany({ where: { recurringGoalId: null, active: true } }),
    prisma.weeklyGoal.findMany({
      where: { weekId, sourceRecurringId: { not: null } },
      select: { sourceRecurringId: true },
    }),
    prisma.task.findMany({
      where: { weekId, sourceRecurringId: { not: null } },
      select: { sourceRecurringId: true },
    }),
  ]);

  const plan = planRecurrence({
    goals,
    standaloneTasks,
    existingGoalSourceIds: existingGoals.map((g) => g.sourceRecurringId as string),
    existingTaskSourceIds: existingTasks.map((t) => t.sourceRecurringId as string),
  });
  if (plan.goals.length === 0 && plan.standaloneTasks.length === 0) return;

  await prisma.$transaction([
    ...plan.goals.map((g) =>
      prisma.weeklyGoal.create({
        data: {
          weekId,
          title: g.title,
          isCritical: g.isCritical,
          longTermGoalId: g.longTermGoalId,
          sourceRecurringId: g.sourceRecurringId,
          tasks: {
            create: g.tasks.map((t) => ({
              title: t.title,
              dueDay: t.dueDay,
              difficulty: t.difficulty,
              xpReward: t.xpReward,
              coinReward: t.coinReward,
              sourceRecurringId: t.sourceRecurringId,
              week: { connect: { id: weekId } },
            })),
          },
        },
      }),
    ),
    ...plan.standaloneTasks.map((t) =>
      prisma.task.create({
        data: {
          weekId,
          title: t.title,
          dueDay: t.dueDay,
          difficulty: t.difficulty,
          xpReward: t.xpReward,
          coinReward: t.coinReward,
          sourceRecurringId: t.sourceRecurringId,
        },
      }),
    ),
  ]);
}

// Última semana cerrada con penalización cuyo mensaje aún no se ha descartado.
export async function getPendingPenalty() {
  return prisma.week.findFirst({
    where: { closedAt: { not: null }, penaltyMsg: { not: null }, msgSeen: false },
    orderBy: { endDate: "desc" },
  });
}

import { prisma } from "./db";
import { DEFAULT_PENALTY, type PenaltySettings } from "./gamification";
import { closeWeekPlan } from "./week-logic";
import { getWeekBounds } from "./week-logic";

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

  return prisma.week.create({ data: { startDate: start, endDate: end } });
}

// Última semana cerrada con penalización cuyo mensaje aún no se ha descartado.
export async function getPendingPenalty() {
  return prisma.week.findFirst({
    where: { closedAt: { not: null }, penaltyMsg: { not: null }, msgSeen: false },
    orderBy: { endDate: "desc" },
  });
}

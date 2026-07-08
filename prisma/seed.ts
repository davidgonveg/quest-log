import { PrismaClient } from "@prisma/client";
import { rewardsForDifficulty, type Difficulty } from "../src/lib/gamification";
import { getWeekBounds } from "../src/lib/week-logic";

const prisma = new PrismaClient();

async function main() {
  // Idempotente: si ya hay usuario, no re-sembrar (el entrypoint de Docker
  // lo ejecuta en cada arranque).
  if (await prisma.user.findFirst()) {
    console.log("Seed omitido: ya hay datos.");
    return;
  }

  await prisma.user.create({ data: { name: "David", xp: 120, coins: 85 } });

  await prisma.setting.createMany({
    data: [
      { key: "penaltyXp", value: "25" },
      { key: "penaltyCoins", value: "50" },
    ],
  });

  const { start, end } = getWeekBounds(new Date());
  const week = await prisma.week.create({ data: { startDate: start, endDate: end } });

  const fitness = await prisma.longTermGoal.create({
    data: {
      title: "Ponerme en forma",
      description: "Constancia en el gimnasio y mejor alimentación durante 6 meses.",
      icon: "💪",
      targetDate: new Date(new Date().getFullYear() + 1, 0, 1),
    },
  });

  const gym = await prisma.weeklyGoal.create({
    data: {
      weekId: week.id,
      longTermGoalId: fitness.id,
      title: "Entrenar 3 días esta semana",
      isCritical: true,
    },
  });
  const reading = await prisma.weeklyGoal.create({
    data: { weekId: week.id, title: "Leer 100 páginas", isCritical: false },
  });

  const tasks: { title: string; dueDay: number | null; difficulty: Difficulty; weeklyGoalId?: string }[] = [
    { title: "Entrenamiento de fuerza", dueDay: 0, difficulty: "MEDIUM", weeklyGoalId: gym.id },
    { title: "Entrenamiento de fuerza", dueDay: 2, difficulty: "MEDIUM", weeklyGoalId: gym.id },
    { title: "Cardio 30 min", dueDay: 4, difficulty: "HARD", weeklyGoalId: gym.id },
    { title: "Leer 50 páginas", dueDay: null, difficulty: "EASY", weeklyGoalId: reading.id },
    { title: "Leer otras 50 páginas", dueDay: null, difficulty: "EASY", weeklyGoalId: reading.id },
    { title: "Preparar comidas de la semana", dueDay: 6, difficulty: "MEDIUM" },
  ];
  for (const t of tasks) {
    const r = rewardsForDifficulty(t.difficulty);
    await prisma.task.create({
      data: {
        weekId: week.id,
        weeklyGoalId: t.weeklyGoalId,
        title: t.title,
        dueDay: t.dueDay,
        difficulty: t.difficulty,
        xpReward: r.xp,
        coinReward: r.coins,
      },
    });
  }

  await prisma.reward.createMany({
    data: [
      { title: "Ver un capítulo de una serie", icon: "📺", cost: 30 },
      { title: "Comprar un antojo", icon: "🍫", cost: 60 },
      { title: "Tarde libre de videojuegos", icon: "🎮", cost: 100 },
      { title: "Cena fuera el fin de semana", icon: "🍕", cost: 200 },
    ],
  });

  console.log("Seed completado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

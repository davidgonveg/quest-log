// Carga la rutina personal en el catálogo de gym y asegura el hábito
// "Entrenar" (4 días/semana, 🏋️). Idempotente: ejercicios emparejados por
// nombre (actualiza bloque/objetivos si ya existen), hábito por título.
// Uso local:  node scripts/seed-gym-routine.mjs
// En Docker:  docker cp scripts/seed-gym-routine.mjs quest-log:/app/seed-tmp.mjs
//             docker compose exec app node /app/seed-tmp.mjs
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL) {
  try {
    const env = await readFile(resolve(".env"), "utf8");
    const line = env.match(/^\s*DATABASE_URL\s*=\s*"?([^"\n]+)"?/m);
    if (line) process.env.DATABASE_URL = line[1];
  } catch {
    // sin .env: PrismaClient fallará con un mensaje claro más abajo
  }
}

const ROUTINE = {
  "Torso A": [
    ["Press Banca con Barra", 4, "6-8"],
    ["Remo con Barra", 4, "6-8"],
    ["Press Inclinado Mancuernas", 3, "8-10"],
    ["Jalón al Pecho Agarre Ancho", 3, "8-10"],
    ["Aperturas", 3, "12-15"],
    ["Face Pulls", 3, "15-20"],
    ["Curl Bíceps Barra Z", 3, "10-12"],
    ["Extensiones Tríceps Cuerda", 3, "10-12"],
  ],
  "Pierna A": [
    ["Sentadilla con Barra", 4, "6-8"],
    ["Peso Muerto Rumano", 4, "8-10"],
    ["Zancadas Búlgaras (por pierna)", 3, "8-10"],
    ["Extensión de Cuádriceps", 3, "12-15"],
    ["Hip Thrust", 3, "10-12"],
    ["Gemelos en Prensa", 3, "12-15"],
    ["Rueda Abdominal", 2, "10-15"],
    ["Plancha RKC", 2, "20-30 seg"],
  ],
  "Torso B": [
    ["Press Militar", 4, "6-8"],
    ["Dominadas Neutras", 4, "6-8"],
    ["Fondos Tríceps", 3, "8-10"],
    ["Elevaciones Laterales", 4, "12-15"],
    ["Elevaciones Posteriores", 3, "12-15"],
    ["Remo Alto con Cable", 3, "12-15"],
    ["Curl Martillo", 3, "10-12"],
    ["Extensiones Overhead", 3, "10-12"],
  ],
  "Pierna B": [
    ["Prensa de Piernas", 4, "8-10"],
    ["Curl Femoral Tumbado", 4, "8-12"],
    ["Zancadas Laterales", 3, "10-12"],
    ["Peso Muerto Piernas Rígidas", 3, "10-12"],
    ["Abducción de Cadera", 3, "15-20"],
    ["Gemelos Sentado", 3, "15-20"],
    ["Farmer's Static", 3, "30-40 s"],
    ["Hollow Body Hold", 3, "20-30 s"],
  ],
};

const HABIT = {
  title: "Entrenar",
  isCritical: false,
  targetDays: 4,
  habitDifficulty: "MEDIUM",
  isGym: true,
};

const prisma = new PrismaClient();
try {
  let created = 0;
  let updated = 0;
  for (const [block, exercises] of Object.entries(ROUTINE)) {
    for (const [name, targetSets, targetReps] of exercises) {
      const data = { muscleGroup: block, targetSets, targetReps, archived: false };
      const existing = await prisma.exercise.findFirst({ where: { name } });
      if (existing) {
        await prisma.exercise.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await prisma.exercise.create({ data: { name, ...data } });
        created++;
      }
    }
  }
  console.log(`Ejercicios: ${created} creados, ${updated} actualizados.`);

  // Hábito "Entrenar": plantilla recurrente + instancia en la semana abierta
  // (la plantilla sola no se instanciaría hasta la semana que viene).
  let tpl = await prisma.recurringGoal.findFirst({
    where: { title: HABIT.title, targetDays: { not: null } },
  });
  if (!tpl) {
    tpl = await prisma.recurringGoal.create({ data: HABIT });
    console.log(`Hábito "${HABIT.title}" creado (${HABIT.targetDays} días/semana, 🏋️).`);
  } else {
    console.log(`Hábito "${HABIT.title}" ya existía: sin cambios.`);
  }

  const now = new Date();
  const week = await prisma.week.findFirst({
    where: { closedAt: null, startDate: { lte: now }, endDate: { gte: now } },
  });
  if (week) {
    const instance = await prisma.weeklyGoal.findFirst({
      where: { weekId: week.id, sourceRecurringId: tpl.id },
    });
    if (!instance) {
      await prisma.weeklyGoal.create({
        data: {
          weekId: week.id,
          title: tpl.title,
          isCritical: tpl.isCritical,
          targetDays: tpl.targetDays,
          habitDifficulty: tpl.habitDifficulty,
          isGym: tpl.isGym,
          sourceRecurringId: tpl.id,
        },
      });
      console.log("Instancia del hábito creada en la semana actual.");
    }
  }
} finally {
  await prisma.$disconnect();
}

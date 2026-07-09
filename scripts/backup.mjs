// Snapshot consistente de la BD SQLite usando `VACUUM INTO`: produce una copia
// íntegra aunque la app esté escribiendo, sin depender del binario `sqlite3`.
// Uso: node scripts/backup.mjs [ruta-destino]
// Sin argumento, escribe backups/quest-YYYY-MM-DD_HH-MM-SS.db junto al proyecto.
// En Docker: docker compose exec app node scripts/backup.mjs /data/backups/quest.db
import { mkdir, readFile, rm, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

// En Docker DATABASE_URL viene del entorno; en local no se carga .env solo.
// Fallback mínimo sin dependencias para que la ejecución suelta funcione igual.
if (!process.env.DATABASE_URL) {
  try {
    const env = await readFile(resolve(".env"), "utf8");
    const line = env.match(/^\s*DATABASE_URL\s*=\s*"?([^"\n]+)"?/m);
    if (line) process.env.DATABASE_URL = line[1];
  } catch {
    // sin .env: PrismaClient fallará con un mensaje claro más abajo
  }
}

function defaultTarget() {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
  return resolve("backups", `quest-${stamp}.db`);
}

const target = resolve(process.argv[2] ?? defaultTarget());

// VACUUM INTO exige que el destino no exista; nunca sobrescribimos a ciegas.
try {
  await stat(target);
  console.error(`El destino ya existe: ${target}`);
  process.exit(1);
} catch {
  // no existe: seguimos
}

await mkdir(dirname(target), { recursive: true });

const prisma = new PrismaClient();
try {
  // Comilla escapada para el literal SQL; el destino es controlado (argv/local).
  await prisma.$executeRawUnsafe(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
  const { size } = await stat(target);
  console.log(`Copia creada: ${target} (${(size / 1024).toFixed(1)} KB)`);
} catch (err) {
  await rm(target, { force: true });
  console.error("Fallo al crear la copia:", err);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}

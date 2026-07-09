import { randomUUID } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma } from "@/lib/db";

// Única ruta HTTP de la app (convención: sin API REST). Existe porque descargar
// un fichero no se puede servir desde una Server Action. Genera un snapshot
// consistente con VACUUM INTO y lo devuelve como descarga directa del .db,
// que es la copia fiel y directamente restaurable en el volumen.
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const tmp = join(tmpdir(), `quest-export-${randomUUID()}.db`);
  try {
    await prisma.$executeRawUnsafe(`VACUUM INTO '${tmp.replace(/'/g, "''")}'`);
    const data = await readFile(tmp);
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="quest-log-${stamp}.db"`,
        "Cache-Control": "no-store",
      },
    });
  } finally {
    await rm(tmp, { force: true });
  }
}

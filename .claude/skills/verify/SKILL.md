---
name: verify
description: Cómo verificar Quest Log end-to-end - levantar el contenedor y recorrer la app real con Playwright
---

# Verificar Quest Log

## Levantar

> ⚠️ **Si el contenedor de producción está corriendo, páralo antes**
> (`docker compose stop`, reversible): ocupa el puerto 3000 y `next dev`
> saltaría en silencio a otro puerto, con lo que el e2e (hardcodeado a :3000)
> escribiría datos de prueba en la BD REAL. El script tiene una guarda que
> aborta si la BD no está virgen, pero no dependas solo de ella.

```bash
# Opción sin tocar datos reales (preferida en la máquina del usuario):
docker compose stop
Remove-Item prisma/e2e.db -Force; $env:DATABASE_URL = "file:./e2e.db"
npx prisma migrate deploy
$env:DATABASE_URL = "file:./e2e.db"; npm run dev   # confirma que dice :3000
# Al terminar: matar el dev server y docker compose start

# Opción contenedor limpio (destruye el volumen quest-data — solo con backup):
docker compose down -v && docker compose up -d --build
```

App en http://localhost:3000. El primer arranque auto-crea usuario "Aventurero" y premios de ejemplo.

## Recorrer

```bash
node scripts/e2e-drive.mjs   # requiere Edge instalado (playwright-core channel msedge)
SHOT_DIR=<dir> node scripts/e2e-drive.mjs   # dónde dejar las capturas
```

Recorre: dashboard inicial → crear objetivo LP y semanal crítico → objetivo y tareas recurrentes (plantillas, toggle 🔁, pausa) → crear 2 tareas → completar/desmarcar (XP/monedas ×racha 🔥, devolución por asiento) → tienda sin saldo → cierre manual de semana → banner de penalización → "Asumido" → objetivo "✕ Fallido". Sale con código 1 y captura `99-error.png` si algo falla.

## Trampas conocidas

- El script debe ejecutarse desde la raíz del repo (resuelve `playwright-core` de node_modules).
- Los server actions tardan: tras acciones que revalidan, esperar texto que solo exista tras el commit (no textos que ya estén en formularios) o recargar en bucle.
- Los `<details>` de los formularios se re-pliegan con cada revalidación RSC: abrirlos por JS (`el.open = true`), no con click en el summary.
- `getByText` casa por **subcadena**: `"0 / 100 XP"` también casa con `"10 / 100 XP"`, así que una espera numérica puede resolverse contra el DOM viejo. Usar `{ exact: true }` en esperas de texto numérico.
- Puerto 3000: si compose falla con "port not available", suele haber un `node` huérfano del dev server (matarlo con `Get-NetTCPConnection -LocalPort 3000`).

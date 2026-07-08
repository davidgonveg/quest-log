---
name: verify
description: Cómo verificar Quest Log end-to-end - levantar el contenedor y recorrer la app real con Playwright
---

# Verificar Quest Log

## Levantar

```bash
docker compose down -v && docker compose up -d --build   # BD limpia
# o en dev: npm run dev  (BD en prisma/dev.db, seed con npm run db:seed)
```

App en http://localhost:3000. El primer arranque auto-crea usuario "Aventurero" y premios de ejemplo.

## Recorrer

```bash
node scripts/e2e-drive.mjs   # requiere Edge instalado (playwright-core channel msedge)
SHOT_DIR=<dir> node scripts/e2e-drive.mjs   # dónde dejar las capturas
```

Recorre: dashboard inicial → crear objetivo LP y semanal crítico → crear 2 tareas → completar/desmarcar (XP/monedas) → tienda sin saldo → cierre manual de semana → banner de penalización → "Asumido" → objetivo "✕ Fallido". Sale con código 1 y captura `99-error.png` si algo falla.

## Trampas conocidas

- El script debe ejecutarse desde la raíz del repo (resuelve `playwright-core` de node_modules).
- Los server actions tardan: tras acciones que revalidan, esperar texto que solo exista tras el commit (no textos que ya estén en formularios) o recargar en bucle.
- Los `<details>` de los formularios se re-pliegan con cada revalidación RSC: abrirlos por JS (`el.open = true`), no con click en el summary.
- Puerto 3000: si compose falla con "port not available", suele haber un `node` huérfano del dev server (matarlo con `Get-NetTCPConnection -LocalPort 3000`).

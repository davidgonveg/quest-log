# Quest Log ⚔️

Organizador semanal gamificado y autohospedado. Convierte tus objetivos en
misiones: gana XP y monedas al cumplir tareas, canjéalas por premios reales en
la tienda, y asume las consecuencias si dejas caer un objetivo crítico.

Mobile-first (PWA instalable), modo oscuro nativo, un solo usuario, sin cuentas.

## Arrancar con Docker (recomendado)

```bash
docker compose up -d --build
```

Abre **http://localhost:3000** (o `http://<ip-del-servidor>:3000` desde el
móvil). El primer arranque crea tu perfil y unos premios de ejemplo; la base de
datos vive en el volumen `quest-data` y sobrevive a reinicios y rebuilds.

Para instalarla como app en el móvil: abre la URL en el navegador → menú →
"Añadir a pantalla de inicio".

## Cómo se juega

1. **Objetivos** 🎯 — crea objetivos a largo plazo ("Ponerme en forma") y
   cuélgales objetivos semanales. Marca como **crítico** lo innegociable.
2. **Tareas** — añade tareas a la semana (con día y dificultad). Completarlas
   da XP (progresión de nivel) y monedas 🪙.
3. **Tienda** 🪙 — define premios reales ("Ver un capítulo", "Comprar un
   antojo") y canjéalos con tus monedas. Sin saldo no hay premio.
4. **Cierre de semana** — el domingo a medianoche la semana se cierra sola:
   los objetivos con todas sus tareas hechas quedan cumplidos; cada **crítico
   incumplido resta XP y monedas** y te deja un mensaje de decepción en el
   dashboard que tendrás que asumir. Lo prometido es deuda — contigo.

## Desarrollo

```bash
npm install
npx prisma migrate dev   # crea prisma/dev.db
npm run db:seed          # datos de demostración
npm run dev              # http://localhost:3000
npm test                 # tests de la lógica de dominio (Vitest)
node scripts/e2e-drive.mjs  # recorrido end-to-end (requiere Edge y la app corriendo)
```

Stack: Next.js 16 (App Router) · Tailwind CSS 4 · Prisma 6 + SQLite · Docker.
El diseño completo está en `docs/superpowers/specs/2026-07-08-quest-log-design.md`.

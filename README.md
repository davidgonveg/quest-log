# Quest Log ⚔️

Organizador semanal gamificado y autohospedado. Convierte tus objetivos en
misiones: gana XP y monedas al cumplir tareas, canjéalas por premios reales en
la tienda, y asume las consecuencias si dejas caer un objetivo crítico.

Mobile-first (PWA instalable), modo oscuro nativo, un solo usuario, sin cuentas.

## Arrancar con Docker (recomendado)

```bash
docker compose up -d --build
```

Abre **http://localhost:3000**. El primer arranque crea tu perfil y unos premios
de ejemplo; la base de datos vive en el volumen `quest-data` y sobrevive a
reinicios y rebuilds.

## Instalar en el móvil

La app es una PWA instalable, pero **no funciona sin el servidor**: el service
worker (`public/sw.js`) es mínimo y no cachea nada offline. El equipo que la
sirve tiene que estar encendido siempre que quieras abrirla.

### 1. Haz accesible el puerto 3000 en la red local

Averigua la IP del equipo servidor:

```powershell
ipconfig            # Windows: "Dirección IPv4" del adaptador WiFi/Ethernet
```

```bash
ip addr | grep inet  # Linux/macOS
```

En Windows, el firewall bloquea el 3000 desde otros dispositivos. Abre una
PowerShell **como administrador**, una sola vez:

```powershell
New-NetFirewallRule -DisplayName "Quest Log" -Direction Inbound `
  -LocalPort 3000 -Protocol TCP -Action Allow -Profile Private
```

> `-Profile Private` limita la regla a redes marcadas como privadas: en una WiFi
> pública el puerto sigue cerrado. Si no conecta, revisa que tu red doméstica
> esté clasificada como privada (`Get-NetConnectionProfile`).

### 2. Añádela a la pantalla de inicio

Con el móvil en la **misma WiFi**, abre `http://<ip-del-servidor>:3000`.

- **iPhone/iPad (Safari)** — Compartir → *Añadir a pantalla de inicio*. Queda
  como app real: pantalla completa, sin barra de navegador, icono y fondo
  propios. Tiene que ser Safari; desde Chrome en iOS el resultado es peor.
- **Android (Chrome)** — menú ⋮ → *Añadir a pantalla de inicio*. Por `http://`
  a una IP local Chrome **no** considera el sitio contexto seguro, así que no
  registra el service worker ni ofrece *Instalar aplicación*: obtienes un acceso
  directo que abre Chrome con su barra, no la experiencia standalone. Para la
  instalación completa necesitas HTTPS (siguiente sección).

### 3. HTTPS y acceso desde fuera de casa (opcional)

Resuelve de una vez la instalación completa en Android y el uso con datos
móviles, sin exponer nada a internet público. Con [Tailscale](https://tailscale.com)
instalado en el servidor y en el móvil (misma cuenta), en el servidor:

```bash
tailscale serve --bg 3000
```

Te devuelve una URL `https://<equipo>.<tailnet>.ts.net` con certificado válido.
Ábrela desde el móvil y Chrome ya ofrece *Instalar aplicación*. Requiere tener
MagicDNS y los certificados HTTPS activados en la consola de Tailscale
(Settings → DNS). Con esto puedes saltarte el paso 1: el tráfico va por la VPN,
no por el puerto 3000 abierto en la red local.

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

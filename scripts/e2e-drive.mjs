// Verificación end-to-end de Quest Log contra el contenedor Docker.
// Superficie: la web móvil real (Edge headless, viewport iPhone).
import { chromium } from "playwright-core";

const BASE = "http://localhost:3000";
const SHOT_DIR = process.env.SHOT_DIR ?? ".";
const results = [];
const log = (icon, msg) => {
  results.push(`${icon} ${msg}`);
  console.log(`${icon} ${msg}`);
};

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  colorScheme: "dark",
});

try {
  // 1. Dashboard inicial: usuario auto-creado, nivel 1, 0 monedas
  await page.goto(BASE, { waitUntil: "networkidle" });
  const header = await page.locator("header").innerText();
  log(
    header.includes("Nivel") && header.includes("Aventurero") ? "✅" : "❌",
    `Dashboard inicial → header: ${JSON.stringify(header.replace(/\n/g, " | "))}`,
  );
  await page.screenshot({ path: `${SHOT_DIR}/01-dash-inicial.png` });

  // 2. Crear objetivo a largo plazo
  await page.goto(`${BASE}/goals`, { waitUntil: "networkidle" });
  await page.locator("summary", { hasText: "Nuevo objetivo a largo plazo" }).click();
  const ltForm = page.locator("form", { has: page.getByRole("button", { name: "Crear objetivo", exact: true }) });
  await ltForm.getByPlaceholder("Ej. Ponerme en forma").fill("Ponerme en forma");
  await ltForm.getByPlaceholder("💪").fill("💪");
  await ltForm.getByRole("button", { name: "Crear objetivo", exact: true }).click();
  await page.getByText("0 de 0 semanas cumplidas").first().waitFor({ timeout: 10000 });
  log("✅", "Objetivo a largo plazo creado y visible con barra de progreso");

  // 3. Crear objetivo semanal CRÍTICO vinculado
  await page.locator("summary", { hasText: "Nuevo objetivo semanal" }).click();
  const wForm = page.locator("form", { has: page.getByRole("button", { name: "Crear objetivo semanal" }) });
  await wForm.getByPlaceholder("Ej. Entrenar 3 días").fill("Entrenar 2 veces");
  await wForm.locator("select[name=longTermGoalId]").selectOption({ label: "Ponerme en forma" });
  await wForm.locator("input[name=isCritical]").check();
  await wForm.getByRole("button", { name: "Crear objetivo semanal" }).click();
  // "Sin tareas" solo aparece en la tarjeta del objetivo ya creado
  // (el texto "Crítico" a secas también está en la etiqueta del checkbox).
  await page.getByText("Sin tareas").first().waitFor({ timeout: 10000 });
  log("✅", "Objetivo semanal crítico creado (tarjeta visible)");

  // 4. Crear dos tareas fáciles ligadas al objetivo (solo completaremos una)
  for (const title of ["Salir a correr", "Estirar 10 min"]) {
    await page.goto(`${BASE}/tasks`, { waitUntil: "networkidle" });
    // Abrir el <details> por JS: las revalidaciones RSC lo re-pliegan y
    // hacen inestable el click sobre el summary.
    await page.locator("details").evaluateAll((els) => els.forEach((e) => (e.open = true)));
    const tForm = page.locator("form", { has: page.getByRole("button", { name: "Añadir tarea" }) });
    await tForm.getByPlaceholder("Ej. Entrenar 45 min").fill(title);
    await tForm.locator("select[name=difficulty]").selectOption("EASY");
    await tForm.locator("select[name=weeklyGoalId]").selectOption({ label: "Entrenar 2 veces" });
    await tForm.getByRole("button", { name: "Añadir tarea" }).click();
    await page.getByText(title).first().waitFor({ timeout: 10000 });
  }
  log("✅", "Dos tareas EASY creadas y agrupadas en 'Cualquier día'");

  // 5. Completar UNA tarea desde el dashboard → +10 XP, +5 monedas
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Completar Salir a correr/ }).click();
  await page.getByText("10 / 100 XP").waitFor({ timeout: 10000 });
  const coins = await page.locator("header").getByText("5", { exact: true }).count();
  log(
    coins > 0 ? "✅" : "❌",
    "Completar tarea → barra de XP marca 10/100 y las monedas suben a 5",
  );
  await page.screenshot({ path: `${SHOT_DIR}/02-dash-tarea-completada.png` });

  // 🔍 6. Desmarcar la misma tarea → los puntos se devuelven
  await page.getByRole("button", { name: /Desmarcar Salir a correr/ }).click();
  await page.getByText("0 / 100 XP").waitFor({ timeout: 10000 });
  log("🔍", "Desmarcar la tarea devuelve los puntos (0/100 XP de nuevo)");
  await page.getByRole("button", { name: /Completar Salir a correr/ }).click();
  await page.getByText("10 / 100 XP").waitFor({ timeout: 10000 });

  // 🔍 7. Tienda sin saldo: canjear debe estar deshabilitado
  await page.goto(`${BASE}/shop`, { waitUntil: "networkidle" });
  const redeemBtn = page.getByRole("button", { name: "Canjear" }).first();
  const disabled = await redeemBtn.isDisabled();
  log(
    disabled ? "🔍" : "❌",
    `Con 5 monedas, el premio de 30 tiene 'Canjear' ${disabled ? "deshabilitado" : "ACTIVO (mal)"}`,
  );
  await page.screenshot({ path: `${SHOT_DIR}/03-tienda-sin-saldo.png` });

  // 8. Cierre manual de semana → el crítico (1/2 tareas) falla → penalización
  await page.goto(`${BASE}/settings`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Cerrar la semana ahora" }).click();
  // El server action tarda un poco en confirmar; recargar hasta ver el banner.
  let bannerVisible = false;
  for (let i = 0; i < 10 && !bannerVisible; i++) {
    await page.waitForTimeout(1000);
    await page.goto(BASE, { waitUntil: "networkidle" });
    bannerVisible = (await page.getByText("Semana fallida").count()) > 0;
  }
  if (!bannerVisible) throw new Error("El banner de penalización no apareció tras cerrar la semana");
  const banner = await page.locator("aside").innerText();
  log("✅", `Cierre con crítico incumplido → banner: ${JSON.stringify(banner.replace(/\n/g, " | "))}`);
  await page.screenshot({ path: `${SHOT_DIR}/04-penalizacion.png` });

  // 9. "Asumido" descarta el banner
  await page.getByRole("button", { name: "Asumido" }).click();
  await page.getByText("Semana fallida").waitFor({ state: "detached", timeout: 10000 });
  log("✅", "Botón 'Asumido' descarta el banner de penalización");

  // 🔍 10. El objetivo crítico aparece como fallido en /goals
  await page.goto(`${BASE}/goals`, { waitUntil: "networkidle" });
  const failed = await page.getByText("✕ Fallido").count();
  log(failed > 0 ? "🔍" : "❌", "El objetivo crítico figura como '✕ Fallido' tras el cierre");
} catch (err) {
  log("❌", `Excepción: ${err.message}`);
  await page.screenshot({ path: `${SHOT_DIR}/99-error.png` }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
  console.log("\n=== RESUMEN ===");
  for (const r of results) console.log(r);
}

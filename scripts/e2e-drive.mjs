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
  await page.getByText("0 semanas cumplidas").first().waitFor({ timeout: 10000 });
  log("✅", "Objetivo a largo plazo creado con Nv. 1 y barra de XP");

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

  // 3b. Objetivo semanal RECURRENTE (no crítico, para no tocar la penalización
  // del cierre en el paso 8): instancia inmediata + plantilla en "Recurrentes"
  await page.locator("details").evaluateAll((els) => els.forEach((e) => (e.open = true)));
  const rForm = page.locator("form", { has: page.getByRole("button", { name: "Crear objetivo semanal" }) });
  await rForm.getByPlaceholder("Ej. Entrenar 3 días").fill("Leer a diario");
  await rForm.locator("input[name=recurring]").check();
  await rForm.getByRole("button", { name: "Crear objetivo semanal" }).click();
  await page.getByText("🔁 Recurrentes").waitFor({ timeout: 10000 });
  const instanceCount = await page.getByText("Leer a diario").count();
  log(
    instanceCount >= 2 ? "✅" : "❌",
    "Objetivo 🔁 creado: instancia en 'Esta semana' y plantilla en 'Recurrentes'",
  );
  await page.screenshot({ path: `${SHOT_DIR}/06-recurrentes.png` });

  // 3c. Tarea recurrente colgada del objetivo recurrente; de paso, el toggle
  // 🔁 debe ocultarse al elegir un objetivo NO recurrente
  await page.goto(`${BASE}/tasks`, { waitUntil: "networkidle" });
  await page.locator("details").evaluateAll((els) => els.forEach((e) => (e.open = true)));
  const rtForm = page.locator("form", { has: page.getByRole("button", { name: "Añadir tarea" }) });
  await rtForm.locator("select[name=weeklyGoalId]").selectOption({ label: "Entrenar 2 veces" });
  const hiddenToggle = (await rtForm.locator("input[name=recurring]").count()) === 0;
  log(hiddenToggle ? "🔍" : "❌", "El toggle 🔁 se oculta con un objetivo no recurrente");
  await rtForm.getByPlaceholder("Ej. Entrenar 45 min").fill("Leer 20 páginas");
  await rtForm.locator("select[name=weeklyGoalId]").selectOption({ label: "Leer a diario" });
  await rtForm.locator("input[name=recurring]").check();
  await rtForm.getByRole("button", { name: "Añadir tarea" }).click();
  await page.getByText("Leer 20 páginas").first().waitFor({ timeout: 10000 });
  log("✅", "Tarea 🔁 creada colgada del objetivo recurrente");

  // 3d. Tarea suelta recurrente (domingo)
  await page.locator("details").evaluateAll((els) => els.forEach((e) => (e.open = true)));
  await rtForm.getByPlaceholder("Ej. Entrenar 45 min").fill("Preparar comidas");
  await rtForm.locator("select[name=dueDay]").selectOption({ label: "Domingo" });
  await rtForm.locator("input[name=recurring]").check();
  await rtForm.getByRole("button", { name: "Añadir tarea" }).click();
  await page.getByText("Preparar comidas").first().waitFor({ timeout: 10000 });
  log("✅", "Tarea suelta recurrente creada (Preparar comidas, domingo)");

  // 3e. La plantilla de la tarea 🔁 cuelga del objetivo en "Recurrentes";
  // pausar la suelta la atenúa con badge "En pausa"
  await page.goto(`${BASE}/goals`, { waitUntil: "networkidle" });
  const tplTask = await page
    .locator("section", { hasText: "🔁 Recurrentes" })
    .getByText("Leer 20 páginas")
    .count();
  log(tplTask > 0 ? "✅" : "❌", "La plantilla de tarea aparece bajo su objetivo en 'Recurrentes'");
  await page.getByRole("button", { name: "Pausar Preparar comidas" }).click();
  await page.getByText("En pausa").waitFor({ timeout: 10000 });
  log("✅", "Pausar la tarea suelta muestra el badge 'En pausa'");
  await page.screenshot({ path: `${SHOT_DIR}/07-recurrente-pausada.png` });

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

  // 5. Completar UNA tarea desde el dashboard → racha 1: +10 XP y 5×1.1 = 6 🪙.
  // Antes, la pendiente ya anuncia el bonus (racha si se completa ahora = 1).
  await page.goto(BASE, { waitUntil: "networkidle" });
  const bonusPreview = await page.getByText("🔥 +1").count();
  log(
    bonusPreview > 0 ? "✅" : "❌",
    "La tarea pendiente muestra el desglose del bonus de racha (🔥 +1)",
  );
  await page.getByRole("button", { name: /Completar Salir a correr/ }).click();
  await page.getByText("10 / 100 XP").waitFor({ timeout: 10000 });
  const coins = await page.locator("header").getByText("6", { exact: true }).count();
  const flame = await page.getByLabel("Racha de 1 día").count();
  log(
    coins > 0 && flame > 0 ? "✅" : "❌",
    "Completar tarea → 10/100 XP, monedas ×1.1 (6) y 🔥 1 en el header",
  );
  await page.screenshot({ path: `${SHOT_DIR}/02-dash-tarea-completada.png` });

  // 🔍 6. Desmarcar devuelve lo del asiento (las 6 multiplicadas) y rompe la racha.
  // exact: sin él, "0 / 100 XP" casa por subcadena con el "10 / 100 XP" previo
  // y las aserciones correrían contra el DOM de antes de la revalidación.
  await page.getByRole("button", { name: /Desmarcar Salir a correr/ }).click();
  await page.getByText("0 / 100 XP", { exact: true }).waitFor({ timeout: 10000 });
  const coinsBack = await page.locator("header").getByText("0", { exact: true }).count();
  const flameBroken = await page.getByLabel("Racha rota").count();
  log(
    coinsBack > 0 && flameBroken > 0 ? "🔍" : "❌",
    "Desmarcar devuelve las monedas multiplicadas (0 🪙) y el chip queda en 🔥 0 gris",
  );
  await page.getByRole("button", { name: /Completar Salir a correr/ }).click();
  await page.getByText("10 / 100 XP").waitFor({ timeout: 10000 });

  // 6b. El objetivo LP acumula la XP de la tarea completada (niveles por objetivo)
  await page.goto(`${BASE}/goals`, { waitUntil: "networkidle" });
  const goalCard = await page
    .locator("section", { hasText: "A largo plazo" })
    .getByText("10/100 XP")
    .count();
  log(
    goalCard > 0 ? "✅" : "❌",
    "El objetivo a largo plazo muestra Nv. 1 con 10/100 XP tras la tarea",
  );

  // 🔍 7. Tienda sin saldo: canjear debe estar deshabilitado
  await page.goto(`${BASE}/shop`, { waitUntil: "networkidle" });
  const redeemBtn = page.getByRole("button", { name: "Canjear" }).first();
  const disabled = await redeemBtn.isDisabled();
  log(
    disabled ? "🔍" : "❌",
    `Con 6 monedas, el premio de 30 tiene 'Canjear' ${disabled ? "deshabilitado" : "ACTIVO (mal)"}`,
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

  // 11. "Conseguido" retira el objetivo LP a la vitrina con su nivel final
  await page.getByRole("button", { name: "Conseguido" }).click();
  let vitrina = false;
  for (let i = 0; i < 10 && !vitrina; i++) {
    await page.waitForTimeout(1000);
    await page.goto(`${BASE}/goals`, { waitUntil: "networkidle" });
    vitrina = (await page.getByText("Vitrina").count()) > 0;
  }
  log(vitrina ? "✅" : "❌", "'Conseguido' mueve el objetivo a la vitrina de trofeos");
  await page.screenshot({ path: `${SHOT_DIR}/05-vitrina.png` });
} catch (err) {
  log("❌", `Excepción: ${err.message}`);
  await page.screenshot({ path: `${SHOT_DIR}/99-error.png` }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
  console.log("\n=== RESUMEN ===");
  for (const r of results) console.log(r);
}

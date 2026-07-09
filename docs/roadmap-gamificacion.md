# Análisis y roadmap de gamificación (2026-07-08)

Objetivo declarado por David: que los sistemas de gamificación sean **lo más
adictivos posible** para engancharle a hacer lo que tiene que hacer. Este
documento analiza el estado actual contra los mecanismos conocidos de formación
de hábitos y propone mejoras priorizadas. Es un documento vivo: al implementar
una idea, moverla a "Hecho" con fecha y spec.

## Diagnóstico del sistema actual

Lo que ya funciona:

- **Recompensa inmediata** (XP/monedas al marcar) y **castigo con significado**
  (penalización + mensaje duro). Bucle básico completo.
- **Economía real**: las monedas compran premios de verdad — el refuerzo cruza
  a la vida física, poco habitual y muy potente.
- **Niveles por objetivo**: progreso visible incluso en metas sin final.

Las tres carencias más importantes frente a un juego que engancha:

1. **Todo es 100% predecible.** Sabes exactamente qué ganas antes de hacerlo.
   Los sistemas más adictivos que existen (tragaperras, cofres, drops) usan
   *recompensa variable*: la incertidumbre dispara más dopamina que el premio.
2. **No hay nada que perder por dejar de entrar.** La penalización castiga el
   incumplimiento semanal, pero saltarse un día no cuesta nada. La aversión a
   la pérdida (no romper la cadena) es el gancho diario más fuerte que hay.
3. **Completar apenas se celebra.** Una barra que avanza no es un momento.
   Subir de nivel debería sentirse como un evento.

## Prioridad 1 — el bucle diario (máximo impacto, poco código)

### 1.2 Botín aleatorio 🎁 (recompensa variable)
- Al completar una tarea, ~15% de probabilidad de "¡Botín!": bonus aleatorio
  (5-30 🪙 o un multiplicador puntual). Animación distinta, inesperada.
- Regla de diseño: el botín **solo existe al completar tareas** — nunca por
  abrir la app ni por acciones vacías. La variabilidad refuerza el trabajo.
- Registrado en el ledger con reason `LOOT`.

### 1.3 Combo del día ⚡
- Completar **todas** las tareas de hoy = "Día perfecto": bonus fijo (+20 🪙)
  + efecto visual. Empuja a terminar la lista, no solo a picotear.

### 1.4 Celebrar de verdad
- Subida de nivel (jugador u objetivo): overlay a pantalla completa con el
  nuevo nivel, chaflanes dorados, `navigator.vibrate` en móvil.
- Completar tarea: micro-explosión de partículas en el check (CSS, sin libs).
- Respetar `prefers-reduced-motion` como ya hace el resto.

## Prioridad 2 — el ritual semanal

### 2.1 El jefe de la semana 👹
- Reencuadre visual de los objetivos críticos: la semana es un *boss fight*.
  Tarjeta de "jefe" en el dashboard con barra de vida que **baja** al completar
  tareas críticas. Derrotarlo (todos los críticos cumplidos) = cofre semanal
  (botín grande). Perder = la penalización y el mensaje duro actuales.
- Mismo modelo de datos; es una capa de presentación sobre lo que ya existe.

### 2.2 Resumen de la semana (ritual de cierre)
- Al cerrar la semana (auto o manual), generar una pantalla-resumen tipo
  "Wrapped": XP ganada, mejor día, racha, jefe derrotado o no. El domingo por
  la noche se convierte en cita, no en trámite.
- El banner de penalización actual pasa a ser parte de este resumen.

### 2.3 Semana de redención
- Tras una semana fallida, ofrecer un pacto: "Cumple todos los críticos esta
  semana y recupera lo perdido +50%". Convierte el castigo en gancho de
  vuelta en lugar de razón de abandono. **Clave**: el sistema debe ser duro
  pero dejar siempre un camino de vuelta, o la adicción muere en frustración.

## Prioridad 3 — colección y largo plazo

- **Logros/insignias** 🏅: "100 tareas", "racha 30", "primer jefe", "Nv. 10".
  Vitrina ampliada. El completismo es un motor propio.
- **Heatmap de actividad** (estilo GitHub) en una vista de historial: la
  constancia se ve de un vistazo y los huecos duelen.
- **Oferta rotatoria en la tienda**: un premio con descuento que caduca el
  domingo — urgencia por ganar monedas *esta* semana.

## Mejoras técnicas (no gamificación, en orden de urgencia)

1. **Backup**: script/documentación para copiar `quest.db` del volumen
   (`docker cp` o bind mount) — es la única copia de los datos.
2. **CI en GitHub Actions**: lint + test en cada push (el e2e requiere Docker,
   puede ser job opcional).
3. **Auth opcional** (PIN simple) si algún día se expone a internet.
4. **Offline real en la PWA** cuando el uso móvil lo pida.

## Principios para no matarlo

- Una mecánica nueva por iteración, verificada en la app real antes de la
  siguiente. Añadir capas sin medir diluye el efecto de todas.
- Nada de recompensas por acciones vacías (abrir la app, mirar la tienda).
- El tono duro se queda — pero cada castigo necesita su camino de redención.
- Todo movimiento de puntos sigue pasando por el ledger.

## Hecho

- 2026-07-08 — Niveles por objetivo + vitrina de trofeos
  (`docs/superpowers/specs/2026-07-08-goal-levels-design.md`).
- 2026-07-08 — Objetivos y tareas recurrentes
  (`docs/superpowers/specs/2026-07-08-recurrencia-semanal-design.md`).
- 2026-07-08 — Racha diaria con multiplicador de monedas
  (`docs/superpowers/specs/2026-07-08-racha-diaria-design.md`).
- 2026-07-09 — Backup y export de la BD (`scripts/backup.mjs`, ruta
  `/api/export`, botón en Ajustes). Mejora técnica #1.
- 2026-07-09 — Bucle diario: botín aleatorio (1.2), día perfecto (1.3) y
  celebraciones (1.4) — `loot.ts`, `perfect-day.ts`, `CelebrationProvider`.
- 2026-07-09 — Resumen semanal "Wrapped" (2.2) — `week-summary.ts`,
  `WeekSummary`, `Week.summarySeen`.
- 2026-07-09 — Historial con heatmap de actividad (P3) — `history.ts`,
  vista `/history`, `ActivityHeatmap`.

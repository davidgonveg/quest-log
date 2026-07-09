# Diseño — "HUD glow-up": rediseño de interfaz para enganche

**Fecha:** 2026-07-09
**Estado:** aprobado (dirección), pendiente de spec-review del usuario

## Objetivo

Elevar el aspecto de Quest Log para maximizar el enganche del único usuario,
tirando de tres palancas motivacionales elegidas por él:

1. **Dopamina / recompensa** — que completar algo dé subidón.
2. **Progresión visible** — sentir el avance (nivel, XP, semana) a la vista.
3. **Orgullo / identidad** — que la app sea tan bonita que apetezca abrirla.

Se deja **fuera** deliberadamente la aversión a la pérdida: nada de castigo
visual nuevo. Todo el refuerzo es en positivo. (Los mensajes duros de cierre de
semana ya existentes no se tocan; siguen siendo severos por diseño.)

Intensidad de movimiento: **"subir bastante"** — vivo y con feedback, sin
marear. Siempre respetando `prefers-reduced-motion`.

## Principios y restricciones

- **Solo presentación.** No se toca lógica de dominio (`src/lib/*`), server
  actions, schema ni BD. Todo el trabajo vive en `src/components/`,
  `src/app/globals.css` y, como mucho, mapeos de datos ya existentes en las
  páginas RSC.
- **Se mantiene el lenguaje HUD** actual: chaflanes (`.hud-chamfer`), tokens de
  color de `globals.css`, tema oscuro nativo, tipografías Chakra Petch (display)
  + Instrument Sans (body). Es evolución, no rediseño desde cero.
- **Colores solo vía tokens** (`bg-surface`, `text-gold`…). Los nuevos efectos
  (glow, gradientes) se expresan con los tokens existentes o derivados de ellos;
  nada de hex sueltos en componentes. Tokens/keyframes nuevos van en
  `globals.css`.
- **Mobile-first**, zonas táctiles ≥ 44px intactas.
- **`prefers-reduced-motion`**: toda animación nueva debe degradar a estado
  final instantáneo (o desaparecer, en el caso de partículas). Se amplía el
  bloque `@media (prefers-reduced-motion: reduce)` existente.
- Todo texto visible en **español**.

## Componentes del rediseño

### 1. Cabecera del jugador → "carné de aventurero"
*Palancas: identidad + progresión.* Fichero: `PlayerHeader.tsx` (+ helper puro
nuevo para rangos).

- **Rango con nombre por nivel.** Además del número, un título derivado del
  nivel (ej. `Nivel 7 · Guardián`). El mapeo nivel→rango es una **función pura
  nueva** en `src/lib/gamification.ts` (`rankFor(level)`), con **test en
  `gamification.test.ts`** (TDD de dominio). Devuelve `{ name, tier }` donde
  `tier` selecciona un acento de color entre los tokens existentes
  (bronce/plata/oro/violeta… mapeados a `--gold`, `--violet`, etc.; sin colores
  nuevos). Nombres en español, tono épico coherente con el proyecto.
- **Contadores animados de XP y 🪙.** Componente cliente reutilizable
  `AnimatedNumber` (`src/components/ui/AnimatedNumber.tsx`): count-up al montar y
  bump/pulse cuando el valor cambia entre renders. Con reduce-motion muestra el
  valor final sin animar. La cabecera pasa a ser (o envuelve) un componente
  cliente para poder animar; los datos siguen viniendo del RSC por props.
- **Barra de XP con más profundidad** y meta siguiente explícita ("faltan N XP
  para nivel M"). Reaprovecha `ProgressBar` con el `shine` ya existente + realce
  visual (glow del relleno vía token).

### 2. Completar tarea → subidón
*Palanca: dopamina.* Ficheros: `TaskRow.tsx`, `globals.css`.

- **Pop del check** más satisfactorio (escala con curva elástica) además de las
  partículas ya existentes.
- **`+XP +🪙` flotante** que sube y se desvanece al marcar (float-up), reusando
  los datos que la fila ya tiene (`xpReward`, `coinReward`, `streakBonus`).
- **Barrido dorado sutil** sobre la fila al completar.
- Todo esto solo al **marcar** (no al desmarcar), y desactivado con
  reduce-motion. No cambia el contrato `onToggle`/optimistic.

### 3. Progreso semanal → hero radial
*Palanca: progresión.* Fichero: `WeekProgress.tsx` (+ posible
`ui/RadialProgress.tsx`).

- El `%` plano actual pasa a un **anillo/arco radial** (SVG) como protagonista,
  con el número animado (reusa `AnimatedNumber`) en el centro.
- La lista de objetivos y los chips de "Crítico"/"Hecho" se mantienen; solo
  cambia la cabecera de la tarjeta.

### 4. Capa premium global
*Palanca: orgullo.* Ficheros: `globals.css`, `ui/Card.tsx`, y ajuste ligero de
`BottomNav.tsx`.

- **Profundidad en superficies:** gradiente sutil y borde con glow interior en
  chaflanes/tarjetas (utilidades nuevas en `globals.css`, p. ej. `.hud-panel`).
- **Jerarquía tipográfica** afinada (tamaños/tracking de títulos de sección).
- **Nav inferior:** realce del estado activo (glow del icono/acento), sin
  romper el layout ni las zonas táctiles.

### 5. Vitrina de trofeos elevada
*Palanca: orgullo.* Fichero: `src/app/goals/page.tsx`, bloque `🏆 Vitrina`
(`trophies`, actualmente `Card` plana con `opacity-90`, líneas ~229-250).

- Presentación tipo "vitrina": tarjetas de trofeo con más peso visual para los
  objetivos con `completedAt` (icono/nivel destacados, acento dorado, sin el
  `opacity-90` que las apaga). Puede extraerse a un `TrophyCard` en
  `src/components/goals/`. Solo visual; la lógica `goalXpFrom` / `completedAt`
  no se toca.

## Qué NO entra (YAGNI / fuera de alcance)

- Sonido (no hay pista de audio en el proyecto; fuera).
- Avatares/imágenes de perfil (no hay assets; el "carné" usa rango + tipografía).
- Cambios de navegación, rutas o estructura de páginas.
- Aversión a la pérdida / nuevos castigos visuales.
- Cualquier animación "fly-to-counter" que exija coordinar posiciones entre
  componentes lejanos (complejidad alta, poco retorno). El bump del contador al
  cambiar de valor cubre la sensación sin ese acoplamiento.

## Verificación

- **Tests** de la función pura `rankFor` en `gamification.test.ts` antes de
  cablearla (TDD de dominio, según AGENTS.md).
- `npm run lint` y `npm test` en verde.
- Recorrido en la **app real** con el skill `verify`
  (`.claude/skills/verify/SKILL.md`): comprobar cabecera, marcar una tarea,
  subir de nivel/botín, progreso semanal, y ambos modos de `prefers-reduced-motion`.
- Comprobación visual en móvil (max-w-md) en tema oscuro (nativo) y claro.

## Riesgos

- **`PlayerHeader`/`WeekProgress` pasan a cliente** para animar: hay que cuidar
  que sigan recibiendo datos por props desde el RSC y no rompan el
  `force-dynamic`. Mitigación: los contadores animados son componentes cliente
  hoja; la página sigue siendo RSC.
- **RSC + Playwright**: trampas ya documentadas en el skill `verify`; seguirlas.
- Riesgo de "demasiado movimiento": calibrar duraciones cortas y respetar
  reduce-motion estrictamente.

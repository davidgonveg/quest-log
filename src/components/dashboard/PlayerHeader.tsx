import { levelProgress, rankFor, type RankAccent } from "@/lib/gamification";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

// Clases literales por acento (Tailwind JIT no ve clases dinámicas).
const ACCENT: Record<RankAccent, { text: string }> = {
  violet: { text: "text-violet" },
  green: { text: "text-green" },
  flame: { text: "text-flame" },
  gold: { text: "text-gold" },
};

export function PlayerHeader({
  name,
  xp,
  coins,
  streak,
  lostStreak,
}: {
  name: string;
  xp: number;
  coins: number;
  streak: number;
  lostStreak: number;
}) {
  const p = levelProgress(xp);
  const rank = rankFor(p.level);
  const accent = ACCENT[rank.accent];
  const broken = streak === 0;

  return (
    <header className="hud-chamfer hud-panel rise-in border border-edge p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">{name}</p>
          <p className="font-display text-3xl font-bold leading-tight">
            Nivel <span className={accent.text}>{p.level}</span>
          </p>
          <p className={`mt-0.5 font-display text-xs font-semibold uppercase tracking-[0.18em] ${accent.text}`}>
            {rank.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            aria-label={
              broken ? "Racha rota" : `Racha de ${streak} ${streak === 1 ? "día" : "días"}`
            }
            className={`hud-chamfer-sm flex items-center gap-1.5 px-3 py-2 ${
              broken ? "bg-surface-2 text-muted grayscale" : "bg-flame-soft text-flame"
            }`}
          >
            <span aria-hidden>🔥</span>
            <span className="font-display text-lg font-semibold">{streak}</span>
          </div>
          <div className="hud-chamfer-sm flex items-center gap-1.5 bg-gold-soft px-3 py-2">
            <span aria-hidden>🪙</span>
            <AnimatedNumber value={coins} className="font-display text-lg font-semibold text-gold" />
          </div>
        </div>
      </div>

      {broken && lostStreak >= 2 && (
        <p className="mt-2 text-xs text-muted">
          Racha de {lostStreak} días perdida. Hoy puede empezar otra.
        </p>
      )}

      <div className="mt-3">
        <ProgressBar pct={p.pct} color="var(--gold)" shine />
        <p className="mt-1.5 flex justify-between text-xs text-muted">
          <span>
            <AnimatedNumber value={p.current} /> / {p.needed} XP
          </span>
          <span>Faltan {Math.max(0, p.needed - p.current)} XP</span>
        </p>
      </div>
    </header>
  );
}

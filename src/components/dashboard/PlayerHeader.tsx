import { levelProgress } from "@/lib/gamification";
import { ProgressBar } from "@/components/ui/ProgressBar";

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
  const broken = streak === 0;

  return (
    <header className="hud-chamfer rise-in border border-edge bg-surface p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">{name}</p>
          <p className="font-display text-3xl font-bold leading-tight">
            Nivel <span className="text-violet">{p.level}</span>
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
            <span className="font-display text-lg font-semibold text-gold">{coins}</span>
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
            {p.current} / {p.needed} XP
          </span>
          <span>Nivel {p.level + 1} a la vista</span>
        </p>
      </div>
    </header>
  );
}

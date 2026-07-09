// Trofeo de la vitrina: objetivo LP conseguido. Peso visual (acento dorado,
// nivel destacado) para que dé orgullo mirarlo. Solo presentación.
export function TrophyCard({
  title,
  icon,
  level,
  month,
}: {
  title: string;
  icon: string | null;
  level: number;
  month: string;
}) {
  return (
    <div className="hud-chamfer flex items-center gap-3 border border-gold/40 bg-gold-soft p-3">
      <div className="hud-chamfer-sm flex h-12 w-12 shrink-0 items-center justify-center bg-surface text-2xl">
        {icon || "🏆"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-xs text-muted">Conseguido · {month}</p>
      </div>
      <span className="hud-chamfer-sm shrink-0 bg-surface px-2.5 py-1 font-display text-sm font-bold text-gold">
        Nv. {level}
      </span>
    </div>
  );
}

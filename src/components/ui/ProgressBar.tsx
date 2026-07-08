// Barra de progreso estilo HUD: chaflán + brillo animado opcional.
export function ProgressBar({
  pct,
  color = "var(--violet)",
  shine = false,
  className = "",
}: {
  pct: number;
  color?: string;
  shine?: boolean;
  className?: string;
}) {
  const width = Math.max(0, Math.min(100, pct));
  return (
    <div className={`hud-chamfer-sm h-3 w-full bg-surface-2 ${className}`}>
      <div
        className="relative h-full overflow-hidden transition-[width] duration-500 ease-out"
        style={{ width: `${width}%`, background: color }}
      >
        {shine && width > 0 && (
          <span
            aria-hidden
            className="xp-shine absolute inset-y-0 w-1/4 bg-white/35"
            style={{ filter: "blur(4px)" }}
          />
        )}
      </div>
    </div>
  );
}

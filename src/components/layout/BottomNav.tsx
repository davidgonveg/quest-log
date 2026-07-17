"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Inicio", icon: "⚔️" },
  { href: "/goals", label: "Objetivos", icon: "🎯" },
  { href: "/shop", label: "Tienda", icon: "🪙" },
  { href: "/history", label: "Historial", icon: "📊" },
  { href: "/settings", label: "Ajustes", icon: "⚙️" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-edge bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md">
        {TABS.map((tab) => {
          // /tasks es una página satélite del dashboard: mantiene Inicio activo.
          const active =
            tab.href === "/"
              ? pathname === "/" || pathname.startsWith("/tasks")
              : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors ${
                active ? "text-gold" : "text-muted hover:text-ink"
              }`}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-gold"
                  style={{ boxShadow: "0 0 8px var(--gold)" }}
                />
              )}
              <span
                className="text-lg leading-none"
                aria-hidden
                style={active ? { filter: "drop-shadow(0 0 6px var(--gold-soft))" } : undefined}
              >
                {tab.icon}
              </span>
              <span className={`font-display ${active ? "font-semibold" : ""}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

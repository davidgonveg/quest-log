"use client";

import { useEffect, useRef, useState } from "react";

// Contador con cuenta ascendente (dopamina) y "bump" al cambiar de valor.
// Arranca en 0 al montar para que el número "suba" al abrir la pantalla.
// Respeta prefers-reduced-motion: salta al valor final sin animar.
export function AnimatedNumber({
  value,
  className = "",
  duration = 600,
}: {
  value: number;
  className?: string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  const [bump, setBump] = useState(false);
  const prev = useRef(0);
  const raf = useRef<number | undefined>(undefined);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = prev.current;
    const to = value;
    prev.current = value;

    if (reduce || from === to) {
      setDisplay(to);
      return;
    }

    setBump(true);
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) {
        raf.current = requestAnimationFrame(tick);
      } else {
        setBump(false);
      }
    };
    raf.current = requestAnimationFrame(tick);

    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value, duration]);

  return <span className={`${bump ? "num-bump" : ""} ${className}`}>{display}</span>;
}

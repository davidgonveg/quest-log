"use client";

import { useEffect } from "react";

export function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Sin SW la app sigue funcionando; solo se pierde la instalabilidad.
      });
    }
  }, []);
  return null;
}

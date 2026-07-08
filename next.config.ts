import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Genera .next/standalone con el servidor y solo las deps necesarias:
  // es lo que copia la etapa final del Dockerfile.
  output: "standalone",
};

export default nextConfig;

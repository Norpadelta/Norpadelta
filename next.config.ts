import type { NextConfig } from "next";

const config: NextConfig = {
  // App independiente dentro del repo: la raíz del proyecto es esta carpeta.
  outputFileTracingRoot: __dirname,
};

export default config;

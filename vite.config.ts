import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: { target: "es2022", outDir: "dist", sourcemap: true, rollupOptions: { input: { index: "index.html", test3d: "test3d.html" } } },
  test: { environment: "node", include: ["tests/unit/**/*.test.ts"] },
} as never);

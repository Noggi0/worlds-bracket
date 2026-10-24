import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": `http://${env.HOST ?? "127.0.0.1"}:${env.PORT ?? "3001"}`,
      },
    },
    build: { outDir: "dist/client" },
    test: { include: ["tests/**/*.test.ts"] },
  };
});

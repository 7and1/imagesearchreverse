import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./src/test/vitest-setup.ts"],
    server: {
      deps: {
        inline: ["server-only"],
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "json", "html"],
      reportsDirectory: "./coverage",
      include: ["src/lib/**/*.ts", "src/app/api/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/test/**",
        "src/**/*.d.ts",
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Mock server-only module for testing
      "server-only": path.resolve(__dirname, "./src/test/server-only-mock.ts"),
    },
  },
});

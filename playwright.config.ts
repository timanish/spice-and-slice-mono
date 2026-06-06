import { defineConfig, devices } from "@playwright/test";
import { readFileSync } from "node:fs";

// --- Load test env from the same files the sandbox uses ----------------------
// We avoid a dotenv dependency with a tiny inline parser.
function loadEnv(path: string) {
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const [, k, v] = m;
      if (process.env[k] === undefined) process.env[k] = v.replace(/^["']|["']$/g, "");
    }
  } catch {
    /* file optional */
  }
}
loadEnv(".env.test");
loadEnv("supabase/functions/.env.test");

// @clerk/testing expects CLERK_PUBLISHABLE_KEY / CLERK_SECRET_KEY.
process.env.CLERK_PUBLISHABLE_KEY ||= process.env.VITE_CLERK_PUBLISHABLE_KEY;

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global.setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Starts the Vite test-mode server. If you already ran `npm run sandbox`,
  // Playwright reuses that running server instead of starting a new one.
  webServer: {
    command: "npm run dev:test",
    url: "http://localhost:5173",
    timeout: 120_000,
    reuseExistingServer: true,
  },
});

import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: "http://127.0.0.1:3001",
    viewport: { width: 1440, height: 1080 },
    trace: "retain-on-failure",
  },
  reporter: "list",
  webServer: [
    {
      command: "python3 -m uvicorn api.main:app --host 127.0.0.1 --port 8001",
      cwd: "..",
      url: "http://127.0.0.1:8001/health",
      env: {
        DEMO_MODE: "1",
        THERMOPB_DB_PATH: `/tmp/thermopb-e2e-${process.pid}-${Date.now()}.sqlite3`,
      },
      reuseExistingServer: false,
    },
    {
      command: "npm run dev -- --port 3001",
      url: "http://127.0.0.1:3001",
      env: { API_URL: "http://127.0.0.1:8001", NEXT_DIST_DIR: ".next-e2e" },
      reuseExistingServer: false,
    },
  ],
});

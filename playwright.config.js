import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "Desktop Chrome",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1320, height: 860 },
      },
    },
    {
      name: "Tablet",
      use: {
        browserName: "chromium",
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: "Mobile",
      use: {
        browserName: "chromium",
        viewport: { width: 375, height: 812 },
        isMobile: true,
      },
    },
  ],
  webServer: [
    {
      command: "node server/index.js",
      url: "http://localhost:3001/api/scanner/health",
      reuseExistingServer: true,
      timeout: 20000,
    },
    {
      command: "npm run dev",
      url: "http://localhost:5173",
      reuseExistingServer: true,
      timeout: 20000,
    },
  ],
});

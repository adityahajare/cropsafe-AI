import { createLovableConfig } from "lovable-agent-playwright-config/config";

export default createLovableConfig({
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      // Remove the empty use object or add actual settings
      use: {
        // Example: viewport: { width: 1280, height: 720 }
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 8080,
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
  },
});
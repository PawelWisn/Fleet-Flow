import { defineConfig } from "@playwright/test";

/**
 * End-to-end tests run against a live stack seeded with demo data (`docker compose up` + `./seed_demo_data.sh`).
 *
 *   BASE_URL  frontend (default http://localhost:8080)
 *   API_URL   backend  (default http://localhost:8000)
 *   PLAYWRIGHT_CHROMIUM_PATH  use an installed browser instead of Playwright's own download
 */
export default defineConfig({
	testDir: "./e2e",
	// Tests share one database, so run them one at a time
	workers: 1,
	fullyParallel: false,
	timeout: 45_000,
	expect: { timeout: 8_000 },
	reporter: [["list"]],
	use: {
		baseURL: process.env.BASE_URL || "http://localhost:8080",
		trace: "retain-on-failure",
		launchOptions: {
			executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
			args: ["--no-sandbox"],
		},
	},
});

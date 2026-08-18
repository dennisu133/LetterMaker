import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI ? "github" : "list",
	use: {
		baseURL: "http://127.0.0.1:4173",
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
		video: "retain-on-failure"
	},
	webServer: {
		// In CI the production bundle from the preceding build step is served so
		// the deployed artifact is what gets tested; locally the dev server keeps
		// the fast iteration loop.
		command: process.env.CI
			? "bun run preview -- --host 127.0.0.1 --port 4173 --strictPort"
			: "bun run dev -- --host 127.0.0.1 --port 4173 --strictPort",
		url: "http://127.0.0.1:4173",
		reuseExistingServer: !process.env.CI
	}
});

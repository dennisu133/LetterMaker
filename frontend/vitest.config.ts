import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src")
		}
	},
	test: {
		exclude: ["e2e/**", "node_modules/**", "dist/**"],
		environment: "jsdom",
		environmentOptions: {
			jsdom: {
				url: "http://localhost/"
			}
		},
		setupFiles: ["./src/test/environment.ts", "./src/test/setup.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "lcov"],
			include: ["src/**/*.{ts,tsx}"],
			exclude: ["src/components/ui/**", "src/test/**"],
			thresholds: {
				branches: 70,
				functions: 75,
				lines: 80,
				statements: 80
			}
		}
	}
});

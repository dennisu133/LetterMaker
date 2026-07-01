import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { compression } from "vite-plugin-compression2";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
		// Gzip and Brotli compression for pre-compressed static files
		compression({
			algorithms: ["gzip", "brotliCompress"],
			exclude: [/\.(br)$/, /\.(gz)$/],
			threshold: 1024 // Only compress files > 1KB
		})
	],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src")
		}
	},
	build: {
		// Optimize module preloading - exclude dynamically imported chunks
		modulePreload: {
			polyfill: true,
			resolveDependencies: (_filename, deps) => {
				// Don't preload pdfjs - it's dynamically imported when needed
				return deps.filter((dep) => !dep.includes("pdfjs"));
			}
		},
		rollupOptions: {
			output: {
				manualChunks(id) {
					// React core
					if (id.includes("node_modules/react-dom") || id.includes("node_modules/react/")) {
						return "react";
					}
					// NOTE: pdfjs-dist is NOT included here - it's dynamically imported
					// and will be automatically split into its own chunk by the bundler.
					// Adding it to manualChunks causes the dynamic import runtime helper
					// to be placed in the pdfjs chunk, which forces it to load on startup.

					// TipTap editor and ProseMirror dependencies
					if (id.includes("node_modules/@tiptap") || id.includes("node_modules/prosemirror")) {
						return "editor";
					}
					// i18n
					if (id.includes("node_modules/i18next") || id.includes("node_modules/react-i18next")) {
						return "i18n";
					}
					// UI utilities
					if (
						id.includes("node_modules/clsx") ||
						id.includes("node_modules/tailwind-merge") ||
						id.includes("node_modules/class-variance-authority") ||
						id.includes("node_modules/lucide-react")
					) {
						return "ui";
					}
					// Form handling
					if (
						id.includes("node_modules/react-hook-form") ||
						id.includes("node_modules/@hookform") ||
						id.includes("node_modules/zod")
					) {
						return "forms";
					}
					// Date utilities
					if (
						id.includes("node_modules/date-fns") ||
						id.includes("node_modules/react-day-picker")
					) {
						return "date";
					}
				}
			}
		}
	}
});

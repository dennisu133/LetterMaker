import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, type Plugin } from "vite";
import { compression } from "vite-plugin-compression2";

function inlineCss(): Plugin {
	let base = "/";

	return {
		name: "inline-css",
		apply: "build",
		configResolved(config) {
			base = config.base;
		},
		transformIndexHtml: {
			order: "post",
			handler(html, context) {
				if (!context.bundle) return html;

				for (const output of Object.values(context.bundle)) {
					if (output.type !== "asset" || !output.fileName.endsWith(".css")) continue;

					const href = `${base}${output.fileName}`;
					const escapedHref = href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
					const stylesheet = new RegExp(`<link[^>]+href=["']${escapedHref}["'][^>]*>`);
					const css =
						typeof output.source === "string"
							? output.source
							: new TextDecoder().decode(output.source);
					const inlinedHtml = html.replace(stylesheet, `<style>${css}</style>`);

					if (inlinedHtml !== html) {
						html = inlinedHtml;
						delete context.bundle[output.fileName];
					}
				}

				return html;
			}
		}
	};
}

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
		inlineCss(),
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
		}
	}
});

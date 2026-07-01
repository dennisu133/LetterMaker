import js from "@eslint/js";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
	globalIgnores(["dist"]),
	{
		files: ["**/*.{ts,tsx}"],
		rules: {
			"react-refresh/only-export-components": "off"
		},
		extends: [
			js.configs.recommended,
			tseslint.configs.recommended,
			reactHooks.configs.flat.recommended,
			reactRefresh.configs.vite,
			jsxA11y.flatConfigs.recommended
		],
		languageOptions: {
			ecmaVersion: 2020,
			globals: globals.browser
		}
	},
	{
		files: ["src/components/ui/**/*.{ts,tsx}"],
		rules: {
			"jsx-a11y/click-events-have-key-events": "off",
			"jsx-a11y/label-has-associated-control": "off",
			"jsx-a11y/no-noninteractive-element-interactions": "off"
		}
	}
]);

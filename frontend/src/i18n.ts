import type { Locale } from "date-fns";
import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

// Type for the locale JSON structure
interface LocaleModule {
	default: {
		language: {
			dateLocale: string;
		};
		[key: string]: unknown;
	};
}

// Auto-discover all locale files using Vite's glob import
const localeModules = import.meta.glob("./locales/*.json", { eager: true });

// Auto-discover all date-fns locales
const dateFnsLocaleModules = import.meta.glob<{ default: Locale }>(
	"../node_modules/date-fns/locale/*/index.mjs",
	{ eager: true }
);

// Build a lookup map for date-fns locales: "en-US" -> Locale
const dateFnsLocalesMap: Record<string, Locale> = {};
for (const path in dateFnsLocaleModules) {
	// Extract locale code from path: "../node_modules/date-fns/locale/en-US/index.mjs" -> "en-US"
	const localeCode = path.match(/locale\/([^/]+)\/index\.mjs$/)?.[1];
	if (localeCode) {
		dateFnsLocalesMap[localeCode] = dateFnsLocaleModules[path].default;
	}
}

// Build resources object dynamically from discovered files
const resources: Record<string, { translation: Record<string, unknown> }> = {};

// Build date locales mapping: language code -> date-fns Locale
export const dateLocales: Record<string, Locale> = {};

for (const path in localeModules) {
	// Extract language code from path: "./locales/en.json" -> "en"
	const langCode = path.match(/\.\/locales\/(.+)\.json$/)?.[1];
	if (langCode) {
		const module = localeModules[path] as LocaleModule;
		resources[langCode] = {
			translation: module.default
		};

		// Map the language code to its date-fns locale
		const dateLocaleCode = module.default.language?.dateLocale;
		if (dateLocaleCode && dateFnsLocalesMap[dateLocaleCode]) {
			dateLocales[langCode] = dateFnsLocalesMap[dateLocaleCode];
		}
	}
}

// Export list of supported language codes for use in other components
export const supportedLanguages = Object.keys(resources);

i18n
	// Detects user language
	.use(LanguageDetector)
	// Passes i18n down to react-i18next
	.use(initReactI18next)
	.init({
		resources,
		fallbackLng: "en",
		debug: false,
		interpolation: {
			escapeValue: false // React already safeguards against XSS
		}
	});

export default i18n;

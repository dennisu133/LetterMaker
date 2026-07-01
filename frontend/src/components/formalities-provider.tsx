import i18n from "i18next";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { supportedLanguages } from "@/i18n";

export type FormalitiesLanguage = string;

type FormalitiesProviderProps = {
	children: React.ReactNode;
	storageKey?: string;
};

type FormalitiesProviderState = {
	language: FormalitiesLanguage;
	setLanguage: (language: FormalitiesLanguage) => void;
};

const FormalitiesProviderContext = createContext<FormalitiesProviderState | null>(null);

// Get language from i18next, extracting base language code (e.g., "en-US" -> "en")
const getLanguageFromI18n = (): FormalitiesLanguage => {
	const i18nLang = i18n.language?.split("-")[0];
	return supportedLanguages.includes(i18nLang) ? i18nLang : "en";
};

export function FormalitiesProvider({
	children,
	storageKey = "formalities-language"
}: FormalitiesProviderProps) {
	const [language, setLanguageState] = useState<FormalitiesLanguage>(() => {
		// Prioritise localStorage if user manually changed it, otherwise use i18next's detected language
		const stored = localStorage.getItem(storageKey);
		return stored && supportedLanguages.includes(stored) ? stored : getLanguageFromI18n();
	});

	const setLanguage = useCallback(
		(language: FormalitiesLanguage) => {
			localStorage.setItem(storageKey, language);
			setLanguageState(language);
		},
		[storageKey]
	);

	const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);

	return (
		<FormalitiesProviderContext.Provider value={value}>
			{children}
		</FormalitiesProviderContext.Provider>
	);
}

export const useFormalities = () => {
	const context = useContext(FormalitiesProviderContext);

	if (!context) {
		throw new Error("useFormalities must be used within a FormalitiesProvider");
	}

	return context;
};

// Helper to get flag emoji for a language using i18n translations
export const getFormalitiesFlag = (language: FormalitiesLanguage): string => {
	return i18n.t("language.flag", { lng: language }) as string;
};

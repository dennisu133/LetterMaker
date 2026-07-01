import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
	children: React.ReactNode;
	defaultTheme?: Theme;
	storageKey?: string;
};

type ThemeProviderState = {
	theme: Theme;
	setTheme: (theme: Theme) => void;
};

const themes: Theme[] = ["dark", "light", "system"];

const ThemeProviderContext = createContext<ThemeProviderState | null>(null);

export function ThemeProvider({
	children,
	defaultTheme = "system",
	storageKey = "theme"
}: ThemeProviderProps) {
	const [theme, setThemeState] = useState<Theme>(() => {
		const storedTheme = localStorage.getItem(storageKey);
		return themes.includes(storedTheme as Theme) ? (storedTheme as Theme) : defaultTheme;
	});

	useLayoutEffect(() => {
		const root = window.document.documentElement;

		root.classList.remove("light", "dark");

		if (theme === "system") {
			const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
			const systemTheme = mediaQuery.matches ? "dark" : "light";

			root.classList.add(systemTheme);

			const listener = (e: MediaQueryListEvent) => {
				root.classList.remove("light", "dark");
				root.classList.add(e.matches ? "dark" : "light");
			};

			mediaQuery.addEventListener("change", listener);
			return () => mediaQuery.removeEventListener("change", listener);
		}

		root.classList.add(theme);
	}, [theme]);

	const setTheme = useCallback(
		(theme: Theme) => {
			localStorage.setItem(storageKey, theme);
			setThemeState(theme);
		},
		[storageKey]
	);

	const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

	return <ThemeProviderContext.Provider value={value}>{children}</ThemeProviderContext.Provider>;
}

export const useTheme = () => {
	const context = useContext(ThemeProviderContext);

	if (!context) throw new Error("useTheme must be used within a ThemeProvider");

	return context;
};

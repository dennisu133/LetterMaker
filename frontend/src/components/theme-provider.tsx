import type { ReactNode } from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useLayoutEffect,
	useMemo,
	useState
} from "react";

type Theme = "dark" | "light";

type ThemeProviderState = {
	/** The theme currently applied (the user override, or the system theme). */
	theme: Theme;
	/** Flips the theme. Toggling back to the system's current theme clears the
	 * override, so the page resumes following the OS preference. */
	toggleTheme: () => void;
};

const themes: Theme[] = ["dark", "light"];

const ThemeProviderContext = createContext<ThemeProviderState | null>(null);

const getSystemTheme = (): Theme =>
	window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

export function ThemeProvider({ children }: { children: ReactNode }) {
	// The stored value is only ever a manual override; absence means "follow
	// the system". Legacy values like "system" fail validation and are ignored.
	const [override, setOverride] = useState<Theme | null>(() => {
		const storedTheme = localStorage.getItem("theme");
		return themes.includes(storedTheme as Theme) ? (storedTheme as Theme) : null;
	});
	const [systemTheme, setSystemTheme] = useState<Theme>(getSystemTheme);

	const theme = override ?? systemTheme;

	// Keep following the OS preference while it changes
	useEffect(() => {
		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const listener = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? "dark" : "light");

		mediaQuery.addEventListener("change", listener);
		return () => mediaQuery.removeEventListener("change", listener);
	}, []);

	useLayoutEffect(() => {
		const root = window.document.documentElement;

		root.classList.remove("light", "dark");
		root.classList.add(theme);
	}, [theme]);

	const toggleTheme = useCallback(() => {
		const next: Theme = theme === "dark" ? "light" : "dark";

		if (next === getSystemTheme()) {
			// Back in sync with the OS: drop the override and keep following it
			localStorage.removeItem("theme");
			setOverride(null);
			setSystemTheme(next);
		} else {
			localStorage.setItem("theme", next);
			setOverride(next);
		}
	}, [theme]);

	const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

	return <ThemeProviderContext.Provider value={value}>{children}</ThemeProviderContext.Provider>;
}

export const useTheme = () => {
	const context = useContext(ThemeProviderContext);

	if (!context) throw new Error("useTheme must be used within a ThemeProvider");

	return context;
};

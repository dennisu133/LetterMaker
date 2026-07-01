import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FormalitiesProvider, useFormalities } from "@/components/formalities-provider";
import { ThemeProvider, useTheme } from "@/components/theme-provider";

function ThemeProbe() {
	const { theme, setTheme } = useTheme();
	return <button onClick={() => setTheme("dark")}>{theme}</button>;
}

function FormalitiesProbe() {
	const { language, setLanguage } = useFormalities();
	return <button onClick={() => setLanguage("en")}>{language}</button>;
}

describe("preference providers", () => {
	it("applies and persists theme changes", async () => {
		const user = userEvent.setup();
		render(
			<ThemeProvider defaultTheme="light">
				<ThemeProbe />
			</ThemeProvider>
		);

		expect(screen.getByRole("button", { name: "light" })).toBeVisible();
		expect(document.documentElement).toHaveClass("light");

		await user.click(screen.getByRole("button", { name: "light" }));

		expect(screen.getByRole("button", { name: "dark" })).toBeVisible();
		expect(document.documentElement).toHaveClass("dark");
		expect(localStorage.getItem("theme")).toBe("dark");
	});

	it("ignores invalid stored themes", () => {
		localStorage.setItem("theme", "ultraviolet");

		render(
			<ThemeProvider defaultTheme="light">
				<ThemeProbe />
			</ThemeProvider>
		);

		expect(screen.getByRole("button", { name: "light" })).toBeVisible();
	});

	it("loads and updates the independently persisted formalities language", async () => {
		const user = userEvent.setup();
		localStorage.setItem("formalities-language", "de");

		render(
			<FormalitiesProvider>
				<FormalitiesProbe />
			</FormalitiesProvider>
		);

		await user.click(screen.getByRole("button", { name: "de" }));

		expect(screen.getByRole("button", { name: "en" })).toBeVisible();
		expect(localStorage.getItem("formalities-language")).toBe("en");
	});

	it("fails loudly when preference hooks are used outside their providers", () => {
		vi.spyOn(console, "error").mockImplementation(() => undefined);

		expect(() => render(<ThemeProbe />)).toThrow("useTheme must be used within a ThemeProvider");
		expect(() => render(<FormalitiesProbe />)).toThrow(
			"useFormalities must be used within a FormalitiesProvider"
		);
	});
});

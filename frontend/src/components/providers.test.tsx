import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FormalitiesProvider, useFormalities } from "@/components/formalities-provider";
import { ThemeProvider, useTheme } from "@/components/theme-provider";

function ThemeProbe() {
	const { theme, toggleTheme } = useTheme();
	return <button onClick={toggleTheme}>{theme}</button>;
}

function FormalitiesProbe() {
	const { language, setLanguage } = useFormalities();
	return <button onClick={() => setLanguage("en")}>{language}</button>;
}

describe("preference providers", () => {
	it("follows the system theme until manually overridden", async () => {
		const user = userEvent.setup();
		render(
			<ThemeProvider>
				<ThemeProbe />
			</ThemeProvider>
		);

		// The mocked matchMedia reports a light system preference
		expect(screen.getByRole("button", { name: "light" })).toBeVisible();
		expect(document.documentElement).toHaveClass("light");
		expect(localStorage.getItem("theme")).toBeNull();

		await user.click(screen.getByRole("button", { name: "light" }));

		expect(screen.getByRole("button", { name: "dark" })).toBeVisible();
		expect(document.documentElement).toHaveClass("dark");
		expect(localStorage.getItem("theme")).toBe("dark");
	});

	it("clears the override when toggling back to the system theme", async () => {
		const user = userEvent.setup();
		localStorage.setItem("theme", "dark");

		render(
			<ThemeProvider>
				<ThemeProbe />
			</ThemeProvider>
		);

		expect(screen.getByRole("button", { name: "dark" })).toBeVisible();

		await user.click(screen.getByRole("button", { name: "dark" }));

		expect(screen.getByRole("button", { name: "light" })).toBeVisible();
		expect(document.documentElement).toHaveClass("light");
		expect(localStorage.getItem("theme")).toBeNull();
	});

	it.each(["ultraviolet", "system"])("ignores invalid or legacy stored theme %j", (value) => {
		localStorage.setItem("theme", value);

		render(
			<ThemeProvider>
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

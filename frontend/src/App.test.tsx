import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import App from "@/App";

describe("LetterMaker", () => {
	it("shows accessible, localized errors for an incomplete letter", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.click(screen.getByRole("button", { name: "Submit" }));

		const recipientName = screen.getByRole("textbox", { name: /Name.*\*/ });
		const editor = screen.getByRole("textbox", { name: "Letter content" });

		expect(await screen.findByText("Enter the recipient's name.")).toBeVisible();
		expect(screen.getByText("Enter the recipient's address.")).toBeVisible();
		expect(screen.getByText("Enter a subject.")).toBeVisible();
		expect(screen.getByText("Write the letter content.")).toBeVisible();
		expect(screen.getByText("Enter a signature.")).toBeVisible();
		expect(recipientName).toHaveAttribute("aria-invalid", "true");
		expect(recipientName).toHaveAccessibleDescription("Enter the recipient's name.");
		expect(editor).toHaveAttribute("aria-invalid", "true");
		expect(editor).toHaveAccessibleDescription("Write the letter content.");
	});

	it("updates the editor label and placeholder when the language changes", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.click(screen.getByRole("button", { name: "Switch language" }));
		await user.click(await screen.findByRole("menuitem", { name: "🇩🇪 Deutsch" }));

		const editor = screen.getByRole("textbox", { name: "Briefinhalt" });
		const emptyParagraph = editor.querySelector("p");

		expect(screen.getByRole("button", { name: "Absenden" })).toBeVisible();
		expect(emptyParagraph).toHaveAttribute("data-placeholder", "Beginnen Sie mit Ihrem Brief…");
		expect(document.documentElement).toHaveAttribute("lang", "de");
	});

	it("fills and resets the complete example letter", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.click(screen.getByRole("button", { name: "Example" }));

		const recipientGroup = screen.getByRole("group", { name: "Recipient" });
		expect(within(recipientGroup).getByRole("textbox", { name: /Name/ })).toHaveValue(
			"Receiver Inc."
		);
		expect(screen.getByRole("textbox", { name: "Subject *" })).toHaveValue(
			"Example Subject\nfile number: 1234567890"
		);
		expect(screen.getByRole("textbox", { name: "Letter content" })).toHaveTextContent(
			"This is an example text"
		);

		await user.click(screen.getByRole("button", { name: "Reset" }));

		expect(within(recipientGroup).getByRole("textbox", { name: /Name/ })).toHaveValue("");
		expect(screen.getByRole("textbox", { name: "Subject *" })).toHaveValue("");
		expect(screen.getByRole("textbox", { name: "Letter content" })).toHaveTextContent("");
	});
});

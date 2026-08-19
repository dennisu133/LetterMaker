import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import App from "@/App";
import { openPdfInNewTab, submitLetter } from "@/lib/api";
import { validateStamp } from "@/lib/validateStamp";

vi.mock("@/lib/api", async (importOriginal) => {
	const original = await importOriginal<typeof import("@/lib/api")>();
	return {
		...original,
		openPdfInNewTab: vi.fn(),
		submitLetter: vi.fn()
	};
});

vi.mock("@/lib/validateStamp", () => ({
	validateStamp: vi.fn()
}));

describe("LetterMaker", () => {
	it("shows accessible, localized errors for an incomplete letter", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.click(screen.getByRole("button", { name: "Submit" }));

		const recipientName = screen.getByRole("textbox", { name: /Name.*\*/ });
		const editor = await screen.findByRole("textbox", { name: "Letter content" });

		expect(await screen.findByText("Enter the recipient's name.")).toBeVisible();
		expect(screen.getByText("Enter the recipient's address.")).toBeVisible();
		expect(screen.getByText("Enter a subject.")).toBeVisible();
		expect(screen.getByText("Write the letter content.")).toBeVisible();
		expect(screen.getByText("Enter a signature.")).toBeVisible();
		expect(recipientName).toHaveFocus();
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
		const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
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
		expect(confirm).toHaveBeenCalledWith(
			"Discard this letter and start over? This cannot be undone."
		);
	});

	it("renders the title as a plain heading", () => {
		render(<App />);

		expect(screen.getByRole("heading", { name: "LetterMaker" })).toBeVisible();
		expect(screen.queryByRole("button", { name: "LetterMaker" })).not.toBeInTheDocument();
	});

	it("preserves a dirty letter when destructive actions are cancelled", async () => {
		const user = userEvent.setup();
		const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
		render(<App />);
		const subject = screen.getByRole("textbox", { name: "Subject *" });

		await user.type(subject, "Keep me");
		await user.click(screen.getByRole("button", { name: "Reset" }));
		expect(subject).toHaveValue("Keep me");

		await user.click(screen.getByRole("button", { name: "Example" }));
		expect(subject).toHaveValue("Keep me");

		expect(confirm).toHaveBeenNthCalledWith(
			1,
			"Discard this letter and start over? This cannot be undone."
		);
		expect(confirm).toHaveBeenNthCalledWith(
			2,
			"Replace this letter with the example? This cannot be undone."
		);
	});

	it("submits a complete letter and opens the PDF", async () => {
		const user = userEvent.setup();
		const pdf = new Blob(["pdf"], { type: "application/pdf" });
		vi.mocked(submitLetter).mockResolvedValue({
			success: true,
			pdf
		});
		render(<App />);

		await user.click(screen.getByRole("button", { name: "Example" }));
		await user.click(screen.getByRole("button", { name: "Submit" }));

		await waitFor(() => expect(submitLetter).toHaveBeenCalledOnce());
		expect(submitLetter).toHaveBeenCalledWith(
			expect.objectContaining({
				mode: "manual",
				locale: "en-US",
				recipientName: "Receiver Inc.",
				salutation: "Dear Sir or Madam,"
			})
		);
		expect(openPdfInNewTab).toHaveBeenCalledWith(pdf);
		expect(screen.getByRole("button", { name: "Submit" })).toBeEnabled();
	});

	it("shows a clear error when an uploaded stamp is invalid", async () => {
		const user = userEvent.setup();
		const file = new File(["invalid"], "stamp.pdf", { type: "application/pdf" });
		vi.mocked(validateStamp).mockResolvedValue({
			valid: false,
			error: "invalid_file"
		});
		render(<App />);

		const input = document.querySelector<HTMLInputElement>('input[type="file"]');
		expect(input).not.toBeNull();
		await user.upload(input!, file);

		expect(await screen.findByText("Stamp validation failed")).toBeVisible();
		expect(screen.getByText("Please upload a valid PDF file.")).toBeVisible();
		expect(validateStamp).toHaveBeenCalledWith(file);
	});

	it("switches between stamp and manual address modes", async () => {
		const user = userEvent.setup();
		const file = new File(["valid"], "stamp.pdf", { type: "application/pdf" });
		vi.mocked(validateStamp).mockResolvedValue({ valid: true, file });
		render(<App />);

		const input = document.querySelector<HTMLInputElement>('input[type="file"]');
		await user.upload(input!, file);

		expect(await screen.findByText("Stamp uploaded successfully!")).toBeVisible();
		expect(screen.queryByRole("group", { name: "Recipient" })).not.toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Remove stamp" }));

		expect(screen.getByRole("group", { name: "Recipient" })).toBeVisible();
	});
});

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

test.beforeEach(async ({ page }) => {
	await page.goto("/");
});

async function loadLetterBody(page: Page) {
	const editor = page.locator("#content");
	if ((await editor.count()) === 0) {
		await page.getByRole("button", { name: "Start writing your letter…" }).dispatchEvent("click");
	}
	await expect(editor).toBeVisible();
	return editor;
}

test("moves keyboard focus into the editor when the deferred body loads", async ({ page }) => {
	await page.getByRole("button", { name: "," }).focus();
	await page.keyboard.press("Tab");

	await expect(page.locator("#content")).toBeFocused();
});

test("creates a new paragraph when pressing Enter in the editor", async ({ page }) => {
	// Regression: duplicate prosemirror-model copies in the bundle made
	// splitBlock throw, silently swallowing every Enter press in production.
	const editor = await loadLetterBody(page);
	await editor.click();
	await page.keyboard.type("First paragraph");
	await page.keyboard.press("Enter");
	await page.keyboard.type("Second paragraph");

	await expect(editor.locator("p")).toHaveCount(2);
	await expect(editor.locator("p").nth(1)).toHaveText("Second paragraph");
});

test("keeps the viewport at the bottom while the letter grows", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 500 });
	await (await loadLetterBody(page)).click();

	for (let line = 0; line < 30; line++) {
		await page.keyboard.type("Another line");
		await page.keyboard.press("Enter");
	}

	await expect
		.poll(() =>
			page.evaluate(
				() => document.documentElement.scrollHeight - window.innerHeight - window.scrollY
			)
		)
		.toBeLessThan(2);
});

test("keeps the toolbar in sync with keyboard formatting", async ({ page }) => {
	await (await loadLetterBody(page)).click();
	const bold = page.getByRole("button", { name: "Bold" });

	await page.keyboard.press("Control+b");
	await expect(bold).toHaveAttribute("aria-pressed", "true");
	await page.keyboard.press("Control+b");
	await expect(bold).toHaveAttribute("aria-pressed", "false");
});

test("submits the example letter", async ({ page }) => {
	await page.route("**/api/create", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/pdf",
			headers: {
				"Content-Disposition": 'attachment; filename="application.pdf"'
			},
			body: "%PDF-1.4 mocked"
		});
	});
	await page.evaluate(() => {
		window.open = (() => ({ closed: true })) as unknown as typeof window.open;
	});

	await page.getByRole("button", { name: "Example" }).click();
	await loadLetterBody(page);
	const requestPromise = page.waitForRequest("**/api/create");
	await page.getByRole("button", { name: "Submit" }).click();
	const request = await requestPromise;

	expect(request.method()).toBe("POST");
	expect(request.postData()).toContain('name="recipientName"');
	expect(request.postData()).toContain("Receiver Inc.");
	await expect(page.getByRole("button", { name: "Submit" })).toBeEnabled();
});

test("validates the bundled stamp examples in the real PDF.js worker", async ({ page }) => {
	const input = page.locator('input[type="file"]');
	await input.setInputFiles(path.resolve("reference/stamp_correct.pdf"));

	await expect(page.getByText("Stamp uploaded successfully!")).toBeVisible();
	await expect(page.getByRole("group", { name: "Recipient" })).toHaveCount(0);

	await page.getByRole("button", { name: "Remove stamp" }).click();
	await input.setInputFiles(path.resolve("reference/stamp_incorrect.pdf"));

	await expect(page.getByText("Stamp validation failed")).toBeVisible();
});

test("has no automatically detectable accessibility violations", async ({ page }) => {
	const initialResults = await new AxeBuilder({ page }).analyze();
	expect(initialResults.violations).toEqual([]);

	await loadLetterBody(page);
	const loadedResults = await new AxeBuilder({ page }).analyze();
	expect(loadedResults.violations).toEqual([]);
});

test("does not overflow the narrow mobile viewport", async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 700 });

	const expectNoHorizontalOverflow = async () => {
		const dimensions = await page.evaluate(() => ({
			viewport: document.documentElement.clientWidth,
			document: document.documentElement.scrollWidth
		}));

		expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
	};

	await loadLetterBody(page);
	await expectNoHorizontalOverflow();

	await page.getByRole("button", { name: "Switch language" }).click();
	await page.getByRole("menuitem", { name: "🇩🇪 Deutsch" }).click();
	await expect(page.getByRole("button", { name: "Briefmarke hochladen" })).toBeVisible();

	await expectNoHorizontalOverflow();
});

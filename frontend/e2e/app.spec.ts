import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import path from "node:path";

test.beforeEach(async ({ page }) => {
	await page.goto("/");
});

test("guides an incomplete submission with accessible errors", async ({ page }) => {
	await page.getByRole("button", { name: "Submit" }).click();

	const recipientName = page.locator("#recipientName");
	const editor = page.locator("#content");

	await expect(page.getByText("Enter the recipient's name.")).toBeVisible();
	await expect(page.getByText("Enter the recipient's address.")).toBeVisible();
	await expect(page.getByText("Write the letter content.")).toBeVisible();
	await expect(recipientName).toBeFocused();
	await expect(recipientName).toHaveAttribute("aria-invalid", "true");
	await expect(recipientName).toHaveAttribute("aria-describedby", "recipientName-error");
	await expect(editor).toHaveAttribute("role", "textbox");
	await expect(editor).toHaveAttribute("aria-invalid", "true");
});

test("keeps selected calendar dates on the intended local day", async ({ page }) => {
	const target = await page.evaluate(() => {
		const today = new Date();
		const date = new Date(today.getFullYear(), today.getMonth(), 15);
		const pad = (value: number) => String(value).padStart(2, "0");
		return {
			iso: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
			display: `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()}`
		};
	});

	await page.locator("#date").click();
	await page
		.locator(`[data-day="${target.iso}"] button, button[data-day="${target.iso}"]`)
		.first()
		.click();

	await expect(page.locator("#date")).toContainText(target.display);
});

test("updates all editor affordances when switching language", async ({ page }) => {
	await page.getByRole("button", { name: "Switch language" }).click();
	await page.getByRole("menuitem", { name: "🇩🇪 Deutsch" }).click();

	const editor = page.getByRole("textbox", { name: "Briefinhalt" });
	await expect(page.getByRole("button", { name: "Absenden" })).toBeVisible();
	await expect(editor.locator("p")).toHaveAttribute(
		"data-placeholder",
		"Beginnen Sie mit Ihrem Brief…"
	);
	await expect(page.locator("html")).toHaveAttribute("lang", "de");
});

test("submits the example letter and starts the cooldown", async ({ page }) => {
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
	const requestPromise = page.waitForRequest("**/api/create");
	await page.getByRole("button", { name: "Submit" }).click();
	const request = await requestPromise;

	expect(request.method()).toBe("POST");
	expect(request.postData()).toContain('name="recipientName"');
	expect(request.postData()).toContain("Receiver Inc.");
	await expect(page.getByRole("button", { name: /Wait [1-5]s/ })).toBeDisabled();
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
	const results = await new AxeBuilder({ page }).analyze();

	expect(results.violations).toEqual([]);
});

test("does not overflow the narrow mobile viewport", async ({ page }, testInfo) => {
	test.skip(testInfo.project.name !== "narrow-mobile", "Only relevant to the narrow viewport");

	const dimensions = await page.evaluate(() => ({
		viewport: window.innerWidth,
		document: document.documentElement.scrollWidth
	}));

	expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
});

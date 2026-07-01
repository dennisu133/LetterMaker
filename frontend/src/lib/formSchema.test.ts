import { describe, expect, it } from "vitest";

import { MAX_CONTENT } from "@/lib/constants";
import {
	createEmptyFormValues,
	formSchema,
	manualSchema,
	proseMirrorContentSchema,
	stampSchema
} from "@/lib/formSchema";
import { createDocFromText } from "@/lib/prosemirror";

const content = JSON.stringify(createDocFromText("A complete letter."));

const manualLetter = {
	mode: "manual" as const,
	date: "2026-07-15",
	subject: "Application",
	salutation: "Dear team",
	salutationComma: true,
	content,
	closing: "Best regards",
	signature: "Dennis",
	senderName: "Dennis",
	senderAddress: "Example Street 1",
	recipientName: "Example GmbH",
	recipientAddress: "Main Street 2"
};

describe("letter form schema", () => {
	it("accepts a complete manual letter", () => {
		expect(manualSchema.parse(manualLetter)).toEqual(manualLetter);
		expect(formSchema.parse(manualLetter)).toEqual(manualLetter);
	});

	it("requires recipient, subject, content, signature, and a real date", () => {
		const result = manualSchema.safeParse({
			...manualLetter,
			date: "2026-02-30",
			subject: "",
			content: JSON.stringify(createDocFromText("")),
			signature: "",
			recipientName: "",
			recipientAddress: ""
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues.map((issue) => issue.path[0])).toEqual(
				expect.arrayContaining([
					"date",
					"subject",
					"content",
					"signature",
					"recipientName",
					"recipientAddress"
				])
			);
		}
	});

	it("accepts stamp mode only with a File", () => {
		const stampFile = new File(["pdf"], "stamp.pdf", { type: "application/pdf" });
		const stampLetter = {
			...manualLetter,
			mode: "stamp" as const,
			stampFile
		};

		expect(stampSchema.safeParse(stampLetter).success).toBe(true);
		expect(stampSchema.safeParse({ ...stampLetter, stampFile: "stamp.pdf" }).success).toBe(false);
	});

	it.each(["", "{", '["not-a-document"]', JSON.stringify(createDocFromText(""))])(
		"rejects invalid or empty editor content %j",
		(value) => {
			expect(proseMirrorContentSchema.safeParse(value).success).toBe(false);
		}
	);

	it("enforces the plain-text editor character limit", () => {
		const oversized = JSON.stringify(createDocFromText("x".repeat(MAX_CONTENT + 1)));

		expect(proseMirrorContentSchema.safeParse(oversized).success).toBe(false);
	});

	it("creates defaults that match the manual branch", () => {
		const defaults = createEmptyFormValues();

		expect(defaults.mode).toBe("manual");
		expect(defaults.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		expect(defaults.salutationComma).toBe(true);
		expect(formSchema.safeParse(defaults).success).toBe(false);
	});
});

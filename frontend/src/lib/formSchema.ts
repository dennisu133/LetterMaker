import { z } from "zod";

import { MAX_CONTENT, MAX_INPUT, MAX_TEXT_AREA } from "@/lib/constants";
import { parseLocalDate, todayLocalDate } from "@/lib/date";
import { createDocFromText, extractPlainText, isValidProseMirrorDoc } from "@/lib/prosemirror";

// Custom Zod validator for ProseMirror JSON content
export const proseMirrorContentSchema = z.string().superRefine((val, ctx) => {
	// Must not be empty
	if (!val || val.trim() === "") {
		ctx.addIssue({
			code: "custom",
			message: "Content is required"
		});
		return;
	}

	// Must be valid JSON
	let parsed: unknown;
	try {
		parsed = JSON.parse(val);
	} catch (e) {
		console.error("Content validation failed: Invalid JSON", e);
		ctx.addIssue({
			code: "custom",
			message: "Invalid content format"
		});
		return;
	}

	// Must be a valid ProseMirror doc
	if (!isValidProseMirrorDoc(parsed)) {
		console.error("Content validation failed: Not a valid ProseMirror doc", parsed);
		ctx.addIssue({
			code: "custom",
			message: "Invalid content format"
		});
		return;
	}

	// Extract plain text and validate length
	const plainText = extractPlainText(parsed).trim();

	if (plainText.length === 0) {
		ctx.addIssue({
			code: "custom",
			message: "Content is required"
		});
		return;
	}

	if (plainText.length > MAX_CONTENT) {
		console.warn(`Content validation failed: Exceeds limit (${plainText.length} > ${MAX_CONTENT})`);
		ctx.addIssue({
			code: "custom",
			message: `Content must be ${MAX_CONTENT} characters or less`
		});
	}
});

// Common fields for both modes
const commonSchema = z.object({
	date: z.string().refine((value) => parseLocalDate(value) !== undefined, {
		message: "Please select a valid date"
	}),
	subject: z.string().min(1).max(MAX_TEXT_AREA),
	salutation: z.string().max(MAX_INPUT).optional(),
	salutationComma: z.boolean(),
	content: proseMirrorContentSchema,
	closing: z.string().max(MAX_INPUT).optional(),
	signature: z.string().min(1).max(MAX_TEXT_AREA)
});

// Schema for manual entry (no stamp)
export const manualSchema = commonSchema.extend({
	mode: z.literal("manual"),
	senderName: z.string().max(MAX_INPUT).optional(),
	senderAddress: z.string().max(MAX_TEXT_AREA).optional(),
	recipientName: z.string().min(1).max(MAX_INPUT),
	recipientAddress: z.string().min(1).max(MAX_TEXT_AREA)
});

// Schema for stamp upload - File object is stored directly (no base64)
export const stampSchema = commonSchema.extend({
	mode: z.literal("stamp"),
	// Validate that stampFile is a File instance
	stampFile: z.instanceof(File, { error: "A valid stamp file is required." })
});

export const formSchema = z.discriminatedUnion("mode", [manualSchema, stampSchema]);
export type FormValues = z.infer<typeof formSchema>;

// Type for manual mode values
export type ManualFormValues = z.infer<typeof manualSchema>;

// Type for stamp mode values
export type StampFormValues = z.infer<typeof stampSchema>;

// Helper to create empty form default values
export function createEmptyFormValues(): FormValues {
	const emptyContentJson = JSON.stringify(createDocFromText(""));
	return {
		mode: "manual",
		date: todayLocalDate(),
		subject: "",
		salutation: "",
		salutationComma: true,
		content: emptyContentJson,
		closing: "",
		signature: "",
		senderName: "",
		senderAddress: "",
		recipientName: "",
		recipientAddress: ""
	};
}

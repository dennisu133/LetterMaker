import type { JSONContent } from "@tiptap/react";

/**
 * Extract plain text from a ProseMirror JSON document.
 * Used for character count validation.
 *
 * Note: This only counts actual text characters, not newlines or whitespace
 * from block structure, to match TipTap's CharacterCount extension behavior.
 */
export function extractPlainText(doc: JSONContent): string {
	if (!doc) return "";

	let text = "";

	if (doc.type === "text" && doc.text) {
		return doc.text;
	}

	if (doc.content) {
		for (const node of doc.content) {
			text += extractPlainText(node);
		}
	}

	return text;
}

/**
 * Validate that a value is a valid ProseMirror JSON document.
 */
export function isValidProseMirrorDoc(value: unknown): value is JSONContent {
	if (typeof value !== "object" || value === null) return false;
	const doc = value as Record<string, unknown>;
	return doc.type === "doc" && Array.isArray(doc.content);
}

/**
 * Parse a JSON string into a ProseMirror document.
 * Returns null if parsing fails or the result is not a valid doc.
 */
export function parseProseMirrorJson(jsonString: string): JSONContent | null {
	try {
		const parsed = JSON.parse(jsonString);
		if (isValidProseMirrorDoc(parsed)) {
			return parsed;
		}
		return null;
	} catch {
		return null;
	}
}

/**
 * Create an empty ProseMirror document.
 */
export function createEmptyDoc(): JSONContent {
	return {
		type: "doc",
		content: [{ type: "paragraph" }]
	};
}

/**
 * Create a ProseMirror document from plain text.
 * Each line becomes a paragraph.
 */
export function createDocFromText(text: string): JSONContent {
	const lines = text.split("\n");
	const content = lines.map((line) => ({
		type: "paragraph" as const,
		content: line ? [{ type: "text" as const, text: line }] : undefined
	}));

	return {
		type: "doc",
		content
	};
}

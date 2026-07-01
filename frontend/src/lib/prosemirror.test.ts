import { describe, expect, it } from "vitest";

import {
	createDocFromText,
	createEmptyDoc,
	extractPlainText,
	isValidProseMirrorDoc,
	parseProseMirrorJson
} from "@/lib/prosemirror";

describe("ProseMirror helpers", () => {
	it("creates the empty document shape expected by TipTap", () => {
		expect(createEmptyDoc()).toEqual({
			type: "doc",
			content: [{ type: "paragraph" }]
		});
	});

	it("turns each line of plain text into a paragraph", () => {
		expect(createDocFromText("First\n\nThird")).toEqual({
			type: "doc",
			content: [
				{ type: "paragraph", content: [{ type: "text", text: "First" }] },
				{ type: "paragraph" },
				{ type: "paragraph", content: [{ type: "text", text: "Third" }] }
			]
		});
	});

	it("extracts nested text while ignoring formatting metadata", () => {
		const document = {
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [
						{ type: "text", text: "Hello " },
						{ type: "text", text: "world", marks: [{ type: "bold" }] }
					]
				},
				{
					type: "bulletList",
					content: [
						{
							type: "listItem",
							content: [{ type: "paragraph", content: [{ type: "text", text: "Item" }] }]
						}
					]
				}
			]
		};

		expect(extractPlainText(document)).toBe("Hello worldItem");
	});

	it.each([
		[null, false],
		[{}, false],
		[{ type: "doc" }, false],
		[{ type: "paragraph", content: [] }, false],
		[{ type: "doc", content: [] }, true]
	])("validates document shape %j", (value, expected) => {
		expect(isValidProseMirrorDoc(value)).toBe(expected);
	});

	it("parses valid JSON documents and rejects malformed input", () => {
		const valid = JSON.stringify(createDocFromText("Hello"));

		expect(parseProseMirrorJson(valid)).toEqual(createDocFromText("Hello"));
		expect(parseProseMirrorJson("{")).toBeNull();
		expect(parseProseMirrorJson('{"type":"paragraph","content":[]}')).toBeNull();
	});
});

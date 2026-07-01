import { beforeEach, describe, expect, it, vi } from "vitest";

const pdfjs = vi.hoisted(() => ({
	getDocument: vi.fn(),
	GlobalWorkerOptions: { workerSrc: "" },
	OPS: {
		save: 1,
		restore: 2,
		transform: 3,
		paintImageXObject: 4,
		paintInlineImageXObject: 5,
		paintImageMaskXObject: 6
	}
}));

vi.mock("pdfjs-dist", () => pdfjs);

import { validateStamp } from "@/lib/validateStamp";

interface MockDocumentOptions {
	numPages?: number;
	author?: string;
	title?: string;
	imageTransform?: [number, number, number, number, number, number];
}

function mockDocument({
	numPages = 1,
	author = "Deutsche Post AG",
	title = "INTERNETMARKEN",
	imageTransform = [50, 0, 0, 50, 221.343, 636.722]
}: MockDocumentOptions = {}) {
	const page = {
		getViewport: vi.fn(() => ({ width: 595, height: 842 })),
		getOperatorList: vi.fn(async () => ({
			fnArray: [
				pdfjs.OPS.save,
				pdfjs.OPS.transform,
				pdfjs.OPS.paintImageXObject,
				pdfjs.OPS.restore
			],
			argsArray: [[], imageTransform, [], []]
		})),
		cleanup: vi.fn()
	};
	const document = {
		numPages,
		getMetadata: vi.fn(async () => ({ info: { Author: author, Title: title } })),
		getPage: vi.fn(async () => page),
		cleanup: vi.fn(async () => undefined)
	};
	pdfjs.getDocument.mockReturnValue({ promise: Promise.resolve(document) });

	return { document, page };
}

describe("stamp validation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("rejects non-PDF files before loading PDF.js", async () => {
		const file = new File(["hello"], "stamp.txt", { type: "text/plain" });

		await expect(validateStamp(file)).resolves.toEqual({
			valid: false,
			error: "invalid_file"
		});
		expect(pdfjs.getDocument).not.toHaveBeenCalled();
	});

	it("accepts a single-page Deutsche Post stamp at the expected position", async () => {
		const { document, page } = mockDocument();
		const file = new File(["pdf"], "stamp.pdf", { type: "application/pdf" });

		await expect(validateStamp(file)).resolves.toEqual({ valid: true, file });
		expect(document.getMetadata).toHaveBeenCalledOnce();
		expect(document.getPage).toHaveBeenCalledWith(1);
		expect(page.cleanup).toHaveBeenCalledOnce();
		expect(document.cleanup).toHaveBeenCalledOnce();
	});

	it("rejects multi-page PDFs", async () => {
		mockDocument({ numPages: 2 });
		const file = new File(["pdf"], "stamp.pdf", { type: "application/pdf" });

		await expect(validateStamp(file)).resolves.toEqual({
			valid: false,
			error: "invalid_file"
		});
	});

	it.each([
		["Unknown", "INTERNETMARKEN"],
		["Deutsche Post AG", "Ordinary PDF"]
	])("rejects unexpected metadata from %s / %s", async (author, title) => {
		mockDocument({ author, title });
		const file = new File(["pdf"], "stamp.pdf", { type: "application/pdf" });

		await expect(validateStamp(file)).resolves.toEqual({
			valid: false,
			error: "invalid_author"
		});
	});

	it("rejects stamps whose QR image is in the wrong position", async () => {
		mockDocument({ imageTransform: [50, 0, 0, 50, 10, 10] });
		const file = new File(["pdf"], "stamp.pdf", { type: "application/pdf" });

		await expect(validateStamp(file)).resolves.toEqual({
			valid: false,
			error: "invalid_format"
		});
	});
});

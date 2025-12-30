/**
 * @file Stamp validation for Deutsche Post digital stamps (Internetmarken).
 *
 * Validates that uploaded PDFs are authentic Deutsche Post stamps in the correct
 * "Einlegeblatt" (insert sheet) format, not the "Ausdruck" (printout) format.
 *
 * Two validation levels:
 * 1. Metadata check: Verifies PDF author and title (easily spoofed)
 * 2. Position check: Verifies QR code is in the correct position (reliable)
 *
 * PDF.js is dynamically imported to reduce initial bundle size.
 */

// Import PDF.js worker URL dynamically to avoid bundling it in the main bundle
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

export type StampValidationResult =
	| { valid: true; file: File }
	| { valid: false; error: "invalid_file" | "invalid_author" | "invalid_format" };

/** 2D affine transformation matrix: [a, b, c, d, e, f] */
type Matrix = [number, number, number, number, number, number];

/** Minimal type for PDFPageProxy to avoid importing pdfjs-dist at top level */
interface PDFPageProxy {
	getViewport(params: { scale: number; rotation: number }): { width: number; height: number };
	getOperatorList(): Promise<{ fnArray: number[]; argsArray: unknown[] }>;
	cleanup(): void;
}

/**
 * Expected center coordinates (in PDF points) of the QR code on a valid
 * "Einlegeblatt" stamp. Determined by inspecting known-good stamp PDFs.
 */
const EXPECTED_QR_CENTER = { x: 246.343, y: 661.722 };

/** Tolerance (in PDF points) for QR code position matching. */
const POSITION_TOLERANCE = 5;

/** Identity matrix - no transformation */
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/**
 * Multiplies two 2D affine transformation matrices.
 * Matrix format: [a, b, c, d, e, f] maps (x, y) → (ax + cy + e, bx + dy + f)
 */
function multiply(m1: Matrix, m2: Matrix): Matrix {
	const [a1, b1, c1, d1, e1, f1] = m1;
	const [a2, b2, c2, d2, e2, f2] = m2;
	return [
		a1 * a2 + c1 * b2,
		b1 * a2 + d1 * b2,
		a1 * c2 + c1 * d2,
		b1 * c2 + d1 * d2,
		a1 * e2 + c1 * f2 + e1,
		b1 * e2 + d1 * f2 + f1
	];
}

/**
 * Calculates image center and metrics from a transformation matrix.
 * Transforms the unit square corners to find the image bounds.
 */
function getImageMetrics(ctm: Matrix) {
	const [a, b, c, d, e, f] = ctm;

	// Transform unit square corners: (0,0), (1,0), (0,1), (1,1)
	const corners = [
		{ x: e, y: f }, // (0,0)
		{ x: a + e, y: b + f }, // (1,0)
		{ x: c + e, y: d + f }, // (0,1)
		{ x: a + c + e, y: b + d + f } // (1,1)
	];

	const xs = corners.map((p) => p.x);
	const ys = corners.map((p) => p.y);

	const width = Math.hypot(a, b);
	const height = Math.hypot(c, d);

	return {
		center: {
			x: (Math.min(...xs) + Math.max(...xs)) / 2,
			y: (Math.min(...ys) + Math.max(...ys)) / 2
		},
		width,
		height,
		area: Math.abs(a * d - b * c),
		aspectRatio: height === 0 ? Infinity : width / height
	};
}

/**
 * Finds the QR code center by analyzing PDF operator list.
 *
 * PDF rendering uses a Current Transformation Matrix (CTM) that gets modified
 * by save/restore/transform operations. When an image is drawn, the CTM at that
 * moment determines its position and size.
 */
async function findQRCodeCenter(
	page: PDFPageProxy,
	OPS: {
		save: number;
		restore: number;
		transform: number;
		paintImageXObject: number;
		paintInlineImageXObject: number;
		paintImageMaskXObject: number;
	}
): Promise<{ x: number; y: number } | null> {
	const viewport = page.getViewport({ scale: 1, rotation: 0 });
	const { fnArray, argsArray } = await page.getOperatorList();

	const images: ReturnType<typeof getImageMetrics>[] = [];
	const stack: Matrix[] = [];
	let ctm: Matrix = [...IDENTITY];

	for (let i = 0; i < fnArray.length; i++) {
		switch (fnArray[i]) {
			case OPS.save:
				stack.push([...ctm]);
				break;

			case OPS.restore:
				ctm = stack.pop() ?? [...IDENTITY];
				break;

			case OPS.transform:
				ctm = multiply(ctm, argsArray[i] as Matrix);
				break;

			case OPS.paintImageXObject:
			case OPS.paintInlineImageXObject:
			case OPS.paintImageMaskXObject:
				images.push(getImageMetrics(ctm));
				break;
		}
	}

	// Heuristic: QR code is the largest square-ish image that isn't full-page
	const maxDim = Math.min(viewport.width, viewport.height) * 0.9;

	const qrCandidate = images
		.filter((img) => img.width < maxDim && img.height < maxDim)
		.filter((img) => img.aspectRatio > 0.9 && img.aspectRatio < 1.1)
		.sort((a, b) => b.area - a.area)[0];

	return qrCandidate?.center ?? null;
}

/**
 * Checks if a center point is within tolerance of the expected QR position.
 */
function isValidQRPosition(center: { x: number; y: number }): boolean {
	const dx = Math.abs(center.x - EXPECTED_QR_CENTER.x);
	const dy = Math.abs(center.y - EXPECTED_QR_CENTER.y);
	return dx <= POSITION_TOLERANCE && dy <= POSITION_TOLERANCE;
}

/** Cached PDF.js module to avoid re-importing */
let pdfjsModule: typeof import("pdfjs-dist") | null = null;

/**
 * Lazily loads PDF.js and configures the worker.
 * The module is cached after first load.
 */
async function getPdfjs() {
	if (pdfjsModule) {
		return pdfjsModule;
	}

	// Dynamic import - this creates a separate chunk that's only loaded when needed
	const pdfjs = await import("pdfjs-dist");

	// Set up the worker for pdf.js using Vite's ?url import for proper asset handling
	pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

	pdfjsModule = pdfjs;
	return pdfjs;
}

/**
 * Validates a PDF file to ensure it's a valid Deutsche Post stamp
 * in the correct "Einlegeblatt" format.
 *
 * PDF.js is loaded on-demand when this function is first called.
 */
export async function validateStamp(file: File): Promise<StampValidationResult> {
	if (file.type !== "application/pdf") {
		return { valid: false, error: "invalid_file" };
	}

	try {
		// Lazy load PDF.js
		const { getDocument, OPS } = await getPdfjs();

		const data = new Uint8Array(await file.arrayBuffer());

		const doc = await getDocument({
			data,
			isEvalSupported: false,
			disableFontFace: true
		}).promise;

		try {
			// Step 1: Must be single page
			if (doc.numPages !== 1) {
				return { valid: false, error: "invalid_file" };
			}

			// Step 2: Check metadata (Author = "Deutsche Post AG", Title contains "INTERNETMARKEN")
			const metadata = await doc.getMetadata();
			const info = metadata.info as Record<string, unknown> | undefined;
			const author = info?.Author;
			const title = info?.Title;

			if (
				typeof author !== "string" ||
				typeof title !== "string" ||
				author !== "Deutsche Post AG" ||
				!title.includes("INTERNETMARKEN")
			) {
				return { valid: false, error: "invalid_author" };
			}

			// Step 3: Verify QR code position (distinguishes Einlegeblatt from Ausdruck)
			const page = await doc.getPage(1);
			try {
				const qrCenter = await findQRCodeCenter(page as unknown as PDFPageProxy, OPS);

				if (!qrCenter || !isValidQRPosition(qrCenter)) {
					return { valid: false, error: "invalid_format" };
				}

				return { valid: true, file };
			} finally {
				page.cleanup();
			}
		} finally {
			await doc.cleanup?.();
		}
	} catch {
		return { valid: false, error: "invalid_file" };
	}
}

import type { FormValues } from "@/lib/formSchema";

/**
 * Payload for submitting a letter, including form values and locale
 */
export type SubmitLetterPayload = FormValues & { locale: string };

// API configuration
const VITE_API_URL = import.meta.env.VITE_API_URL;

const API_BASE_URL =
	VITE_API_URL !== undefined && VITE_API_URL !== ""
		? VITE_API_URL
		: import.meta.env.DEV
			? "http://localhost:8080"
			: "";
const API_ENDPOINT = "/api/create";
const REQUEST_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Internal error codes derived from HTTP status codes.
 * These codes correspond to translation keys in form.error.*
 */
export type ErrorCode =
	| "NETWORK_ERROR"
	| "RATELIMIT"
	| "VALIDATION_ERROR"
	| "SERVER_ERROR"
	| "BUSY"
	| "TIMEOUT"
	| "UNKNOWN";

/**
 * Result type for API calls
 */
export type SubmitResult =
	{ success: true; pdf: Blob; filename: string } | { success: false; error: ErrorCode };

/**
 * Builds a FormData object from the form values.
 * Uses multipart/form-data to efficiently send file data without base64 encoding.
 */
function buildFormData(data: SubmitLetterPayload): FormData {
	const formData = new FormData();

	// Common fields
	formData.append("mode", data.mode);
	formData.append("date", data.date);
	formData.append("locale", data.locale);
	formData.append("subject", data.subject);
	formData.append("content", data.content); // ProseMirror JSON string
	formData.append("signature", data.signature);

	// Optional fields - only append if they have values
	if (data.salutation) {
		formData.append("salutation", data.salutation);
	}
	if (data.closing) {
		formData.append("closing", data.closing);
	}

	// Mode-specific fields
	if (data.mode === "stamp") {
		// Append the stamp file directly - no base64 needed with multipart/form-data
		formData.append("stampFile", data.stampFile, data.stampFile.name);
	} else {
		// Manual mode - address fields
		if (data.senderName) {
			formData.append("senderName", data.senderName);
		}
		if (data.senderAddress) {
			formData.append("senderAddress", data.senderAddress);
		}
		formData.append("recipientName", data.recipientName);
		formData.append("recipientAddress", data.recipientAddress);
	}

	return formData;
}

/**
 * Extracts filename from Content-Disposition header or returns default
 */
function extractFilename(response: Response): string {
	const contentDisposition = response.headers.get("Content-Disposition");
	if (contentDisposition) {
		// Try to extract filename from header
		// Format: attachment; filename="letter.pdf" or attachment; filename*=UTF-8''letter.pdf
		const filenameMatch = contentDisposition.match(/filename\*?=['"]?(?:UTF-8'')?([^;\n"']+)/i);
		if (filenameMatch?.[1]) {
			return decodeURIComponent(filenameMatch[1]);
		}
	}
	// Default filename with timestamp
	const timestamp = new Date().toISOString().slice(0, 10);
	return `letter-${timestamp}.pdf`;
}

/**
 * Maps HTTP status codes to internal error codes for translation.
 */
function mapStatusToErrorCode(status: number): ErrorCode {
	switch (status) {
		case 429:
			return "RATELIMIT";
		case 422:
			return "VALIDATION_ERROR";
		case 503:
			return "BUSY";
		case 500:
		case 507:
		case 508:
			return "SERVER_ERROR";
		case 408:
			return "TIMEOUT";
		default:
			return "UNKNOWN";
	}
}

/**
 * Submits the letter form to the backend and returns either a PDF blob or an error.
 *
 * The backend should respond with:
 * - 200 OK with Content-Type: application/pdf for success
 * - 4xx/5xx with Content-Type: application/json for errors
 */
export async function submitLetter(payload: SubmitLetterPayload): Promise<SubmitResult> {
	const formData = buildFormData(payload);

	// Create an AbortController for timeout handling
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

	try {
		const response = await fetch(`${API_BASE_URL}${API_ENDPOINT}`, {
			method: "POST",
			body: formData,
			signal: controller.signal
			// Note: Do NOT set Content-Type header manually!
			// The browser will automatically set it to multipart/form-data
			// with the correct boundary parameter
		});

		clearTimeout(timeoutId);

		const contentType = response.headers.get("Content-Type") || "";

		if (response.ok && contentType.includes("application/pdf")) {
			// Success - return the PDF blob
			const pdf = await response.blob();
			const filename = extractFilename(response);
			return { success: true, pdf, filename };
		}

		// Error response - derive code from HTTP status
		const code = mapStatusToErrorCode(response.status);

		// Log technical details to console for debugging
		let message = `${response.status} ${response.statusText}`;
		const body = await response.text();
		if (body) {
			message = body;
		}
		console.error("[API Error]", message);

		return { success: false, error: code };
	} catch (err) {
		clearTimeout(timeoutId);

		// Handle abort/timeout errors
		if (typeof err === "object" && err !== null && "name" in err && err.name === "AbortError") {
			console.error("[API Error]", `Request timed out after ${REQUEST_TIMEOUT_MS}ms`);
			return { success: false, error: "TIMEOUT" };
		}

		// Network or other fetch errors
		console.error("[API Error] Network or fetch error:", err instanceof Error ? err.message : err);
		return { success: false, error: "NETWORK_ERROR" };
	}
}

/**
 * Opens the PDF blob in a new browser tab.
 * The blob URL is revoked when the tab is closed or after a timeout.
 */
export function openPdfInNewTab(pdf: Blob): void {
	const url = URL.createObjectURL(pdf);
	const newTab = window.open(url, "_blank");

	if (newTab) {
		// Revoke URL when the new tab is closed
		// We check periodically since there's no reliable cross-origin close event
		const checkClosed = setInterval(() => {
			if (newTab.closed) {
				clearInterval(checkClosed);
				URL.revokeObjectURL(url);
			}
		}, 1000);

		// Safety cleanup after 5 minutes in case the check fails
		setTimeout(
			() => {
				clearInterval(checkClosed);
				URL.revokeObjectURL(url);
			},
			5 * 60 * 1000
		);
	} else {
		// Popup was blocked - fall back to download
		const link = document.createElement("a");
		link.href = url;
		link.download = "letter.pdf";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		setTimeout(() => URL.revokeObjectURL(url), 100);
	}
}

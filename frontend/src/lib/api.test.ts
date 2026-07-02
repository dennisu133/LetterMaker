import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { submitLetter, type SubmitLetterPayload } from "@/lib/api";
import { createDocFromText } from "@/lib/prosemirror";

const manualPayload: SubmitLetterPayload = {
	mode: "manual",
	date: "2026-07-15",
	locale: "en-US",
	subject: "Application",
	salutation: "Dear team,",
	salutationComma: true,
	content: JSON.stringify(createDocFromText("Hello")),
	closing: "Best regards",
	signature: "Dennis",
	senderName: "Dennis",
	senderAddress: "Example Street 1",
	recipientName: "Example GmbH",
	recipientAddress: "Main Street 2"
};

describe("letter API", () => {
	beforeEach(() => {
		vi.spyOn(console, "error").mockImplementation(() => undefined);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.useRealTimers();
	});

	it("posts manual letters as multipart data and returns the PDF metadata", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response("%PDF-1.4", {
				status: 200,
				headers: {
					"Content-Type": "application/pdf",
					"Content-Disposition": "attachment; filename*=UTF-8''application-letter.pdf"
				}
			})
		);
		vi.stubGlobal("fetch", fetchMock);

		const result = await submitLetter(manualPayload);

		expect(result).toMatchObject({ success: true, filename: "application-letter.pdf" });
		if (!result.success) {
			throw new Error("Expected a successful PDF response");
		}
		await expect(result.pdf.text()).resolves.toBe("%PDF-1.4");
		expect(fetchMock).toHaveBeenCalledOnce();
		const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
		const body = request.body as FormData;
		expect(url).toBe("http://localhost:8080/api/create");
		expect(request.method).toBe("POST");
		expect(body.get("mode")).toBe("manual");
		expect(body.get("recipientName")).toBe("Example GmbH");
		expect(body.get("content")).toBe(manualPayload.content);
		expect(body.has("stampFile")).toBe(false);
	});

	it("includes the uploaded file in stamp mode and omits manual addresses", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response("pdf", {
				status: 200,
				headers: { "Content-Type": "application/pdf" }
			})
		);
		vi.stubGlobal("fetch", fetchMock);
		const stampFile = new File(["stamp"], "stamp.pdf", { type: "application/pdf" });

		await submitLetter({
			...manualPayload,
			mode: "stamp",
			stampFile
		});

		const body = fetchMock.mock.calls[0]?.[1]?.body as FormData;
		expect(body.get("stampFile")).toEqual(stampFile);
		expect(body.has("recipientName")).toBe(false);
		expect(body.has("recipientAddress")).toBe(false);
	});

	it.each([
		[429, "RATELIMIT"],
		[413, "VALIDATION_ERROR"],
		[422, "VALIDATION_ERROR"],
		[503, "BUSY"],
		[500, "SERVER_ERROR"],
		[408, "TIMEOUT"],
		[418, "UNKNOWN"]
	] as const)("maps HTTP %i to %s", async (status, error) => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(new Response("failure", { status, statusText: "Failure" }))
		);

		await expect(submitLetter(manualPayload)).resolves.toEqual({ success: false, error });
	});

	it("returns a network error when fetch rejects", async () => {
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

		await expect(submitLetter(manualPayload)).resolves.toEqual({
			success: false,
			error: "NETWORK_ERROR"
		});
	});

	it("aborts requests after the timeout", async () => {
		vi.useFakeTimers();
		vi.stubGlobal(
			"fetch",
			vi.fn((_url: string, request: RequestInit) => {
				return new Promise((_resolve, reject) => {
					request.signal?.addEventListener("abort", () => {
						reject(new DOMException("Aborted", "AbortError"));
					});
				});
			})
		);

		const pending = submitLetter(manualPayload);
		await vi.advanceTimersByTimeAsync(45_000);

		await expect(pending).resolves.toEqual({ success: false, error: "TIMEOUT" });
	});
});

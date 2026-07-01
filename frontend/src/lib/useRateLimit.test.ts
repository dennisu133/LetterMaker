import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useRateLimit } from "@/lib/useRateLimit";

const config = {
	baseCooldown: 2000,
	maxCooldown: 8000,
	escalationThreshold: 2,
	escalationMultiplier: 2,
	resetAfter: 5000
};

describe("useRateLimit", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-07-01T10:00:00Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("counts down successful submissions once per second", () => {
		const { result } = renderHook(() => useRateLimit(config));

		act(() => result.current.recordSubmission());

		expect(result.current.canSubmit).toBe(false);
		expect(result.current.cooldownSeconds).toBe(2);

		act(() => vi.advanceTimersByTime(1000));
		expect(result.current.cooldownSeconds).toBe(1);

		act(() => vi.advanceTimersByTime(1000));
		expect(result.current.canSubmit).toBe(true);
		expect(result.current.cooldownSeconds).toBe(0);
	});

	it("escalates repeated submissions up to the configured maximum", () => {
		const { result } = renderHook(() => useRateLimit(config));

		act(() => result.current.recordSubmission());
		act(() => vi.advanceTimersByTime(2000));
		act(() => result.current.recordSubmission());

		expect(result.current.currentCooldownSeconds).toBe(4);
		expect(result.current.cooldownSeconds).toBe(4);

		act(() => vi.advanceTimersByTime(4000));
		act(() => result.current.recordSubmission());
		act(() => vi.advanceTimersByTime(4000));
		act(() => result.current.recordSubmission());

		expect(result.current.currentCooldownSeconds).toBe(8);
		expect(result.current.cooldownSeconds).toBe(8);
	});

	it("returns to the base cooldown after inactivity", () => {
		const { result } = renderHook(() => useRateLimit(config));

		act(() => result.current.recordSubmission());
		act(() => vi.advanceTimersByTime(2000));
		act(() => result.current.recordSubmission());
		expect(result.current.currentCooldownSeconds).toBe(4);

		act(() => vi.advanceTimersByTime(5000));
		expect(result.current.currentCooldownSeconds).toBe(2);

		act(() => result.current.recordSubmission());
		expect(result.current.cooldownSeconds).toBe(2);
	});
});

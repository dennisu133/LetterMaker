import { describe, expect, it } from "vitest";

import { formatLocalDate, parseLocalDate, todayLocalDate } from "@/lib/date";

describe("local date helpers", () => {
	it("formats local calendar dates without converting them to UTC", () => {
		const localMidnight = new Date(2026, 6, 15);

		expect(formatLocalDate(localMidnight)).toBe("2026-07-15");
	});

	it("parses date-only values at local midnight", () => {
		const parsed = parseLocalDate("2026-07-15");

		expect(parsed).toBeDefined();
		expect(parsed?.getFullYear()).toBe(2026);
		expect(parsed?.getMonth()).toBe(6);
		expect(parsed?.getDate()).toBe(15);
		expect(parsed?.getHours()).toBe(0);
	});

	it.each(["", "2026-02-30", "15.07.2026", "not-a-date"])(
		"rejects invalid date-only value %j",
		(value) => {
			expect(parseLocalDate(value)).toBeUndefined();
		}
	);

	it("uses the local calendar day for defaults", () => {
		const lateEvening = new Date(2026, 11, 31, 23, 59);

		expect(todayLocalDate(lateEvening)).toBe("2026-12-31");
	});
});

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const padTwoDigits = (value: number) => String(value).padStart(2, "0");

/**
 * Converts a Date to the date-only format used by the form without crossing
 * time-zone boundaries.
 */
export function formatLocalDate(date: Date): string {
	return [
		String(date.getFullYear()).padStart(4, "0"),
		padTwoDigits(date.getMonth() + 1),
		padTwoDigits(date.getDate())
	].join("-");
}

/**
 * Parses a date-only value as local calendar time. `new Date("yyyy-MM-dd")`
 * parses as UTC and can otherwise move the displayed day.
 */
export function parseLocalDate(value: string): Date | undefined {
	const match = ISO_DATE_PATTERN.exec(value);
	if (!match) return undefined;

	const [, yearString, monthString, dayString] = match;
	const parsed = new Date(Number(yearString), Number(monthString) - 1, Number(dayString));

	return formatLocalDate(parsed) === value ? parsed : undefined;
}

export function todayLocalDate(now = new Date()): string {
	return formatLocalDate(now);
}

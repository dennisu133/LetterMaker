import { format, isValid, parse } from "date-fns";

const ISO_DATE_FORMAT = "yyyy-MM-dd";

/**
 * Converts a Date to the date-only format used by the form without crossing
 * time-zone boundaries.
 */
export function formatLocalDate(date: Date): string {
	return format(date, ISO_DATE_FORMAT);
}

/**
 * Parses a date-only value as local calendar time. `new Date("yyyy-MM-dd")`
 * parses as UTC and can otherwise move the displayed day.
 */
export function parseLocalDate(value: string): Date | undefined {
	if (!value) return undefined;

	const parsed = parse(value, ISO_DATE_FORMAT, new Date());
	return isValid(parsed) && formatLocalDate(parsed) === value ? parsed : undefined;
}

export function todayLocalDate(now = new Date()): string {
	return formatLocalDate(now);
}

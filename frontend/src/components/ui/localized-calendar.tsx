import { de, enUS } from "date-fns/locale";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { Calendar } from "@/components/ui/calendar";

export function LocalizedCalendar(props: React.ComponentProps<typeof Calendar>) {
	const { i18n } = useTranslation();
	// Only the app's supported languages are mapped; anything else falls back
	// to enUS. Extend this when adding a new locale to src/locales/.
	const language = (i18n.resolvedLanguage ?? i18n.language).split("-")[0];

	return <Calendar {...props} locale={language === "de" ? de : enUS} />;
}

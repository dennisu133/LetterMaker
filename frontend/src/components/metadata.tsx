import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export function MetaTags() {
	const { t, i18n } = useTranslation();

	useEffect(() => {
		document.title = t("title");
		document.documentElement.lang = i18n.language;
	}, [t, i18n.language]); // Re-run when language changes

	return null; // This component renders nothing in the React tree
}

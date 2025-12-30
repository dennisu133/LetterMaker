import { getFormalitiesFlag, useFormalities } from "@/components/formalities-provider";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supportedLanguages } from "@/i18n";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

type FormalitiesProps = {
	tooltip?: string;
};

export function Formalities({ tooltip = "content.salutation.language" }: FormalitiesProps) {
	const { i18n, t } = useTranslation();
	const { language, setLanguage } = useFormalities();

	// Build languages list dynamically from i18n
	const languages = useMemo(() => {
		return supportedLanguages.map((code) => ({
			code,
			name: i18n.t("language.name", { lng: code }) as string,
			flag: i18n.t("language.flag", { lng: code }) as string
		}));
	}, [i18n]);

	return (
		<DropdownMenu>
			<Tooltip>
				<TooltipTrigger
					render={
						<DropdownMenuTrigger
							render={<Button variant="outline" className="border-input bg-card" size="icon" />}
						/>
					}
				>
					<span className="text-lg">{getFormalitiesFlag(language)}</span>
					<span className="sr-only">{t(tooltip)}</span>
				</TooltipTrigger>
				<TooltipContent>
					<p>{t(tooltip)}</p>
				</TooltipContent>
			</Tooltip>

			<DropdownMenuContent align="end">
				{languages.map((lang) => (
					<DropdownMenuItem
						key={lang.code}
						className="gap-4 text-lg"
						onClick={() => setLanguage(lang.code)}
					>
						<span>{lang.flag}</span> {lang.name}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

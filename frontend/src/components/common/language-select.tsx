import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Languages } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export function LanguageToggle() {
	const { i18n, t } = useTranslation();

	// Get available languages from i18next resources
	const languages = useMemo(() => {
		const resources = i18n.options.resources;
		if (!resources) return [];

		return Object.keys(resources).map((code) => ({
			code,
			// Get the name and flag from each language's own translations
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
							render={<Button variant="outline" size="icon" aria-label={t("language.tooltip")} />}
						/>
					}
				>
					<Languages className="size-5" />
				</TooltipTrigger>
				<TooltipContent>
					<p>{t("language.tooltip")}</p>
				</TooltipContent>
			</Tooltip>

			<DropdownMenuContent align="end">
				{languages.map((lang) => (
					<DropdownMenuItem
						key={lang.code}
						className="gap-4 text-lg"
						onClick={() => i18n.changeLanguage(lang.code)}
					>
						<span>{lang.flag}</span> {lang.name}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

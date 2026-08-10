import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";

export function ThemeToggle() {
	const { t } = useTranslation();
	const { theme, toggleTheme } = useTheme();

	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Button
						variant="outline"
						size="icon"
						className="relative"
						aria-label={t("theme.tooltip")}
						aria-pressed={theme === "dark"}
						onClick={toggleTheme}
					/>
				}
			>
				<Sun className="size-5 scale-100 rotate-0 transition-transform duration-300 dark:scale-0 dark:-rotate-90" />
				<Moon className="absolute size-5 scale-0 rotate-90 transition-transform duration-300 dark:scale-100 dark:rotate-0" />
			</TooltipTrigger>
			<TooltipContent>
				<p>{t("theme.tooltip")}</p>
			</TooltipContent>
		</Tooltip>
	);
}

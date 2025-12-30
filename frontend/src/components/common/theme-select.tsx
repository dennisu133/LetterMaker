import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Moon, Sun, SunMoon } from "lucide-react";
import { useTranslation } from "react-i18next";

export function ThemeToggle() {
	const { t } = useTranslation();
	const { setTheme, theme } = useTheme();

	return (
		<DropdownMenu>
			<Tooltip>
				<TooltipTrigger
					render={
						<DropdownMenuTrigger
							render={<Button variant="outline" size="icon" aria-label={t("theme.tooltip")} />}
						/>
					}
				>
					{theme === "light" && <Sun className="size-5" />}
					{theme === "dark" && <Moon className="size-5" />}
					{theme === "system" && <SunMoon className="size-5" />}
				</TooltipTrigger>
				<TooltipContent>
					<p>{t("theme.tooltip")}</p>
				</TooltipContent>
			</Tooltip>

			<DropdownMenuContent align="end">
				<DropdownMenuItem className="gap-4 text-lg" onClick={() => setTheme("system")}>
					<SunMoon className="size-5" />
					{t("theme.system")}
				</DropdownMenuItem>
				<DropdownMenuItem className="gap-4 text-lg" onClick={() => setTheme("light")}>
					<Sun className="size-5" />
					{t("theme.light")}
				</DropdownMenuItem>
				<DropdownMenuItem className="gap-4 text-lg" onClick={() => setTheme("dark")}>
					<Moon className="size-5" />
					{t("theme.dark")}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

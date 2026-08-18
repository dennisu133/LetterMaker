import { useTranslation } from "react-i18next";

import { LanguageToggle } from "@/components/common/language-select";
import { ThemeToggle } from "@/components/common/theme-select";
import { useFormActions } from "@/components/form-actions-provider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function Navbar() {
	const { t } = useTranslation();
	const formActions = useFormActions();

	return (
		<nav className="border-border/70 border-b px-3 py-2 sm:px-6">
			<div className="mx-auto flex max-w-6xl items-center justify-between gap-2">
				<h1 className="shrink-0 font-serif text-lg font-semibold tracking-tight sm:text-2xl">
					{t("title")}
				</h1>

				<div className="flex items-center gap-1.5 sm:gap-3">
					<Button variant="outline" type="button" onClick={() => formActions?.fillExample()}>
						{t("button.example")}
					</Button>

					<Separator
						orientation="vertical"
						className="hidden h-6 data-[orientation=vertical]:self-center sm:block"
					/>

					<LanguageToggle />
					<ThemeToggle />
				</div>
			</div>
		</nav>
	);
}

import { AlertCircle } from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { LanguageToggle } from "@/components/common/language-select";
import { ThemeToggle } from "@/components/common/theme-select";
import { useFormActions, useStamp } from "@/components/form-actions-provider";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function Navbar() {
	const { t } = useTranslation();
	const formActions = useFormActions();
	const { stamp, uploadState, uploadStamp, clearStamp, clearError } = useStamp();

	const fileInputRef = React.useRef<HTMLInputElement>(null);
	const [popoverOpen, setPopoverOpen] = React.useState(false);
	const [tooltipOpen, setTooltipOpen] = React.useState(false);

	const isValidating = uploadState.status === "validating";
	const hasError = uploadState.status === "error";

	// Close tooltip when stamp state changes
	React.useEffect(() => {
		setTooltipOpen(false);
	}, [stamp.isValid]);

	// Open popover when error occurs
	React.useEffect(() => {
		if (hasError) {
			setPopoverOpen(true);
		}
	}, [hasError]);

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Reset file input so the same file can be selected again
		e.target.value = "";

		await uploadStamp(file);
	};

	const handleButtonClick = () => {
		if (stamp.isValid) {
			clearStamp();
		} else if (!isValidating) {
			fileInputRef.current?.click();
		}
	};

	const handlePopoverOpenChange = (open: boolean) => {
		setPopoverOpen(open);
		if (!open && hasError) {
			clearError();
		}
	};

	return (
		<nav className="w-full border-b px-4 py-2 sm:px-6">
			<div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2">
				<h1 className="shrink-0 text-xl font-bold">{t("title")}</h1>

				<div className="flex grow items-center justify-between sm:justify-end sm:gap-4">
					{/* Fluid scaling via linear interpolation:
            - 0px gap at exactly 320px viewport width (10% of 320 - 32 = 0)
            - Scales up to max 0.5rem (8px) at 400px viewport width
          */}
					<div className="flex gap-[clamp(0px,10vw-32px,0.5rem)]">
						<input
							ref={fileInputRef}
							type="file"
							accept=".pdf,application/pdf"
							className="hidden"
							onChange={handleFileChange}
						/>
						<Tooltip
							open={tooltipOpen && !stamp.isValid && !hasError}
							onOpenChange={setTooltipOpen}
						>
							<Popover open={popoverOpen && hasError} onOpenChange={handlePopoverOpenChange}>
								<TooltipTrigger
									render={
										<PopoverTrigger
											render={
												<Button
													variant={stamp.isValid ? "destructive" : "default"}
													type="button"
													disabled={isValidating}
													onClick={handleButtonClick}
												>
													{isValidating && <Spinner className="mr-2" />}
													{stamp.isValid ? t("stamp.remove") : t("button.stamp")}
												</Button>
											}
										/>
									}
								/>
								{hasError && (
									<PopoverContent align="start" className="w-80">
										<PopoverHeader>
											<PopoverTitle className="text-destructive flex items-center gap-2">
												<AlertCircle className="size-4" />
												{t("stamp.error.title")}
											</PopoverTitle>
											<PopoverDescription>
												{t(`stamp.error.${uploadState.error.error}`)}
											</PopoverDescription>
										</PopoverHeader>
									</PopoverContent>
								)}
							</Popover>
							<TooltipContent side="bottom" align="start">
								{t("stamp.tooltip")}
							</TooltipContent>
						</Tooltip>
						<Button variant="outline" type="button" onClick={() => formActions?.fillExample()}>
							{t("button.example")}
						</Button>
					</div>

					<Separator orientation="vertical" className="hidden sm:block" />

					<div className="flex gap-[clamp(0px,10vw-32px,0.5rem)] sm:pl-0">
						<LanguageToggle />
						<ThemeToggle />
					</div>
				</div>
			</div>
		</nav>
	);
}

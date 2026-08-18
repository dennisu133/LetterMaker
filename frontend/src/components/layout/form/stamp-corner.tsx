import { AlertCircle, CheckCircle, Stamp } from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { useStamp } from "@/components/form-actions-provider";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { inkSurface } from "@/lib/paper";
import { cn } from "@/lib/utils";

/**
 * The stamp corner of the letter: a dashed "affix stamp here" outline in the
 * top-right, like on a real envelope. Uploading a valid Deutsche Post stamp
 * replaces the outline with the affixed stamp.
 */
export function StampCorner() {
	const { t } = useTranslation();
	const { stamp, uploadState, uploadStamp, clearStamp, clearError } = useStamp();

	const fileInputRef = React.useRef<HTMLInputElement>(null);

	const isValidating = uploadState.status === "validating";
	const hasError = uploadState.status === "error";

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Reset file input so the same file can be selected again
		e.target.value = "";

		await uploadStamp(file);
	};

	const handlePopoverOpenChange = (open: boolean) => {
		if (!open && hasError) {
			clearError();
		}
	};

	if (stamp.isValid) {
		return (
			<div className="border-paper-line bg-paper-foreground/3 w-full shrink-0 rounded-xs border p-3 text-center sm:w-48 sm:rotate-1">
				<p className="flex items-center justify-center gap-1.5 text-sm font-medium text-green-800 dark:text-green-900">
					<CheckCircle className="size-4 shrink-0" aria-hidden="true" />
					{t("stamp.success.title")}
				</p>
				<p className="text-paper-muted mt-1 text-xs leading-snug">
					{t("stamp.success.description")}
				</p>
				<Button
					variant="ghost"
					size="sm"
					type="button"
					className="text-destructive hover:bg-destructive/10 hover:text-destructive mt-2 text-sm"
					onClick={clearStamp}
				>
					{t("stamp.remove")}
				</Button>
			</div>
		);
	}

	return (
		<div className="w-full shrink-0 sm:w-48">
			<input
				ref={fileInputRef}
				type="file"
				accept=".pdf,application/pdf"
				className="hidden"
				onChange={handleFileChange}
			/>
			<Tooltip disabled={hasError}>
				<Popover open={hasError} onOpenChange={handlePopoverOpenChange}>
					<TooltipTrigger
						render={
							<PopoverTrigger
								render={
									<Button
										variant="ghost"
										type="button"
										disabled={isValidating}
										onClick={() => {
											fileInputRef.current?.click();
										}}
										className={cn(
											"border-paper-line text-paper-muted flex h-24 w-full flex-col rounded-xs border-dashed whitespace-normal sm:h-28",
											"hover:border-paper-muted hover:bg-paper-foreground/4 hover:text-paper-foreground dark:hover:bg-paper-foreground/4",
											// The error popover marks the trigger expanded; keep it paper-toned
											// instead of the ghost variant's theme-dark expanded state
											"aria-expanded:bg-paper-foreground/4 aria-expanded:text-paper-foreground"
										)}
									>
										{isValidating ? (
											<Spinner className="size-5" />
										) : (
											<Stamp className="size-5 opacity-70" aria-hidden="true" />
										)}
										<span className="text-[0.78rem] tracking-wide">{t("button.stamp")}</span>
									</Button>
								}
							/>
						}
					/>
					{hasError && (
						<PopoverContent align="end" className={cn(inkSurface, "w-80")}>
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
				<TooltipContent side="bottom" align="end">
					{t("stamp.tooltip")}
				</TooltipContent>
			</Tooltip>
		</div>
	);
}

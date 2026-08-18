import { AlertCircle, Send } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { useStamp } from "@/components/form-actions-provider";
import { useSubmission } from "@/components/submission-provider";
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
import { inkSurface, quietControl } from "@/lib/paper";
import { cn } from "@/lib/utils";

/** Submit/reset controls in the letter's bottom corner. */
export function FormActions() {
	const { reset } = useFormContext();
	const { clearStamp } = useStamp();
	const { isSubmitting, error, setError } = useSubmission();
	const { t } = useTranslation();

	const hasError = error !== null;

	const handlePopoverOpenChange = (open: boolean) => {
		if (!open && hasError) {
			setError(null);
		}
	};

	return (
		<div className="flex items-center justify-end gap-2">
			<Popover open={hasError} onOpenChange={handlePopoverOpenChange}>
				<PopoverTrigger
					render={
						<Button className="relative z-10 min-w-32" type="submit" disabled={isSubmitting}>
							{isSubmitting ? (
								<Spinner className="mr-1" />
							) : (
								<Send className="size-4" aria-hidden="true" />
							)}
							{t("button.submit")}
						</Button>
					}
				/>
				{error && (
					<PopoverContent align="end" side="top" className={cn(inkSurface, "w-80")}>
						<PopoverHeader>
							<PopoverTitle className="text-destructive flex items-center gap-2">
								<AlertCircle className="size-4" />
								{t("form.error.title")}
							</PopoverTitle>
							<PopoverDescription>{t(`form.error.${error}`)}</PopoverDescription>
						</PopoverHeader>
					</PopoverContent>
				)}
			</Popover>
			<Button
				variant="ghost"
				type="button"
				className={quietControl}
				disabled={isSubmitting}
				onClick={() => {
					reset();
					clearStamp();
					setError(null);
				}}
			>
				{t("button.reset")}
			</Button>
		</div>
	);
}

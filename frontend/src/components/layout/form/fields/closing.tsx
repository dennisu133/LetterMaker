import { AlertCircle } from "lucide-react";
import * as React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Formalities } from "@/components/common/formalities";
import { useStamp } from "@/components/form-actions-provider";
import { useFormalities } from "@/components/formalities-provider";
import { useSubmission } from "@/components/submission-provider";
import { Button } from "@/components/ui/button";
import {
	ComboboxContent,
	ComboboxFreeForm,
	ComboboxFreeFormInput,
	ComboboxItem,
	ComboboxList
} from "@/components/ui/combobox";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { MAX_INPUT, MAX_TEXT_AREA } from "@/lib/constants";
import type { FormValues } from "@/lib/formSchema";
import { cn } from "@/lib/utils";

export function ClosingSection() {
	const {
		control,
		watch,
		setValue,
		reset,
		formState: { errors }
	} = useFormContext<FormValues>();
	const { clearStamp } = useStamp();
	const { state: submissionState, clearError, canSubmit, cooldownSeconds } = useSubmission();
	// Track whether signature is linked to senderName
	const isSignatureLinkedRef = React.useRef(true);

	const { i18n, t } = useTranslation();
	const { language: formalitiesLanguage } = useFormalities();

	// Get closings from the formalities language locale
	const closings = React.useMemo(() => {
		return i18n.t("content.closing.list", {
			lng: formalitiesLanguage,
			returnObjects: true
		}) as string[];
	}, [i18n, formalitiesLanguage]);

	// Subscribe to senderName changes and sync to signature when linked
	React.useEffect(() => {
		const subscription = watch((value, { name }) => {
			if (name === "senderName" && isSignatureLinkedRef.current && "senderName" in value) {
				setValue("signature", value.senderName ?? "", { shouldDirty: false });
			}
		});
		return () => subscription.unsubscribe();
	}, [watch, setValue]);

	const hasError = submissionState.error !== null;

	const handlePopoverOpenChange = (open: boolean) => {
		if (!open && hasError) {
			clearError();
		}
	};

	return (
		<FieldGroup className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[3fr_2fr_auto]">
			<Field data-invalid={!!errors.closing}>
				<FieldLabel htmlFor="closing">{t("content.closing.label")}</FieldLabel>
				<div className="flex gap-2">
					<Formalities tooltip="content.closing.tooltip" />
					<Controller
						name="closing"
						control={control}
						render={({ field, fieldState }) => (
							<ComboboxFreeForm items={closings} value={field.value} onValueChange={field.onChange}>
								<ComboboxFreeFormInput
									id="closing"
									maxLength={MAX_INPUT}
									className={cn(
										"flex-1",
										fieldState.error && "border-destructive focus-visible:ring-destructive"
									)}
									placeholder={t("content.closing.placeholder")}
									onBlur={field.onBlur}
									triggerAriaLabel={t("content.closing.label")}
									aria-invalid={!!fieldState.error}
									aria-describedby={fieldState.error ? "closing-error" : undefined}
								/>
								<ComboboxContent>
									<ComboboxList>
										{(item) => (
											<ComboboxItem key={item} value={item}>
												{item}
											</ComboboxItem>
										)}
									</ComboboxList>
								</ComboboxContent>
							</ComboboxFreeForm>
						)}
					/>
				</div>
				<FieldError id="closing-error">{errors.closing && t("form.validation.closing")}</FieldError>
			</Field>
			<Field data-invalid={!!errors.signature}>
				<FieldLabel htmlFor="signature">{t("content.signature.label") + "\u2009*"}</FieldLabel>
				<Controller
					name="signature"
					control={control}
					render={({ field, fieldState }) => (
						<Input
							id="signature"
							maxLength={MAX_TEXT_AREA}
							placeholder={t("content.signature.placeholder")}
							value={field.value}
							onChange={(e) => {
								// Break the link when user manually edits signature
								isSignatureLinkedRef.current = false;
								field.onChange(e);
							}}
							onBlur={field.onBlur}
							aria-invalid={!!fieldState.error}
							aria-describedby={fieldState.error ? "signature-error" : undefined}
							className={cn(
								fieldState.error && "border-destructive focus-visible:ring-destructive"
							)}
						/>
					)}
				/>
				<FieldError id="signature-error">
					{errors.signature && t("form.validation.signature")}
				</FieldError>
			</Field>
			<div className="flex flex-row justify-end gap-2 sm:w-auto">
				<Popover open={hasError} onOpenChange={handlePopoverOpenChange}>
					<PopoverTrigger
						render={
							<Button
								className="min-w-24"
								type="submit"
								disabled={submissionState.isSubmitting || !canSubmit}
							>
								{submissionState.isSubmitting && <Spinner className="mr-2" />}
								{!canSubmit && !submissionState.isSubmitting
									? t("button.submitCooldown", { seconds: cooldownSeconds })
									: t("button.submit")}
							</Button>
						}
					/>
					{submissionState.error && (
						<PopoverContent align="start" side="top" className="w-80">
							<PopoverHeader>
								<PopoverTitle className="text-destructive flex items-center gap-2">
									<AlertCircle className="size-4" />
									{t("form.error.title")}
								</PopoverTitle>
								<PopoverDescription>{t(`form.error.${submissionState.error}`)}</PopoverDescription>
							</PopoverHeader>
						</PopoverContent>
					)}
				</Popover>
				<Button
					variant="outline"
					type="button"
					disabled={submissionState.isSubmitting}
					onClick={() => {
						reset();
						clearStamp();
						clearError();
						// Re-enable signature linking after reset
						isSignatureLinkedRef.current = true;
					}}
				>
					{t("button.reset")}
				</Button>
			</div>
		</FieldGroup>
	);
}

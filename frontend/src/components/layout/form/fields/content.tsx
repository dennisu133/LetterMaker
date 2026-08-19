import { CalendarIcon } from "lucide-react";
import { useMemo } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Formalities } from "@/components/common/formalities";
import { useFormalities } from "@/components/formalities-provider";
import { Button } from "@/components/ui/button";
import { FreeFormCombobox } from "@/components/ui/combobox";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MAX_INPUT, MAX_TEXT_AREA } from "@/lib/constants";
import type { FormValues } from "@/lib/formSchema";
import { inkInput, quietControl } from "@/lib/paper";
import { cn } from "@/lib/utils";

const MAX_SUBJECT_LINES = 5;

function limitSubjectLines(value: string) {
	return value.split("\n").slice(0, MAX_SUBJECT_LINES).join("\n");
}

export function DetailsSection() {
	const {
		control,
		formState: { errors }
	} = useFormContext<FormValues>();

	const { i18n, t } = useTranslation();
	const { language: formalitiesLanguage } = useFormalities();

	// Get salutations from the formalities language locale
	const salutations = useMemo(() => {
		return i18n.t("content.salutation.list", {
			lng: formalitiesLanguage,
			returnObjects: true
		}) as string[];
	}, [i18n, formalitiesLanguage]);

	return (
		<div className="mt-5 flex flex-col gap-4 sm:mt-7 sm:gap-5">
			<Field data-invalid={!!errors.date} className="items-end">
				<label htmlFor="date" className="sr-only">
					{t("content.date.label") + "\u2009*"}
				</label>
				<Controller
					name="date"
					control={control}
					render={({ field, fieldState }) => (
						<div className="group relative">
							<Input
								{...field}
								id="date"
								type="date"
								lang={i18n.resolvedLanguage ?? i18n.language}
								className={cn(inkInput, "[&::-webkit-calendar-picker-indicator]:opacity-0")}
								aria-invalid={!!fieldState.error}
								aria-describedby={fieldState.error ? "date-error" : undefined}
							/>
							<Tooltip>
								<TooltipTrigger
									render={
										<Button
											type="button"
											variant="ghost"
											size="icon-xs"
											className={cn(
												quietControl,
												"absolute top-1/2 -right-1 hidden -translate-y-1/2 supports-[selector(input::-webkit-calendar-picker-indicator)]:inline-flex"
											)}
											aria-label={t("content.date.tooltip")}
											onClick={() =>
												(document.getElementById("date") as HTMLInputElement).showPicker()
											}
										/>
									}
								>
									<CalendarIcon className="size-4" />
								</TooltipTrigger>
								<TooltipContent>
									<p>{t("content.date.tooltip")}</p>
								</TooltipContent>
							</Tooltip>
						</div>
					)}
				/>
				<FieldError id="date-error" className="text-right">
					{errors.date && t("form.validation.date")}
				</FieldError>
			</Field>

			{/* Subject: the bold line of the letter */}
			<Field data-invalid={!!errors.subject}>
				<label htmlFor="subject" className="sr-only">
					{t("content.subject.label") + "\u2009*"}
				</label>
				<Controller
					name="subject"
					control={control}
					render={({ field, fieldState }) => (
						<Textarea
							id="subject"
							placeholder={t("content.subject.placeholder")}
							maxLength={MAX_TEXT_AREA}
							value={field.value}
							onChange={(e) => field.onChange(limitSubjectLines(e.target.value))}
							onBlur={field.onBlur}
							aria-invalid={!!fieldState.error}
							aria-describedby={fieldState.error ? "subject-error" : undefined}
							className={cn(inkInput, "resize-none text-lg leading-snug font-semibold")}
						/>
					)}
				/>
				<FieldError id="subject-error">{errors.subject && t("form.validation.subject")}</FieldError>
			</Field>

			{/* Salutation with its quiet language + comma helpers */}
			<Field data-invalid={!!errors.salutation}>
				<label htmlFor="salutation" className="sr-only">
					{t("content.salutation.label")}
				</label>
				<div className="flex items-end gap-2">
					<Formalities tooltip="content.salutation.tooltip" />
					<Controller
						name="salutation"
						control={control}
						render={({ field, fieldState }) => (
							<FreeFormCombobox
								items={salutations}
								value={field.value}
								onValueChange={field.onChange}
								id="salutation"
								maxLength={MAX_INPUT}
								placeholder={t("content.salutation.placeholder")}
								className={cn(inkInput, "flex-1")}
								onBlur={field.onBlur}
								triggerAriaLabel={t("content.salutation.label")}
								aria-invalid={!!fieldState.error}
								aria-describedby={fieldState.error ? "salutation-error" : undefined}
							/>
						)}
					/>

					<Controller
						name="salutationComma"
						control={control}
						render={({ field }) => (
							<Tooltip>
								<TooltipTrigger
									render={
										<Toggle
											size="sm"
											className={cn(quietControl, "font-serif text-lg")}
											pressed={field.value}
											onPressedChange={field.onChange}
										/>
									}
								>
									,
								</TooltipTrigger>
								<TooltipContent>
									<p>{t("content.salutation.comma")}</p>
								</TooltipContent>
							</Tooltip>
						)}
					/>
				</div>
				<FieldError id="salutation-error">
					{errors.salutation && t("form.validation.salutation")}
				</FieldError>
			</Field>
		</div>
	);
}

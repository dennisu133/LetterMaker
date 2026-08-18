import { CalendarIcon } from "lucide-react";
import * as React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Formalities } from "@/components/common/formalities";
import { useFormalities } from "@/components/formalities-provider";
import { Button } from "@/components/ui/button";
import { FreeFormCombobox } from "@/components/ui/combobox";
import { Field, FieldError } from "@/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MAX_INPUT, MAX_TEXT_AREA } from "@/lib/constants";
import { formatLocalDate, parseLocalDate } from "@/lib/date";
import type { FormValues } from "@/lib/formSchema";
import { inkInput, quietControl } from "@/lib/paper";
import { cn } from "@/lib/utils";

const MAX_SUBJECT_LINES = 5;

const Calendar = React.lazy(async () => {
	const module = await import("@/components/ui/localized-calendar");
	return { default: module.LocalizedCalendar };
});

export function DetailsSection() {
	const [dateOpen, setDateOpen] = React.useState(false);
	const {
		control,
		formState: { errors }
	} = useFormContext<FormValues>();

	const { i18n, t } = useTranslation();
	const { language: formalitiesLanguage } = useFormalities();

	const dateFormatter = React.useMemo(
		() =>
			new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, {
				day: "2-digit",
				month: "2-digit",
				year: "numeric"
			}),
		[i18n.language, i18n.resolvedLanguage]
	);

	// Get salutations from the formalities language locale
	const salutations = React.useMemo(() => {
		return i18n.t("content.salutation.list", {
			lng: formalitiesLanguage,
			returnObjects: true
		}) as string[];
	}, [i18n, formalitiesLanguage]);

	// Limit subject to max lines
	const limitSubjectLines = (value: string) => {
		const lines = value.split("\n");
		if (lines.length <= MAX_SUBJECT_LINES) {
			return value;
		}
		return lines.slice(0, MAX_SUBJECT_LINES).join("\n");
	};

	return (
		<div className="mt-5 flex flex-col gap-4 sm:mt-7 sm:gap-5">
			{/* The date sits right-aligned like on a printed letter */}
			<Field data-invalid={!!errors.date} className="items-end [&>*]:w-auto">
				<label htmlFor="date" className="sr-only">
					{t("content.date.label") + "\u2009*"}
				</label>
				<Controller
					name="date"
					control={control}
					render={({ field, fieldState }) => {
						const dateValue = parseLocalDate(field.value);
						return (
							<Popover open={dateOpen} onOpenChange={setDateOpen}>
								<PopoverTrigger
									id="date"
									render={(props) => (
										<Button
											{...props}
											variant="ghost"
											className={cn(
												"group border-paper-line hover:border-paper-muted h-auto gap-2 rounded-none border-0 border-b border-dashed bg-transparent px-0 py-0.5 font-serif text-[1rem] font-normal",
												quietControl,
												"text-paper-foreground hover:bg-transparent dark:hover:bg-transparent",
												!dateValue && "text-paper-faint",
												fieldState.error && "border-destructive border-solid"
											)}
											aria-invalid={!!fieldState.error}
											aria-describedby={fieldState.error ? "date-error" : undefined}
										>
											{dateValue ? dateFormatter.format(dateValue) : t("content.date.placeholder")}
											<CalendarIcon className="text-paper-muted size-4 opacity-60 transition-opacity group-hover:opacity-100" />
										</Button>
									)}
								/>
								<PopoverContent className="w-auto overflow-hidden p-0" align="end">
									<React.Suspense fallback={<div className="size-72" aria-hidden="true" />}>
										<Calendar
											mode="single"
											className="bg-popover"
											selected={dateValue}
											captionLayout="dropdown"
											onSelect={(date) => {
												field.onChange(date ? formatLocalDate(date) : "");
												setDateOpen(false);
											}}
										/>
									</React.Suspense>
								</PopoverContent>
							</Popover>
						);
					}}
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
							className={cn(
								inkInput,
								"resize-none text-[1.14rem] leading-snug font-semibold md:text-[1.14rem]"
							)}
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
								className={cn(inkInput, "flex-1 text-[1.05rem] md:text-[1.05rem]")}
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
											className={cn(quietControl, "font-serif text-[1.05rem] md:text-[1.05rem]")}
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

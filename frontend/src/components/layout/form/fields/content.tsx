import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import * as React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Formalities } from "@/components/common/formalities";
import { useFormalities } from "@/components/formalities-provider";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	ComboboxContent,
	ComboboxFreeForm,
	ComboboxFreeFormInput,
	ComboboxItem,
	ComboboxList
} from "@/components/ui/combobox";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { dateLocales } from "@/i18n";
import { MAX_INPUT, MAX_TEXT_AREA } from "@/lib/constants";
import { formatLocalDate, parseLocalDate } from "@/lib/date";
import { cn } from "@/lib/utils";

const MAX_SUBJECT_LINES = 5;

export function DetailsSection() {
	const [dateOpen, setDateOpen] = React.useState(false);
	const { control } = useFormContext();

	const { i18n, t } = useTranslation();
	const { language: formalitiesLanguage } = useFormalities();

	// Get the current locale for date-fns
	const currentLocale = dateLocales[i18n.language];
	const dateFormat = t("content.date.format");

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
		<FieldSet className="mb-0 border-b-0">
			<FieldLegend>{t("content.title")}</FieldLegend>
			<FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_5fr]">
				<Field>
					<FieldLabel htmlFor="date">{t("content.date.label") + "\u2009*"}</FieldLabel>
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
												variant="outline"
												className={cn(
													"border-input hover:bg-input/30 w-full justify-between bg-transparent font-normal",
													fieldState.error && "border-destructive focus-visible:ring-destructive"
												)}
											>
												{dateValue
													? format(dateValue, dateFormat, { locale: currentLocale })
													: t("content.date.placeholder")}
												<CalendarIcon />
											</Button>
										)}
									/>
									<PopoverContent className="w-auto overflow-hidden p-0" align="start">
										<Calendar
											mode="single"
											className="bg-input"
											selected={dateValue}
											captionLayout="dropdown"
											locale={currentLocale}
											onSelect={(date) => {
												field.onChange(date ? formatLocalDate(date) : "");
												setDateOpen(false);
											}}
										/>
									</PopoverContent>
								</Popover>
							);
						}}
					/>
				</Field>

				<Field>
					<FieldLabel htmlFor="subject">{t("content.subject.label") + "\u2009*"}</FieldLabel>
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
								className={cn(
									"min-h-8 resize-none pt-1 pb-0.5",
									fieldState.error && "border-destructive focus-visible:ring-destructive"
								)}
							/>
						)}
					/>
				</Field>
			</FieldGroup>

			<Field>
				<FieldLabel htmlFor="salutation">{t("content.salutation.label")}</FieldLabel>
				<div className="flex gap-2">
					<Formalities tooltip="content.salutation.tooltip" />
					<Controller
						name="salutation"
						control={control}
						render={({ field, fieldState }) => (
							<ComboboxFreeForm
								items={salutations}
								value={field.value}
								onValueChange={field.onChange}
							>
								<ComboboxFreeFormInput
									id="salutation"
									maxLength={MAX_INPUT}
									placeholder={t("content.salutation.placeholder")}
									className={cn(
										"flex-1",
										fieldState.error && "border-destructive focus-visible:ring-destructive"
									)}
									onBlur={field.onBlur}
									triggerAriaLabel={t("content.salutation.label")}
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

					<Controller
						name="salutationComma"
						control={control}
						render={({ field }) => (
							<Tooltip>
								<TooltipTrigger
									render={
										<Toggle
											variant="outline"
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
			</Field>
		</FieldSet>
	);
}

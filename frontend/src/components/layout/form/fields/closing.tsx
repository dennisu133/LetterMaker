import { useEffect, useMemo, useRef } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Formalities } from "@/components/common/formalities";
import { useFormalities } from "@/components/formalities-provider";
import { FormActions } from "@/components/layout/form/fields/actions";
import { FreeFormCombobox } from "@/components/ui/combobox";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MAX_INPUT, MAX_TEXT_AREA } from "@/lib/constants";
import type { FormValues } from "@/lib/formSchema";
import { inkInput } from "@/lib/paper";
import { cn } from "@/lib/utils";

export function ClosingSection() {
	const {
		control,
		watch,
		setValue,
		formState: { errors }
	} = useFormContext<FormValues>();
	// Track whether signature is linked to senderName
	const isSignatureLinkedRef = useRef(true);

	const { i18n, t } = useTranslation();
	const { language: formalitiesLanguage } = useFormalities();

	// Get closings from the formalities language locale
	const closings = useMemo(() => {
		return i18n.t("content.closing.list", {
			lng: formalitiesLanguage,
			returnObjects: true
		}) as string[];
	}, [i18n, formalitiesLanguage]);

	// Subscribe to senderName changes and sync to signature when linked.
	// A form reset fires the subscription without a field name; it re-links
	// the signature so the next example fill syncs again.
	useEffect(() => {
		const subscription = watch((value, { name }) => {
			if (!name) {
				isSignatureLinkedRef.current = true;
				return;
			}
			if (name === "senderName" && isSignatureLinkedRef.current && "senderName" in value) {
				setValue("signature", value.senderName ?? "", { shouldDirty: false });
			}
		});
		return () => subscription.unsubscribe();
	}, [watch, setValue]);

	return (
		<div className="mt-auto grid items-end gap-4 pt-5 sm:grid-cols-[3fr_2fr_auto] sm:gap-8 sm:pt-6">
			<Field data-invalid={!!errors.closing}>
				<label htmlFor="closing" className="sr-only">
					{t("content.closing.label")}
				</label>
				<div className="flex items-end gap-2">
					<Formalities tooltip="content.closing.tooltip" />
					<Controller
						name="closing"
						control={control}
						render={({ field, fieldState }) => (
							<FreeFormCombobox
								items={closings}
								value={field.value}
								onValueChange={field.onChange}
								id="closing"
								maxLength={MAX_INPUT}
								className={cn(inkInput, "flex-1")}
								placeholder={t("content.closing.placeholder")}
								onBlur={field.onBlur}
								triggerAriaLabel={t("content.closing.label")}
								aria-invalid={!!fieldState.error}
								aria-describedby={fieldState.error ? "closing-error" : undefined}
							/>
						)}
					/>
				</div>
				<FieldError id="closing-error">{errors.closing && t("form.validation.closing")}</FieldError>
			</Field>

			{/* The signature is rendered in a handwriting face, like a signed letter */}
			<Field data-invalid={!!errors.signature}>
				<label htmlFor="signature" className="sr-only">
					{t("content.signature.label") + "\u2009*"}
				</label>
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
							className={cn(inkInput, "font-signature text-2xl leading-tight font-medium")}
						/>
					)}
				/>
				<FieldError id="signature-error">
					{errors.signature && t("form.validation.signature")}
				</FieldError>
			</Field>

			<FormActions />
		</div>
	);
}

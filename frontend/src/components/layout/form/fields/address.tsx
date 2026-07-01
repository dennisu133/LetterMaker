import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FormValues, ManualFormValues } from "@/lib/formSchema";
import { cn } from "@/lib/utils";
import { useFormContext, type FieldErrors } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { MAX_INPUT, MAX_TEXT_AREA } from "@/lib/constants";

interface AddressSectionProps {
	kind: "sender" | "recipient";
}

export function AddressSection({ kind }: AddressSectionProps) {
	const { t } = useTranslation();
	const {
		register,
		formState: { errors }
	} = useFormContext<FormValues>();

	const nameField = `${kind}Name` as const;
	const addressField = `${kind}Address` as const;
	const manualErrors = errors as FieldErrors<ManualFormValues>;
	const nameError = manualErrors[nameField];
	const addressError = manualErrors[addressField];
	const nameErrorId = `${nameField}-error`;
	const addressErrorId = `${addressField}-error`;

	return (
		<FieldSet className="mb-0 flex-1">
			<FieldLegend>{t(`contact.${kind}`)}</FieldLegend>
			<FieldGroup>
				<Field data-invalid={!!nameError}>
					<FieldLabel htmlFor={nameField}>
						{t("contact.name.label")}
						{kind === "recipient" && "\u2009*"}
					</FieldLabel>
					<Input
						id={nameField}
						maxLength={MAX_INPUT}
						placeholder={t("contact.name.placeholder")}
						className={cn(nameError && "border-destructive focus-visible:ring-destructive")}
						aria-invalid={!!nameError}
						aria-describedby={nameError ? nameErrorId : undefined}
						{...register(nameField)}
					/>
					<FieldError id={nameErrorId}>{nameError && t(`form.validation.${nameField}`)}</FieldError>
				</Field>

				<Field data-invalid={!!addressError}>
					<FieldLabel htmlFor={addressField}>
						{t("contact.address.label")}
						{kind === "recipient" && "\u2009*"}
					</FieldLabel>
					<Textarea
						id={addressField}
						maxLength={MAX_TEXT_AREA}
						placeholder={t("contact.address.placeholder")}
						className={cn(
							"resize-none",
							addressError && "border-destructive focus-visible:ring-destructive"
						)}
						aria-invalid={!!addressError}
						aria-describedby={addressError ? addressErrorId : undefined}
						{...register(addressField)}
					/>
					<FieldError id={addressErrorId}>
						{addressError && t(`form.validation.${addressField}`)}
					</FieldError>
				</Field>
			</FieldGroup>
		</FieldSet>
	);
}

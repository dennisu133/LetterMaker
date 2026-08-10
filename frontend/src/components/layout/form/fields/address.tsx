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
import { inkInput } from "@/lib/paper";
import { cn } from "@/lib/utils";
import { useFormContext, type FieldErrors } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { MAX_INPUT, MAX_TEXT_AREA } from "@/lib/constants";

interface AddressSectionProps {
	kind: "sender" | "recipient";
	className?: string;
}

export function AddressSection({ kind, className }: AddressSectionProps) {
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

	const isRecipient = kind === "recipient";

	return (
		<FieldSet
			className={cn(
				"m-0 gap-1 border-0 bg-transparent p-0",
				// The recipient block mimics the envelope's address window
				isRecipient &&
					"bg-paper-foreground/2 border-paper-line max-w-sm gap-1 rounded-[2px] border border-solid p-3 sm:p-4",
				className
			)}
		>
			<FieldLegend className={cn("paper-label float-left mb-2 w-full p-0")}>
				{t(`contact.${kind}`)}
			</FieldLegend>
			<FieldGroup className={cn("gap-2", isRecipient && "gap-3")}>
				<Field data-invalid={!!nameError}>
					<FieldLabel htmlFor={nameField} className="sr-only">
						{t("contact.name.label")}
						{isRecipient && " *"}
					</FieldLabel>
					<Input
						id={nameField}
						maxLength={MAX_INPUT}
						placeholder={t("contact.name.placeholder")}
						className={cn(
							inkInput,
							isRecipient
								? "text-[1.05rem] font-medium md:text-[1.05rem]"
								: "text-[0.95rem] md:text-[0.95rem]"
						)}
						aria-invalid={!!nameError}
						aria-describedby={nameError ? nameErrorId : undefined}
						{...register(nameField)}
					/>
					<FieldError id={nameErrorId}>{nameError && t(`form.validation.${nameField}`)}</FieldError>
				</Field>

				<Field data-invalid={!!addressError}>
					<FieldLabel htmlFor={addressField} className="sr-only">
						{t("contact.address.label")}
						{isRecipient && " *"}
					</FieldLabel>
					<Textarea
						id={addressField}
						maxLength={MAX_TEXT_AREA}
						placeholder={t("contact.address.placeholder")}
						className={cn(
							inkInput,
							"resize-none leading-relaxed",
							isRecipient
								? "text-[1.05rem] md:text-[1.05rem]"
								: "min-h-0 text-[0.95rem] md:text-[0.95rem]"
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

import { Field, FieldError } from "@/components/ui/field";
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
		<fieldset
			className={cn(
				"flex flex-col gap-1",
				// The recipient block mimics the envelope's address window
				isRecipient &&
					"bg-paper-foreground/2 border-paper-line max-w-sm rounded-xs border p-3 sm:p-4",
				className
			)}
		>
			<legend className="text-paper-muted float-left mb-2 w-full text-[clamp(1.125rem,1.08rem+0.19vw,1.25rem)] font-medium tracking-[0.08em] uppercase">
				{t(`contact.${kind}`)}
			</legend>
			<div className={cn("flex flex-col gap-2", isRecipient && "gap-3")}>
				<Field data-invalid={!!nameError}>
					<label htmlFor={nameField} className="sr-only">
						{t("contact.name.label")}
						{isRecipient && " *"}
					</label>
					<Input
						id={nameField}
						maxLength={MAX_INPUT}
						placeholder={t("contact.name.placeholder")}
						className={cn(inkInput, isRecipient ? "text-[1.05rem] font-medium" : "text-[0.95rem]")}
						aria-invalid={!!nameError}
						aria-describedby={nameError ? nameErrorId : undefined}
						{...register(nameField)}
					/>
					<FieldError id={nameErrorId}>{nameError && t(`form.validation.${nameField}`)}</FieldError>
				</Field>

				<Field data-invalid={!!addressError}>
					<label htmlFor={addressField} className="sr-only">
						{t("contact.address.label")}
						{isRecipient && " *"}
					</label>
					<Textarea
						id={addressField}
						maxLength={MAX_TEXT_AREA}
						placeholder={t("contact.address.placeholder")}
						className={cn(
							inkInput,
							"resize-none leading-relaxed",
							isRecipient ? "text-[1.05rem]" : "min-h-0 text-[0.95rem]"
						)}
						aria-invalid={!!addressError}
						aria-describedby={addressError ? addressErrorId : undefined}
						{...register(addressField)}
					/>
					<FieldError id={addressErrorId}>
						{addressError && t(`form.validation.${addressField}`)}
					</FieldError>
				</Field>
			</div>
		</fieldset>
	);
}

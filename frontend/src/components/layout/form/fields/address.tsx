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
				"m-0 flex flex-col gap-1 border-0 bg-transparent p-0",
				// The recipient block mimics the envelope's address window
				isRecipient &&
					"bg-paper-foreground/2 border-paper-line max-w-sm gap-1 rounded-[2px] border border-solid p-3 sm:p-4",
				className
			)}
		>
			<legend className="paper-label float-left mb-2 w-full p-0 text-sm font-medium">
				{t(`contact.${kind}`)}
			</legend>
			<div className={cn("flex w-full flex-col gap-2", isRecipient && "gap-3")}>
				<Field data-invalid={!!nameError}>
					<label htmlFor={nameField} className="sr-only">
						{t("contact.name.label")}
						{isRecipient && " *"}
					</label>
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
			</div>
		</fieldset>
	);
}

import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useFormContext } from "react-hook-form";
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
	} = useFormContext();

	const nameField = `${kind}Name` as const;
	const addressField = `${kind}Address` as const;

	return (
		<FieldSet className="mb-0 flex-1">
			<FieldLegend>{t(`contact.${kind}`)}</FieldLegend>
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor={nameField}>
						{t("contact.name.label")}
						{kind === "recipient" && "\u2009*"}
					</FieldLabel>
					<Input
						id={nameField}
						maxLength={MAX_INPUT}
						placeholder={t("contact.name.placeholder")}
						className={cn(errors[nameField] && "border-destructive focus-visible:ring-destructive")}
						{...register(nameField)}
					/>
				</Field>

				<Field>
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
							errors[addressField] && "border-destructive focus-visible:ring-destructive"
						)}
						{...register(addressField)}
					/>
				</Field>
			</FieldGroup>
		</FieldSet>
	);
}

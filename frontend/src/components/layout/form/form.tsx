import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle } from "lucide-react";
import * as React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { useFormActionsRegister, useStamp } from "@/components/form-actions-provider";
import { AddressSection } from "@/components/layout/form/fields/address";
import { ClosingSection } from "@/components/layout/form/fields/closing";
import { DetailsSection } from "@/components/layout/form/fields/content";
import { ContentSection } from "@/components/layout/form/fields/editor";
import { SubmissionProvider, useSubmission } from "@/components/submission-provider";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { openPdfInNewTab, submitLetter } from "@/lib/api";
import { todayLocalDate } from "@/lib/date";
import { createEmptyFormValues, formSchema, type FormValues } from "@/lib/formSchema";

function StampSuccessCard() {
	const { t } = useTranslation();

	return (
		<Card className="m-4 mb-0 border border-green-500/50 bg-green-50/50 dark:border-green-600/50 dark:bg-green-950/20">
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-500">
					<CheckCircle className="size-5" />
					{t("stamp.success.title")}
				</CardTitle>
				<CardDescription>{t("stamp.success.description")}</CardDescription>
			</CardHeader>
		</Card>
	);
}

function LetterFormContent() {
	const { t } = useTranslation();
	const { register: registerActions } = useFormActionsRegister();
	const { stamp } = useStamp();
	const { setSubmitting, setError, recordSubmission } = useSubmission();

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: createEmptyFormValues()
	});

	// Sync form mode with stamp context
	// When a stamp is uploaded via navbar, switch to stamp mode
	// When stamp is cleared, switch back to manual mode
	React.useEffect(() => {
		if (stamp.isValid && stamp.file) {
			// Switch to stamp mode and set the file
			form.setValue("mode", "stamp");
			form.setValue("stampFile", stamp.file);
			// Clear any validation errors for address fields since they're not needed
			form.clearErrors(["senderName", "senderAddress", "recipientName", "recipientAddress"]);
		} else {
			// Switch back to manual mode
			form.setValue("mode", "manual");
		}
	}, [stamp.isValid, stamp.file, form]);

	// Register form actions for the navbar
	React.useEffect(() => {
		registerActions({
			fillExample: () => {
				// Example content is already ProseMirror JSON in the translation file
				const exampleContentJson = t("example.content");

				if (stamp.isValid && stamp.file) {
					// Stamp mode: fill only the common fields, keep the stamp
					form.reset(
						{
							mode: "stamp",
							stampFile: stamp.file,
							date: todayLocalDate(),
							subject: t("example.subject"),
							salutation: t("example.salutation"),
							salutationComma: true,
							content: exampleContentJson,
							closing: t("example.closing"),
							signature: t("example.signature")
						},
						{ keepDefaultValues: true }
					);
				} else {
					// Manual mode: fill all fields including addresses
					form.reset(
						{
							mode: "manual",
							date: todayLocalDate(),
							senderName: t("example.senderName"),
							senderAddress: t("example.senderAddress"),
							recipientName: t("example.recipientName"),
							recipientAddress: t("example.recipientAddress"),
							subject: t("example.subject"),
							salutation: t("example.salutation"),
							salutationComma: true,
							content: exampleContentJson,
							closing: t("example.closing"),
							signature: t("example.signature")
						},
						{ keepDefaultValues: true }
					);
				}
			}
		});
	}, [registerActions, form, t, stamp.isValid, stamp.file]);

	const onSubmit = React.useCallback(
		async (data: FormValues) => {
			setSubmitting(true);
			setError(null);

			try {
				const salutation =
					data.salutationComma && data.salutation ? `${data.salutation},` : data.salutation;
				const locale = t("language.dateLocale") as string;
				const finalData = { ...data, salutation, locale };
				delete (finalData as Record<string, unknown>).salutationComma;

				const result = await submitLetter(finalData);

				if (result.success) {
					openPdfInNewTab(result.pdf);
					recordSubmission();
				} else {
					setError(result.error);
				}
			} finally {
				setSubmitting(false);
			}
		},
		[setSubmitting, setError, recordSubmission, t]
	);

	const handleFormSubmit = React.useCallback(
		(e: React.FormEvent<HTMLFormElement>) => {
			form.handleSubmit(onSubmit)(e);
		},
		[form, onSubmit]
	);

	return (
		<FormProvider {...form}>
			<form onSubmit={handleFormSubmit} noValidate className="flex flex-1 flex-col">
				{stamp.isValid ? (
					<StampSuccessCard />
				) : (
					<div className="flex flex-col sm:flex-row">
						<AddressSection kind="sender" />
						<AddressSection kind="recipient" />
					</div>
				)}

				<DetailsSection />

				<div className="bg-card mx-4 mb-4 flex flex-1 flex-col gap-4 border border-t-0 p-4">
					<ContentSection />
					<ClosingSection />
				</div>
			</form>
		</FormProvider>
	);
}

export function LetterForm() {
	return (
		<SubmissionProvider>
			<LetterFormContent />
		</SubmissionProvider>
	);
}

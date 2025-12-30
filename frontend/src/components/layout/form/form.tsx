import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle } from "lucide-react";
import * as React from "react";
import { FormProvider, useForm, type FieldErrors } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { useFormActionsRegister, useStamp } from "@/components/form-actions-provider";
import { AddressSection } from "@/components/layout/form/fields/address";
import { ClosingSection } from "@/components/layout/form/fields/closing";
import { DetailsSection } from "@/components/layout/form/fields/content";
import { ContentSection } from "@/components/layout/form/fields/editor";
import { SubmissionProvider, useSubmission } from "@/components/submission-provider";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { openPdfInNewTab, submitLetter } from "@/lib/api";
import { createEmptyFormValues, formSchema, type FormValues } from "@/lib/formSchema";

function StampSuccessCard() {
	const { t } = useTranslation();

	return (
		<Card className="m-4 border border-green-500/50 bg-green-50/50 dark:border-green-600/50 dark:bg-green-950/20">
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

	// Log validation errors only on submit attempts
	const logValidationErrors = React.useCallback((errors: FieldErrors<FormValues>) => {
		if (Object.keys(errors).length > 0) {
			console.group("Form Validation Errors");
			Object.entries(errors).forEach(([field, error]) => {
				console.warn(`${field}:`, error?.message ?? error);
			});
			console.groupEnd();
		}
	}, []);

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
							date: new Date().toISOString().split("T")[0],
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
							date: new Date().toISOString().split("T")[0],
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
			// Clear any previous errors and set submitting state
			setSubmitting(true);

			// Append comma to salutation if enabled and salutation is not empty
			const salutation =
				data.salutationComma && data.salutation ? `${data.salutation},` : data.salutation;

			// Get the current locale for date formatting from the i18n translation
			const locale = t("language.dateLocale") as string;

			// Prepare final data with processed salutation and locale
			const finalData = { ...data, salutation, locale };
			delete (finalData as Record<string, unknown>).salutationComma;

			// Submit to backend using multipart/form-data
			const result = await submitLetter(finalData);

			if (result.success) {
				// Open the PDF in a new tab
				openPdfInNewTab(result.pdf);
				setError(null);
				// Record successful submission for rate limiting
				recordSubmission();
			} else {
				// Show error to user via popover
				setError(result.error);
			}
		},
		[setSubmitting, setError, recordSubmission, t]
	);

	// Handle form submission with validation error logging
	const handleFormSubmit = React.useCallback(
		(e: React.FormEvent<HTMLFormElement>) => {
			form.handleSubmit(onSubmit, (errors) => logValidationErrors(errors))(e);
		},
		[form, onSubmit, logValidationErrors]
	);

	return (
		<FormProvider {...form}>
			<form onSubmit={handleFormSubmit} noValidate className="flex flex-1 flex-col">
				{stamp.isValid ? (
					<StampSuccessCard />
				) : (
					<div className="flex flex-col sm:flex-row">
						<AddressSection role="sender" />
						<AddressSection role="recipient" />
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

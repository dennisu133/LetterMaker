import * as React from "react";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { useFormActionsRegister, useStamp } from "@/components/form-actions-provider";
import { AddressSection } from "@/components/layout/form/fields/address";
import { ClosingSection } from "@/components/layout/form/fields/closing";
import { DetailsSection } from "@/components/layout/form/fields/content";
import { StampCorner } from "@/components/layout/form/stamp-corner";
import { SubmissionProvider, useSubmission } from "@/components/submission-provider";
import { openPdfInNewTab, submitLetter } from "@/lib/api";
import { todayLocalDate } from "@/lib/date";
import { createEmptyFormValues } from "@/lib/formDefaults";
import type { FormValues } from "@/lib/formSchema";

const lazyFormResolver: Resolver<FormValues> = async (values, context, options) => {
	const [{ zodResolver }, { formSchema }] = await Promise.all([
		import("@hookform/resolvers/zod"),
		import("@/lib/formSchema")
	]);

	return zodResolver(formSchema)(values, context, options);
};

// Fetch the validation chunks once the browser is idle so the first submit
// doesn't have to wait for them.
function useWarmFormResolver() {
	React.useEffect(() => {
		const warmUp = () => {
			void import("@hookform/resolvers/zod");
			void import("@/lib/formSchema");
		};

		if ("requestIdleCallback" in window) {
			const id = requestIdleCallback(warmUp);
			return () => cancelIdleCallback(id);
		}

		const id = setTimeout(warmUp, 2000);
		return () => clearTimeout(id);
	}, []);
}

// Keep the tiptap editor out of the critical chunk; a flex spacer holds the
// layout until it arrives.
const ContentSection = React.lazy(async () => {
	const module = await import("@/components/layout/form/fields/editor");
	return { default: module.ContentSection };
});

function LetterFormContent() {
	const { t } = useTranslation();
	const { register: registerActions } = useFormActionsRegister();
	const { stamp } = useStamp();
	const { setSubmitting, setError } = useSubmission();

	const form = useForm<FormValues>({
		resolver: lazyFormResolver,
		defaultValues: createEmptyFormValues()
	});

	useWarmFormResolver();

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
				} else {
					setError(result.error);
				}
			} finally {
				setSubmitting(false);
			}
		},
		[setSubmitting, setError, t]
	);

	const handleFormSubmit = React.useCallback(
		(e: React.FormEvent<HTMLFormElement>) => {
			form.handleSubmit(onSubmit)(e);
		},
		[form, onSubmit]
	);

	return (
		<FormProvider {...form}>
			<form
				onSubmit={handleFormSubmit}
				noValidate
				className="flex w-full flex-1 flex-col items-center px-2 py-4 sm:px-6 sm:py-6"
			>
				<div className="letter-sheet flex w-full max-w-6xl flex-1 flex-col px-5 py-6 sm:px-10 sm:py-8">
					{/* Letterhead: sender and recipient window left, stamp corner right */}
					<div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
						{stamp.isValid ? (
							<div className="hidden flex-1 sm:block" aria-hidden="true" />
						) : (
							<div className="flex flex-1 flex-col gap-4 md:flex-row md:gap-10">
								<AddressSection kind="sender" className="flex-1 md:max-w-xs" />
								<AddressSection kind="recipient" className="flex-1 md:max-w-sm" />
							</div>
						)}
						<StampCorner />
					</div>

					<DetailsSection />

					<React.Suspense fallback={<div className="flex-1" aria-hidden="true" />}>
						<ContentSection />
					</React.Suspense>
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

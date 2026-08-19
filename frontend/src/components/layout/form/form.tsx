import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
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

// Keep the tiptap editor out of the critical chunk; a flex spacer holds the
// layout until it arrives.
const ContentSection = lazy(async () => {
	const module = await import("@/components/layout/form/fields/editor");
	return { default: module.ContentSection };
});

const resolveForm: Resolver<FormValues> = async (values, context, options) => {
	const [{ zodResolver }, { formSchema }] = await Promise.all([
		import("@hookform/resolvers/zod"),
		import("@/lib/formSchema")
	]);
	return zodResolver(formSchema)(values, context, options);
};

function DeferredLetterBody() {
	const [shouldLoad, setShouldLoad] = useState(false);
	const [focusEditorOnMount, setFocusEditorOnMount] = useState(false);
	const placeholderRef = useRef<HTMLButtonElement>(null);
	const { t } = useTranslation();

	useEffect(() => {
		const placeholder = placeholderRef.current;
		if (!placeholder || typeof IntersectionObserver === "undefined") {
			setShouldLoad(true);
			return;
		}

		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry?.isIntersecting) return;
				setFocusEditorOnMount(document.activeElement === placeholder);
				setShouldLoad(true);
				observer.disconnect();
			},
			{ threshold: 1 }
		);
		observer.observe(placeholder);

		return () => observer.disconnect();
	}, []);

	if (!shouldLoad) {
		return (
			<button
				ref={placeholderRef}
				type="button"
				onClick={() => {
					setFocusEditorOnMount(true);
					setShouldLoad(true);
				}}
				className="text-paper-faint border-paper-line mt-5 min-h-64 flex-1 cursor-text border-b border-dashed py-2 text-left font-serif sm:mt-6"
			>
				{t("content.editor.placeholder")}
			</button>
		);
	}

	return (
		<>
			<Suspense fallback={<div className="mt-5 min-h-28 flex-1 sm:mt-6" aria-hidden="true" />}>
				<ContentSection focusOnMount={focusEditorOnMount} />
			</Suspense>
			<ClosingSection />
		</>
	);
}

function LetterFormContent() {
	const { t } = useTranslation();
	const { register: registerActions } = useFormActionsRegister();
	const { stamp, clearStamp } = useStamp();
	const { setSubmitting, setError } = useSubmission();

	const form = useForm<FormValues>({
		resolver: resolveForm,
		defaultValues: createEmptyFormValues()
	});
	const isDirty = form.formState.isDirty;

	// Sync form mode with stamp context
	useEffect(() => {
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
	useEffect(() => {
		registerActions({
			resetForm: () => {
				if ((isDirty || stamp.isValid) && !window.confirm(t("form.confirm.reset"))) return;
				form.reset();
				clearStamp();
				setError(null);
			},
			fillExample: () => {
				if (isDirty && !window.confirm(t("form.confirm.example"))) return;

				const commonValues = {
					date: todayLocalDate(),
					subject: t("example.subject"),
					salutation: t("example.salutation"),
					salutationComma: true,
					// Example content is already ProseMirror JSON in the translation file
					content: t("example.content"),
					closing: t("example.closing"),
					signature: t("example.signature")
				};

				const values =
					stamp.isValid && stamp.file
						? { ...commonValues, mode: "stamp" as const, stampFile: stamp.file }
						: {
								...commonValues,
								mode: "manual" as const,
								senderName: t("example.senderName"),
								senderAddress: t("example.senderAddress"),
								recipientName: t("example.recipientName"),
								recipientAddress: t("example.recipientAddress")
							};

				form.reset(values, { keepDefaultValues: true });
			}
		});
	}, [registerActions, form, t, stamp.isValid, stamp.file, clearStamp, setError, isDirty]);

	const onSubmit = useCallback(
		async (data: FormValues) => {
			setSubmitting(true);
			setError(null);

			try {
				const salutation =
					data.salutationComma && data.salutation ? `${data.salutation},` : data.salutation;
				const locale = t("language.dateLocale") as string;
				const finalData = { ...data, salutation, locale };

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

	return (
		<FormProvider {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				noValidate
				className="flex flex-1 flex-col items-center px-2 py-4 sm:px-6 sm:py-6"
			>
				<div className="letter-sheet flex w-full max-w-6xl flex-1 flex-col px-5 py-6 sm:px-10 sm:py-8">
					{/* Letterhead: sender and recipient window left, stamp corner right */}
					<div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-start sm:justify-end sm:gap-8">
						{!stamp.isValid && (
							<div className="flex flex-1 flex-col gap-4 md:flex-row md:gap-10">
								<AddressSection kind="sender" className="flex-1 md:max-w-xs" />
								<AddressSection kind="recipient" className="flex-1" />
							</div>
						)}
						<StampCorner />
					</div>

					<DetailsSection />

					<DeferredLetterBody />
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

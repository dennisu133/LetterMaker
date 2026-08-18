import * as React from "react";

import type { ErrorCode } from "@/lib/api";

interface SubmissionContextValue {
	isSubmitting: boolean;
	setSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
	error: ErrorCode | null;
	setError: React.Dispatch<React.SetStateAction<ErrorCode | null>>;
}

const SubmissionContext = React.createContext<SubmissionContextValue | null>(null);

export function SubmissionProvider({ children }: { children: React.ReactNode }) {
	const [isSubmitting, setSubmitting] = React.useState(false);
	const [error, setError] = React.useState<ErrorCode | null>(null);

	return (
		<SubmissionContext.Provider value={{ isSubmitting, setSubmitting, error, setError }}>
			{children}
		</SubmissionContext.Provider>
	);
}

export function useSubmission(): SubmissionContextValue {
	const context = React.useContext(SubmissionContext);
	if (!context) {
		throw new Error("useSubmission must be used within a SubmissionProvider");
	}
	return context;
}

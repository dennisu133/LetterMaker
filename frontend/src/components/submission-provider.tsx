import type { Dispatch, ReactNode, SetStateAction } from "react";
import { createContext, useContext, useState } from "react";

import type { ErrorCode } from "@/lib/api";

interface SubmissionContextValue {
	isSubmitting: boolean;
	setSubmitting: Dispatch<SetStateAction<boolean>>;
	error: ErrorCode | null;
	setError: Dispatch<SetStateAction<ErrorCode | null>>;
}

const SubmissionContext = createContext<SubmissionContextValue | null>(null);

export function SubmissionProvider({ children }: { children: ReactNode }) {
	const [isSubmitting, setSubmitting] = useState(false);
	const [error, setError] = useState<ErrorCode | null>(null);

	return (
		<SubmissionContext.Provider value={{ isSubmitting, setSubmitting, error, setError }}>
			{children}
		</SubmissionContext.Provider>
	);
}

export function useSubmission(): SubmissionContextValue {
	const context = useContext(SubmissionContext);
	if (!context) {
		throw new Error("useSubmission must be used within a SubmissionProvider");
	}
	return context;
}

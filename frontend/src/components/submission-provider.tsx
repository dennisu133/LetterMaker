import * as React from "react";

import type { ErrorCode } from "@/lib/api";
import { useRateLimit } from "@/lib/useRateLimit";

interface SubmissionState {
	isSubmitting: boolean;
	error: ErrorCode | null;
}

interface SubmissionContextValue {
	state: SubmissionState;
	setSubmitting: (isSubmitting: boolean) => void;
	setError: (error: ErrorCode | null) => void;
	clearError: () => void;
	/** Whether submission is allowed (not rate limited) */
	canSubmit: boolean;
	/** Remaining cooldown in seconds */
	cooldownSeconds: number;
	/** Current cooldown duration in seconds (shows escalation) */
	currentCooldownSeconds: number;
	/** Call this after a successful submission to start the cooldown */
	recordSubmission: () => void;
}

const SubmissionContext = React.createContext<SubmissionContextValue | null>(null);

export function SubmissionProvider({ children }: { children: React.ReactNode }) {
	const [state, setState] = React.useState<SubmissionState>({
		isSubmitting: false,
		error: null
	});

	const { canSubmit, cooldownSeconds, currentCooldownSeconds, recordSubmission } = useRateLimit();

	const setSubmitting = React.useCallback((isSubmitting: boolean) => {
		setState((prev) => ({ ...prev, isSubmitting }));
	}, []);

	const setError = React.useCallback((error: ErrorCode | null) => {
		setState((prev) => ({ ...prev, error }));
	}, []);

	const clearError = React.useCallback(() => {
		setState((prev) => ({ ...prev, error: null }));
	}, []);

	const value = React.useMemo(
		() => ({
			state,
			setSubmitting,
			setError,
			clearError,
			canSubmit,
			cooldownSeconds,
			currentCooldownSeconds,
			recordSubmission
		}),
		[
			state,
			setSubmitting,
			setError,
			clearError,
			canSubmit,
			cooldownSeconds,
			currentCooldownSeconds,
			recordSubmission
		]
	);

	return <SubmissionContext.Provider value={value}>{children}</SubmissionContext.Provider>;
}

export function useSubmission(): SubmissionContextValue {
	const context = React.useContext(SubmissionContext);
	if (!context) {
		throw new Error("useSubmission must be used within a SubmissionProvider");
	}
	return context;
}

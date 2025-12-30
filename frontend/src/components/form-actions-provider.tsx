import * as React from "react";

import { validateStamp, type StampValidationResult } from "@/lib/validateStamp";

type FormActions = {
	fillExample: () => void;
};

const FormActionsContext = React.createContext<FormActions | null>(null);

type FormActionsRegisterContext = {
	register: (actions: FormActions) => void;
};

const FormActionsRegisterContext = React.createContext<FormActionsRegisterContext | null>(null);

// Stamp state management
type StampState = {
	file: File | null;
	isValid: boolean;
};

// Upload state for validation feedback
export type StampUploadState =
	| { status: "idle" }
	| { status: "validating" }
	| { status: "error"; error: StampValidationResult & { valid: false } };

type StampContext = {
	stamp: StampState;
	uploadState: StampUploadState;
	uploadStamp: (file: File) => Promise<void>;
	clearStamp: () => void;
	clearError: () => void;
};

const StampContext = React.createContext<StampContext | null>(null);

export function FormActionsProvider({ children }: { children: React.ReactNode }) {
	const [actions, setActions] = React.useState<FormActions | null>(null);
	const [stamp, setStampState] = React.useState<StampState>({ file: null, isValid: false });
	const [uploadState, setUploadState] = React.useState<StampUploadState>({ status: "idle" });

	const register = React.useCallback((newActions: FormActions) => {
		setActions(newActions);
	}, []);

	const uploadStamp = React.useCallback(async (file: File) => {
		setUploadState({ status: "validating" });

		const result = await validateStamp(file);

		if (result.valid) {
			setStampState({ file: result.file, isValid: true });
			setUploadState({ status: "idle" });
		} else {
			setUploadState({ status: "error", error: result });
		}
	}, []);

	const clearStamp = React.useCallback(() => {
		setStampState({ file: null, isValid: false });
		setUploadState({ status: "idle" });
	}, []);

	const clearError = React.useCallback(() => {
		setUploadState({ status: "idle" });
	}, []);

	return (
		<FormActionsRegisterContext.Provider value={{ register }}>
			<StampContext.Provider value={{ stamp, uploadState, uploadStamp, clearStamp, clearError }}>
				<FormActionsContext.Provider value={actions}>{children}</FormActionsContext.Provider>
			</StampContext.Provider>
		</FormActionsRegisterContext.Provider>
	);
}

export function useFormActions() {
	const context = React.useContext(FormActionsContext);
	return context;
}

export function useFormActionsRegister() {
	const context = React.useContext(FormActionsRegisterContext);
	if (!context) {
		throw new Error("useFormActionsRegister must be used within a FormActionsProvider");
	}
	return context;
}

export function useStamp() {
	const context = React.useContext(StampContext);
	if (!context) {
		throw new Error("useStamp must be used within a FormActionsProvider");
	}
	return context;
}

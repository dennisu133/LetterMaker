import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useState } from "react";

import { validateStamp, type StampValidationResult } from "@/lib/validateStamp";

type FormActions = {
	fillExample: () => void;
};

const FormActionsContext = createContext<FormActions | null>(null);

type FormActionsRegisterContext = {
	register: (actions: FormActions) => void;
};

const FormActionsRegisterContext = createContext<FormActionsRegisterContext | null>(null);

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

const StampContext = createContext<StampContext | null>(null);

export function FormActionsProvider({ children }: { children: ReactNode }) {
	const [actions, setActions] = useState<FormActions | null>(null);
	const [stamp, setStampState] = useState<StampState>({ file: null, isValid: false });
	const [uploadState, setUploadState] = useState<StampUploadState>({ status: "idle" });

	const register = useCallback((newActions: FormActions) => {
		setActions(newActions);
	}, []);

	const uploadStamp = useCallback(async (file: File) => {
		setUploadState({ status: "validating" });

		const result = await validateStamp(file);

		if (result.valid) {
			setStampState({ file: result.file, isValid: true });
			setUploadState({ status: "idle" });
		} else {
			setUploadState({ status: "error", error: result });
		}
	}, []);

	const clearStamp = useCallback(() => {
		setStampState({ file: null, isValid: false });
		setUploadState({ status: "idle" });
	}, []);

	const clearError = useCallback(() => {
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
	const context = useContext(FormActionsContext);
	return context;
}

export function useFormActionsRegister() {
	const context = useContext(FormActionsRegisterContext);
	if (!context) {
		throw new Error("useFormActionsRegister must be used within a FormActionsProvider");
	}
	return context;
}

export function useStamp() {
	const context = useContext(StampContext);
	if (!context) {
		throw new Error("useStamp must be used within a FormActionsProvider");
	}
	return context;
}

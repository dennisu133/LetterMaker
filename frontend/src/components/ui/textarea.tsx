import * as React from "react";

import { cn } from "@/lib/utils";

// Check if browser supports field-sizing: content (Firefox doesn't)
const supportsFieldSizing = typeof CSS !== "undefined" && CSS.supports?.("field-sizing", "content");

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
	({ className, value, defaultValue, ...props }, forwardedRef) => {
		const internalRef = React.useRef<HTMLTextAreaElement>(null);

		// Merge refs so both internal and forwarded refs work
		const setRefs = React.useCallback(
			(element: HTMLTextAreaElement | null) => {
				internalRef.current = element;
				if (typeof forwardedRef === "function") {
					forwardedRef(element);
				} else if (forwardedRef) {
					forwardedRef.current = element;
				}
			},
			[forwardedRef]
		);

		// Auto-resize fallback for browsers that don't support field-sizing: content
		React.useLayoutEffect(() => {
			if (supportsFieldSizing) return;

			const textarea = internalRef.current;
			if (!textarea) return;

			const adjustHeight = () => {
				const minHeight = parseFloat(getComputedStyle(textarea).minHeight) || 0;
				// Reset to minHeight to get accurate scrollHeight measurement
				textarea.style.height = `${minHeight}px`;
				// Expand to fit content, but never shrink below minHeight
				textarea.style.height = `${Math.max(textarea.scrollHeight, minHeight)}px`;
			};

			// Adjust on mount and when value changes
			adjustHeight();

			// For controlled components (value prop provided), only adjust when value changes via the effect
			// For uncontrolled components, listen to input events
			const isControlled = value !== undefined;

			if (!isControlled) {
				textarea.addEventListener("input", adjustHeight);
			}

			// Adjust on window resize (textarea width might change)
			window.addEventListener("resize", adjustHeight);

			return () => {
				if (!isControlled) {
					textarea.removeEventListener("input", adjustHeight);
				}
				window.removeEventListener("resize", adjustHeight);
			};
		}, [value]); // Re-run when value changes (controlled components)

		return (
			<textarea
				ref={setRefs}
				data-slot="textarea"
				className={cn(
					"border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 disabled:bg-input/50 dark:disabled:bg-input/80 placeholder:text-muted-foreground flex field-sizing-content min-h-16 w-full overflow-hidden rounded-none border bg-transparent px-2.5 py-2 text-xs transition-colors outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-1 md:text-xs",
					className
				)}
				value={value}
				defaultValue={defaultValue}
				{...props}
			/>
		);
	}
);

Textarea.displayName = "Textarea";

export { Textarea };

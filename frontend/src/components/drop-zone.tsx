import { Upload } from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { useStamp } from "@/components/form-actions-provider";
import { cn } from "@/lib/utils";

export function DropZone() {
	const { t } = useTranslation();
	const { stamp, uploadState, uploadStamp } = useStamp();
	const [isDragging, setIsDragging] = React.useState(false);
	const dragCounterRef = React.useRef(0);

	const isValidating = uploadState.status === "validating";

	// Don't show drop zone if stamp is already uploaded or currently validating
	const canDrop = !stamp.isValid && !isValidating;

	React.useEffect(() => {
		const handleDragEnter = (e: DragEvent) => {
			e.preventDefault();
			e.stopPropagation();

			// Only react to file drags
			if (!e.dataTransfer?.types.includes("Files")) return;

			dragCounterRef.current++;
			if (dragCounterRef.current === 1 && canDrop) {
				setIsDragging(true);
			}
		};

		const handleDragLeave = (e: DragEvent) => {
			e.preventDefault();
			e.stopPropagation();

			dragCounterRef.current--;
			if (dragCounterRef.current === 0) {
				setIsDragging(false);
			}
		};

		const handleDragOver = (e: DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
		};

		const handleDrop = async (e: DragEvent) => {
			e.preventDefault();
			e.stopPropagation();

			dragCounterRef.current = 0;
			setIsDragging(false);

			if (!canDrop) return;

			const file = e.dataTransfer?.files[0];
			if (file) {
				await uploadStamp(file);
			}
		};

		// Add listeners to document to catch drags from anywhere
		document.addEventListener("dragenter", handleDragEnter);
		document.addEventListener("dragleave", handleDragLeave);
		document.addEventListener("dragover", handleDragOver);
		document.addEventListener("drop", handleDrop);

		return () => {
			document.removeEventListener("dragenter", handleDragEnter);
			document.removeEventListener("dragleave", handleDragLeave);
			document.removeEventListener("dragover", handleDragOver);
			document.removeEventListener("drop", handleDrop);
		};
	}, [canDrop, uploadStamp]);

	if (!isDragging) return null;

	return (
		<div
			className={cn(
				"pointer-events-none fixed inset-0 z-50",
				"flex items-center justify-center",
				"bg-primary/5 backdrop-blur-[2px]",
				"border-primary border-4 border-dashed",
				"animate-in fade-in duration-150"
			)}
		>
			<div
				className={cn(
					"flex flex-col items-center gap-4 p-8",
					"bg-background border-foreground border-2"
				)}
			>
				<Upload className="text-primary size-12" strokeWidth={2.5} />
				<div className="text-center">
					<p className="text-lg font-bold">{t("stamp.drop.title")}</p>
					<p className="text-muted-foreground text-sm">{t("stamp.drop.description")}</p>
				</div>
			</div>
		</div>
	);
}

import {
	Bold,
	ChevronDown,
	Eraser,
	Italic,
	List,
	ListOrdered,
	Pilcrow,
	Quote,
	Strikethrough,
	Underline as UnderlineIcon
} from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";

import { quietControl } from "@/lib/paper";
import { cn } from "@/lib/utils";

// Sizing shared between the real editor toolbar (editor.tsx) and this
// skeleton so the swap after the lazy editor chunk loads is invisible.
// The toolbar sits on the paper sheet, so its controls use paper colors.
export const toolbarClass =
	"border-paper-line flex flex-wrap items-center gap-1 border-b py-1 opacity-80 transition-opacity group-focus-within/editor:opacity-100";
export const toolbarDropdownButtonClass = cn(
	"h-[clamp(1.5rem,1.25rem+0.75vw,1.75rem)] gap-1 px-[clamp(0.25rem,0.125rem+0.375vw,0.5rem)]",
	quietControl
);
export const toolbarIconClass = "size-[clamp(0.875rem,0.75rem+0.375vw,1rem)]";
export const toolbarChevronClass = "size-[clamp(0.625rem,0.5rem+0.375vw,0.75rem)]";
export const toolbarSeparatorClass = cn(
	"mx-[clamp(0,0.0625vw,0.125rem)] my-auto h-[clamp(1.25rem,1rem+0.75vw,1.5rem)]",
	"bg-paper-line"
);
export const toolbarSquareButtonClass = cn(
	"size-[clamp(1.5rem,1.25rem+0.75vw,1.75rem)] p-0",
	quietControl
);
export const toolbarToggleClass = quietControl;

const toggleGroups = [[Bold, Italic, UnderlineIcon, Strikethrough], [List, ListOrdered], [Quote]];

/**
 * Non-interactive stand-in rendered while the editor chunk downloads.
 * Mirrors the DOM of ContentSection (label, toolbar, placeholder) so nothing
 * visibly changes once the real editor takes over.
 */
export function ContentSectionSkeleton() {
	const { t } = useTranslation();

	return (
		<Field
			className="group/editor mt-5 flex min-h-0 flex-1 flex-col gap-1 sm:mt-6"
			aria-hidden="true"
			inert
		>
			<FieldLabel htmlFor="content" className="sr-only">
				{t("content.editor.label") + "\u2009*"}
			</FieldLabel>
			<div className="flex flex-1 flex-col">
				<div className={toolbarClass}>
					<Button variant="ghost" size="sm" type="button" className={toolbarDropdownButtonClass}>
						<Pilcrow className={toolbarIconClass} />
						<ChevronDown className={toolbarChevronClass} />
					</Button>
					{toggleGroups.map((icons, groupIndex) => (
						<React.Fragment key={groupIndex}>
							<Separator orientation="vertical" className={toolbarSeparatorClass} />
							{icons.map((Icon, iconIndex) => (
								<Toggle key={iconIndex} size="sm-responsive" className={toolbarToggleClass}>
									<Icon className={toolbarIconClass} />
								</Toggle>
							))}
						</React.Fragment>
					))}
					<Button variant="ghost" size="sm" type="button" className={toolbarSquareButtonClass}>
						<Eraser className={toolbarIconClass} />
					</Button>
				</div>
				<div className="text-paper-faint min-h-28 flex-1 py-2 font-serif text-[1.02rem] leading-[1.8]">
					{t("content.editor.placeholder")}
				</div>
			</div>
		</Field>
	);
}

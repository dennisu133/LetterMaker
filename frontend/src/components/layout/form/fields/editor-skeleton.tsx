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

// Sizing shared between the real editor toolbar (editor.tsx) and this
// skeleton so the swap after the lazy editor chunk loads is invisible.
export const toolbarClass = "border-input flex flex-wrap items-center gap-1 border-b p-1";
export const toolbarDropdownButtonClass =
	"h-[clamp(1.5rem,1.25rem+0.75vw,1.75rem)] gap-1 px-[clamp(0.25rem,0.125rem+0.375vw,0.5rem)]";
export const toolbarIconClass = "size-[clamp(0.875rem,0.75rem+0.375vw,1rem)]";
export const toolbarChevronClass = "size-[clamp(0.625rem,0.5rem+0.375vw,0.75rem)]";
export const toolbarSeparatorClass =
	"mx-[clamp(0,0.0625vw,0.125rem)] my-auto h-[clamp(1.25rem,1rem+0.75vw,1.5rem)]";
export const toolbarSquareButtonClass = "size-[clamp(1.5rem,1.25rem+0.75vw,1.75rem)] p-0";

const toggleGroups = [[Bold, Italic, UnderlineIcon, Strikethrough], [List, ListOrdered], [Quote]];

/**
 * Non-interactive stand-in rendered while the editor chunk downloads.
 * Mirrors the DOM of ContentSection (label, toolbar, placeholder) so nothing
 * visibly changes once the real editor takes over.
 */
export function ContentSectionSkeleton() {
	const { t } = useTranslation();

	return (
		<Field className="flex flex-1 flex-col gap-1" aria-hidden="true" inert>
			<FieldLabel htmlFor="content">{t("content.editor.label") + "\u2009*"}</FieldLabel>
			<div className="border-input flex flex-1 flex-col border">
				<div className={toolbarClass}>
					<Button variant="ghost" size="sm" type="button" className={toolbarDropdownButtonClass}>
						<Pilcrow className={toolbarIconClass} />
						<ChevronDown className={toolbarChevronClass} />
					</Button>
					{toggleGroups.map((icons, groupIndex) => (
						<React.Fragment key={groupIndex}>
							<Separator orientation="vertical" className={toolbarSeparatorClass} />
							{icons.map((Icon, iconIndex) => (
								<Toggle key={iconIndex} size="sm-responsive">
									<Icon className={toolbarIconClass} />
								</Toggle>
							))}
						</React.Fragment>
					))}
					<Button variant="ghost" size="sm" type="button" className={toolbarSquareButtonClass}>
						<Eraser className={toolbarIconClass} />
					</Button>
				</div>
				<div className="dark:bg-input/30 text-muted-foreground min-h-16 flex-1 px-2.5 py-2 text-xs">
					{t("content.editor.placeholder")}
				</div>
			</div>
		</Field>
	);
}

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Field, FieldError } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MAX_CONTENT } from "@/lib/constants";
import { quietControl } from "@/lib/paper";
import { createEmptyDoc, parseProseMirrorJson } from "@/lib/prosemirror";
import { cn } from "@/lib/utils";

import CharacterCount from "@tiptap/extension-character-count";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import {
	Bold,
	ChevronDown,
	Eraser,
	Heading1,
	Heading2,
	Heading3,
	Italic,
	List,
	ListOrdered,
	Pilcrow,
	Quote,
	Strikethrough,
	Underline as UnderlineIcon,
	type LucideIcon
} from "lucide-react";
import * as React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

const toolbarClass =
	"border-paper-line flex flex-wrap items-center gap-1 border-b py-1 opacity-80 transition-opacity group-focus-within/editor:opacity-100";
const toolbarDropdownButtonClass = cn(
	"h-[clamp(1.5rem,1.25rem+0.75vw,1.75rem)] gap-1 px-[clamp(0.25rem,0.125rem+0.375vw,0.5rem)]",
	quietControl
);
const toolbarIconClass = "size-[clamp(0.875rem,0.75rem+0.375vw,1rem)]";
const toolbarChevronClass = "size-[clamp(0.625rem,0.5rem+0.375vw,0.75rem)]";
const toolbarSeparatorClass = cn(
	"mx-[clamp(0,0.0625vw,0.125rem)] my-auto h-[clamp(1.25rem,1rem+0.75vw,1.5rem)]",
	"bg-paper-line"
);
const toolbarSquareButtonClass = cn(
	"size-[clamp(1.5rem,1.25rem+0.75vw,1.75rem)] p-0",
	quietControl
);
const toolbarToggleClass = quietControl;

interface EditorToolbarProps {
	editor: Editor;
}

interface ToolbarToggleButtonProps {
	active: boolean;
	icon: LucideIcon;
	label: string;
	onPressedChange: () => void;
}

const headingIcons = [Pilcrow, Heading1, Heading2, Heading3] as const;

function ToolbarToggleButton({
	active,
	icon: Icon,
	label,
	onPressedChange
}: ToolbarToggleButtonProps) {
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Toggle
						className={toolbarToggleClass}
						size="sm-responsive"
						aria-label={label}
						pressed={active}
						onPressedChange={onPressedChange}
					/>
				}
			>
				<Icon className={toolbarIconClass} />
			</TooltipTrigger>
			<TooltipContent>
				<p>{label}</p>
			</TooltipContent>
		</Tooltip>
	);
}

const EditorToolbar = React.memo(({ editor }: EditorToolbarProps) => {
	const { t } = useTranslation();
	const state = useEditorState({
		editor,
		selector: ({ editor }) => ({
			bold: editor.isActive("bold"),
			italic: editor.isActive("italic"),
			underline: editor.isActive("underline"),
			strike: editor.isActive("strike"),
			bulletList: editor.isActive("bulletList"),
			orderedList: editor.isActive("orderedList"),
			blockquote: editor.isActive("blockquote"),
			heading: editor.isActive("heading", { level: 1 })
				? 1
				: editor.isActive("heading", { level: 2 })
					? 2
					: editor.isActive("heading", { level: 3 })
						? 3
						: 0
		})
	});
	const CurrentIcon = headingIcons[state.heading];

	return (
		<div className={toolbarClass}>
			<DropdownMenu>
				<Tooltip>
					<TooltipTrigger
						render={
							<DropdownMenuTrigger
								render={
									<Button
										variant="ghost"
										size="sm"
										className={toolbarDropdownButtonClass}
										aria-label={t("content.editor.text_style")}
									>
										<CurrentIcon className={toolbarIconClass} />
										<ChevronDown className={toolbarChevronClass} />
									</Button>
								}
							/>
						}
					/>
					<TooltipContent>
						<p>{t("content.editor.text_style")}</p>
					</TooltipContent>
				</Tooltip>
				<DropdownMenuContent align="start">
					<DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()}>
						<Pilcrow className="size-4" />
						{t("content.editor.paragraph")}
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
					>
						<Heading1 className="size-4" />
						{t("content.editor.heading1")}
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
					>
						<Heading2 className="size-4" />
						{t("content.editor.heading2")}
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
					>
						<Heading3 className="size-4" />
						{t("content.editor.heading3")}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<Separator orientation="vertical" className={toolbarSeparatorClass} />

			<ToolbarToggleButton
				label={t("content.editor.bold")}
				icon={Bold}
				active={state.bold}
				onPressedChange={() => editor.chain().focus().toggleBold().run()}
			/>
			<ToolbarToggleButton
				label={t("content.editor.italic")}
				icon={Italic}
				active={state.italic}
				onPressedChange={() => editor.chain().focus().toggleItalic().run()}
			/>
			<ToolbarToggleButton
				label={t("content.editor.underline")}
				icon={UnderlineIcon}
				active={state.underline}
				onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
			/>
			<ToolbarToggleButton
				label={t("content.editor.strikethrough")}
				icon={Strikethrough}
				active={state.strike}
				onPressedChange={() => editor.chain().focus().toggleStrike().run()}
			/>

			<Separator orientation="vertical" className={toolbarSeparatorClass} />

			<ToolbarToggleButton
				label={t("content.editor.bullet_list")}
				icon={List}
				active={state.bulletList}
				onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
			/>
			<ToolbarToggleButton
				label={t("content.editor.ordered_list")}
				icon={ListOrdered}
				active={state.orderedList}
				onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
			/>

			<Separator orientation="vertical" className={toolbarSeparatorClass} />

			<ToolbarToggleButton
				label={t("content.editor.blockquote")}
				icon={Quote}
				active={state.blockquote}
				onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
			/>

			<Tooltip>
				<TooltipTrigger
					render={
						<Button
							variant="ghost"
							size="sm"
							className={toolbarSquareButtonClass}
							aria-label={t("content.editor.remove_formatting")}
							onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
						/>
					}
				>
					<Eraser className={toolbarIconClass} />
				</TooltipTrigger>
				<TooltipContent>
					<p>{t("content.editor.remove_formatting")}</p>
				</TooltipContent>
			</Tooltip>
		</div>
	);
});

interface TipTapEditorProps {
	value: string;
	onChange: (value: string) => void;
	onBlur: () => void;
	hasError?: boolean;
}

function TipTapEditor({ value, onChange, onBlur, hasError }: TipTapEditorProps) {
	const { i18n, t } = useTranslation();
	const placeholder = t("content.editor.placeholder");
	const editorLabel = t("content.editor.label");

	// Track the last value we sent to the form to avoid unnecessary syncs
	const lastValueRef = React.useRef(value);
	// Stable callback refs to avoid re-creating the editor
	const onChangeRef = React.useRef(onChange);
	const onBlurRef = React.useRef(onBlur);

	// Keep refs up to date
	React.useLayoutEffect(() => {
		onChangeRef.current = onChange;
		onBlurRef.current = onBlur;
	});

	const getEditorAttributes = React.useCallback(
		() => ({
			class: cn(
				"min-h-28 max-w-none flex-1 py-2 font-serif text-[1.02rem] leading-[1.8] outline-none",
				"[&_h1]:text-xl [&_h1]:font-bold [&_h1]:leading-snug",
				"[&_h2]:text-sm [&_h2]:font-bold [&_h2]:leading-snug",
				"[&_h3]:text-xs [&_h3]:font-semibold [&_h3]:leading-snug",
				"[&_ul]:list-disc [&_ul]:pl-5",
				"[&_ol]:list-decimal [&_ol]:pl-5",
				"[&_blockquote]:border-l-2 [&_blockquote]:border-paper-line [&_blockquote]:pl-3 [&_blockquote]:italic",
				"[&_.is-editor-empty:first-child]:before:text-paper-faint [&_.is-editor-empty:first-child]:before:content-[attr(data-placeholder)] [&_.is-editor-empty:first-child]:before:float-left [&_.is-editor-empty:first-child]:before:h-0 [&_.is-editor-empty:first-child]:before:pointer-events-none"
			),
			id: "content",
			role: "textbox",
			"aria-label": editorLabel,
			"aria-multiline": "true",
			...(hasError
				? {
						"aria-invalid": "true",
						"aria-describedby": "content-error"
					}
				: {})
		}),
		[editorLabel, hasError]
	);

	// compute initial content
	const initialContent = React.useMemo(() => {
		if (!value) return createEmptyDoc();
		return parseProseMirrorJson(value) ?? createEmptyDoc();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				heading: {
					levels: [1, 2, 3]
				},
				// Disable dropcursor to prevent visual indicators when dragging files over the editor
				dropcursor: false
			}),
			CharacterCount.configure({
				limit: MAX_CONTENT
			}),
			Placeholder.configure({
				placeholder: () => i18n.t("content.editor.placeholder"),
				emptyEditorClass: "is-editor-empty"
			})
		],
		content: initialContent,
		immediatelyRender: true,
		editorProps: {
			attributes: getEditorAttributes()
		},
		onUpdate: ({ editor }) => {
			const json = JSON.stringify(editor.getJSON());
			lastValueRef.current = json;
			onChangeRef.current(json);
		},
		onBlur: () => {
			onBlurRef.current();
		}
	});

	React.useEffect(() => {
		if (!editor) return;

		editor.setOptions({
			editorProps: {
				attributes: getEditorAttributes()
			}
		});
		editor.view.dispatch(editor.state.tr);
	}, [editor, getEditorAttributes, placeholder]);

	// Update editor content only when value changes externally (e.g., form reset)
	React.useEffect(() => {
		if (!editor) return;

		// Skip if the value matches what we last sent (internal change)
		if (value === lastValueRef.current) return;

		// Update our ref and sync content
		lastValueRef.current = value;
		const newContent = value ? parseProseMirrorJson(value) : createEmptyDoc();
		if (newContent) {
			// Avoid emitting an update event here; the form state already owns `value`.
			editor.commands.setContent(newContent, { emitUpdate: false });
		}
	}, [value, editor]);

	return (
		<div
			className={cn(
				"flex flex-1 flex-col border-b border-dashed transition-colors",
				"border-paper-line focus-within:border-paper-foreground focus-within:border-solid",
				hasError && "border-destructive border-solid"
			)}
		>
			{editor && <EditorToolbar editor={editor} />}
			<EditorContent editor={editor} className="flex flex-1 flex-col" />
		</div>
	);
}

export function ContentSection() {
	const { t } = useTranslation();
	const {
		control,
		formState: { errors }
	} = useFormContext();

	const hasError = !!errors.content;

	return (
		<Field
			className="group/editor mt-5 flex min-h-0 flex-1 flex-col gap-1 sm:mt-6"
			data-invalid={hasError}
		>
			<label htmlFor="content" className="sr-only">
				{t("content.editor.label") + "\u2009*"}
			</label>
			<Controller
				name="content"
				control={control}
				render={({ field }) => (
					<TipTapEditor
						value={field.value}
						onChange={field.onChange}
						onBlur={field.onBlur}
						hasError={hasError}
					/>
				)}
			/>
			<FieldError id="content-error">{errors.content && t("form.validation.content")}</FieldError>
		</Field>
	);
}

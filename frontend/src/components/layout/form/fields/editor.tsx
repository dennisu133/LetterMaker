import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MAX_CONTENT } from "@/lib/constants";
import { createEmptyDoc, parseProseMirrorJson } from "@/lib/prosemirror";
import { cn } from "@/lib/utils";

import CharacterCount from "@tiptap/extension-character-count";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
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
	Underline as UnderlineIcon
} from "lucide-react";
import * as React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

interface EditorToolbarProps {
	editor: Editor;
}

const EditorToolbar = React.memo(({ editor }: EditorToolbarProps) => {
	const { t } = useTranslation();

	// Force re-render on editor state changes
	const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

	React.useEffect(() => {
		// Only listen to selection updates for toolbar state, not every transaction
		editor.on("selectionUpdate", forceUpdate);

		return () => {
			editor.off("selectionUpdate", forceUpdate);
		};
	}, [editor]);

	const handleBold = () => {
		editor.chain().focus().toggleBold().run();
		forceUpdate();
	};
	const handleItalic = () => {
		editor.chain().focus().toggleItalic().run();
		forceUpdate();
	};
	const handleUnderline = () => {
		editor.chain().focus().toggleUnderline().run();
		forceUpdate();
	};
	const handleStrike = () => {
		editor.chain().focus().toggleStrike().run();
		forceUpdate();
	};
	const handleBulletList = () => {
		editor.chain().focus().toggleBulletList().run();
		forceUpdate();
	};
	const handleOrderedList = () => {
		editor.chain().focus().toggleOrderedList().run();
		forceUpdate();
	};
	const handleBlockquote = () => {
		editor.chain().focus().toggleBlockquote().run();
		forceUpdate();
	};
	const handleClearFormatting = () => {
		editor.chain().focus().unsetAllMarks().clearNodes().run();
	};

	const handleHeading = (level: 1 | 2 | 3) => {
		editor.chain().focus().toggleHeading({ level }).run();
		forceUpdate();
	};

	const handleParagraph = () => {
		editor.chain().focus().setParagraph().run();
		forceUpdate();
	};

	// Determine current heading state for display
	const getCurrentHeadingLabel = () => {
		if (editor.isActive("heading", { level: 1 }))
			return { label: t("content.editor.heading1"), icon: Heading1 };
		if (editor.isActive("heading", { level: 2 }))
			return { label: t("content.editor.heading2"), icon: Heading2 };
		if (editor.isActive("heading", { level: 3 }))
			return { label: t("content.editor.heading3"), icon: Heading3 };
		return { label: t("content.editor.paragraph"), icon: Pilcrow };
	};

	const currentHeading = getCurrentHeadingLabel();
	const CurrentIcon = currentHeading.icon;
	const separatorClass =
		"mx-[clamp(0,0.0625vw,0.125rem)] my-auto h-[clamp(1.25rem,1rem+0.75vw,1.5rem)]";

	return (
		<div className="border-input flex flex-wrap items-center gap-1 border-b p-1">
			{/* Heading Dropdown */}
			<DropdownMenu>
				<Tooltip>
					<TooltipTrigger
						render={
							<DropdownMenuTrigger
								render={
									<Button
										variant="ghost"
										size="sm"
										className="h-[clamp(1.5rem,1.25rem+0.75vw,1.75rem)] gap-1 px-[clamp(0.25rem,0.125rem+0.375vw,0.5rem)]"
										aria-label={t("content.editor.text_style")}
									>
										<CurrentIcon className="size-[clamp(0.875rem,0.75rem+0.375vw,1rem)]" />
										<ChevronDown className="size-[clamp(0.625rem,0.5rem+0.375vw,0.75rem)]" />
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
					<DropdownMenuItem onClick={handleParagraph}>
						<Pilcrow className="size-4" />
						{t("content.editor.paragraph")}
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => handleHeading(1)}>
						<Heading1 className="size-4" />
						{t("content.editor.heading1")}
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => handleHeading(2)}>
						<Heading2 className="size-4" />
						{t("content.editor.heading2")}
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => handleHeading(3)}>
						<Heading3 className="size-4" />
						{t("content.editor.heading3")}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<Separator orientation="vertical" className={separatorClass} />

			{/* Bold */}
			<Tooltip>
				<TooltipTrigger
					render={
						<Toggle
							size="sm-responsive"
							aria-label={t("content.editor.bold")}
							pressed={editor.isActive("bold")}
							onPressedChange={handleBold}
						/>
					}
				>
					<Bold className="size-[clamp(0.875rem,0.75rem+0.375vw,1rem)]" />
				</TooltipTrigger>
				<TooltipContent>
					<p>{t("content.editor.bold")}</p>
				</TooltipContent>
			</Tooltip>

			{/* Italic */}
			<Tooltip>
				<TooltipTrigger
					render={
						<Toggle
							size="sm-responsive"
							aria-label={t("content.editor.italic")}
							pressed={editor.isActive("italic")}
							onPressedChange={handleItalic}
						/>
					}
				>
					<Italic className="size-[clamp(0.875rem,0.75rem+0.375vw,1rem)]" />
				</TooltipTrigger>
				<TooltipContent>
					<p>{t("content.editor.italic")}</p>
				</TooltipContent>
			</Tooltip>

			{/* Underline */}
			<Tooltip>
				<TooltipTrigger
					render={
						<Toggle
							size="sm-responsive"
							aria-label={t("content.editor.underline")}
							pressed={editor.isActive("underline")}
							onPressedChange={handleUnderline}
						/>
					}
				>
					<UnderlineIcon className="size-[clamp(0.875rem,0.75rem+0.375vw,1rem)]" />
				</TooltipTrigger>
				<TooltipContent>
					<p>{t("content.editor.underline")}</p>
				</TooltipContent>
			</Tooltip>

			{/* Strikethrough */}
			<Tooltip>
				<TooltipTrigger
					render={
						<Toggle
							size="sm-responsive"
							aria-label={t("content.editor.strikethrough")}
							pressed={editor.isActive("strike")}
							onPressedChange={handleStrike}
						/>
					}
				>
					<Strikethrough className="size-[clamp(0.875rem,0.75rem+0.375vw,1rem)]" />
				</TooltipTrigger>
				<TooltipContent>
					<p>{t("content.editor.strikethrough")}</p>
				</TooltipContent>
			</Tooltip>

			<Separator orientation="vertical" className={separatorClass} />

			{/* Bullet List */}
			<Tooltip>
				<TooltipTrigger
					render={
						<Toggle
							size="sm-responsive"
							aria-label={t("content.editor.bullet_list")}
							pressed={editor.isActive("bulletList")}
							onPressedChange={handleBulletList}
						/>
					}
				>
					<List className="size-[clamp(0.875rem,0.75rem+0.375vw,1rem)]" />
				</TooltipTrigger>
				<TooltipContent>
					<p>{t("content.editor.bullet_list")}</p>
				</TooltipContent>
			</Tooltip>

			{/* Ordered List */}
			<Tooltip>
				<TooltipTrigger
					render={
						<Toggle
							size="sm-responsive"
							aria-label={t("content.editor.ordered_list")}
							pressed={editor.isActive("orderedList")}
							onPressedChange={handleOrderedList}
						/>
					}
				>
					<ListOrdered className="size-[clamp(0.875rem,0.75rem+0.375vw,1rem)]" />
				</TooltipTrigger>
				<TooltipContent>
					<p>{t("content.editor.ordered_list")}</p>
				</TooltipContent>
			</Tooltip>

			<Separator orientation="vertical" className={separatorClass} />

			{/* Blockquote */}
			<Tooltip>
				<TooltipTrigger
					render={
						<Toggle
							size="sm-responsive"
							aria-label={t("content.editor.blockquote")}
							pressed={editor.isActive("blockquote")}
							onPressedChange={handleBlockquote}
						/>
					}
				>
					<Quote className="size-[clamp(0.875rem,0.75rem+0.375vw,1rem)]" />
				</TooltipTrigger>
				<TooltipContent>
					<p>{t("content.editor.blockquote")}</p>
				</TooltipContent>
			</Tooltip>

			{/* Remove Formatting */}
			<Tooltip>
				<TooltipTrigger
					render={
						<Button
							variant="ghost"
							size="sm"
							className="size-[clamp(1.5rem,1.25rem+0.75vw,1.75rem)] p-0"
							aria-label={t("content.editor.remove_formatting")}
							onClick={handleClearFormatting}
						/>
					}
				>
					<Eraser className="size-[clamp(0.875rem,0.75rem+0.375vw,1rem)]" />
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
				"dark:bg-input/30 min-h-16 prose prose-sm dark:prose-invert max-w-none flex-1 px-2.5 py-2 text-xs outline-none",
				"[&_h1]:text-xl [&_h1]:font-bold [&_h1]:leading-snug",
				"[&_h2]:text-sm [&_h2]:font-bold [&_h2]:leading-snug",
				"[&_h3]:text-xs [&_h3]:font-semibold [&_h3]:leading-snug",
				"[&_ul]:list-disc [&_ul]:pl-4",
				"[&_ol]:list-decimal [&_ol]:pl-4",
				"[&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground [&_blockquote]:pl-3 [&_blockquote]:italic",
				"[&_.is-editor-empty:first-child]:before:text-muted-foreground [&_.is-editor-empty:first-child]:before:content-[attr(data-placeholder)] [&_.is-editor-empty:first-child]:before:float-left [&_.is-editor-empty:first-child]:before:h-0 [&_.is-editor-empty:first-child]:before:pointer-events-none"
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
				"border-input flex flex-1 flex-col border transition-colors",
				"focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-1",
				hasError &&
					"border-destructive ring-destructive/20 focus-within:border-destructive focus-within:ring-destructive/50 dark:ring-destructive/40 ring-1"
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
		<Field className="flex flex-1 flex-col gap-1" data-invalid={hasError}>
			<FieldLabel htmlFor="content">{t("content.editor.label") + "\u2009*"}</FieldLabel>
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

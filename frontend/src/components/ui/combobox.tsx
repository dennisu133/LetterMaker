import { Combobox as ComboboxPrimitive } from "@base-ui/react";
import { CheckIcon, ChevronDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type FreeFormComboboxProps = Omit<ComboboxPrimitive.Input.Props, "value" | "onChange"> & {
	items: string[];
	value?: string;
	onValueChange: (value: string) => void;
	triggerAriaLabel: string;
};

export function FreeFormCombobox({
	items,
	value,
	onValueChange,
	triggerAriaLabel,
	className,
	disabled,
	...props
}: FreeFormComboboxProps) {
	return (
		<ComboboxPrimitive.Root
			items={items}
			value={value && items.includes(value) ? value : null}
			autoHighlight
			onValueChange={(selected) => selected && onValueChange(selected)}
		>
			<div
				data-slot="input-group"
				role="group"
				className={cn(
					"border-input dark:bg-input/30 has-[[data-slot=input-group-control]:focus-visible]:border-paper-foreground has-[[data-slot][aria-invalid=true]]:border-destructive has-disabled:bg-input/50 dark:has-disabled:bg-input/80 flex h-8 min-w-0 items-center rounded-none border transition-colors has-disabled:opacity-50 has-[[data-slot=input-group-control]:focus-visible]:border-solid has-[[data-slot][aria-invalid=true]]:border-solid [&>input]:pr-1.5",
					className
				)}
			>
				<ComboboxPrimitive.Input
					render={
						<Input
							data-slot="input-group-control"
							disabled={disabled}
							className="flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0 dark:bg-transparent dark:disabled:bg-transparent"
						/>
					}
					value={value ?? ""}
					onChange={(event) => onValueChange(event.target.value)}
					{...props}
				/>
				<div role="group" data-slot="input-group-addon" className="flex items-center pr-2">
					<ComboboxPrimitive.Trigger
						render={<Button type="button" variant="ghost" size="icon-xs" />}
						data-slot="input-group-button"
						className="mr-[-0.3rem] data-pressed:bg-transparent"
						disabled={disabled}
						aria-label={triggerAriaLabel}
					>
						<ChevronDownIcon className="text-muted-foreground size-4" />
					</ComboboxPrimitive.Trigger>
				</div>
			</div>

			<ComboboxPrimitive.Portal>
				<ComboboxPrimitive.Positioner
					side="bottom"
					sideOffset={6}
					align="start"
					className="isolate z-50"
				>
					<ComboboxPrimitive.Popup
						data-slot="combobox-content"
						className="bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 ring-foreground/10 w-(--anchor-width) max-w-(--available-width) min-w-36 origin-(--transform-origin) rounded-none shadow-md ring-1 duration-100 data-empty:shadow-none data-empty:ring-0"
					>
						<ComboboxPrimitive.List data-slot="combobox-list" className="max-h-72 overflow-y-auto">
							{(item: string) => (
								<ComboboxPrimitive.Item
									key={item}
									value={item}
									data-slot="combobox-item"
									className="data-highlighted:bg-accent data-highlighted:text-accent-foreground relative flex cursor-default items-center py-2 pr-8 pl-2 text-xs outline-hidden select-none"
								>
									{item}
									<ComboboxPrimitive.ItemIndicator
										render={
											<span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
										}
									>
										<CheckIcon className="pointer-events-none" />
									</ComboboxPrimitive.ItemIndicator>
								</ComboboxPrimitive.Item>
							)}
						</ComboboxPrimitive.List>
					</ComboboxPrimitive.Popup>
				</ComboboxPrimitive.Positioner>
			</ComboboxPrimitive.Portal>
		</ComboboxPrimitive.Root>
	);
}

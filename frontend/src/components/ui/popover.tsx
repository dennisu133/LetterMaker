import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;

function PopoverContent({
	className,
	align = "center",
	side = "bottom",
	...props
}: PopoverPrimitive.Popup.Props & Pick<PopoverPrimitive.Positioner.Props, "align" | "side">) {
	return (
		<PopoverPrimitive.Portal>
			<PopoverPrimitive.Positioner
				align={align}
				side={side}
				sideOffset={4}
				className="isolate z-50"
			>
				<PopoverPrimitive.Popup
					className={cn(
						"bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 origin-(--transform-origin) p-2.5 ring-1 outline-hidden duration-100",
						className
					)}
					{...props}
				/>
			</PopoverPrimitive.Positioner>
		</PopoverPrimitive.Portal>
	);
}

function PopoverHeader({ className, ...props }: ComponentProps<"div">) {
	return <div className={cn("flex flex-col gap-1", className)} {...props} />;
}

function PopoverTitle({ className, ...props }: PopoverPrimitive.Title.Props) {
	return <PopoverPrimitive.Title className={cn("text-sm font-medium", className)} {...props} />;
}

function PopoverDescription({ className, ...props }: PopoverPrimitive.Description.Props) {
	return (
		<PopoverPrimitive.Description
			className={cn("text-muted-foreground text-xs/relaxed", className)}
			{...props}
		/>
	);
}

export { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger };

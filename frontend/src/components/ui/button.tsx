import { Button as ButtonPrimitive } from "@base-ui/react/button";

import { cn } from "@/lib/utils";

const buttonClassName =
	"focus-visible:border-ring focus-visible:ring-ring/50 cursor-pointer rounded-none border border-transparent bg-clip-padding font-medium focus-visible:ring-1 inline-flex items-center justify-center whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none select-none";

const buttonVariants = {
	default: "bg-primary text-primary-foreground",
	outline:
		"border-border bg-background hover:bg-muted hover:text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 aria-expanded:bg-muted aria-expanded:text-foreground",
	ghost:
		"hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground"
} as const;

const buttonSizes = {
	default: "h-8 gap-1.5 px-2.5",
	sm: "h-7 gap-1 px-2.5",
	icon: "size-8",
	"icon-xs": "size-6"
} as const;

function Button({
	className,
	variant = "default",
	size = "default",
	...props
}: ButtonPrimitive.Props & {
	variant?: keyof typeof buttonVariants;
	size?: keyof typeof buttonSizes;
}) {
	return (
		<ButtonPrimitive
			data-slot="button"
			className={cn(buttonClassName, buttonVariants[variant], buttonSizes[size], className)}
			{...props}
		/>
	);
}

export { Button };

import { Button as ButtonPrimitive } from "@base-ui/react/button";

import { cn } from "@/lib/utils";

const buttonClassName =
	"focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-none border border-transparent bg-clip-padding text-xs font-medium focus-visible:ring-1 aria-invalid:ring-1 [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none";

const buttonVariants = {
	default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
	outline:
		"border-border bg-background hover:bg-muted hover:text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 aria-expanded:bg-muted aria-expanded:text-foreground",
	ghost:
		"hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground"
} as const;

const buttonSizes = {
	default: "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
	sm: "h-7 gap-1 rounded-none px-2.5 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
	icon: "size-8",
	"icon-xs": "size-6 rounded-none [&_svg:not([class*='size-'])]:size-3"
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

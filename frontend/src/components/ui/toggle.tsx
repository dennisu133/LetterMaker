import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";

import { cn } from "@/lib/utils";

const toggleClassName =
	"hover:text-foreground aria-pressed:bg-muted focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive data-[state=on]:bg-muted gap-1 rounded-none bg-transparent text-xs font-medium transition-all [&_svg:not([class*='size-'])]:size-4 group/toggle hover:bg-muted inline-flex items-center justify-center whitespace-nowrap outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0";

const toggleSizes = {
	sm: "h-7 min-w-7 rounded-none px-1.5",
	"sm-responsive":
		"h-[clamp(1.5rem,1.25rem+0.75vw,1.75rem)] min-w-[clamp(1.5rem,1.25rem+0.75vw,1.75rem)] rounded-none px-[clamp(0.25rem,0.125rem+0.375vw,0.375rem)]"
} as const;

function Toggle({
	className,
	size,
	...props
}: TogglePrimitive.Props & { size: keyof typeof toggleSizes }) {
	return (
		<TogglePrimitive
			data-slot="toggle"
			className={cn(toggleClassName, toggleSizes[size], className)}
			{...props}
		/>
	);
}

export { Toggle };

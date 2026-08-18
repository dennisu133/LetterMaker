import { cn } from "@/lib/utils";

function Field({ className, ...props }: React.ComponentProps<"div">) {
	return <div role="group" className={cn("flex flex-col gap-1", className)} {...props} />;
}

function FieldError({ className, children, ...props }: React.ComponentProps<"div">) {
	if (!children) return null;

	return (
		<div role="alert" className={cn("text-destructive", className)} {...props}>
			{children}
		</div>
	);
}

export { Field, FieldError };

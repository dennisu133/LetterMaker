import { LetterForm } from "@/components/layout/form/form";

export function Main() {
	return (
		<main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-2 md:max-w-6xl lg:border-x">
			<LetterForm />
		</main>
	);
}

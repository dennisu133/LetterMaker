import { DropZone } from "@/components/drop-zone";
import { FormActionsProvider } from "@/components/form-actions-provider";
import { FormalitiesProvider } from "@/components/formalities-provider";
import { Footer } from "@/components/layout/footer";
import { LetterForm } from "@/components/layout/form/form";
import { Navbar } from "@/components/layout/navbar";
import { MetaTags } from "@/components/metadata";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function App() {
	return (
		<ThemeProvider>
			<FormalitiesProvider>
				<FormActionsProvider>
					<TooltipProvider>
						<MetaTags />
						<Navbar />
						<main className="desk flex w-full flex-1 flex-col">
							<LetterForm />
						</main>
						<Footer />
						<DropZone />
					</TooltipProvider>
				</FormActionsProvider>
			</FormalitiesProvider>
		</ThemeProvider>
	);
}

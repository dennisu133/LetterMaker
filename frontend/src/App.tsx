import { DropZone } from "@/components/drop-zone";
import { FormActionsProvider } from "@/components/form-actions-provider";
import { FormalitiesProvider } from "@/components/formalities-provider";
import { Footer } from "@/components/layout/footer.tsx";
import { Main } from "@/components/layout/main.tsx";
import { Navbar } from "@/components/layout/navbar";
import { MetaTags } from "@/components/metadata";
import { ThemeProvider } from "@/components/theme-provider.tsx";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function App() {
	return (
		<ThemeProvider>
			<FormalitiesProvider>
				<FormActionsProvider>
					<TooltipProvider>
						<MetaTags />
						<Navbar />
						<Main />
						<Footer />
						<DropZone />
					</TooltipProvider>
				</FormActionsProvider>
			</FormalitiesProvider>
		</ThemeProvider>
	);
}

import { DropZone } from "@/components/drop-zone";
import { FormActionsProvider } from "@/components/form-actions-provider";
import { FormalitiesProvider } from "@/components/formalities-provider";
import { Footer } from "@/components/layout/footer.tsx";
import { Main } from "@/components/layout/main.tsx";
import { Navbar } from "@/components/layout/navbar";
import { MetaTags } from "@/components/metadata";
import { ThemeProvider } from "@/components/theme-provider.tsx";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./i18n";
import "./index.css";

function App() {
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

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<App />
	</StrictMode>
);

export default App;

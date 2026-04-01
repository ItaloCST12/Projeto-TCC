import { createRoot } from "react-dom/client";
import React, { type ReactNode } from "react";
import App from "./App.tsx";
import "./index.css";

// Fallback class local para evitar tela branca em erros de runtime do React.
class AppErrorBoundary extends React.Component<{ children: ReactNode }, { hasError: boolean }> {
	constructor(props: { children: ReactNode }) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError() {
		return { hasError: true };
	}

	override componentDidCatch(error: unknown) {
		console.error("[APP] Erro de renderizacao:", error);
	}

	override render() {
		if (this.state.hasError) {
			return (
				<div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6 text-center">
					<div>
						<h1 className="text-xl font-semibold">Nao foi possivel carregar a pagina.</h1>
						<p className="mt-2 text-sm text-muted-foreground">
							Recarregue a pagina. Se persistir, limpe os dados do site no navegador.
						</p>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}

const registrarServiceWorkerPush = () => {
	if (!window.isSecureContext) {
		return;
	}

	if (!("serviceWorker" in navigator)) {
		return;
	}

	window.addEventListener("load", () => {
		void navigator.serviceWorker.register("/push-sw.js").catch((error) => {
			console.error("[PUSH] Falha ao registrar service worker:", error);
		});
	});
};

const bootstrapVlibras = () => {
	const widgetContainerId = "vlibras-plugin-container";
	const scriptId = "vlibras-plugin-script";
	const styleId = "vlibras-plugin-overrides";

	if (!document.getElementById(styleId)) {
		const style = document.createElement("style");
		style.id = styleId;
		style.textContent = `
			#vlibras-plugin-container [vw-access-button],
			#vlibras-plugin-container .vw-access-button {
				z-index: 2147483000 !important;
			}
		`;
		document.head.appendChild(style);
	}

	if (!document.getElementById(widgetContainerId)) {
		const root = document.createElement("div");
		root.id = widgetContainerId;
		root.setAttribute("vw", "");
		root.className = "enabled";

		const accessButton = document.createElement("div");
		accessButton.setAttribute("vw-access-button", "");
		accessButton.className = "active";

		const pluginWrapper = document.createElement("div");
		pluginWrapper.setAttribute("vw-plugin-wrapper", "");

		const pluginTopWrapper = document.createElement("div");
		pluginTopWrapper.className = "vw-plugin-top-wrapper";

		pluginWrapper.appendChild(pluginTopWrapper);
		root.appendChild(accessButton);
		root.appendChild(pluginWrapper);
		document.body.appendChild(root);
	}

	const maybeInitWidget = () => {
		const vlibrasWindow = window as Window & {
			VLibras?: { Widget: new (url: string) => unknown };
		};

		if (!vlibrasWindow.VLibras?.Widget) {
			return;
		}

		if (!document.body.dataset.vlibrasInitialized) {
			new vlibrasWindow.VLibras.Widget("https://vlibras.gov.br/app");
			document.body.dataset.vlibrasInitialized = "true";
		}
	};

	const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;
	if (existingScript) {
		maybeInitWidget();
		return;
	}

	const script = document.createElement("script");
	script.id = scriptId;
	script.src = "https://vlibras.gov.br/app/vlibras-plugin.js";
	script.async = true;
	script.onload = maybeInitWidget;
	script.onerror = () => {
		console.error("[A11Y] Falha ao carregar script do VLibras.");
	};
	document.body.appendChild(script);
};

const bootstrapAccessibilityWidget = () => {
	try {
		bootstrapVlibras();
	} catch (error) {
		console.error("[A11Y] Falha ao inicializar widget de acessibilidade:", error);
	}
};

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", bootstrapAccessibilityWidget, {
		once: true,
	});
} else {
	bootstrapAccessibilityWidget();
}

registrarServiceWorkerPush();

const rootElement = document.getElementById("root");
if (!rootElement) {
	throw new Error("Elemento #root nao encontrado.");
}

createRoot(rootElement).render(
	<AppErrorBoundary>
		<App />
	</AppErrorBoundary>,
);

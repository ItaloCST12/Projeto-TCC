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

const HANDTALK_SCRIPT_ID = "handtalk-plugin-script";
const HANDTALK_TOKEN = import.meta.env.VITE_HANDTALK_TOKEN?.trim();

const bootstrapHandTalk = () => {
	if (!HANDTALK_TOKEN) {
		return false;
	}

	const maybeInitWidget = () => {
		const handTalkWindow = window as Window & {
			HT?: new (options: {
				token: string;
				align?: "left" | "right";
				videoEnabled?: boolean;
				ytEmbedReplace?: boolean;
			}) => unknown;
		};

		if (handTalkWindow.HT && !document.body.dataset.handtalkInitialized) {
			new handTalkWindow.HT({
				token: HANDTALK_TOKEN,
				align: "right",
				videoEnabled: true,
				ytEmbedReplace: true,
			});
			document.body.dataset.handtalkInitialized = "true";
		}
	};

	const existingScript = document.getElementById(HANDTALK_SCRIPT_ID) as HTMLScriptElement | null;
	if (existingScript) {
		maybeInitWidget();
		return true;
	}

	const script = document.createElement("script");
	script.id = HANDTALK_SCRIPT_ID;
	script.src = "https://plugin.handtalk.me/web/latest/handtalk.min.js";
	script.async = true;
	script.onload = maybeInitWidget;
	document.body.appendChild(script);

	return true;
};

const bootstrapVlibras = () => {
	const widgetContainerId = "vlibras-plugin-container";
	const scriptId = "vlibras-plugin-script";

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

		if (vlibrasWindow.VLibras?.Widget && !document.body.dataset.vlibrasInitialized) {
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
	document.body.appendChild(script);
};

const bootstrapAccessibilityWidget = () => {
	try {
		const handTalkLoaded = bootstrapHandTalk();
		if (!handTalkLoaded) {
			bootstrapVlibras();
		}
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

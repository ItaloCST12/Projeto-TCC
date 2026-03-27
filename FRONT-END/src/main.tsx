import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const registrarServiceWorkerPush = () => {
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
	const handTalkLoaded = bootstrapHandTalk();
	if (!handTalkLoaded) {
		bootstrapVlibras();
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

createRoot(document.getElementById("root")!).render(<App />);

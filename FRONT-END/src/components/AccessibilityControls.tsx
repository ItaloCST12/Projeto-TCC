import { useEffect, useState } from "react";
import { Contrast, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

const ZOOM_STORAGE_KEY = "accessibility:zoom";
const CONTRAST_STORAGE_KEY = "accessibility:high-contrast";
const DEFAULT_ZOOM = 100;
const MIN_ZOOM = 90;
const MAX_ZOOM = 200;
const ZOOM_STEP = 10;

const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

const applyZoom = (zoom: number) => {
  document.documentElement.style.fontSize = `${zoom}%`;
};

const applyHighContrast = (enabled: boolean) => {
  document.documentElement.classList.toggle("high-contrast", enabled);
};

const AccessibilityControls = ({ mobile = false }: { mobile?: boolean }) => {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    const storedZoom = window.localStorage.getItem(ZOOM_STORAGE_KEY);
    const parsedZoom = storedZoom ? Number(storedZoom) : DEFAULT_ZOOM;
    const initialZoom = Number.isFinite(parsedZoom) ? clampZoom(parsedZoom) : DEFAULT_ZOOM;

    const storedContrast = window.localStorage.getItem(CONTRAST_STORAGE_KEY);
    const initialHighContrast = storedContrast === "1";

    setZoom(initialZoom);
    setHighContrast(initialHighContrast);
    applyZoom(initialZoom);
    applyHighContrast(initialHighContrast);
  }, []);

  const updateZoom = (nextZoom: number) => {
    const normalizedZoom = clampZoom(nextZoom);
    setZoom(normalizedZoom);
    applyZoom(normalizedZoom);
    window.localStorage.setItem(ZOOM_STORAGE_KEY, String(normalizedZoom));
  };

  const toggleHighContrast = () => {
    const nextHighContrast = !highContrast;
    setHighContrast(nextHighContrast);
    applyHighContrast(nextHighContrast);
    window.localStorage.setItem(CONTRAST_STORAGE_KEY, nextHighContrast ? "1" : "0");
  };

  const containerClassName = mobile
    ? "mb-3 rounded-xl border border-border bg-muted/40 p-2"
    : "hidden lg:flex items-center";

  const buttonBaseClassName =
    "inline-flex items-center justify-center h-8 rounded-lg border border-border bg-background text-foreground hover:bg-muted transition-colors";

  const contrastButtonClassName = highContrast
    ? `${buttonBaseClassName} bg-primary text-primary-foreground border-primary`
    : buttonBaseClassName;

  return (
    <div className={containerClassName} aria-label="Controles visuais">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-background/80 p-1">
          <button
            type="button"
            onClick={() => updateZoom(zoom - ZOOM_STEP)}
            className={`${buttonBaseClassName} w-8`}
            aria-label="Diminuir zoom"
            title="Diminuir zoom"
          >
            <ZoomOut className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => updateZoom(DEFAULT_ZOOM)}
            className={`${buttonBaseClassName} px-2 text-xs font-semibold min-w-14`}
            aria-label="Restaurar zoom padrão"
            title="Restaurar zoom padrão"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            {zoom}%
          </button>

          <button
            type="button"
            onClick={() => updateZoom(zoom + ZOOM_STEP)}
            className={`${buttonBaseClassName} w-8`}
            aria-label="Aumentar zoom"
            title="Aumentar zoom"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={toggleHighContrast}
          className={`${contrastButtonClassName} w-9`}
          aria-label="Alternar alto contraste"
          aria-pressed={highContrast}
          title="Alternar alto contraste"
        >
          <Contrast className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default AccessibilityControls;
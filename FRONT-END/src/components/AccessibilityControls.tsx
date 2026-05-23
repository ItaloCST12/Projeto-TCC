import { useEffect, useState } from "react";
import { Contrast, Moon, RotateCcw, SlidersHorizontal, Sun, ZoomIn, ZoomOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ZOOM_STORAGE_KEY = "accessibility:zoom";
const CONTRAST_STORAGE_KEY = "accessibility:high-contrast";
const DARK_MODE_STORAGE_KEY = "accessibility:dark-mode";
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

const applyDarkMode = (enabled: boolean) => {
  document.documentElement.classList.toggle("dark", enabled);
};

const AccessibilityControls = ({ mobile = false }: { mobile?: boolean }) => {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [highContrast, setHighContrast] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const storedZoom = window.localStorage.getItem(ZOOM_STORAGE_KEY);
    const parsedZoom = storedZoom ? Number(storedZoom) : DEFAULT_ZOOM;
    const initialZoom = Number.isFinite(parsedZoom) ? clampZoom(parsedZoom) : DEFAULT_ZOOM;

    const storedContrast = window.localStorage.getItem(CONTRAST_STORAGE_KEY);
    const initialHighContrast = storedContrast === "1";

    const storedDarkMode = window.localStorage.getItem(DARK_MODE_STORAGE_KEY);
    const hasStoredDarkMode = storedDarkMode === "1" || storedDarkMode === "0";
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialDarkMode = hasStoredDarkMode ? storedDarkMode === "1" : prefersDark;

    setZoom(initialZoom);
    setHighContrast(initialHighContrast);
    setDarkMode(initialDarkMode);
    applyZoom(initialZoom);
    applyHighContrast(initialHighContrast);
    applyDarkMode(initialDarkMode);

    const colorSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemTheme = (event: MediaQueryListEvent) => {
      const hasManualPreference = window.localStorage.getItem(DARK_MODE_STORAGE_KEY);
      if (hasManualPreference) {
        return;
      }

      setDarkMode(event.matches);
      applyDarkMode(event.matches);
    };

    colorSchemeQuery.addEventListener("change", syncSystemTheme);
    return () => {
      colorSchemeQuery.removeEventListener("change", syncSystemTheme);
    };
  }, []);

  const updateZoom = (nextZoom: number) => {
    const normalizedZoom = clampZoom(nextZoom);
    setZoom(normalizedZoom);
    applyZoom(normalizedZoom);
    window.localStorage.setItem(ZOOM_STORAGE_KEY, String(normalizedZoom));
  };

  const setHighContrastEnabled = (enabled: boolean) => {
    setHighContrast(enabled);
    applyHighContrast(enabled);
    window.localStorage.setItem(CONTRAST_STORAGE_KEY, enabled ? "1" : "0");

    if (enabled) {
      setDarkMode(false);
      applyDarkMode(false);
      window.localStorage.setItem(DARK_MODE_STORAGE_KEY, "0");
    }
  };

  const setDarkModeEnabled = (enabled: boolean) => {
    setDarkMode(enabled);
    applyDarkMode(enabled);
    window.localStorage.setItem(DARK_MODE_STORAGE_KEY, enabled ? "1" : "0");

    if (enabled) {
      setHighContrast(false);
      applyHighContrast(false);
      window.localStorage.setItem(CONTRAST_STORAGE_KEY, "0");
    }
  };

  const resetToLightDefault = () => {
    setDarkModeEnabled(false);
    setHighContrastEnabled(false);
  };

  const containerClassName = mobile
    ? "mb-3 rounded-xl border border-border bg-muted/40 p-2"
    : "hidden lg:flex items-center";

  const buttonBaseClassName =
    "inline-flex items-center justify-center h-8 rounded-lg border border-border bg-background text-foreground hover:bg-muted transition-colors";

  const appearanceButtonClassName = highContrast || darkMode
    ? `${buttonBaseClassName} bg-primary text-primary-foreground border-primary`
    : buttonBaseClassName;

  const darkModeButtonClassName = darkMode
    ? `${buttonBaseClassName} bg-secondary text-secondary-foreground border-secondary`
    : buttonBaseClassName;

  const contrastButtonClassName = highContrast
    ? `${buttonBaseClassName} bg-primary text-primary-foreground border-primary`
    : buttonBaseClassName;

  const appearanceTitle =
    highContrast && darkMode
      ? "Aparência: escuro e alto contraste"
      : highContrast
        ? "Aparência: alto contraste"
        : darkMode
          ? "Aparência: modo escuro"
          : "Aparência: padrão";

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

        {mobile ? (
          <>
            <button
              type="button"
              onClick={() => setDarkModeEnabled(!darkMode)}
              className={`${darkModeButtonClassName} w-9`}
              aria-label="Alternar modo escuro"
              aria-pressed={darkMode}
              title="Alternar modo escuro"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={() => setHighContrastEnabled(!highContrast)}
              className={`${contrastButtonClassName} w-9`}
              aria-label="Alternar alto contraste"
              aria-pressed={highContrast}
              title="Alternar alto contraste"
            >
              <Contrast className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={resetToLightDefault}
              className={`${buttonBaseClassName} px-2 gap-1.5`}
              aria-label="Voltar para padrão claro"
              title="Voltar para padrão claro"
            >
              <Sun className="h-4 w-4" />
              <span className="text-xs font-semibold">Padrão</span>
            </button>
          </>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={`${appearanceButtonClassName} w-9`}
                aria-label="Abrir ajustes de aparência"
                title={appearanceTitle}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Aparência</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuCheckboxItem
                checked={darkMode}
                onCheckedChange={(checked) => setDarkModeEnabled(checked === true)}
              >
                <span className="inline-flex items-center gap-2">
                  {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  Modo escuro
                </span>
              </DropdownMenuCheckboxItem>

              <DropdownMenuCheckboxItem
                checked={highContrast}
                onCheckedChange={(checked) => setHighContrastEnabled(checked === true)}
              >
                <span className="inline-flex items-center gap-2">
                  <Contrast className="h-4 w-4" />
                  Alto contraste
                </span>
              </DropdownMenuCheckboxItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem onSelect={resetToLightDefault}>
                <span className="inline-flex items-center gap-2">
                  <Sun className="h-4 w-4" />
                  Padrão claro
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};

export default AccessibilityControls;
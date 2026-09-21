import { observer } from "mobx-react-lite";
import { Sun, Moon } from "lucide-react";
import { uiStore } from "@/stores";

/**
 * ThemeToggle — brand-styled dark/light switch used across the product funnel
 * (register, onboarding, hub and the app shell).
 *
 * IMPORTANT: this component delegates to the shared `uiStore` on purpose, so
 * there is exactly ONE source of truth for the theme. The store owns both the
 * `<html class="dark">` mutation and the `webforge-ui-preferences` persistence.
 *
 * Do NOT mutate the document class or localStorage here. This component used to
 * write a standalone `localStorage["theme"]` key that nothing ever read back,
 * which meant the choice was silently lost on reload and the store ended up
 * out of sync with the DOM.
 */
export const ThemeToggle = observer(function ThemeToggle({
  className = "",
}: {
  className?: string;
}) {
  const isDarkMode = uiStore.isDarkMode;

  return (
    <button
      type="button"
      onClick={() => uiStore.toggleTheme()}
      aria-label={isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      aria-pressed={isDarkMode}
      title={isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className={`relative flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-theme-sm transition-colors hover:scale-105 hover:bg-gray-100 hover:text-gray-700 active:scale-95 sm:h-11 sm:w-11 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white ${className}`}
    >
      {isDarkMode ? (
        <Sun className="w-5 h-5 text-brand-500 fill-brand-500/20 transition-transform duration-300 transform rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="w-5 h-5 text-secondary-600 transition-transform duration-300 transform rotate-0 hover:-rotate-12" />
      )}
    </button>
  );
});

export default ThemeToggle;

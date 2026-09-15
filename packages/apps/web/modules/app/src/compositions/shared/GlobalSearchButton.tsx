import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { useBusiness } from "../../context/BusinessContext";

export function GlobalSearchButton({ className = "" }: { className?: string }) {
  const { setIsCommandPaletteOpen } = useBusiness();
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsMac(/Mac|iPod|iPhone|iPad/.test(navigator.userAgent));
    }
  }, []);

  return (
    <button
      type="button"
      onClick={() => setIsCommandPaletteOpen(true)}
      className={`flex items-center gap-2.5 pl-3.5 pr-2.5 h-10 sm:h-11 rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 shadow-xs hover:shadow-sm hover:border-brand-500/50 dark:hover:border-brand-500/50 hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-theme-sm font-medium group flex-none ${className}`}
      title={`Buscar en todo el sistema (${isMac ? "Cmd" : "Ctrl"} + K)`}
    >
      <Search className="w-4 h-4 text-gray-400 group-hover:text-brand-500 transition-colors flex-none stroke-[2.2]" />
      <span className="text-gray-500 dark:text-gray-400 hidden lg:inline font-normal group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors">
        Buscar...
      </span>
      <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700/80 font-mono text-theme-xs text-gray-400 dark:text-gray-400 group-hover:text-brand-500 group-hover:border-orange-200 dark:group-hover:border-orange-900/60 transition-colors">
        <span>{isMac ? "⌘" : "Ctrl"}</span>
        <span>K</span>
      </kbd>
    </button>
  );
}


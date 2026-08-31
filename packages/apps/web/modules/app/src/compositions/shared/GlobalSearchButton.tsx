import React from "react";
import { Search } from "lucide-react";
import { useBusiness } from "../../context/BusinessContext";

export function GlobalSearchButton({ className = "" }: { className?: string }) {
  const { setIsCommandPaletteOpen } = useBusiness();

  return (
    <button
      type="button"
      onClick={() => setIsCommandPaletteOpen(true)}
      className={`flex items-center gap-2.5 pl-3.5 pr-2.5 h-10 sm:h-11 rounded-full border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 shadow-xs hover:shadow-sm hover:border-[#FF3F1A]/50 dark:hover:border-[#FF3F1A]/50 hover:bg-slate-50 dark:hover:bg-gray-800/70 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-[13px] font-medium group flex-none ${className}`}
      title="Buscar en todo el sistema (Ctrl + K)"
    >
      <Search className="w-4 h-4 text-gray-400 group-hover:text-[#FF3F1A] transition-colors flex-none stroke-[2.2]" />
      <span className="text-gray-500 dark:text-gray-400 hidden lg:inline font-normal group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors">
        Buscar...
      </span>
      <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-gray-800 border border-slate-200/80 dark:border-gray-700/80 font-mono text-[10px] text-gray-400 dark:text-gray-400 group-hover:text-[#FF3F1A] group-hover:border-orange-200 dark:group-hover:border-orange-900/60 transition-colors">
        <span>⌘</span>
        <span>K</span>
      </kbd>
    </button>
  );
}


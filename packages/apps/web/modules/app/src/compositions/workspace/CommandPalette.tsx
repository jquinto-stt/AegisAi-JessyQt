import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "../../context/BusinessContext";
import { Search, X, Building2 } from "lucide-react";
import { createPaletteItems } from "./command-palette/palette.items";
import type { PaletteItem } from "./command-palette/palette.types";

export const CommandPalette: React.FC = () => {
  const navigate = useNavigate();
  const {
    businesses,
    activeBusinessId,
    switchBusiness,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    semantics,
  } = useBusiness();

  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isCommandPaletteOpen) {
      setSearch("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const items: PaletteItem[] = createPaletteItems(
    businesses,
    semantics,
    navigate,
    switchBusiness,
    () => setIsCommandPaletteOpen(false),
    activeBusinessId
  );

  // Filter items
  const filteredItems = items.filter(item => {
    const q = search.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
      item.category.toLowerCase().includes(q)
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsCommandPaletteOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + (filteredItems.length || 1)) % (filteredItems.length || 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-20 backdrop-blur-sm animate-in fade-in duration-150 sm:pt-28"
      onClick={() => setIsCommandPaletteOpen(false)}
      role="presentation"
    >
      <div
        className="flex max-h-[75vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-theme-xl animate-in fade-in zoom-in-95 duration-200 dark:bg-gray-900"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Paleta de comandos"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <Search className="h-5 w-5 flex-none text-brand-500" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Buscar sucursal, comanda, módulo o comando…"
            className="w-full bg-transparent text-theme-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-hidden dark:text-white"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Limpiar búsqueda"
              className="flex h-7 w-7 flex-none cursor-pointer items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="flex-none rounded-md bg-gray-100 px-2 py-0.5 font-mono text-theme-xs font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              ESC
            </kbd>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 space-y-1 overflow-y-auto p-2.5">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center">
              <Building2 className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
              <p className="text-theme-sm font-bold text-gray-500 dark:text-gray-400">
                No se encontraron resultados
              </p>
              <p className="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
                Prueba buscando por nombre de negocio o módulo
              </p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={item.id}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3.5 py-3 transition-colors ${
                    isSelected
                      ? "bg-brand-500 text-white"
                      : item.active
                      ? "bg-brand-50 dark:bg-brand-500/10"
                      : "hover:bg-gray-50 dark:hover:bg-gray-900"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-9 w-9 flex-none items-center justify-center rounded-xl transition-colors ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400"
                      }`}
                    >
                      {item.icon}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={`truncate text-theme-sm font-bold leading-tight ${
                            isSelected ? "text-white" : "text-secondary-600 dark:text-white"
                          }`}
                        >
                          {item.title}
                        </p>
                        {item.badge && (
                          <span
                            className={`flex-none rounded-full px-2 py-0.5 text-theme-xs font-bold ${
                              isSelected
                                ? "bg-white/20 text-white"
                                : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <p
                          className={`mt-0.5 truncate text-theme-xs leading-tight ${
                            isSelected ? "text-white/75" : "text-gray-400 dark:text-gray-500"
                          }`}
                        >
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-none items-center gap-2">
                    {item.active && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-theme-xs font-bold ${
                          isSelected ? "bg-white/20 text-white" : "bg-brand-500 text-white"
                        }`}
                      >
                        Activo
                      </span>
                    )}
                    {isSelected && (
                      <kbd className="rounded bg-white/20 px-1.5 py-0.5 font-mono text-theme-xs text-white">
                        ↵
                      </kbd>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Shortcut hints */}
        <div className="flex items-center gap-4 border-t border-gray-100 bg-gray-50 px-5 py-2.5 text-theme-xs text-gray-400 dark:border-gray-800 dark:bg-gray-900/60">
          <span className="flex items-center gap-1.5">
            <kbd className="rounded bg-gray-200/80 px-1.5 py-0.5 font-mono text-theme-xs dark:bg-gray-800">
              ↑
            </kbd>
            <kbd className="rounded bg-gray-200/80 px-1.5 py-0.5 font-mono text-theme-xs dark:bg-gray-800">
              ↓
            </kbd>
            Navegar
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="rounded bg-gray-200/80 px-1.5 py-0.5 font-mono text-theme-xs dark:bg-gray-800">
              ↵
            </kbd>
            Seleccionar
          </span>
        </div>
      </div>
    </div>
  );
};

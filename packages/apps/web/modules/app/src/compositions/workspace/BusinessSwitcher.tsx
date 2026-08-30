import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "../../context/BusinessContext";
import { BusinessIcon } from "./BusinessIcon";
import { ChevronDown, Plus, Check, LayoutGrid, Building2, Sparkles } from "lucide-react";

export const BusinessSwitcher: React.FC = () => {
  const navigate = useNavigate();
  const { businesses, activeBusiness, switchBusiness } = useBusiness();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Switcher Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-zinc-50/80 hover:bg-zinc-100/90 dark:bg-zinc-800/70 dark:hover:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 hover:border-[#FF3F1A] dark:hover:border-[#FF3F1A] transition-all shadow-2xs cursor-pointer group"
        title="Cambiar de negocio o administrar sucursales"
      >
        <div className="w-7 h-7 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-center flex-none shadow-2xs group-hover:scale-105 transition-transform">
          <BusinessIcon iconKey={activeBusiness?.iconKey} className="w-3.5 h-3.5 text-[#FF3F1A]" />
        </div>

        <div className="text-left min-w-0 max-w-[130px] sm:max-w-[180px]">
          <p className="text-xs font-black text-zinc-950 dark:text-zinc-50 truncate group-hover:text-[#FF3F1A] transition-colors leading-tight">
            {activeBusiness?.name || "Mi Restaurante"}
          </p>
          <p className="text-[10px] text-zinc-400 font-medium truncate leading-tight mt-0.5">
            {activeBusiness?.city || "Restaurante"}
          </p>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200 transition-transform duration-200 ml-0.5 flex-none ${
            isOpen ? "rotate-180 text-[#FF3F1A]" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu (Right-Aligned) */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2.5 w-80 bg-white/95 dark:bg-[#18181B]/95 backdrop-blur-md rounded-3xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-2.5 z-50 animate-fade-in divide-y divide-zinc-100 dark:divide-zinc-800/80">
          {/* Header */}
          <div className="p-2 pb-2 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">
              Mis Negocios ({businesses.length})
            </span>
            <button
              onClick={() => {
                setIsOpen(false);
                navigate("/workspaces");
              }}
              className="text-[10px] font-bold text-[#FF3F1A] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <LayoutGrid className="w-3 h-3" /> Ver Todos
            </button>
          </div>

          {/* Business List */}
          <div className="py-1.5 max-h-60 overflow-y-auto space-y-1 scrollbar-thin">
            {businesses.map(biz => {
              const isSelected = biz.id === activeBusiness?.id;
              return (
                <div
                  key={biz.id}
                  onClick={() => {
                    switchBusiness(biz.id);
                    setIsOpen(false);
                  }}
                  className={`p-2.5 rounded-2xl flex items-center justify-between gap-3 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-orange-50/50 dark:bg-orange-950/30 text-zinc-950 dark:text-zinc-50 font-bold border border-orange-200/60 dark:border-orange-900/60 shadow-2xs"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center flex-none">
                      <BusinessIcon iconKey={biz.iconKey} className="w-4 h-4 text-[#FF3F1A]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate leading-tight">{biz.name}</p>
                      <p className="text-[10px] text-zinc-400 font-medium truncate mt-0.5">
                        {biz.specialty || biz.city}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-[#FF3F1A] text-white flex items-center justify-center flex-none shadow-2xs">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Create New Business CTA */}
          <div className="pt-2 p-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate("/onboarding");
              }}
              className="w-full py-2.5 px-3 rounded-2xl bg-zinc-900 hover:bg-[#FF3F1A] text-white dark:bg-zinc-800 dark:hover:bg-[#FF3F1A] text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs group active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Nuevo Negocio</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "../../context/BusinessContext";
import { BusinessIcon } from "./BusinessIcon";
import { ChevronDown, Plus, Check, LayoutGrid } from "lucide-react";

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
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-white dark:bg-[#2C2D31] border border-slate-200 dark:border-[#374151] hover:border-[#FF3F1A] dark:hover:border-[#FF3F1A] transition-all shadow-2xs cursor-pointer group"
        title="Cambiar de negocio o ver espacios"
      >
        <div className="w-6 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center flex-none">
          <BusinessIcon iconKey={activeBusiness?.iconKey} className="w-3.5 h-3.5 text-[#FF3F1A]" />
        </div>

        <div className="text-left min-w-0 max-w-[130px] sm:max-w-[170px]">
          <p className="text-xs font-black text-zinc-900 dark:text-zinc-100 truncate group-hover:text-[#FF3F1A] transition-colors leading-tight">
            {activeBusiness?.name || "Mi Restaurante"}
          </p>
          <p className="text-[10px] text-zinc-400 font-medium truncate">
            {activeBusiness?.city || "Restaurante"}
          </p>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200 transition-transform duration-200 ml-0.5 flex-none" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-[#18181B] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-2 z-50 animate-fade-in divide-y divide-zinc-100 dark:divide-zinc-800/80">
          <div className="p-2 pb-1.5 flex items-center justify-between">
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
          <div className="py-1 max-h-56 overflow-y-auto space-y-1 scrollbar-thin">
            {businesses.map(biz => {
              const isSelected = biz.id === activeBusiness?.id;
              return (
                <div
                  key={biz.id}
                  onClick={() => {
                    switchBusiness(biz.id);
                    setIsOpen(false);
                  }}
                  className={`p-2.5 rounded-2xl flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-orange-50/50 dark:bg-orange-950/30 text-zinc-900 dark:text-zinc-100 font-bold"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center flex-none">
                      <BusinessIcon iconKey={biz.iconKey} className="w-3.5 h-3.5 text-[#FF3F1A]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate leading-tight">{biz.name}</p>
                      <p className="text-[10px] text-zinc-400 font-medium truncate">
                        {biz.specialty || biz.city}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-[#FF3F1A] text-white flex items-center justify-center flex-none">
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
              className="w-full py-2.5 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 hover:bg-[#FF3F1A] hover:text-white dark:hover:bg-[#FF3F1A] dark:hover:text-white text-zinc-800 dark:text-zinc-200 text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs group"
            >
              <Plus className="w-4 h-4 text-[#FF3F1A] group-hover:text-white transition-colors" />
              <span>Crear Nuevo Negocio</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

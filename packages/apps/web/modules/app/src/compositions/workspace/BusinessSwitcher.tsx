import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "../../context/BusinessContext";
import { BusinessIcon } from "./BusinessIcon";
import {
  ChevronDown,
  Check,
  LayoutGrid,
  Building2,
  Layers,
  ArrowRight,
  ShieldCheck,
  Clock,
  Zap,
  Flame,
} from "lucide-react";
import { Button } from "@/elements";

export const BusinessSwitcher: React.FC = () => {
  const navigate = useNavigate();
  const {
    businesses,
    activeBusiness,
    switchBusiness,
    userRole,
    storePace,
    setStorePace,
  } = useBusiness();

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
      <Button
        variant="ghost"
        intent="business.switcher.trigger"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-zinc-50/90 hover:bg-zinc-100 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 border border-zinc-200/90 dark:border-zinc-700/80 hover:border-[#FF3F1A] dark:hover:border-[#FF3F1A] transition-all shadow-2xs cursor-pointer group"
        title="Cambiar de negocio, ritmo de tienda o ver resumen global"
      >
        <div className="w-7 h-7 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center flex-none shadow-2xs group-hover:scale-105 transition-transform overflow-hidden">
          {activeBusiness?.logoUrl ? (
            <img src={activeBusiness.logoUrl} alt={activeBusiness.name} className="w-full h-full object-cover" />
          ) : (
            <BusinessIcon iconKey={activeBusiness?.iconKey} className="w-3.5 h-3.5 text-[#FF3F1A]" />
          )}
        </div>

        <div className="text-left min-w-0 max-w-[130px] sm:max-w-[180px]">
          <p className="text-xs font-bold text-zinc-950 dark:text-zinc-50 truncate group-hover:text-[#FF3F1A] transition-colors leading-tight">
            {activeBusiness?.name || "Mi Negocio"}
          </p>
          <p className="text-[10px] text-zinc-400 font-medium truncate leading-tight mt-0.5">
            {activeBusiness?.city || "Sucursal Activa"}
          </p>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200 transition-transform duration-200 ml-0.5 flex-none ${
            isOpen ? "rotate-180 text-[#FF3F1A]" : ""
          }`}
        />
      </Button>

      {/* Dropdown Menu (Clean Workspace Selector) */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-3xl bg-white dark:bg-[#18181B] border border-zinc-200/90 dark:border-zinc-800 shadow-2xl p-3 z-50 animate-fade-in space-y-2.5">
          {/* Header Action: Ir a Visión Franquicia / Hub */}
          <Button
            variant="ghost"
            intent="business.hub.navigate"
            onClick={() => {
              navigate("/workspaces");
              setIsOpen(false);
            }}
            className="w-full p-3 rounded-2xl bg-gradient-to-r from-[#190088] to-[#14006e] text-white flex items-center justify-between group shadow-sm hover:opacity-95 transition-all cursor-pointer border border-[#190088]"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center flex-none">
                <Layers className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold leading-tight flex items-center gap-1.5">
                  <span>Dashboard de Franquicias</span>
                  <span className="text-[9px] font-mono bg-white/20 px-1.5 py-0.2 rounded font-normal">Visión Global</span>
                </p>
                <p className="text-[10px] text-zinc-300 dark:text-zinc-400 group-hover:text-white/90 transition-colors">
                  Ver métricas consolidadas y gestionar sucursales
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-white/70 group-hover:text-white group-hover:translate-x-0.5 transition-all flex-none" />
          </Button>

          {/* Switcher Business List */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-1.5 max-h-48 overflow-y-auto pr-1">
            <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 px-1.5 font-bold">
              Sucursales Activas ({businesses.length})
            </p>
            {businesses.map(biz => {
              const isSelected = biz.id === activeBusiness?.id;
              return (
                <div
                  key={biz.id}
                  onClick={() => {
                    switchBusiness(biz.id);
                    setIsOpen(false);
                  }}
                  className={`p-2.5 rounded-2xl flex items-center justify-between gap-3 transition-all cursor-pointer border ${
                    isSelected
                      ? "bg-orange-50/60 dark:bg-orange-950/30 text-zinc-950 dark:text-zinc-50 border-orange-200 dark:border-orange-900/60 shadow-2xs font-bold"
                      : "bg-zinc-50/60 dark:bg-zinc-900/40 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 border-zinc-200/70 dark:border-zinc-800/70 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center flex-none overflow-hidden ${
                        isSelected
                          ? "bg-[#FF3F1A] text-white shadow-2xs"
                          : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                      }`}
                    >
                      {biz.logoUrl ? (
                        <img src={biz.logoUrl} alt={biz.name} className="w-full h-full object-cover" />
                      ) : (
                        <BusinessIcon
                          iconKey={biz.iconKey}
                          className={`w-4 h-4 ${isSelected ? "text-white" : "text-[#FF3F1A]"}`}
                        />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate leading-tight">
                        {biz.name}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mt-0.5">
                        <span className="truncate">{biz.city || "Principal"}</span>
                        <span>·</span>
                        <span className="font-mono uppercase text-[9px] px-1.5 py-0.2 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                          {biz.businessType === "retail_store"
                            ? "Retail"
                            : biz.businessType === "services"
                            ? "Servicios"
                            : "Restaurante"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isSelected ? (
                    <div className="w-5 h-5 rounded-full bg-[#FF3F1A] text-white flex items-center justify-center flex-none shadow-2xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  ) : (
                    <span className="text-[10px] font-mono text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      Activar
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

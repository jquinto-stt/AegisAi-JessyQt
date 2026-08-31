import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "../../context/BusinessContext";
import { BusinessIcon } from "./BusinessIcon";
import {
  ChevronDown,
  Plus,
  Check,
  LayoutGrid,
  Building2,
  ArrowRight,
  Sparkles,
  Command,
  Store,
  MapPin,
  ShieldCheck,
  Clock,
  Zap,
  Flame,
} from "lucide-react";

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
      <button
        type="button"
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
          <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-medium truncate leading-tight mt-0.5">
            <span className="truncate">{activeBusiness?.city || "Sucursal Activa"}</span>
            <span>·</span>
            <span className={`font-mono font-bold text-[9px] ${
              storePace === "demorada"
                ? "text-rose-500 font-bold"
                : storePace === "rapida"
                ? "text-emerald-500 font-bold"
                : "text-zinc-500"
            }`}>
              {storePace === "demorada" ? "Demorada" : storePace === "rapida" ? "Rápida" : "Habitual"}
            </span>
          </div>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200 transition-transform duration-200 ml-0.5 flex-none ${
            isOpen ? "rotate-180 text-[#FF3F1A]" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu (High-End Enterprise Workspace Panel) */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2.5 w-84 sm:w-96 bg-white dark:bg-[#121214] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-3.5 z-50 animate-fade-in space-y-3.5">
          {/* Header with Title & Role Badge */}
          <div className="flex items-center justify-between px-1.5 pt-1">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#FF3F1A]" />
              <h4 className="text-xs font-bold text-zinc-950 dark:text-zinc-100">
                Espacios de Trabajo
              </h4>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900 flex items-center gap-1">
                <ShieldCheck className="w-2.5 h-2.5" />
                {userRole === "owner" ? "Dueño / Admin" : userRole === "manager" ? "Gerente" : "Staff"}
              </span>
            </div>
          </div>

          {/* Prominent Hub Access Banner */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              navigate("/workspaces");
            }}
            className="w-full p-3 rounded-2xl bg-zinc-950 text-white dark:bg-zinc-800/90 dark:hover:bg-zinc-700/90 hover:bg-[#FF3F1A] dark:hover:bg-[#FF3F1A] transition-all flex items-center justify-between group cursor-pointer shadow-sm text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center flex-none">
                <LayoutGrid className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight flex items-center gap-1.5">
                  Abrir Hub de Negocios
                  <span className="text-[9px] font-mono bg-white/20 px-1.5 py-0.2 rounded font-normal">Visión Global</span>
                </p>
                <p className="text-[10px] text-zinc-300 dark:text-zinc-400 group-hover:text-white/90 transition-colors">
                  Ver métricas consolidadas y gestionar sucursales
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-white/70 group-hover:text-white group-hover:translate-x-0.5 transition-all flex-none" />
          </button>

          {/* Ritmo Operativo de Tienda (Store Pace) */}
          <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
            <div className="flex items-center justify-between px-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-[#FF3F1A]" /> Ritmo Operativo de Tienda
              </span>
              <span className="text-[10px] font-mono text-zinc-400">
                {storePace === "rapida" ? "-5m colchón" : storePace === "demorada" ? "+10m colchón" : "Estándar"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setStorePace("rapida")}
                className={`p-2.5 rounded-2xl text-left border transition-all cursor-pointer ${
                  storePace === "rapida"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 shadow-2xs font-bold"
                    : "bg-zinc-50/70 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                }`}
              >
                <div className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-emerald-500" />
                  <span className="text-xs font-bold">Rápida</span>
                </div>
                <p className="text-[9px] text-zinc-400 mt-0.5">-5 min prom.</p>
              </button>

              <button
                type="button"
                onClick={() => setStorePace("habitual")}
                className={`p-2.5 rounded-2xl text-left border transition-all cursor-pointer ${
                  storePace === "habitual"
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-zinc-950 dark:border-white shadow-2xs font-bold"
                    : "bg-zinc-50/70 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                }`}
              >
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#FF3F1A]" />
                  <span className="text-xs font-bold">Habitual</span>
                </div>
                <p className={`text-[9px] mt-0.5 ${storePace === "habitual" ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-400"}`}>Estándar</p>
              </button>

              <button
                type="button"
                onClick={() => setStorePace("demorada")}
                className={`p-2.5 rounded-2xl text-left border transition-all cursor-pointer ${
                  storePace === "demorada"
                    ? "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 shadow-2xs font-bold"
                    : "bg-zinc-50/70 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                }`}
              >
                <div className="flex items-center gap-1">
                  <Flame className="w-3 h-3 text-rose-500" />
                  <span className="text-xs font-bold">Demorada</span>
                </div>
                <p className="text-[9px] text-zinc-400 mt-0.5">+10 min prot.</p>
              </button>
            </div>
          </div>

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

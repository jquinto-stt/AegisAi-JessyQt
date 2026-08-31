import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness, BusinessInstance } from "../../context/BusinessContext";
import { BusinessIcon } from "./BusinessIcon";
import {
  Search,
  Building2,
  Plus,
  Settings,
  LayoutGrid,
  Check,
  Zap,
  ShoppingBag,
  Flame,
  ChefHat,
  BarChart3,
  Users,
  Command,
  ArrowRight,
  Sparkles,
  X,
} from "lucide-react";

export const CommandPalette: React.FC = () => {
  const navigate = useNavigate();
  const {
    businesses,
    activeBusiness,
    activeBusinessId,
    switchBusiness,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
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

  // Build searchable items
  interface PaletteItem {
    id: string;
    category: "Espacios de Trabajo" | "Vistas Especiales" | "Acceso Rápido a Módulos" | "Acciones";
    title: string;
    subtitle?: string;
    icon: React.ReactNode;
    action: () => void;
    active?: boolean;
    badge?: string;
  }

  const items: PaletteItem[] = [
    {
      id: "global-overview",
      category: "Vistas Especiales",
      title: "Vista Franquicia / Resumen Global",
      subtitle: "Dashboard consolidado con ventas y métricas de todas las marcas",
      icon: <LayoutGrid className="w-4 h-4 text-[#FF3F1A]" />,
      action: () => {
        setIsCommandPaletteOpen(false);
        navigate("/workspaces?tab=franchise_overview");
      },
      badge: "MULTI-LOCAL",
    },

    // Businesses
    ...businesses.map(b => ({
      id: `biz-${b.id}`,
      category: "Espacios de Trabajo" as const,
      title: b.name,
      subtitle: `${b.city || "Sucursal"} · ${b.currency} · ${b.specialty || "Restaurante"}`,
      icon: <BusinessIcon iconKey={b.iconKey} className="w-4 h-4 text-[#FF3F1A]" />,
      action: () => {
        switchBusiness(b.id);
        setIsCommandPaletteOpen(false);
        navigate("/?section=operacion&tab=en-vivo");
      },
      active: b.id === activeBusinessId,
      badge: b.businessType === "retail_store" ? "Retail" : "Gastro",
    })),

    // Actions
    {
      id: "create-business",
      category: "Acciones",
      title: "Crear nuevo negocio / sucursal",
      subtitle: "Wizard guiado en 2 pasos para dar de alta una nueva marca",
      icon: <Plus className="w-4 h-4 text-emerald-500" />,
      action: () => {
        setIsCommandPaletteOpen(false);
        navigate("/onboarding");
      },
    },
    {
      id: "hub-workspaces",
      category: "Acciones",
      title: "Abrir Hub de Gestión de Negocios",
      subtitle: "Ver todas las sedes, estados de suscripción y parámetros",
      icon: <Building2 className="w-4 h-4 text-blue-500" />,
      action: () => {
        setIsCommandPaletteOpen(false);
        navigate("/workspaces");
      },
    },

    // Modules Navigation (Exact direct routing)
    {
      id: "mod-pedidos",
      category: "Acceso Rápido a Módulos",
      title: "Bandeja Unificada de Pedidos",
      subtitle: "Monitor omnicanal de comandas (WhatsApp, Web y POS)",
      icon: <ShoppingBag className="w-4 h-4 text-orange-500" />,
      action: () => {
        setIsCommandPaletteOpen(false);
        navigate("/?section=operacion&tab=en-vivo");
      },
    },
    {
      id: "mod-kds",
      category: "Acceso Rápido a Módulos",
      title: "Pantalla KDS Cocina & Tiempos",
      subtitle: "Estación táctil de preparación para cocineros y horneros",
      icon: <Flame className="w-4 h-4 text-rose-500" />,
      action: () => {
        setIsCommandPaletteOpen(false);
        navigate("/?section=operacion&tab=preparacion");
      },
    },
    {
      id: "mod-catalogo",
      category: "Acceso Rápido a Módulos",
      title: "Catálogo de Platos & Modificadores",
      subtitle: "Gestión de cartas, fotos, secciones y opciones extras",
      icon: <Layers className="w-4 h-4 text-amber-500" />,
      action: () => {
        setIsCommandPaletteOpen(false);
        navigate("/?section=menu&tab=catalogo");
      },
    },
    {
      id: "mod-insumos",
      category: "Acceso Rápido a Módulos",
      title: "Insumos & Stock (Escandallos)",
      subtitle: "Control de materias primas y coste unitario por receta",
      icon: <Building2 className="w-4 h-4 text-emerald-500" />,
      action: () => {
        setIsCommandPaletteOpen(false);
        navigate("/?section=menu&tab=insumos");
      },
    },
    {
      id: "mod-analitica",
      category: "Acceso Rápido a Módulos",
      title: "Dashboard Analítico & Rendimiento",
      subtitle: "Métricas de facturación, ticket promedio y canales",
      icon: <BarChart3 className="w-4 h-4 text-violet-500" />,
      action: () => {
        setIsCommandPaletteOpen(false);
        navigate("/?section=analitica&tab=resumen");
      },
    },
    {
      id: "mod-historial",
      category: "Acceso Rápido a Módulos",
      title: "Historial Completo de Ventas",
      subtitle: "Auditoría de tickets finalizados y trazabilidad",
      icon: <ShoppingBag className="w-4 h-4 text-indigo-500" />,
      action: () => {
        setIsCommandPaletteOpen(false);
        navigate("/?section=analitica&tab=historial");
      },
    },
    {
      id: "mod-automatizaciones",
      category: "Acceso Rápido a Módulos",
      title: "Automatizaciones & WhatsApp IA",
      subtitle: "Reglas automáticas de despacho y respuestas con IA",
      icon: <Zap className="w-4 h-4 text-yellow-500" />,
      action: () => {
        setIsCommandPaletteOpen(false);
        navigate("/?section=configuracion&tab=automatizaciones");
      },
    },
    {
      id: "mod-turnos",
      category: "Acceso Rápido a Módulos",
      title: "Turnos y Capacidad de Cocina",
      subtitle: "Dotación de personal y buffer de tiempos de entrega",
      icon: <Users className="w-4 h-4 text-sky-500" />,
      action: () => {
        setIsCommandPaletteOpen(false);
        navigate("/?section=configuracion&tab=turnos");
      },
    },
  ];


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
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 px-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={() => setIsCommandPaletteOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-[#18181B] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[75vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <Search className="w-5 h-5 text-[#FF3F1A] flex-none" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Buscar sucursal, comanda, módulo o comando..."
            className="w-full bg-transparent text-sm sm:text-base font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden"
          />
          {search ? (
            <button
              onClick={() => setSearch("")}
              className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-0.5 text-[10px] font-mono font-bold bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-md border border-zinc-300/80 dark:border-zinc-700">
                ESC
              </kbd>
            </div>
          )}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 dark:text-zinc-500">
              <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No se encontraron resultados</p>
              <p className="text-xs mt-1">Prueba buscando por nombre de negocio o módulo</p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={item.id}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between gap-3 px-3.5 py-3 rounded-2xl cursor-pointer transition-all ${
                    isSelected
                      ? "bg-zinc-950 text-white dark:bg-zinc-800 shadow-md"
                      : item.active
                      ? "bg-orange-50/70 dark:bg-orange-950/30 text-zinc-900 dark:text-zinc-100"
                      : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-none ${
                        isSelected
                          ? "bg-white/10 text-white"
                          : "bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                      }`}
                    >
                      {item.icon}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-xs font-bold truncate leading-tight ${
                            isSelected ? "text-white" : "text-zinc-900 dark:text-zinc-100"
                          }`}
                        >
                          {item.title}
                        </p>
                        {item.badge && (
                          <span
                            className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-md ${
                              isSelected
                                ? "bg-white/20 text-white"
                                : "bg-orange-100 dark:bg-orange-900/50 text-[#FF3F1A]"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <p
                          className={`text-[11px] truncate leading-tight mt-0.5 ${
                            isSelected ? "text-zinc-300" : "text-zinc-400"
                          }`}
                        >
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-none">
                    {item.active && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isSelected
                            ? "bg-emerald-500 text-white"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        }`}
                      >
                        Activo
                      </span>
                    )}
                    {isSelected && (
                      <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/20 text-white">
                        ↵
                      </kbd>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="px-5 py-2.5 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/80 flex items-center justify-between text-[11px] text-zinc-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded font-mono text-[10px]">
                ↑
              </kbd>
              <kbd className="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded font-mono text-[10px]">
                ↓
              </kbd>
              Navegar
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded font-mono text-[10px]">
                ↵
              </kbd>
              Seleccionar
            </span>
          </div>
          <span className="font-mono text-[10px]">Necto Hub Command</span>
        </div>
      </div>
    </div>
  );
};

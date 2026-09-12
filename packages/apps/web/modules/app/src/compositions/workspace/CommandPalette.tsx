import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "../../context/BusinessContext";
import { BusinessIcon } from "./BusinessIcon";
import {
  Search,
  Building2,
  Plus,
  LayoutGrid,
  SlidersHorizontal,
  ShoppingBag,
  Flame,
  BarChart3,
  Users,
  Layers,
  Package,
  X,
} from "lucide-react";

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
  const isFood = semantics?.requiresKitchenDisplay;

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

  /**
   * Icons deliberately carry no colour of their own — they inherit from the
   * chip that wraps them, so the whole list stays on the single brand accent.
   */
  const items: PaletteItem[] = [
    {
      id: "global-overview",
      category: "Vistas Especiales",
      title: "Vista Franquicia / Resumen Global",
      subtitle: "Dashboard consolidado con ventas y métricas de todas las marcas",
      icon: <LayoutGrid className="w-4 h-4" />,
      action: () => {
        setIsCommandPaletteOpen(false);
        navigate("/workspaces?tab=franchise_overview");
      },
      badge: "Multi-local",
    },

    // Businesses
    ...businesses.map(b => ({
      id: `biz-${b.id}`,
      category: "Espacios de Trabajo" as const,
      title: b.name,
      subtitle: `${b.city || "Sucursal"} · ${b.currency} · ${b.specialty || "Restaurante"}`,
      icon: <BusinessIcon iconKey={b.iconKey} className="w-4 h-4" />,
      action: () => {
        switchBusiness(b.id);
        setIsCommandPaletteOpen(false);
        navigate("/app?section=operacion&tab=en-vivo");
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
      icon: <Plus className="w-4 h-4" />,
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
      icon: <Building2 className="w-4 h-4" />,
      action: () => {
        setIsCommandPaletteOpen(false);
        navigate("/workspaces");
      },
    },

    // Modules Navigation (Exact direct routing)
    {
      id: "mod-pedidos",
      category: "Acceso Rápido a Módulos",
      title: "Órdenes",
      subtitle: "Monitor omnicanal de comandas (WhatsApp, Web y POS)",
      icon: <ShoppingBag className="w-4 h-4" />,
      action: () => {
        setIsCommandPaletteOpen(false);
        navigate("/app?section=operacion&tab=en-vivo");
      },
    },
    {
      id: "mod-kds",
      category: "Acceso Rápido a Módulos",
      title: isFood ? "Pantalla KDS Cocina & Tiempos" : `Pantalla de ${semantics?.stationShortName || "Despacho"} & Tiempos`,
      subtitle: isFood
        ? "Estación táctil de preparación para cocineros y horneros"
        : "Estación táctil de alistamiento, empaque y despacho",
      icon: isFood ? <Flame className="w-4 h-4" /> : <Package className="w-4 h-4" />,
      action: () => {
        setIsCommandPaletteOpen(false);
        navigate("/app?section=operacion&tab=preparacion");
      },
    },
    {
      id: "mod-catalogo",
      category: "Acceso Rápido a Módulos",
      title: isFood ? "Catálogo de Platos & Modificadores" : "Catálogo de Productos & Variantes",
      subtitle: isFood
        ? "Gestión de cartas, fotos, secciones y opciones extras"
        : "Gestión de productos, variantes, precios y catálogo",
      icon: <Layers className="w-4 h-4" />,
      action: () => {
        setIsCommandPaletteOpen(false);
        navigate("/app?section=menu&tab=catalogo");
      },
    },
    {
      id: "mod-insumos",
      category: "Acceso Rápido a Módulos",
      title: "Insumos & Stock (Escandallos)",
      subtitle: "Control de materias primas y coste unitario por receta",
      icon: <Building2 className="w-4 h-4" />,
      action: () => {
        setIsCommandPaletteOpen(false);
        navigate("/app?section=menu&tab=insumos");
      },
    },
    {
      id: "mod-analitica",
      category: "Acceso Rápido a Módulos",
      title: "Dashboard Analítico & Rendimiento",
      subtitle: "Métricas de facturación, ticket promedio y canales",
      icon: <BarChart3 className="w-4 h-4" />,
      action: () => {
        setIsCommandPaletteOpen(false);
        navigate("/app?section=analitica&tab=resumen");
      },
    },
    {
      id: "mod-historial",
      category: "Acceso Rápido a Módulos",
      title: "Historial Completo de Ventas",
      subtitle: "Auditoría de tickets finalizados y trazabilidad",
      icon: <ShoppingBag className="w-4 h-4" />,
      action: () => {
        setIsCommandPaletteOpen(false);
        navigate("/app?section=analitica&tab=historial");
      },
    },
    {
      id: "mod-automatizaciones",
      category: "Acceso Rápido a Módulos",
      title: "Automatizaciones & Reglas WhatsApp",
      subtitle: "Reglas de despacho automático y atención configurada",
      icon: <SlidersHorizontal className="w-4 h-4" />,
      action: () => {
        setIsCommandPaletteOpen(false);
        navigate("/app?section=configuracion&tab=automatizaciones");
      },
    },
    {
      id: "mod-turnos",
      category: "Acceso Rápido a Módulos",
      title: isFood ? "Turnos y Capacidad de Cocina" : "Turnos y Capacidad Operativa",
      subtitle: isFood
        ? "Dotación de personal y buffer de tiempos de entrega"
        : "Dotación de personal y capacidad de despacho",
      icon: <Users className="w-4 h-4" />,
      action: () => {
        setIsCommandPaletteOpen(false);
        navigate("/app?section=configuracion&tab=turnos");
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
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-20 backdrop-blur-sm animate-in fade-in duration-150 sm:pt-28"
      onClick={() => setIsCommandPaletteOpen(false)}
      role="presentation"
    >
      <div
        className="flex max-h-[75vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 dark:bg-[#1C1C1F]"
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
            placeholder="Buscar sucursal, comanda, módulo o comando..."
            className="w-full bg-transparent text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-hidden dark:text-white"
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
            <kbd className="flex-none rounded-md bg-gray-100 px-2 py-0.5 font-mono text-[10px] font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              ESC
            </kbd>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 space-y-1 overflow-y-auto p-2.5">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center">
              <Building2 className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                No se encontraron resultados
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
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
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl px-3.5 py-3 transition-colors ${
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
                          className={`truncate text-[13px] font-bold leading-tight ${
                            isSelected ? "text-white" : "text-secondary-600 dark:text-white"
                          }`}
                        >
                          {item.title}
                        </p>
                        {item.badge && (
                          <span
                            className={`flex-none rounded-full px-2 py-0.5 text-[10px] font-bold ${
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
                          className={`mt-0.5 truncate text-[11px] leading-tight ${
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
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isSelected ? "bg-white/20 text-white" : "bg-brand-500 text-white"
                        }`}
                      >
                        Activo
                      </span>
                    )}
                    {isSelected && (
                      <kbd className="rounded bg-white/20 px-1.5 py-0.5 font-mono text-[10px] text-white">
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
        <div className="flex items-center gap-4 border-t border-gray-100 bg-gray-50 px-5 py-2.5 text-[11px] text-gray-400 dark:border-gray-800 dark:bg-gray-900/60">
          <span className="flex items-center gap-1.5">
            <kbd className="rounded bg-gray-200/80 px-1.5 py-0.5 font-mono text-[10px] dark:bg-gray-800">
              ↑
            </kbd>
            <kbd className="rounded bg-gray-200/80 px-1.5 py-0.5 font-mono text-[10px] dark:bg-gray-800">
              ↓
            </kbd>
            Navegar
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="rounded bg-gray-200/80 px-1.5 py-0.5 font-mono text-[10px] dark:bg-gray-800">
              ↵
            </kbd>
            Seleccionar
          </span>
        </div>
      </div>
    </div>
  );
};

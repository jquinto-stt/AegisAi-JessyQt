import {
  Building2,
  Plus,
  BarChart2,
  Layers,
} from "lucide-react";
import { BusinessIcon } from "../BusinessIcon";
import type { PaletteBusiness, PaletteItem, PaletteSemantics } from "./palette.types";

export function createPaletteItems(
  businesses: PaletteBusiness[],
  _semantics: PaletteSemantics | undefined,
  onNavigate: (path: string) => void,
  onSwitchBusiness: (id: string) => void,
  onClose: () => void,
  activeBusinessId?: string
): PaletteItem[] {
  const go = (path: string) => () => {
    onClose();
    onNavigate(path);
  };

  return [
    // Navegación principal
    {
      id: "hub-workspaces",
      category: "Navegación principal",
      title: "Hub de franquicias y sucursales",
      subtitle: "Panel general con todas tus sedes y negocios registrados",
      icon: <Building2 className="w-4 h-4" />,
      action: go("/workspaces"),
    },
    {
      id: "auditoria-360",
      category: "Navegación principal",
      title: "Analítica corporativa",
      subtitle: "Cifras consolidadas de ventas, tickets y crecimiento",
      icon: <BarChart2 className="w-4 h-4" />,
      action: go("/analitica"),
    },
    {
      id: "modulos-tienda",
      category: "Navegación principal",
      title: "Módulos de tienda",
      subtitle: "Centro de capacidades activas de tu negocio",
      icon: <Layers className="w-4 h-4" />,
      action: go("/app?module=modules-hub"),
    },

    // Acciones de Gestión
    {
      id: "create-business",
      category: "Acciones",
      title: "Crear nueva sucursal / negocio",
      subtitle: "Dar de alta una nueva sede en tu cuenta",
      icon: <Plus className="w-4 h-4" />,
      action: go("/onboarding"),
    },

    // Sucursales Activas
    ...businesses.map<PaletteItem>(b => ({
      id: `biz-${b.id}`,
      category: "Sucursales y sedes",
      title: b.name,
      subtitle: `${b.city || "Sucursal"} · Moneda: ${b.currency}`,
      icon: <BusinessIcon iconKey={b.iconKey} className="w-4 h-4" />,
      action: () => {
        onSwitchBusiness(b.id);
        onClose();
        onNavigate("/app?module=modules-hub");
      },
      active: b.id === activeBusinessId,
      badge: b.id === activeBusinessId ? "Sede Activa" : undefined,
    })),
  ];
}

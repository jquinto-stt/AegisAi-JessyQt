import React from "react";

export interface PaletteItem {
  id: string;
  category: "Espacios de trabajo" | "Vistas especiales" | "Acceso rápido a módulos" | "Acciones" | "Navegación principal" | "Sucursales y sedes";
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
  active?: boolean;
  badge?: string;
}

/** A business entry as exposed to the palette builder. */
export interface PaletteBusiness {
  id: string;
  name: string;
  city?: string;
  currency: string;
  specialty?: string;
  iconKey: string;
  businessType: string;
}

export interface PaletteSemantics {
  requiresKitchenDisplay?: boolean;
  stationShortName?: string;
}

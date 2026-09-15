import React from "react";
import { ZoomIn, RotateCcw, Move, RefreshCw } from "lucide-react";
import { Button } from "@/elements";
import type { ImageTransformConfig } from "../../../context/BusinessContext";
import { DEFAULT_TRANSFORM } from "./business-settings.constants";

/* ── Framing controls for the logo and the storefront banner ───────────
 * The `logoTransform` / `bannerTransform` fields already existed on the
 * business model and were already rendered by the hub cards and the
 * storefront banner, but nothing ever let the user set them.
 * ─────────────────────────────────────────────────────────────────── */

export const TransformControls: React.FC<{
  value: ImageTransformConfig;
  onChange: (next: ImageTransformConfig) => void;
}> = ({ value, onChange }) => {
  const rows: Array<{
    key: keyof ImageTransformConfig;
    label: string;
    icon: React.ReactNode;
    min: number;
    max: number;
    step: number;
    suffix: string;
  }> = [
    { key: "scale", label: "Zoom", icon: <ZoomIn className="h-3.5 w-3.5" />, min: 0.5, max: 3, step: 0.05, suffix: "×" },
    { key: "rotate", label: "Rotación", icon: <RotateCcw className="h-3.5 w-3.5" />, min: -180, max: 180, step: 1, suffix: "°" },
    { key: "posX", label: "Horizontal", icon: <Move className="h-3.5 w-3.5" />, min: -100, max: 100, step: 1, suffix: "%" },
    { key: "posY", label: "Vertical", icon: <Move className="h-3.5 w-3.5" />, min: -100, max: 100, step: 1, suffix: "%" },
  ];

  return (
    <div className="space-y-2.5">
      {rows.map(row => (
        <div key={String(row.key)} className="flex items-center gap-3">
          <span className="flex w-28 flex-none items-center gap-1.5 text-theme-xs font-medium text-gray-500 dark:text-gray-400">
            {row.icon}
            {row.label}
          </span>
          {/*
            ⚠️ El deslizador **no** tiene equivalente en el catálogo: `Input` es de
            texto y no existe un componente de rango. Se queda nativo, con su
            `aria-label`, que es lo único que le da nombre accesible.
          */}
          <input
            type="range"
            min={row.min}
            max={row.max}
            step={row.step}
            value={value[row.key]}
            onChange={e => onChange({ ...value, [row.key]: Number(e.target.value) })}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-gray-200 accent-brand-500 dark:bg-gray-700"
            aria-label={row.label}
          />
          <span className="w-14 flex-none text-right text-theme-xs font-medium tabular-nums text-gray-400 dark:text-gray-500">
            {value[row.key]}
            {row.suffix}
          </span>
        </div>
      ))}
      {/* El icono entra por `startIcon`, no como hijo: así hereda las reglas de
          alineación del slot del catálogo en vez de quedar fuera de ellas. */}
      <Button
        variant="ghost"
        intent="branding.transform.reset"
        onClick={() => onChange(DEFAULT_TRANSFORM)}
        startIcon={<RefreshCw className="h-3 w-3" />}
        className="h-auto gap-1.5 rounded-full px-3 py-1.5 text-theme-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-brand-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-brand-400"
      >
        Restablecer encuadre
      </Button>
    </div>
  );
};

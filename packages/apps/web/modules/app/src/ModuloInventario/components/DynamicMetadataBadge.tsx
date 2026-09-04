import React from "react";
import { Calendar, Tag, ShieldCheck, Hash, Thermometer, Layers } from "lucide-react";

interface DynamicMetadataBadgeProps {
  fieldKey: string;
  value: any;
}

export const DynamicMetadataBadge: React.FC<DynamicMetadataBadgeProps> = ({ fieldKey, value }) => {
  if (value === undefined || value === null || value === "") {
    return <span className="text-zinc-400 dark:text-zinc-500 text-xs italic">-</span>;
  }

  const strVal = String(value);

  // Formato para fechas (ej. vencimiento)
  if (fieldKey.toLowerCase().includes("fecha") || fieldKey.toLowerCase().includes("vencimiento")) {
    const isPast = new Date(strVal).getTime() < Date.now();
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${
          isPast
            ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-900"
            : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-900"
        }`}
        title={`Fecha: ${strVal}`}
      >
        <Calendar className="w-3 h-3 flex-none" />
        {strVal}
      </span>
    );
  }

  // Tallas
  if (fieldKey.toLowerCase() === "talla") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold uppercase tracking-wider">
        {strVal}
      </span>
    );
  }

  // Colores
  if (fieldKey.toLowerCase() === "color") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-medium">
        <span className="w-2 h-2 rounded-full bg-purple-500 flex-none" />
        {strVal}
      </span>
    );
  }

  // Lotes o Serials
  if (fieldKey.toLowerCase().includes("lote") || fieldKey.toLowerCase().includes("serie")) {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
        <Hash className="w-3 h-3 text-zinc-400" />
        {strVal}
      </span>
    );
  }

  // Temperatura
  if (fieldKey.toLowerCase().includes("temperatura")) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 text-xs font-medium">
        <Thermometer className="w-3 h-3" />
        {strVal}
      </span>
    );
  }

  // Atributo genérico
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 text-xs font-medium">
      {strVal}
    </span>
  );
};

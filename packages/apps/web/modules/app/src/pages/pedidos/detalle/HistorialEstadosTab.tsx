import { useState } from "react";

import {
  CheckBadgeIcon,
  ChevronDownIcon,
  DocumentTextIcon,
  MapIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import { pedidosStore } from "@/stores";
import type { Pedido } from "@/stores/pedidos.store";
import { fechaCorta, fechaHora, eventosDeEnvio, hitosDe, type EstadoHito } from "./detalle.utils";

// ═══════════════════════════════════════════════════════════════════════════
// HISTORIAL DE ESTADOS
// ═══════════════════════════════════════════════════════════════════════════

const ICONO_HITO = [DocumentTextIcon, MapIcon, TruckIcon, CheckBadgeIcon];

/** Clases del hito según en qué punto está. */
const CLASE_HITO: Record<EstadoHito, { caja: string; circulo: string; titulo: string }> = {
  hecho: {
    caja: "border-accent-200 bg-accent-50/60 dark:border-accent-900/60 dark:bg-accent-950/20",
    circulo: "bg-accent-100 text-accent-600 dark:bg-accent-900/50 dark:text-accent-300",
    titulo: "text-ink-title dark:text-white",
  },
  actual: {
    caja: "border-brand-300 bg-brand-50/60 dark:border-brand-800 dark:bg-brand-950/30",
    circulo: "bg-brand-100 text-brand-600 dark:bg-brand-900/50 dark:text-brand-300",
    titulo: "text-ink-title dark:text-white",
  },
  pendiente: {
    caja: "border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]",
    circulo: "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500",
    titulo: "text-gray-400 dark:text-gray-500",
  },
};

/**
 * HistorialEstadosTab — por dónde va el envío y todo lo que dejó registrado.
 *
 * Arriba, los cuatro hitos como tarjetas: se leen de un vistazo y no hace falta
 * abrir nada. Abajo, la línea de tiempo plegada, porque es el detalle de
 * auditoría (quién movió qué y cuándo) y se consulta, no se vigila.
 */
export const HistorialEstadosTab = ({ pedido }: { pedido: Pedido }) => {
  const [abierto, setAbierto] = useState(false);
  const hitos = hitosDe(pedido);
  const eventos = eventosDeEnvio(pedido, pedidosStore.estadoLabel(pedido.estado));
  const unidades = pedido.items.reduce((s, it) => s + it.cantidad, 0);

  const meta: { label: string; valor: string }[] = [
    { label: "Origen", valor: pedido.origen === "whatsapp" ? "WhatsApp" : "Operador" },
    {
      label: "Destino",
      valor: pedido.direccionEntrega?.barrio || pedido.direccionEntrega?.calle || "Sin dirección",
    },
    { label: "Unidades", valor: String(unidades) },
    {
      label: "Fecha de entrega",
      valor: pedido.finishedAt
        ? fechaCorta(pedido.finishedAt)
        : pedido.programadoPara
          ? fechaCorta(pedido.programadoPara)
          : "No se ha calculado",
    },
    { label: "Transportadora", valor: pedido.repartidor?.trim() || "Sin asignar" },
  ];

  return (
    <div>
      {/* Los cuatro hitos */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {hitos.map((h, i) => {
          const Icono = ICONO_HITO[i];
          const clase = CLASE_HITO[h.estado];
          return (
            <div
              key={h.clave}
              className={`rounded-2xl border p-4 transition-colors ${clase.caja} ${
                h.estado === "actual" ? "ring-1 ring-brand-300/70 dark:ring-brand-800" : ""
              }`}
            >
              <span
                className={`flex size-11 items-center justify-center rounded-full ${clase.circulo}`}
              >
                <Icono className="size-5.5" />
              </span>
              <p className={`mt-3 text-sm font-semibold leading-snug ${clase.titulo}`}>
                {h.titulo}
              </p>
              <p className="mt-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                {h.detalle}
              </p>
            </div>
          );
        })}
      </div>

      {/* Datos del envío, en una fila: son cinco respuestas cortas */}
      <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 xl:grid-cols-5">
        {meta.map((m) => (
          <div key={m.label}>
            <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500">{m.label}</p>
            <p className="mt-0.5 truncate text-xs font-semibold text-gray-800 dark:text-gray-200">
              {m.valor}
            </p>
          </div>
        ))}
      </div>

      {/* Línea de tiempo plegable */}
      <div className="mt-6 rounded-2xl border border-gray-200 dark:border-gray-800">
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-gray-50 cursor-pointer dark:hover:bg-white/[0.03]"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-ink-title dark:text-white">
            <DocumentTextIcon className="size-4 text-gray-400" />
            Historial de envío
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              {eventos.length}
            </span>
          </span>
          <ChevronDownIcon
            className={`size-4 text-gray-400 transition-transform ${abierto ? "rotate-180" : ""}`}
          />
        </button>

        {abierto && (
          <ol className="border-t border-gray-100 px-4 py-3 dark:border-gray-800">
            {eventos.map((e, i) => (
              <li key={`${e.titulo}-${e.fecha}`} className="flex items-start gap-3 py-2">
                {/* Punto + guía vertical: el último punto no lleva cola. */}
                <span className="relative flex flex-col items-center self-stretch">
                  <span
                    className={`mt-1.5 size-2.5 shrink-0 rounded-full border-2 ${
                      i === eventos.length - 1
                        ? "border-accent-500 bg-accent-500"
                        : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900"
                    }`}
                  />
                  {i < eventos.length - 1 && (
                    <span className="mt-1 w-px flex-1 bg-gray-200 dark:bg-gray-800" />
                  )}
                </span>
                <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {e.titulo}
                  </span>
                  <span className="shrink-0 text-[11px] text-gray-400">{fechaHora(e.fecha)}</span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};

export default HistorialEstadosTab;

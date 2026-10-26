import { useMemo, useState } from "react";
import { observer } from "mobx-react-lite";
import { useNavigate } from "react-router";

import { organizacionStore, pedidosStore, sessionStore } from "@/stores";
import type { Pedido, PedidoEstado } from "@/stores/pedidos.store";
import { DetallePedidoModal } from "./DetallePedidoModal";
import { money, ListaVacia } from "./widgets";
import {
  UserIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  EllipsisHorizontalIcon,
} from "@heroicons/react/24/outline";

// ═══════════════════════════════════════════════════════════════════════════
// ETAPAS Y SUB-ESTADOS DEL PIPELINE
// ═══════════════════════════════════════════════════════════════════════════

export const ETAPAS_INICIO = [
  { clave: "por_preparar", label: "Por preparar", estados: ["nuevo", "confirmado"] },
  { clave: "en_preparacion", label: "En preparación", estados: ["en_preparacion", "listo"] },
  { clave: "en_transito", label: "En tránsito", estados: ["en_camino"] },
  { clave: "finalizadas", label: "Finalizadas", estados: ["entregado", "cancelado"] },
] as const satisfies ReadonlyArray<{ clave: string; label: string; estados: PedidoEstado[] }>;

export type EtapaInicio = (typeof ETAPAS_INICIO)[number]["clave"];

/** Conteo de pedidos por etapa del pipeline. */
export function contarEtapa(pedidos: Pedido[], clave: EtapaInicio): number {
  const etapa = ETAPAS_INICIO.find((e) => e.clave === clave);
  if (!etapa) return 0;
  return pedidos.filter((p) => (etapa.estados as readonly PedidoEstado[]).includes(p.estado)).length;
}

const sinAcentos = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Fecha en formato ISO corto: «2026-10-23». */
const fechaISO = (iso: string) => {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toISOString().split("T")[0];
  } catch {
    return "—";
  }
};

export interface ResumenPedidosVistaProps {
  etapa?: EtapaInicio;
  onEtapaChange?: (etapa: EtapaInicio) => void;
  busqueda?: string;
  porConfirmar?: boolean;
  pendiente?: boolean;
  filtroPago?: "todos" | "pendientes" | "pagados";
  etapasFiltro?: EtapaInicio[];
}

export const ResumenPedidosVista = observer(
  ({
    etapa: etapaProp,
    busqueda: busquedaProp = "",
    porConfirmar = false,
    pendiente = false,
    filtroPago = "todos",
    etapasFiltro = [],
  }: ResumenPedidosVistaProps) => {
    const navigate = useNavigate();
    const [detalleId, setDetalleId] = useState<string | null>(null);

    const terminoBusqueda = busquedaProp;
    const puedeVerMontos = sessionStore.hasPermission("team.read");
    const todos = pedidosStore.pedidos;

    const estadosPermitidos = useMemo(() => {
      if (etapasFiltro.length > 0) {
        const etapas = ETAPAS_INICIO.filter((e) => etapasFiltro.includes(e.clave));
        return new Set<PedidoEstado>(etapas.flatMap((e) => e.estados));
      }
      if (etapaProp) {
        const def = ETAPAS_INICIO.find((e) => e.clave === etapaProp);
        if (def) return new Set<PedidoEstado>(def.estados);
      }
      return null;
    }, [etapasFiltro, etapaProp]);

    // Pedidos filtrados según etapas permitidas, pago y búsqueda
    const visibles = useMemo(() => {
      const q = sinAcentos(terminoBusqueda.trim());

      return todos
        .filter((p) => {
          if (estadosPermitidos && !estadosPermitidos.has(p.estado)) return false;
          if (filtroPago === "pagados" && !p.pagado) return false;
          if (filtroPago === "pendientes" && p.pagado) return false;
          if (porConfirmar && p.estado !== "nuevo") return false;
          if (pendiente && p.pagado !== false) return false;
          if (!q) return true;
          const texto = [p.numero, p.cliente, ...p.items.map((i) => i.nombre)].join(" ");
          return sinAcentos(texto).includes(q);
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }, [todos, estadosPermitidos, filtroPago, porConfirmar, pendiente, terminoBusqueda]);

    const totalRegistros = useMemo(() => {
      return todos.filter((p) => {
        if (estadosPermitidos && !estadosPermitidos.has(p.estado)) return false;
        if (filtroPago === "pagados" && !p.pagado) return false;
        if (filtroPago === "pendientes" && p.pagado) return false;
        if (porConfirmar && p.estado !== "nuevo") return false;
        if (pendiente && p.pagado !== false) return false;
        return true;
      }).length;
    }, [todos, estadosPermitidos, filtroPago, porConfirmar, pendiente]);

    const totalValor = visibles.reduce((acc, p) => acc + pedidosStore.totalPedido(p), 0);
    const pedidoAbierto: Pedido | undefined = detalleId ? todos.find((p) => p.id === detalleId) : undefined;
    const moneda = organizacionStore.organizacion?.moneda ?? "COP";

    return (
      <div className="flex flex-col gap-4">

        {/* ══════════════════════════════════════════════════════════════════════
            3. RESUMEN DE REGISTROS Y VALOR TOTAL
            ══════════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2 dark:border-gray-800/80">
          <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
            Mostrando {visibles.length} de {totalRegistros} {totalRegistros === 1 ? "Registro" : "Registros"}
          </p>
          {puedeVerMontos && (
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Valor Total:{" "}
              <strong className="text-base font-bold text-gray-900 dark:text-white">
                {money(totalValor)} {moneda}
              </strong>
            </p>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            4. TABLA DE REGISTROS (DISEÑO NECTO)
            ══════════════════════════════════════════════════════════════════════ */}
        <div className="overflow-x-auto rounded-2xl border border-gray-200/90 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <table className="w-full min-w-[920px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:border-gray-800 dark:text-gray-500">
                <th className="px-5 py-3.5">N. Orden</th>
                <th className="px-5 py-3.5">Producto</th>
                <th className="px-5 py-3.5">Fecha</th>
                <th className="px-5 py-3.5">Comprador</th>
                <th className="px-5 py-3.5">Estado de Confirmación</th>
                <th className="px-5 py-3.5">Tipo de Pedido</th>
                {puedeVerMontos && <th className="px-5 py-3.5 text-right">Valor</th>}
                <th className="px-5 py-3.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {visibles.length === 0 ? (
                <tr>
                  <td colSpan={puedeVerMontos ? 8 : 7} className="px-5 py-12">
                    <ListaVacia>No hay pedidos que coincidan con los filtros seleccionados.</ListaVacia>
                  </td>
                </tr>
              ) : (
                visibles.map((p) => {
                  const primero = p.items[0];
                  const extra = p.items.length - 1;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setDetalleId(p.id)}
                      className="cursor-pointer transition-colors hover:bg-gray-50/80 dark:hover:bg-white/[0.02]"
                    >
                      {/* N. Orden */}
                      <td className="px-5 py-4 font-bold text-gray-900 dark:text-white">
                        <span className="text-brand-600 dark:text-brand-400 hover:underline">
                          N°: {p.numero}
                        </span>
                      </td>

                      {/* Producto */}
                      <td className="px-5 py-4 text-gray-800 dark:text-gray-200">
                        <span className="block max-w-[200px] truncate font-medium">
                          {primero ? primero.nombre : "Sin artículos"}
                        </span>
                        {extra > 0 && (
                          <span className="text-[11px] text-gray-400 dark:text-gray-500">
                            y {extra} {extra === 1 ? "más" : "más"}
                          </span>
                        )}
                      </td>

                      {/* Fecha */}
                      <td className="px-5 py-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {fechaISO(p.createdAt)}
                      </td>

                      {/* Comprador */}
                      <td className="px-5 py-4 text-gray-800 dark:text-gray-200">
                        <span className="block max-w-[170px] truncate font-semibold">
                          {p.cliente || "Cliente sin nombre"}
                        </span>
                        {p.telefono && (
                          <span className="text-[11px] text-gray-400 dark:text-gray-500">
                            {p.telefono}
                          </span>
                        )}
                      </td>

                      {/* Estado de Confirmación */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 font-medium">
                          <UserIcon className="size-3.5 text-gray-400 shrink-0" />
                          <span>
                            {p.estado === "nuevo"
                              ? "Para Confirmación Manual"
                              : pedidosStore.estadoLabel(p.estado)}
                          </span>
                        </div>
                      </td>

                      {/* Tipo de Pedido */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-0.5 text-xs text-gray-700 dark:text-gray-300">
                          <div className="flex items-center gap-1 font-medium">
                            <ShoppingBagIcon className="size-3.5 text-gray-400 shrink-0" />
                            <span>{p.pagado ? "Con recaudo / Pagado" : "Sin recaudo"}</span>
                          </div>
                          <span className="text-[11px] text-gray-400 dark:text-gray-500">
                            Modalidad: {pedidosStore.modalidadLabel(p.modalidad)}
                          </span>
                        </div>
                      </td>

                      {/* Valor */}
                      {puedeVerMontos && (
                        <td className="px-5 py-4 text-right font-bold text-gray-900 dark:text-white whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1">
                            <CurrencyDollarIcon className="size-4 text-gray-400" />
                            <span>
                              {pedidosStore.totalPedido(p) > 0 ? money(pedidosStore.totalPedido(p)) : "0"}{" "}
                              {moneda}
                            </span>
                          </div>
                        </td>
                      )}

                      {/* Acciones */}
                      <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setDetalleId(p.id)}
                          title="Ver detalle del pedido"
                          className="inline-flex size-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors cursor-pointer"
                        >
                          <EllipsisHorizontalIcon className="size-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modal de Detalle al hacer clic en cualquier fila */}
        {pedidoAbierto && (
          <DetallePedidoModal
            pedido={pedidoAbierto}
            onClose={() => setDetalleId(null)}
            onChat={() => {
              setDetalleId(null);
              navigate("/conversaciones");
            }}
          />
        )}
      </div>
    );
  },
);

export default ResumenPedidosVista;

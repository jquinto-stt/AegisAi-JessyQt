import { useMemo, useState } from "react";
import { observer } from "mobx-react-lite";
import { useNavigate } from "react-router";

import { organizacionStore, pedidosStore, sessionStore } from "@/stores";
import type { Pedido, PedidoEstado } from "@/stores/pedidos.store";
import { DetallePedidoModal } from "./DetallePedidoModal";
import { money, ListaVacia } from "./widgets";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  XMarkIcon,
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

export interface SubEstadoDef {
  clave: string;
  label: string;
  filtro: (p: Pedido) => boolean;
}

export const SUB_ESTADOS_POR_ETAPA: Record<EtapaInicio, SubEstadoDef[]> = {
  por_preparar: [
    { clave: "todos", label: "Todos", filtro: () => true },
    { clave: "nuevo", label: "Por Confirmar", filtro: (p) => p.estado === "nuevo" },
    { clave: "confirmado", label: "Confirmados", filtro: (p) => p.estado === "confirmado" },
  ],
  en_preparacion: [
    { clave: "todos", label: "Todos", filtro: () => true },
    { clave: "en_preparacion", label: "Por Alistar", filtro: (p) => p.estado === "en_preparacion" },
    { clave: "listo", label: "Por Recolectar", filtro: (p) => p.estado === "listo" },
  ],
  en_transito: [
    { clave: "todos", label: "Todos", filtro: () => true },
    { clave: "en_camino", label: "En Camino", filtro: (p) => p.estado === "en_camino" },
  ],
  finalizadas: [
    { clave: "todos", label: "Todos", filtro: () => true },
    { clave: "entregado", label: "Entregados", filtro: (p) => p.estado === "entregado" },
    { clave: "cancelado", label: "Cancelados", filtro: (p) => p.estado === "cancelado" },
  ],
};

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

/** Ícono de relámpago conector de pipeline con la paleta de Necto. */
const RayoConector = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="size-4.5 text-brand-500 shrink-0 mx-1">
    <path d="M13 2L3 14h8l-1 8 11-12h-8l1-8z" />
  </svg>
);

export interface ResumenPedidosVistaProps {
  etapa?: EtapaInicio;
  onEtapaChange?: (etapa: EtapaInicio) => void;
  busqueda?: string;
  porConfirmar?: boolean;
  pendiente?: boolean;
}

export const ResumenPedidosVista = observer(
  ({
    etapa: etapaProp,
    onEtapaChange,
    busqueda: busquedaProp = "",
    porConfirmar = false,
    pendiente = false,
  }: ResumenPedidosVistaProps) => {
    const navigate = useNavigate();
    const [etapaLocal, setEtapaLocal] = useState<EtapaInicio>("en_preparacion");
    const [subEstado, setSubEstado] = useState<string>("todos");
    const [busquedaLocal, setBusquedaLocal] = useState<string>("");
    const [filtroPagoLocal, setFiltroPagoLocal] = useState<"todos" | "pagados" | "por_cobrar">("todos");
    const [mostrarFiltrosModal, setMostrarFiltrosModal] = useState<boolean>(false);
    const [detalleId, setDetalleId] = useState<string | null>(null);

    // Sincronizar etapa controlada o interna
    const etapaActiva = etapaProp ?? etapaLocal;
    const cambiarEtapa = (nueva: EtapaInicio) => {
      setEtapaLocal(nueva);
      setSubEstado("todos");
      onEtapaChange?.(nueva);
    };

    const terminoBusqueda = busquedaLocal || busquedaProp;
    const puedeVerMontos = sessionStore.hasPermission("team.read");
    const todos = pedidosStore.pedidos;

    // Sub-estados disponibles para la etapa actual
    const subEstados = SUB_ESTADOS_POR_ETAPA[etapaActiva] ?? [{ clave: "todos", label: "Todos", filtro: () => true }];

    // Pedidos filtrados según etapa, sub-estado, pago y búsqueda
    const visibles = useMemo(() => {
      const defEtapa = ETAPAS_INICIO.find((e) => e.clave === etapaActiva);
      const subDef = subEstados.find((s) => s.clave === subEstado);
      const q = sinAcentos(terminoBusqueda.trim());

      return todos
        .filter((p) => {
          // 1. Etapa macro
          if (defEtapa && !(defEtapa.estados as readonly PedidoEstado[]).includes(p.estado)) return false;
          // 2. Sub-estado
          if (subDef && !subDef.filtro(p)) return false;
          // 3. Filtro pago
          if (filtroPagoLocal === "pagados" && !p.pagado) return false;
          if (filtroPagoLocal === "por_cobrar" && p.pagado) return false;
          if (porConfirmar && p.estado !== "nuevo") return false;
          if (pendiente && p.pagado !== false) return false;
          // 4. Búsqueda libre
          if (!q) return true;
          const texto = [p.numero, p.cliente, ...p.items.map((i) => i.nombre)].join(" ");
          return sinAcentos(texto).includes(q);
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }, [todos, etapaActiva, subEstado, subEstados, filtroPagoLocal, porConfirmar, pendiente, terminoBusqueda]);

    const totalDeEtapa = useMemo(() => {
      const defEtapa = ETAPAS_INICIO.find((e) => e.clave === etapaActiva);
      if (!defEtapa) return 0;
      return todos.filter((p) => (defEtapa.estados as readonly PedidoEstado[]).includes(p.estado)).length;
    }, [todos, etapaActiva]);

    const totalValor = visibles.reduce((acc, p) => acc + pedidosStore.totalPedido(p), 0);
    const pedidoAbierto: Pedido | undefined = detalleId ? todos.find((p) => p.id === detalleId) : undefined;
    const moneda = organizacionStore.organizacion?.moneda ?? "COP";

    return (
      <div className="flex flex-col gap-6">
        {/* ══════════════════════════════════════════════════════════════════════
            1. PIPELINE DE ETAPAS (FUNNEL STEPPER SECUENCIAL)
            ══════════════════════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-start sm:justify-center overflow-x-auto py-2 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {ETAPAS_INICIO.map((e, idx) => {
              const activa = etapaActiva === e.clave;
              const count = contarEtapa(todos, e.clave);
              return (
                <div key={e.clave} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => cambiarEtapa(e.clave)}
                    className={`flex items-center gap-3 transition-all cursor-pointer select-none ${
                      activa
                        ? "rounded-full bg-brand-500 px-6 py-2.5 text-sm font-bold text-white shadow-theme-sm"
                        : "rounded-full px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800/60"
                    }`}
                  >
                    <span>{e.label}</span>
                    <span
                      className={`flex items-center justify-center rounded-full text-xs font-bold transition-colors ${
                        activa
                          ? "bg-white text-brand-600 px-2.5 py-0.5 shadow-sm"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {count}
                    </span>
                  </button>

                  {/* Rayo conector hacia la siguiente etapa */}
                  {idx < ETAPAS_INICIO.length - 1 && <RayoConector />}
                </div>
              );
            })}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            2. FILA DE SUB-ESTADOS Y HERRAMIENTAS DE BÚSQUEDA / FILTROS
            ══════════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Sub-estados de la etapa activa */}
          <div className="flex flex-wrap items-center gap-2">
            {subEstados.map((sub) => {
              const activo = subEstado === sub.clave;
              return (
                <button
                  key={sub.clave}
                  type="button"
                  onClick={() => setSubEstado(sub.clave)}
                  className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer select-none ${
                    activo
                      ? "border-2 border-brand-500 bg-brand-50/70 text-brand-700 dark:bg-brand-950/30 dark:text-brand-300 shadow-theme-xs"
                      : "border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800/60"
                  }`}
                >
                  {sub.label}
                </button>
              );
            })}
          </div>

          {/* Barra de herramientas derecha: Buscador + Filtros + Refresh */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <input
                type="text"
                value={busquedaLocal}
                onChange={(e) => setBusquedaLocal(e.target.value)}
                placeholder="Nombre del Cliente, orden..."
                className="h-10 w-48 sm:w-64 rounded-xl border border-gray-200 bg-white pl-9 pr-8 text-xs text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              />
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-3 size-4 text-gray-400" />
              {busquedaLocal && (
                <button
                  type="button"
                  onClick={() => setBusquedaLocal("")}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                >
                  <XMarkIcon className="size-4" />
                </button>
              )}
            </div>

            {/* Botón Buscar / Filtros rápidos */}
            <button
              type="button"
              onClick={() => setMostrarFiltrosModal((v) => !v)}
              className={`flex h-10 items-center gap-1.5 rounded-xl border px-3.5 text-xs font-semibold transition-colors cursor-pointer ${
                filtroPagoLocal !== "todos" || mostrarFiltrosModal
                  ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-950/40 dark:text-brand-300"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              <FunnelIcon className="size-4" />
              <span>Filtros</span>
              {filtroPagoLocal !== "todos" && (
                <span className="size-2 rounded-full bg-brand-500 ml-0.5" />
              )}
            </button>

            {/* Botón Limpiar / Restablecer */}
            <button
              type="button"
              onClick={() => {
                setBusquedaLocal("");
                setSubEstado("todos");
                setFiltroPagoLocal("todos");
              }}
              title="Restablecer filtros de etapa"
              className="flex size-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <ArrowPathIcon className="size-4" />
            </button>
          </div>
        </div>

        {/* Panel desplegable de Filtros adicionales */}
        {mostrarFiltrosModal && (
          <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-gray-900/60 flex flex-wrap items-center gap-4 text-xs">
            <span className="font-semibold text-gray-700 dark:text-gray-300">Estado de pago:</span>
            <div className="flex items-center gap-1.5">
              {(["todos", "por_cobrar", "pagados"] as const).map((modo) => (
                <button
                  key={modo}
                  type="button"
                  onClick={() => setFiltroPagoLocal(modo)}
                  className={`rounded-lg px-3 py-1.5 font-medium transition-colors cursor-pointer ${
                    filtroPagoLocal === modo
                      ? "bg-brand-500 text-white font-semibold shadow-theme-xs"
                      : "bg-white text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                >
                  {modo === "todos" ? "Todos" : modo === "por_cobrar" ? "Por cobrar" : "Pagados"}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setMostrarFiltrosModal(false)}
              className="ml-auto text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 underline cursor-pointer"
            >
              Cerrar filtros
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            3. RESUMEN DE REGISTROS Y VALOR TOTAL
            ══════════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2 dark:border-gray-800/80">
          <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
            Mostrando {visibles.length} de {totalDeEtapa} {visibles.length === 1 ? "Registro" : "Registros"}
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

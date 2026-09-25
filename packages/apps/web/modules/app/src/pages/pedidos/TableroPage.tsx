import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Badge } from "@/elements/ui/badge";
import { Button } from "@/elements/ui/button";
import { Modal } from "@/elements/ui/modal";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/elements/ui/table";
import {
  pedidosStore,
  ETIQUETA_PAGO,
  puedeMoverA,
  puedeCancelarPedido,
  puedeEscribirCliente,
  puedeVerProgramados,
  puedeGestionarProgramados,
} from "@/stores";
import type { Pedido, PedidoEstado, Modalidad } from "@/stores/pedidos.store";
import { retardoEscalonado } from "@/utils";
import { ProgramarModal } from "./ProgramarModal";
import {
  avanzarPedido,
  cancelarPedido,
} from "./pedidos.notificaciones";
import { BUSINESS_PROFILES } from "@/domain/pedidos/pedidos.profiles";
import { ChatDrawer } from "@/pages/conversaciones/components/ChatDrawer";
import {
  MoreHorizontal,
  SlidersHorizontal,
  Plus,
  Calendar,
  MessageSquare,
  Paperclip,
  ArrowLeft,
  ArrowRight,
  Edit3,
  Trash2,
  Check,
  Search,
  X,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════
// AUTORIZACIÓN DE ACCIONES (contrato §1.4 / §2)
// ═══════════════════════════════════════════════════════════════════════════
//
// Cada afordancia de este tablero se gobierna por una CAPACIDAD, no por el
// módulo ni por la sección. Ver `stores/acceso.utils.ts` para el mapeo
// transición-del-pipeline → capacidad.
//
// Criterio de presentación: una acción que la sesión **no puede** ejecutar no
// se dibuja (en vez de dibujarse deshabilitada). Evita muros de botones grises
// y deja cada rol con exactamente las acciones que le corresponden. Donde sí
// conviene "ver pero no poder" (p. ej. la configuración) se deshabilita con
// motivo; eso se resuelve en la página correspondiente.
//
// Invariante C5: poder ENTRAR a /pedidos no implica poder operar nada. El
// guard de ruta solo exige `orders.read`.

// ═══════════════════════════════════════════════════════════════════════════
// PREFERENCIA DE VISTA (persistida en localStorage)
// ═══════════════════════════════════════════════════════════════════════════

type VistaTablero = "kanban" | "lista";
const VISTA_KEY = "necto.pedidosVista";

const loadVista = (): VistaTablero => {
  try {
    return localStorage.getItem(VISTA_KEY) === "lista" ? "lista" : "kanban";
  } catch {
    return "kanban";
  }
};
const saveVista = (v: VistaTablero) => {
  try {
    localStorage.setItem(VISTA_KEY, v);
  } catch {
    // Sin localStorage: no-op (mock).
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/** Opciones del filtro de modalidad (según la config del módulo). */
const FILTRO_TODAS = "__todas__";

/** Formatea una fecha ISO como "12 sep, 14:30" (es-CO). */
const formatFechaHora = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("es-CO", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
    <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18a8 8 0 01-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1112 20z" />
  </svg>
);

const DeliveryIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

const RiderIcon = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="5" r="3" />
    <path d="M5 20l4-9 3 3 4-2 3 8" />
  </svg>
);

const MapPinIcon = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const AlertTriangleIcon = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════
// TARJETA DE PEDIDO
// ═══════════════════════════════════════════════════════════════════════════

// Helper para iniciales de avatar de cliente
const getIniciales = (nombre: string): string => {
  if (!nombre) return "C";
  const partes = nombre.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
};

const PedidoCard = observer(
  ({
    pedido,
    onDetalle,
    onCancelar,
    onConfirmarEntrega,
    onChat,
  }: {
    pedido: Pedido;
    onDetalle: () => void;
    /** Solicita confirmación de cancelación (modal en el padre). */
    onCancelar: () => void;
    /** Solicita confirmación del paso final →Entregado (modal en el padre). */
    onConfirmarEntrega: () => void;
    /** Abre el chat rápido (slide-over) con el cliente del pedido. */
    onChat: () => void;
  }) => {
    const urgente = pedidosStore.esUrgente(pedido);
    const siguiente = pedidosStore.siguienteEstado(pedido);
    const mins = pedidosStore.minutosEnEstado(pedido);

    const puedeAvanzar = puedeMoverA(siguiente);
    const puedeEscribir = puedeEscribirCliente();
    const puedeCancelar = puedeCancelarPedido();
    const sinAcciones = !puedeAvanzar && !puedeEscribir && !puedeCancelar;

    const handleAvanzar = () => {
      if (siguiente === "entregado") onConfirmarEntrega();
      else avanzarPedido(pedido.id);
    };

    const stop = (e: React.MouseEvent) => e.stopPropagation();

    // Determinar tag visual suave según modalidad u origen
    const tagModalidad = () => {
      if (pedido.modalidad === "domicilio") {
        return { label: "Delivery", bg: "bg-accent-50 text-accent-600 dark:bg-accent-900/30 dark:text-accent-300" };
      }
      if (pedido.modalidad === "en_sitio") {
        return { label: "En Mesa", bg: "bg-secondary-50 text-secondary-600 dark:bg-secondary-900/30 dark:text-secondary-300" };
      }
      return { label: "Pickup", bg: "bg-warning-50 text-warning-600 dark:bg-warning-900/30 dark:text-warning-300" };
    };
    const tag = tagModalidad();

    // Simular fecha amigable similar a la maqueta (ej. "Today", "Tomorrow" o fecha formateada)
    const fechaAmigable = () => {
      if (pedido.programadoPara) {
        return formatFechaHora(pedido.programadoPara);
      }
      if (mins < 60) return `Hace ${mins}m`;
      return "Hoy";
    };

    // Resumen de items para la descripción estilo maqueta
    const descripcionItems = pedidosStore.resumenItems(pedido);

    // Si el pedido tiene portada (por ejemplo, el primer pedido de preparación para replicar el preview de la imagen)
    const tieneCover = pedido.id === "pd-3" || pedido.id === "pd-f3";

    return (
      <div
        role="button"
        tabIndex={0}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", pedido.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onClick={onDetalle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onDetalle();
          }
        }}
        className={`group relative cursor-pointer rounded-2xl border bg-white p-4 sm:p-5 shadow-theme-xs transition-all duration-200 hover:shadow-theme-md hover:border-brand-300 dark:bg-gray-900/90 dark:hover:border-brand-600 ${
          urgente
            ? "border-error-300 dark:border-error-800"
            : "border-gray-100 dark:border-gray-800"
        }`}
      >
        {/* Cabecera de la tarjeta: Título + Avatar del responsable / cliente */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm sm:text-base font-semibold text-ink-title dark:text-white line-clamp-2 leading-snug">
              {pedido.items[0]?.nombre ? pedido.items[0].nombre : `Pedido ${pedido.numero}`}
            </h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 font-medium truncate">
              {pedido.numero} · {pedido.cliente}
            </p>
          </div>

          <div className="relative shrink-0">
            <div className="flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold text-xs ring-2 ring-white dark:bg-brand-900/40 dark:text-brand-300 dark:ring-gray-800 shadow-theme-xs">
              {getIniciales(pedido.cliente)}
            </div>
          </div>
        </div>

        {/* Descripción secundaria / notas */}
        {descripcionItems && (
          <p className="mt-2.5 text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
            {descripcionItems}
          </p>
        )}

        {/* Imagen de previsualización (cover banner) idéntica a la maqueta de referencia */}
        {tieneCover && (
          <div className="mt-3.5 overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
            <img
              src="/images/kanban-cover.jpg"
              alt="Preview"
              className="h-28 sm:h-32 w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        )}

        {/* Metadatos inferiores: Fecha/Tiempo, Comentarios (items), Enlaces (chat), y Tag */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-50 dark:border-gray-800/60 text-xs text-gray-400 dark:text-gray-400">
          <div className="flex items-center gap-3 font-medium">
            <div className="flex items-center gap-1.5">
              <Calendar className="size-3.5 text-gray-400" />
              <span className="text-[11px] sm:text-xs text-gray-600 dark:text-gray-300">
                {fechaAmigable()}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <MessageSquare className="size-3.5 text-gray-400" />
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                {pedido.items.length}
              </span>
            </div>

            {pedido.direccionEntrega && (
              <div className="flex items-center gap-1" title={pedido.direccionEntrega.calle}>
                <Paperclip className="size-3.5 text-gray-400" />
                <span className="text-[11px] text-gray-500 dark:text-gray-400">1</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold tracking-wide ${tag.bg}`}
            >
              {tag.label}
            </span>
          </div>
        </div>

        {/* Barra de acciones operativas (Avanzar estado / WhatsApp / Cancelar) */}
        {!sinAcciones && (
          <div className="mt-3 flex items-center justify-between gap-2 pt-2" onClick={stop}>
            <div className="flex items-center gap-2">
              {siguiente && puedeAvanzar && (
                <button
                  type="button"
                  onClick={handleAvanzar}
                  className="rounded-lg bg-brand-500 hover:bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-theme-xs transition-colors cursor-pointer"
                >
                  {pedidosStore.estadoLabel(siguiente)} →
                </button>
              )}

              {puedeEscribir && (
                <button
                  type="button"
                  onClick={onChat}
                  className="flex items-center gap-1 rounded-lg border border-success-200 bg-success-50/70 hover:bg-success-100/80 px-2.5 py-1.5 text-xs font-medium text-success-700 dark:border-success-800 dark:bg-success-950/40 dark:text-success-300 transition-colors cursor-pointer"
                >
                  <WhatsAppIcon />
                  <span>Chat</span>
                </button>
              )}
            </div>

            {puedeCancelar && (
              <button
                type="button"
                onClick={onCancelar}
                className="text-[11px] font-medium text-error-500 hover:text-error-600 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            )}
          </div>
        )}
      </div>
    );
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// DETALLE (modal)
// ═══════════════════════════════════════════════════════════════════════════

const DetalleModal = observer(
  ({
    pedido,
    onClose,
    onChat,
  }: {
    pedido: Pedido;
    onClose: () => void;
    /** Abre el chat rápido (slide-over) con el cliente del pedido. */
    onChat: () => void;
  }) => {
    const subtotal = pedidosStore.subtotalItems(pedido);
    const total = pedidosStore.totalPedido(pedido);
    const cambio = pedidosStore.cambioRequerido(pedido);
    const [repartidorInput, setRepartidorInput] = useState(pedido.repartidor ?? "");

    const queryMaps = [
      pedido.direccionEntrega?.calle,
      pedido.direccionEntrega?.barrio,
    ]
      .filter(Boolean)
      .join(", ");

    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryMaps)}`;

    return (
      <Modal isOpen onClose={onClose} className="max-w-lg p-6 sm:p-8">
        {/* Encabezado: título + estado debajo. pr-12 reserva espacio para la X. */}
        <div className="mb-5 pr-12">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-ink-title dark:text-white/90">{pedido.numero}</h2>
            <Badge color={pedidosStore.estadoBadgeColor(pedido.estado)} size="sm">
              {pedidosStore.estadoLabel(pedido.estado)}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{pedido.cliente} · {pedido.telefono}</p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Modalidad</p>
            <p className="mt-1 text-sm text-gray-800 dark:text-white/90">{pedidosStore.modalidadLabel(pedido.modalidad)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Origen</p>
            <p className="mt-1 text-sm text-gray-800 dark:text-white/90">{pedido.origen === "whatsapp" ? "WhatsApp" : "Operador"}</p>
          </div>
        </div>

        {/* Consumo en Salón / Mesa (si es en_sitio) */}
        {pedido.modalidad === "en_sitio" && (
          <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-white/[0.02]">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-800 dark:text-white/90">
              🍽️ Consumo en salón / Mesa
            </span>
            <p className="mt-1.5 text-xs text-gray-700 dark:text-gray-300">
              {pedido.notas?.match(/Mesa:?\s*[^·\n]+/i)?.[0] ?? "Servicio en salón / mesa"}
            </p>
          </div>
        )}

        {/* Logística de Entrega (Domicilio) */}
        {pedido.modalidad === "domicilio" && (
          <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-white/[0.02]">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-800 dark:text-white/90">
                <DeliveryIcon className="h-3.5 w-3.5 text-brand-500" />
                Dirección de entrega
              </span>
              {pedido.direccionEntrega?.calle && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
                >
                  <MapPinIcon className="h-3.5 w-3.5" />
                  Abrir en Google Maps
                </a>
              )}
            </div>

            {pedido.direccionEntrega ? (
              <div className="mt-2 space-y-1 text-xs text-gray-700 dark:text-gray-300">
                <p className="font-semibold text-gray-800 dark:text-white">
                  {pedido.direccionEntrega.calle}
                </p>
                {(pedido.direccionEntrega.barrio || pedido.direccionEntrega.referencia) && (
                  <p className="text-gray-500 dark:text-gray-400">
                    {[pedido.direccionEntrega.barrio, pedido.direccionEntrega.referencia].filter(Boolean).join(" · ")}
                  </p>
                )}
                {pedido.direccionEntrega.indicaciones && (
                  <p className="italic text-gray-500 dark:text-gray-400">
                    "{pedido.direccionEntrega.indicaciones}"
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-1 flex items-center gap-1 text-xs text-warning-600 dark:text-warning-400">
                <AlertTriangleIcon className="h-3.5 w-3.5 shrink-0" />
                Sin dirección registrada para este domicilio.
              </p>
            )}

            {/* Asignación de Repartidor / Courier */}
            <div className="mt-3 flex items-center justify-between border-t border-gray-200/60 pt-2.5 dark:border-gray-800">
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {pedidosStore.tieneCapacidad("carrier_shipment")
                  ? "Courier / Guía de envío:"
                  : "Repartidor asignado:"}
              </span>
              <input
                type="text"
                placeholder={
                  pedidosStore.tieneCapacidad("carrier_shipment")
                    ? "Ej: Servientrega Guía #1234"
                    : "Nombre o empresa de mensajería"
                }
                value={repartidorInput}
                onChange={(e) => {
                  setRepartidorInput(e.target.value);
                  pedidosStore.asignarRepartidor(pedido.id, e.target.value);
                }}
                className="h-7.5 w-52 rounded-lg border border-gray-200 bg-white px-2.5 text-right text-xs text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>
        )}

        {/* Items */}
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
            {pedidosStore.config.perfilComercial && BUSINESS_PROFILES[pedidosStore.config.perfilComercial]
              ? BUSINESS_PROFILES[pedidosStore.config.perfilComercial].labels.itemPlural
              : "Items"} y valores
          </p>
          {pedido.items.length === 0 ? (
            <p className="text-sm text-gray-400">Sin items detallados.</p>
          ) : (
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 dark:divide-white/5 dark:border-gray-800">
              {pedido.items.map((it, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-gray-700 dark:text-gray-300">{it.cantidad}× {it.nombre}</span>
                  {it.precio !== undefined && (
                    <span className="text-gray-500 dark:text-gray-400">${(it.precio * it.cantidad).toLocaleString()}</span>
                  )}
                </div>
              ))}

              {/* Desglose de Subtotal y Envío */}
              {pedido.modalidad === "domicilio" && (pedido.costoEnvio ?? 0) > 0 && (
                <>
                  <div className="flex items-center justify-between px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <span>Subtotal items</span>
                    <span>${subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      {pedidosStore.tieneCapacidad("carrier_shipment")
                        ? "Costo de envío / flete"
                        : "Costo de envío (delivery)"}
                    </span>
                    <span>${(pedido.costoEnvio ?? 0).toLocaleString()}</span>
                  </div>
                </>
              )}

              {total > 0 && (
                <div className="flex items-center justify-between px-3 py-2 text-sm font-semibold">
                  <span className="text-gray-800 dark:text-white/90">Total a pagar</span>
                  <span className="text-gray-800 dark:text-white/90">${total.toLocaleString()}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pago y Cambio */}
        <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Información de Pago
            </span>
            <button
              type="button"
              onClick={() => {
                pedidosStore.togglePagado(pedido.id);
              }}
              className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
            >
              {pedido.pagado ? `Marcar como ${ETIQUETA_PAGO.sinPagar.toLowerCase()}` : `Marcar como ${ETIQUETA_PAGO.pagado.toLowerCase()}`}
            </button>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-400">Método: </span>
              <span className="font-medium text-gray-700 capitalize dark:text-gray-300">
                {pedido.metodoPago ? pedido.metodoPago.replace("_", " ") : "No especificado"}
              </span>
            </div>
            <div>
              {/* «Pago», no «Estado»: el badge de estado del pedido está arriba
                  y este campo es el estado de PAGO, un eje distinto. */}
              <span className="text-gray-400">Pago: </span>
              <span className={pedido.pagado ? "font-semibold text-success-600" : "font-semibold text-warning-600"}>
                {pedido.pagado ? ETIQUETA_PAGO.pagado : ETIQUETA_PAGO.sinPagar}
              </span>
            </div>
          </div>

          {pedido.metodoPago === "efectivo" && pedido.pagaCon !== undefined && (
            <div className="mt-2 border-t border-gray-200/60 pt-2 text-xs dark:border-gray-800">
              <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                <span>Paga en efectivo con:</span>
                <span className="font-semibold text-gray-800 dark:text-white">
                  ${pedido.pagaCon.toLocaleString()}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between font-semibold text-success-600 dark:text-success-400">
                <span>Cambio / Vuelto a entregar:</span>
                <span>${cambio.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {pedido.notas && (
          <div className="mb-4">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Notas</p>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{pedido.notas}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          {puedeEscribirCliente() && (
            <Button size="sm" variant="ghost" startIcon={<WhatsAppIcon />} onClick={onChat} className="!text-[#25D366] hover:!bg-[#25D366]/10">
              WhatsApp
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onClose}>Cerrar</Button>
        </div>
      </Modal>
    );
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// MODAL: CONFIRMAR CANCELACIÓN (con motivo opcional)
// ═══════════════════════════════════════════════════════════════════════════

const inputBase =
  "w-full rounded-lg border bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:text-white/90 dark:placeholder:text-white/30";
const inputOk = "border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700";

const CancelarModal = observer(
  ({ pedido, onClose }: { pedido: Pedido; onClose: () => void }) => {
    const [motivo, setMotivo] = useState("");

    const confirmar = () => {
      // Defensa en profundidad: el modal solo se abre desde `abrirCancelar`
      // (que ya comprueba `orders.cancel`), pero la mutación lo re-comprueba.
      if (!puedeCancelarPedido()) return;
      const notaMotivo = motivo.trim();
      if (notaMotivo) {
        // El motivo es opcional; si se indica, se anexa a las notas del pedido.
        pedido.notas = pedido.notas
          ? `${pedido.notas}\nCancelado: ${notaMotivo}`
          : `Cancelado: ${notaMotivo}`;
      }
      // `cancelarPedido` publica además la plantilla de cancelación en el hilo.
      cancelarPedido(pedido.id);
      onClose();
    };

    return (
      <Modal isOpen onClose={onClose} className="max-w-sm p-6">
        <div className="mb-4 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error-50 text-error-500 dark:bg-error-500/10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L14.7 3.9a2 2 0 00-3.4 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-ink-title dark:text-white/90">Cancelar {pedido.numero}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Esta acción es irreversible. El pedido pasará a <strong>Cancelado</strong>.
            </p>
          </div>
        </div>

        <div className="mb-5">
          <label htmlFor="motivo-cancel" className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300">
            Motivo (opcional)
          </label>
          <textarea
            id="motivo-cancel"
            rows={2}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej: cliente no respondió, sin stock..."
            className={`${inputBase} ${inputOk}`}
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button size="sm" variant="outline" onClick={onClose}>Volver</Button>
          <Button size="sm" variant="destructive" onClick={confirmar}>Cancelar pedido</Button>
        </div>
      </Modal>
    );
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// MODAL: CONFIRMAR ENTREGA (paso final, irreversible)
// ═══════════════════════════════════════════════════════════════════════════

const EntregaModal = observer(
  ({ pedido, onClose }: { pedido: Pedido; onClose: () => void }) => {
    const confirmar = () => {
      // Entregar es el último paso de preparación: `preparation.manage`.
      if (!puedeMoverA("entregado")) return;
      // Envoltorio: además publica la plantilla de "entregado" en el hilo.
      avanzarPedido(pedido.id);
      onClose();
    };
    return (
      <Modal isOpen onClose={onClose} className="max-w-sm p-6">
        <div className="mb-5 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-50 text-success-500 dark:bg-success-500/10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-ink-title dark:text-white/90">Marcar como entregado</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {pedido.numero} · {pedido.cliente}. Al entregar, el pedido sale del tablero y pasa al historial.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3">
          <Button size="sm" variant="outline" onClick={onClose}>Volver</Button>
          <Button size="sm" onClick={confirmar}>Confirmar entrega</Button>
        </div>
      </Modal>
    );
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// SECCIÓN: PEDIDOS PROGRAMADOS (arriba del kanban)
// ═══════════════════════════════════════════════════════════════════════════

/** Cuántos programados mostrar en el tablero antes de "Ver todos". */
const PROGRAMADOS_VISIBLES = 3;

interface ProgramadoCardProps {
  pedido: Pedido;
  onCancelar: (p: Pedido) => void;
  onReprogramar: (p: Pedido) => void;
  /** Abre el detalle del pedido (click en el cuerpo). Opcional. */
  onDetalle?: (id: string) => void;
  focusId?: string | null;
}

/** Tarjeta de un pedido programado (reutilizada en el tablero y en el modal). */
const ProgramadoCard = observer(({ pedido: p, onCancelar, onReprogramar, onDetalle, focusId }: ProgramadoCardProps) => {
  const clickable = !!onDetalle;
  // Evita que los botones de acción abran el detalle.
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  // Activar y reprogramar son la MISMA capacidad (`scheduled.manage`): ambas
  // alteran cuándo entra el pedido al pipeline. Cancelar es otra cosa
  // (`orders.cancel`) y se gobierna aparte.
  const puedeGestionar = puedeGestionarProgramados();
  const puedeCancelar = puedeCancelarPedido();
  const sinAcciones = !puedeGestionar && !puedeCancelar;

  return (
    <div
      id={`programado-${p.id}`}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? () => onDetalle!(p.id) : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onDetalle!(p.id);
              }
            }
          : undefined
      }
      className={
        "flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors " +
        (clickable ? "cursor-pointer hover:border-brand-300 dark:hover:border-brand-700 " : "") +
        (focusId === p.id
          ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/30 dark:border-brand-500 dark:bg-brand-500/10"
          : "border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]")
      }
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-gray-800 dark:text-white/90">{p.numero}</p>
          <Badge color="light" size="xs">{pedidosStore.modalidadLabel(p.modalidad)}</Badge>
        </div>
        <p className="truncate text-xs text-gray-600 dark:text-gray-300">{p.cliente}</p>
        {p.programadoPara && (
          <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatFechaHora(p.programadoPara)}
          </p>
        )}
      </div>
      {/* Acciones: no propagan el click al cuerpo */}
      {!sinAcciones && (
        <div className="flex shrink-0 flex-col items-end gap-1.5" onClick={stop}>
          {puedeGestionar && <Button size="sm" onClick={() => pedidosStore.activarAhora(p.id)}>Activar ahora</Button>}
          <div className="flex items-center gap-2">
            {puedeGestionar && (
              <button
                type="button"
                onClick={() => onReprogramar(p)}
                className="text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
              >
                Reprogramar
              </button>
            )}
            {puedeGestionar && puedeCancelar && <span className="text-gray-300 dark:text-gray-700">·</span>}
            {puedeCancelar && (
              <button
                type="button"
                onClick={() => onCancelar(p)}
                className="text-xs font-medium text-error-500 hover:text-error-600 dark:text-error-400"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// SECCIÓN: PEDIDOS PROGRAMADOS (arriba del kanban)
// ═══════════════════════════════════════════════════════════════════════════

const ProgramadosSection = observer(
  ({
    onCancelar,
    onReprogramar,
    onVerTodos,
    onDetalle,
    focusId,
  }: {
    onCancelar: (p: Pedido) => void;
    onReprogramar: (p: Pedido) => void;
    /** Abre el modal con la lista completa y filtro. */
    onVerTodos: () => void;
    /** Abre el detalle de un pedido (click en el cuerpo de la tarjeta). */
    onDetalle: (id: string) => void;
    /** Id del pedido a resaltar temporalmente (llegada desde ?focus=). */
    focusId?: string | null;
  }) => {
    const programados = pedidosStore.programados; // ya ordenados por hora (más próximos primero)
    if (programados.length === 0) return null;

    // Solo los más cercanos: refuerza la urgencia y evita un grid sin límite.
    const visibles = programados.slice(0, PROGRAMADOS_VISIBLES);
    const restantes = programados.length - visibles.length;

    return (
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-sm font-semibold text-ink-title dark:text-white/90">Próximos programados</h2>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              {programados.length}
            </span>
          </div>
          {restantes > 0 && (
            <button
              type="button"
              onClick={onVerTodos}
              className="text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
            >
              Ver todos ({programados.length})
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibles.map((p) => (
            <ProgramadoCard
              key={p.id}
              pedido={p}
              onCancelar={onCancelar}
              onReprogramar={onReprogramar}
              onDetalle={onDetalle}
              focusId={focusId}
            />
          ))}
        </div>

        {restantes > 0 && (
          <button
            type="button"
            onClick={onVerTodos}
            className="mt-3 w-full rounded-xl border border-dashed border-gray-200 py-2.5 text-center text-xs font-medium text-gray-500 transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-gray-800 dark:text-gray-400 dark:hover:border-brand-700"
          >
            + {restantes} pedido{restantes === 1 ? "" : "s"} programado{restantes === 1 ? "" : "s"} más
          </button>
        )}
      </div>
    );
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// MODAL: TODOS LOS PEDIDOS PROGRAMADOS (lista completa + filtro)
// ═══════════════════════════════════════════════════════════════════════════

const FILTRO_MOD_TODAS = "__todas__";

const ProgramadosModal = observer(
  ({
    onClose,
    onCancelar,
    onReprogramar,
    onDetalle,
  }: {
    onClose: () => void;
    onCancelar: (p: Pedido) => void;
    onReprogramar: (p: Pedido) => void;
    onDetalle: (id: string) => void;
  }) => {
    const [busqueda, setBusqueda] = useState("");
    const [modalidad, setModalidad] = useState<Modalidad | typeof FILTRO_MOD_TODAS>(FILTRO_MOD_TODAS);

    const q = busqueda.trim().toLowerCase();
    const lista = pedidosStore.programados.filter((p) => {
      if (modalidad !== FILTRO_MOD_TODAS && p.modalidad !== modalidad) return false;
      if (q && !(p.cliente.toLowerCase().includes(q) || p.numero.toLowerCase().includes(q))) return false;
      return true;
    });

    // Modalidades presentes entre los programados (para el filtro).
    const modalidadesPresentes = Array.from(new Set(pedidosStore.programados.map((p) => p.modalidad)));

    return (
      <Modal isOpen onClose={onClose} className="max-w-3xl p-6 sm:p-8">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-ink-title dark:text-white/90">Pedidos programados</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {pedidosStore.programados.length} en total · ordenados por proximidad
          </p>
        </div>

        {/* Filtros */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por número o cliente…"
              className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <FiltroChip label="Todas" activo={modalidad === FILTRO_MOD_TODAS} onClick={() => setModalidad(FILTRO_MOD_TODAS)} />
            {modalidadesPresentes.map((m) => (
              <FiltroChip
                key={m}
                label={pedidosStore.modalidadLabel(m)}
                activo={modalidad === m}
                onClick={() => setModalidad(m)}
              />
            ))}
          </div>
        </div>

        {/* Lista */}
        {lista.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-400 dark:border-gray-800">
            No hay pedidos programados que coincidan con el filtro.
          </p>
        ) : (
          <div className="grid max-h-[60vh] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
            {lista.map((p) => (
              <ProgramadoCard key={p.id} pedido={p} onCancelar={onCancelar} onReprogramar={onReprogramar} onDetalle={onDetalle} />
            ))}
          </div>
        )}
      </Modal>
    );
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// VISTA LISTA (tabla) — misma data y acciones que el kanban
// ═══════════════════════════════════════════════════════════════════════════

/** Menú de acciones por fila (patrón DropdownTable): 3 puntos → acciones. */
const AccionesMenu = observer(
  ({
    pedido,
    onAvanzar,
    onCancelar,
    onChat,
  }: {
    pedido: Pedido;
    onAvanzar: (p: Pedido) => void;
    onCancelar: (id: string) => void;
    /** Abre el chat rápido (slide-over) con el cliente del pedido. */
    onChat: (id: string) => void;
  }) => {
    const [open, setOpen] = useState(false);
    const siguiente = pedidosStore.siguienteEstado(pedido);

    // Mismas reglas que el kanban: avance por capacidad del destino, WhatsApp
    // por `channels.read`, cancelar por `orders.cancel`.
    const puedeAvanzar = puedeMoverA(siguiente);
    const puedeEscribir = puedeEscribirCliente();
    const puedeCancelar = puedeCancelarPedido();
    const sinAcciones = !puedeAvanzar && !puedeEscribir && !puedeCancelar;

    // Cierra el menú al hacer click fuera.
    useEffect(() => {
      if (!open) return;
      const close = () => setOpen(false);
      document.addEventListener("click", close);
      return () => document.removeEventListener("click", close);
    }, [open]);

    const run = (fn: () => void) => (e: React.MouseEvent) => {
      e.stopPropagation();
      setOpen(false);
      fn();
    };

    // Sin acciones disponibles no se dibuja el menú (evita un botón que abre
    // un desplegable vacío).
    if (sinAcciones) return null;

    return (
      <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          aria-label="Acciones"
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <circle cx="5" cy="5" r="1.6" /><circle cx="12" cy="5" r="1.6" /><circle cx="19" cy="5" r="1.6" />
            <circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" />
            <circle cx="5" cy="19" r="1.6" /><circle cx="12" cy="19" r="1.6" /><circle cx="19" cy="19" r="1.6" />
          </svg>
        </button>

        {open && (
          <div className="absolute right-0 z-40 mt-1 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
            {siguiente && puedeAvanzar && (
              <button
                type="button"
                onClick={run(() => onAvanzar(pedido))}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-600 dark:text-gray-200 dark:hover:bg-brand-500/10"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 7l5 5-5 5" /></svg>
                Avanzar a "{pedidosStore.estadoLabel(siguiente)}"
              </button>
            )}
            {puedeEscribir && (
              <button
                type="button"
                onClick={run(() => onChat(pedido.id))}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#25D366] hover:bg-[#25D366]/10"
              >
                <WhatsAppIcon />
                Abrir WhatsApp
              </button>
            )}
            {puedeCancelar && (
              <>
                <div className="my-1 border-t border-gray-100 dark:border-white/5" />
                <button
                  type="button"
                  onClick={run(() => onCancelar(pedido.id))}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  Cancelar pedido
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  },
);

const ListaView = observer(
  ({
    pedidos,
    onDetalle,
    onCancelar,
    onConfirmarEntrega,
    onChat,
  }: {
    pedidos: Pedido[];
    onDetalle: (id: string) => void;
    onCancelar: (id: string) => void;
    onConfirmarEntrega: (id: string) => void;
    /** Abre el chat rápido (slide-over) con el cliente del pedido. */
    onChat: (id: string) => void;
  }) => {
    if (pedidos.length === 0) {
      return (
        <div className="animate-aparecer rounded-2xl border border-dashed border-gray-200 py-16 text-center text-sm text-gray-400 dark:border-gray-800">
          No hay pedidos en curso.
        </div>
      );
    }

    const handleAvanzar = (p: Pedido) => {
      if (pedidosStore.siguienteEstado(p) === "entregado") onConfirmarEntrega(p.id);
      else avanzarPedido(p.id);
    };

    return (
      // La clase de entrada va aquí y no se recibe por prop: `ListaView` solo existe
      // en la rama `lista`, así que se monta exactamente al conmutar de vista y el
      // fundido se dispara justo cuando debe. Añadir una prop `className` para esto
      // sería ceremonia sin lector.
      <div className="animate-aparecer overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell header>Pedido</TableCell>
                <TableCell header>Estado</TableCell>
                <TableCell header>Modalidad</TableCell>
                <TableCell header>En estado</TableCell>
                <TableCell header className="text-right">Acciones</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidos.map((p, i) => {
                const urgente = pedidosStore.esUrgente(p);
                return (
                  // Fila entera clicable → abre el detalle (patrón DropdownTable).
                  <TableRow
                    key={p.id}
                    onClick={() => onDetalle(p.id)}
                    style={{ animationDelay: retardoEscalonado(i) }}
                    className="animate-entrada-lista cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                  >
                    <TableCell>
                      <span className="block font-semibold text-gray-800 dark:text-white/90">{p.numero}</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">{p.cliente}</span>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge color={pedidosStore.estadoBadgeColor(p.estado)} size="sm">
                          {pedidosStore.estadoLabel(p.estado)}
                        </Badge>
                        {urgente && <Badge color="error" size="xs">Urgente</Badge>}
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="text-sm text-gray-600 dark:text-gray-300">{pedidosStore.modalidadLabel(p.modalidad)}</span>
                    </TableCell>

                    <TableCell>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{pedidosStore.minutosEnEstado(p)} min</span>
                    </TableCell>

                    {/* Acciones agrupadas en menú de 3 puntos */}
                    <TableCell className="text-right">
                      <AccionesMenu pedido={p} onAvanzar={handleAvanzar} onCancelar={onCancelar} onChat={onChat} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// TOGGLE DE VISTA (Kanban / Lista)
// ═══════════════════════════════════════════════════════════════════════════

const VistaToggle = ({ vista, onChange }: { vista: VistaTablero; onChange: (v: VistaTablero) => void }) => {
  const opciones: { id: VistaTablero; label: string; icon: React.ReactNode }[] = [
    {
      id: "kanban",
      label: "Kanban",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h5v14H4zM15 5h5v9h-5z" />
        </svg>
      ),
    },
    {
      id: "lista",
      label: "Lista",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      ),
    },
  ];
  return (
    <div className="inline-flex h-10 items-center rounded-xl border border-gray-200/90 bg-gray-50/80 p-1 dark:border-gray-800 dark:bg-gray-800/50 shrink-0">
      {opciones.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={
            "flex h-full items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors cursor-pointer select-none whitespace-nowrap " +
            (vista === o.id
              ? "bg-white text-gray-900 shadow-theme-xs dark:bg-gray-900 dark:text-white"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400")
          }
          aria-pressed={vista === o.id}
        >
          {o.icon}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * TableroPage — kanban del flujo de pedidos. Cada columna es un estado activo
 * del pipeline (según la config). Las tarjetas avanzan por el pipeline con el
 * botón "siguiente estado", se cancelan, se abren en detalle o disparan
 * WhatsApp del cliente. Filtro por modalidad en el encabezado.
 *
 * **Autorización (Fase 2).** Entrar aquí solo exige `orders.read`. Cada acción
 * de dentro se gobierna por su propia capacidad:
 *
 *   | Acción                          | Capacidad            |
 *   |---------------------------------|----------------------|
 *   | Avanzar a `confirmado`          | `orders.confirm`     |
 *   | Avanzar a preparación/entrega   | `preparation.manage` |
 *   | Cancelar un pedido              | `orders.cancel`      |
 *   | Abrir WhatsApp del cliente      | `channels.read`      |
 *   | Ver la sección de programados   | `scheduled.read`     |
 *   | Activar / reprogramar           | `scheduled.manage`   |
 *
 * Consecuencia buscada (C5): un rol de Preparación ve el tablero y mueve el
 * pedido por preparación y entrega, pero no puede confirmarlo ni cancelarlo, y
 * no ve el botón de WhatsApp.
 */
export const TableroPage = observer(() => {
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [cancelarId, setCancelarId] = useState<string | null>(null);
  const [entregaId, setEntregaId] = useState<string | null>(null);
  const [reprogramarId, setReprogramarId] = useState<string | null>(null);
  const [verTodosProgramados, setVerTodosProgramados] = useState(false);
  type CriterioOrden = "reciente" | "antiguo" | "monto" | "urgente";
  const [criterioOrden, setCriterioOrden] = useState<CriterioOrden>("reciente");
  const [menuFilterOpen, setMenuFilterOpen] = useState(false);
  const [busquedaExpandida, setBusquedaExpandida] = useState(false);
  const busquedaActiva = busquedaExpandida || busquedaTablero.length > 0;

  // Gestión dinámica de columnas
  const [menuColumnaId, setMenuColumnaId] = useState<string | null>(null);
  const [modalNuevaColumna, setModalNuevaColumna] = useState(false);
  const [nuevoNombreColumna, setNuevoNombreColumna] = useState("");
  const [modalRenombrar, setModalRenombrar] = useState<{ id: string; label: string } | null>(null);
  const [nuevoLabelEdit, setNuevoLabelEdit] = useState("");

  const [focusId, setFocusId] = useState<string | null>(null);
  const [vista, setVista] = useState<VistaTablero>(loadVista);
  // Chat rápido (slide-over). Guarda el ID del pedido, no el teléfono: así el
  // drawer resuelve el hilo con el resolutor canónico del store y no se duplica
  // la regla de normalización de teléfono en el call site.
  const [chatDrawerPedidoId, setChatDrawerPedidoId] = useState<string | null>(null);

  const cambiarVista = (v: VistaTablero) => {
    setVista(v);
    saveVista(v);
  };

  const [searchParams, setSearchParams] = useSearchParams();

  // Activación automática de programados, carga de pedidos desde Supabase y suscripción en tiempo real.
  useEffect(() => {
    pedidosStore.iniciarTick();
    void pedidosStore.cargarDesdeBase();
    const unsub = pedidosStore.suscribirRealtime();
    return () => {
      pedidosStore.detenerTick();
      unsub();
    };
  }, []);

  // Enfoque de un pedido programado al llegar con ?focus=<id> (desde el modal
  // de programación). Hace scroll a la tarjeta, la resalta y limpia la URL.
  // También soporta ?detalle=<id> (abre el detalle) y ?estado=<estado> (vista
  // Lista filtrada) para llegar desde el dashboard justo a lo señalado.
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    let cambiar = false;

    // ?detalle=<id> → abre el modal de detalle de ese pedido.
    const det = searchParams.get("detalle");
    if (det && pedidosStore.getPedido(det)) {
      setDetalleId(det);
      next.delete("detalle");
      cambiar = true;
    }

    // ?estado=<estado> → fuerza vista Lista (los estados se ven mejor en lista).
    const est = searchParams.get("estado");
    if (est) {
      setVista("lista");
      next.delete("estado");
      cambiar = true;
    }

    // ?focus=<id> → resalta un programado y hace scroll.
    const target = searchParams.get("focus");
    let scrollTimer: ReturnType<typeof setTimeout> | undefined;
    let clearTimer: ReturnType<typeof setTimeout> | undefined;
    if (target && pedidosStore.getPedido(target)) {
      setFocusId(target);
      next.delete("focus");
      cambiar = true;
      scrollTimer = setTimeout(() => {
        document.getElementById(`programado-${target}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 60);
      clearTimer = setTimeout(() => setFocusId(null), 2600);
    }

    if (cambiar) setSearchParams(next, { replace: true });
    return () => {
      if (scrollTimer) clearTimeout(scrollTimer);
      if (clearTimer) clearTimeout(clearTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columnas = pedidosStore.columnasTablero;
  const detalle = detalleId ? pedidosStore.getPedido(detalleId) ?? null : null;
  const paraCancelar = cancelarId ? pedidosStore.getPedido(cancelarId) ?? null : null;
  const paraEntrega = entregaId ? pedidosStore.getPedido(entregaId) ?? null : null;
  const paraReprogramar = reprogramarId ? pedidosStore.getPedido(reprogramarId) ?? null : null;

  const pedidosDeColumna = (estado: PedidoEstado): Pedido[] => {
    let list = pedidosStore.porEstado(estado);
    const q = busquedaTablero.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const clienteMatch = p.cliente?.toLowerCase().includes(q);
        const numeroMatch = p.numero?.toLowerCase().includes(q);
        const itemsMatch = p.items?.some((it) => it.nombre.toLowerCase().includes(q));
        return clienteMatch || numeroMatch || itemsMatch;
      });
    }
    if (criterioOrden === "reciente") {
      list = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } else if (criterioOrden === "antiguo") {
      list = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    } else if (criterioOrden === "monto") {
      list = [...list].sort((a, b) => pedidosStore.totalPedido(b) - pedidosStore.totalPedido(a));
    } else if (criterioOrden === "urgente") {
      list = [...list].sort((a, b) => (pedidosStore.esUrgente(b) ? 1 : 0) - (pedidosStore.esUrgente(a) ? 1 : 0));
    }
    return list;
  };

  // ── Apertura de modales, gobernada por capacidad ─────────────────────────
  //
  // Embudo único: aunque algún camino de UI se saltara el ocultado del botón,
  // el modal no se abre sin la capacidad correspondiente. Las tarjetas ya
  // ocultan sus acciones; esto es la segunda línea (defensa en profundidad,
  // coherente con C5: entrar a la sección no habilita operar).
  const abrirCancelar = (id: string) => {
    if (puedeCancelarPedido()) setCancelarId(id);
  };
  const abrirEntrega = (id: string) => {
    if (puedeMoverA("entregado")) setEntregaId(id);
  };
  const abrirReprogramar = (id: string) => {
    if (puedeGestionarProgramados()) setReprogramarId(id);
  };

  // Ver programados es una capacidad propia (`scheduled.read`): un rol de
  // Preparación la tiene, pero uno personalizado sin ella no debe ver la
  // sección ni poder abrir su modal.
  const verProgramados = puedeVerProgramados();

  const navigate = useNavigate();

  // Estados filtrados según la pestaña activa superior ("All Tasks", o columna específica)
  const [columnaFiltroActiva, setColumnaFiltroActiva] = useState<string>("all");

  const totalTareasGlobal = pedidosStore.totalEnCurso;

  // Filtrado de columnas visibles según la pestaña seleccionada
  const columnasVisibles = columnas.filter((estado) => {
    if (columnaFiltroActiva === "all") return true;
    return estado === columnaFiltroActiva;
  });

  return (
    <>
      <PageMeta title="Tablero de pedidos" description="Flujo de pedidos en vivo, de nuevo a entregado" />

      {/* ── BARRA SUPERIOR DE FILTROS Y ACCIONES (Idéntica a la Maqueta) ── */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between min-w-0">
        {/* Pestañas / Pills agrupadas con contador en badge suave */}
        <div className="flex items-center gap-1.5 overflow-x-auto rounded-2xl bg-gray-50 dark:bg-gray-800/40 p-1.5 border border-gray-200/70 dark:border-gray-800/60 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-w-0">
          <button
            type="button"
            onClick={() => setColumnaFiltroActiva("all")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer select-none whitespace-nowrap shrink-0 ${
              columnaFiltroActiva === "all"
                ? "bg-white text-gray-900 shadow-theme-xs dark:bg-gray-900 dark:text-white"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            <span className="whitespace-nowrap">All Tasks</span>
            <span
              className={`flex size-5.5 items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                columnaFiltroActiva === "all"
                  ? "bg-secondary-50 text-secondary-600 dark:bg-secondary-950 dark:text-secondary-400"
                  : "bg-gray-200/80 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              {totalTareasGlobal}
            </span>
          </button>

          {columnas.map((estado) => {
            const count = pedidosDeColumna(estado).length;
            const activa = columnaFiltroActiva === estado;
            return (
              <button
                key={estado}
                type="button"
                onClick={() => setColumnaFiltroActiva(activa ? "all" : estado)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer select-none ${
                  activa
                    ? "bg-white text-gray-900 shadow-theme-xs dark:bg-gray-900 dark:text-white font-semibold"
                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                <span className="whitespace-nowrap">{pedidosStore.estadoLabel(estado)}</span>
                <span
                  className={`flex size-5.5 items-center justify-center rounded-full text-xs font-semibold shrink-0 ${
                    activa
                      ? "bg-secondary-50 text-secondary-600 dark:bg-secondary-950 dark:text-secondary-400 font-bold"
                      : "bg-gray-200/80 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Acciones derechas: Buscador + VistaToggle + Filter & Sort + Add New Task */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-end lg:self-auto">
          {/* Buscador de Tarjetas desplegable (icono -> input) */}
          <div className="relative flex items-center">
            {!busquedaActiva ? (
              <button
                type="button"
                onClick={() => setBusquedaExpandida(true)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200/90 bg-white text-gray-600 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                title="Buscar tarjetas"
              >
                <Search className="size-4" />
              </button>
            ) : (
              <div className="relative flex items-center animate-aparecer">
                <Search className="absolute left-3 size-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  value={busquedaTablero}
                  onChange={(e) => setBusquedaTablero(e.target.value)}
                  onBlur={() => {
                    if (!busquedaTablero.trim()) setBusquedaExpandida(false);
                  }}
                  placeholder="Buscar cliente, # pedido..."
                  className="h-10 w-48 sm:w-60 rounded-xl border border-gray-200/90 bg-white pl-9 pr-8 text-xs text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500 transition-all shadow-theme-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    setBusquedaTablero("");
                    setBusquedaExpandida(false);
                  }}
                  className="absolute right-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Selector de vista: Kanban / Lista */}
          <VistaToggle vista={vista} onChange={cambiarVista} />

          {/* Botón y menú Filter & Sort */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuFilterOpen((v) => !v)}
              className="flex h-10 items-center gap-2 rounded-xl border border-gray-200/90 bg-white px-3.5 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              <SlidersHorizontal className="size-4 text-gray-600 dark:text-gray-300 shrink-0" />
              <span>Filter & Sort</span>
            </button>

            {menuFilterOpen && (
              <div
                className="absolute right-0 top-full mt-2 z-50 w-52 rounded-2xl border border-gray-100 bg-white p-2 shadow-theme-xl dark:border-gray-800 dark:bg-gray-900"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="px-3 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Ordenar por</p>
                {[
                  { id: "reciente", label: "Más reciente" },
                  { id: "antiguo", label: "Más antiguo" },
                  { id: "monto", label: "Mayor importe" },
                  { id: "urgente", label: "Urgentes primero" },
                ].map((op) => (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => {
                      setCriterioOrden(op.id as CriterioOrden);
                      setMenuFilterOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                      criterioOrden === op.id
                        ? "bg-secondary-50 text-secondary-600 dark:bg-secondary-950/60 dark:text-secondary-400 font-semibold"
                        : "text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                    }`}
                  >
                    <span>{op.label}</span>
                    {criterioOrden === op.id && <Check className="size-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Botón primario: Add New Task + */}
          <button
            type="button"
            onClick={() => navigate("/pedidos/crear")}
            className="flex h-10 items-center gap-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 px-4 text-xs sm:text-sm font-semibold text-white shadow-theme-xs transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>Add New Task</span>
            <Plus className="size-4 stroke-[2.5] shrink-0" />
          </button>
        </div>
      </div>

      {/* Pedidos programados (arriba del kanban, no como columna del pipeline) */}
      {verProgramados && (
        <ProgramadosSection
          focusId={focusId}
          onCancelar={(p) => abrirCancelar(p.id)}
          onReprogramar={(p) => abrirReprogramar(p.id)}
          onVerTodos={() => setVerTodosProgramados(true)}
          onDetalle={(id) => setDetalleId(id)}
        />
      )}

      {/* Tablero — vista Kanban o Lista */}
      {vista === "kanban" ? (
        <div
          className={`animate-aparecer flex-1 min-h-0 h-full overflow-x-auto grid grid-cols-1 gap-6 md:grid-cols-2 ${
            columnasVisibles.length === 1
              ? "xl:grid-cols-1 max-w-xl mx-auto"
              : columnasVisibles.length === 2
              ? "xl:grid-cols-2"
              : columnasVisibles.length === 3
              ? "xl:grid-cols-3"
              : columnasVisibles.length === 4
              ? "xl:grid-cols-4"
              : "xl:grid-cols-5"
          }`}
        >
          {columnasVisibles.map((estado, colIndex) => {
            const items = pedidosDeColumna(estado);
            return (
              <div
                key={estado}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain");
                  if (id) {
                    pedidosStore.moverAColumna(id, estado);
                  }
                }}
                className="flex flex-col h-full max-h-full min-h-0 rounded-3xl bg-gray-50/90 dark:bg-white/[0.02] border border-gray-100/80 dark:border-gray-800/60 p-3 sm:p-4 transition-colors overflow-hidden"
              >
                {/* Cabecera de la columna con nombre, contador suave y botón de tres puntos ... */}
                <div className="shrink-0 mb-3 flex items-center justify-between px-1.5 pt-1 relative">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-sm sm:text-base font-bold text-ink-title dark:text-white">
                      {pedidosStore.estadoLabel(estado)}
                    </h2>
                    <span className="flex size-6 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-700 shadow-theme-xs border border-gray-100 dark:border-gray-700/80 dark:bg-gray-800 dark:text-gray-200">
                      {items.length}
                    </span>
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuColumnaId(menuColumnaId === estado ? null : estado);
                      }}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                      aria-label={`Opciones de columna ${pedidosStore.estadoLabel(estado)}`}
                    >
                      <MoreHorizontal className="size-4" />
                    </button>

                    {menuColumnaId === estado && (
                      <div
                        className="absolute right-0 top-full mt-1 z-40 w-48 overflow-hidden rounded-2xl border border-gray-100 bg-white py-1.5 shadow-theme-xl dark:border-gray-800 dark:bg-gray-900"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setMenuColumnaId(null);
                            setNuevoLabelEdit(pedidosStore.estadoLabel(estado));
                            setModalRenombrar({ id: estado, label: pedidosStore.estadoLabel(estado) });
                          }}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800 cursor-pointer"
                        >
                          <Edit3 className="size-3.5 text-gray-400" />
                          <span>Renombrar</span>
                        </button>

                        {colIndex > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newCols = [...columnas];
                              const temp = newCols[colIndex - 1];
                              newCols[colIndex - 1] = newCols[colIndex];
                              newCols[colIndex] = temp;
                              pedidosStore.reordenarColumnas(newCols);
                              setMenuColumnaId(null);
                            }}
                            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800 cursor-pointer"
                          >
                            <ArrowLeft className="size-3.5 text-gray-400" />
                            <span>Mover a la izquierda</span>
                          </button>
                        )}

                        {colIndex < columnas.length - 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newCols = [...columnas];
                              const temp = newCols[colIndex + 1];
                              newCols[colIndex + 1] = newCols[colIndex];
                              newCols[colIndex] = temp;
                              pedidosStore.reordenarColumnas(newCols);
                              setMenuColumnaId(null);
                            }}
                            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800 cursor-pointer"
                          >
                            <ArrowRight className="size-3.5 text-gray-400" />
                            <span>Mover a la derecha</span>
                          </button>
                        )}

                        <div className="my-1 border-t border-gray-100 dark:border-gray-800" />

                        <button
                          type="button"
                          onClick={() => {
                            setMenuColumnaId(null);
                            pedidosStore.eliminarColumna(estado);
                          }}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-950/40 cursor-pointer"
                        >
                          <Trash2 className="size-3.5 text-error-500" />
                          <span>Eliminar columna</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Lista de tarjetas Kanban con scroll interno independiente */}
                <div className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-3.5 [scrollbar-width:thin]">
                  {items.map((p, i) => (
                    <div
                      key={p.id}
                      className="animate-entrada-lista"
                      style={{ animationDelay: retardoEscalonado(i) }}
                    >
                      <PedidoCard
                        pedido={p}
                        onDetalle={() => setDetalleId(p.id)}
                        onCancelar={() => abrirCancelar(p.id)}
                        onConfirmarEntrega={() => abrirEntrega(p.id)}
                        onChat={() => setChatDrawerPedidoId(p.id)}
                      />
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200/80 py-12 text-center text-xs font-medium text-gray-400 dark:border-gray-800/80">
                      Sin pedidos
                    </div>
                  )}
                </div>
              </div>
            );
          })}

        </div>
      ) : (
        <ListaView
          pedidos={columnas.flatMap((estado) => pedidosDeColumna(estado))}
          onDetalle={(id) => setDetalleId(id)}
          onCancelar={abrirCancelar}
          onConfirmarEntrega={abrirEntrega}
          onChat={(id) => setChatDrawerPedidoId(id)}
        />
      )}

      {detalle && (
        <DetalleModal
          pedido={detalle}
          onClose={() => setDetalleId(null)}
          onChat={() => {
            // Cierra el detalle para que el drawer quede como única superficie
            // modal visible (evita dos capas compitiendo por el foco).
            setDetalleId(null);
            setChatDrawerPedidoId(detalle.id);
          }}
        />
      )}
      {verTodosProgramados && verProgramados && (
        <ProgramadosModal
          onClose={() => setVerTodosProgramados(false)}
          onCancelar={(p) => abrirCancelar(p.id)}
          onReprogramar={(p) => abrirReprogramar(p.id)}
          onDetalle={(id) => {
            // Cierra este modal para que el detalle quede visible.
            setVerTodosProgramados(false);
            setDetalleId(id);
          }}
        />
      )}
      {paraCancelar && <CancelarModal pedido={paraCancelar} onClose={() => setCancelarId(null)} />}
      {paraEntrega && <EntregaModal pedido={paraEntrega} onClose={() => setEntregaId(null)} />}
      {paraReprogramar && (
        <ProgramarModal
          valorInicial={paraReprogramar.programadoPara ? new Date(paraReprogramar.programadoPara) : null}
          onClose={() => setReprogramarId(null)}
          onConfirmar={(iso) => {
            // Reprogramar exige `scheduled.manage` (el modal solo se abre desde
            // `abrirReprogramar`; esto es la re-comprobación de la mutación).
            if (!puedeGestionarProgramados()) return;
            pedidosStore.reprogramar(paraReprogramar.id, iso);
            setReprogramarId(null);
          }}
          onVerPedido={(id) => {
            // Ya estamos en el tablero: cierra el modal y enfoca la tarjeta.
            setReprogramarId(null);
            setFocusId(id);
            setTimeout(() => {
              document.getElementById(`programado-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 60);
            setTimeout(() => setFocusId(null), 2600);
          }}
        />
      )}

      {/* Modal Crear Columna */}
      {modalNuevaColumna && (
        <Modal isOpen onClose={() => setModalNuevaColumna(false)} className="max-w-md p-6">
          <h3 className="text-lg font-bold text-ink-title dark:text-white">Nueva Columna</h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Define un nuevo estado para organizar el flujo de trabajo en el tablero.
          </p>
          <div className="mt-4">
            <input
              type="text"
              autoFocus
              value={nuevoNombreColumna}
              onChange={(e) => setNuevoNombreColumna(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && nuevoNombreColumna.trim()) {
                  pedidosStore.agregarColumna(nuevoNombreColumna.trim());
                  setModalNuevaColumna(false);
                }
              }}
              placeholder="Ej: En Control de Calidad, Empacando..."
              className="h-10 w-full rounded-xl border border-gray-300 bg-transparent px-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-secondary-500 focus:ring-2 focus:ring-secondary-500/20 dark:border-gray-700 dark:text-white"
            />
          </div>
          <div className="mt-5 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setModalNuevaColumna(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!nuevoNombreColumna.trim()}
              onClick={() => {
                if (nuevoNombreColumna.trim()) {
                  pedidosStore.agregarColumna(nuevoNombreColumna.trim());
                  setModalNuevaColumna(false);
                }
              }}
              className="rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white shadow-theme-xs transition-colors cursor-pointer"
            >
              Crear columna
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Renombrar Columna */}
      {modalRenombrar && (
        <Modal isOpen onClose={() => setModalRenombrar(null)} className="max-w-md p-6">
          <h3 className="text-lg font-bold text-ink-title dark:text-white">Renombrar Columna</h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Cambia el nombre de la columna "{modalRenombrar.label}".
          </p>
          <div className="mt-4">
            <input
              type="text"
              autoFocus
              value={nuevoLabelEdit}
              onChange={(e) => setNuevoLabelEdit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && nuevoLabelEdit.trim()) {
                  pedidosStore.renombrarColumna(modalRenombrar.id, nuevoLabelEdit.trim());
                  setModalRenombrar(null);
                }
              }}
              placeholder="Nuevo nombre de columna..."
              className="h-10 w-full rounded-xl border border-gray-300 bg-transparent px-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-secondary-500 focus:ring-2 focus:ring-secondary-500/20 dark:border-gray-700 dark:text-white"
            />
          </div>
          <div className="mt-5 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setModalRenombrar(null)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!nuevoLabelEdit.trim()}
              onClick={() => {
                if (nuevoLabelEdit.trim()) {
                  pedidosStore.renombrarColumna(modalRenombrar.id, nuevoLabelEdit.trim());
                  setModalRenombrar(null);
                }
              }}
              className="rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white shadow-theme-xs transition-colors cursor-pointer"
            >
              Guardar
            </button>
          </div>
        </Modal>
      )}

      {/* Chat rápido (slide-over). Una sola instancia para todo el tablero: el
          hilo se resuelve dentro del drawer con el resolutor canónico del store.
          Es `pointer-events: none` fuera del panel, así que no bloquea el
          arrastre de tarjetas del Kanban. */}
      <ChatDrawer
        pedido={chatDrawerPedidoId ? pedidosStore.getPedido(chatDrawerPedidoId) ?? null : null}
        onClose={() => setChatDrawerPedidoId(null)}
      />
    </>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// FILTRO CHIP
// ═══════════════════════════════════════════════════════════════════════════

const FiltroChip = ({ label, activo, onClick }: { label: string; activo: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
      activo
        ? "bg-brand-500 text-white"
        : "bg-white text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700"
    }`}
  >
    {label}
  </button>
);

export default TableroPage;

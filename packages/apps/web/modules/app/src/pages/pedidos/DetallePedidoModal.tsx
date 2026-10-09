import { useState } from "react";
import { observer } from "mobx-react-lite";
import { Modal } from "@/elements/ui/modal";
import { Button } from "@/elements/ui/button";
import { Badge } from "@/elements/ui/badge";
import { pedidosStore, ETIQUETA_PAGO, puedeEscribirCliente, puedeConfirmarPedido, puedeEditarPedido } from "@/stores";
import type { Pedido } from "@/stores/pedidos.store";
import { BUSINESS_PROFILES } from "@/domain/pedidos/pedidos.profiles";

// ═══════════════════════════════════════════════════════════════════════════
// DETALLE DEL PEDIDO (modal)
// ═══════════════════════════════════════════════════════════════════════════
//
// Pieza ÚNICA del detalle de un pedido. La montan DOS superficies:
//   · Tablero — clic en una tarjeta del kanban.
//   · Inicio  — botón «Ver detalle» de la tarjeta de atención inmediata.
// Vive en su propio archivo justamente por eso: con el detalle duplicado en
// cada página, las dos copias se desincronizan al primer ajuste. Un dueño,
// dos puntos de montaje.
//
// Los glifos de abajo son locales, como en el resto de las páginas del módulo
// (HistorialPage, CrearPedidoPage): el barrel `@/icons` no los expone.

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

export const DetallePedidoModal = observer(
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

    // Sin X en la esquina: el cierre de este detalle es el botón «Cerrar» del
    // pie. `showCloseButton={false}` deja un solo control de cierre.
    return (
      <Modal isOpen onClose={onClose} showCloseButton={false} className="max-w-lg p-6 sm:p-8">
        {/* Encabezado: título + estado debajo. */}
        <div className="mb-5">
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
                <DeliveryIcon className="h-3.5 w-3.5 text-secondary-600 dark:text-accent-300" />
                Dirección de entrega
              </span>
              {pedido.direccionEntrega?.calle && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-secondary-600 hover:underline dark:text-brand-400"
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
              <p className="mt-1 flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400">
                <AlertTriangleIcon className="h-3.5 w-3.5 shrink-0" />
                Sin dirección registrada para este domicilio.
              </p>
            )}

            {/* Asignación de Repartidor / Courier.
                El input es una ESCRITURA sobre la logística del pedido, así que
                exige `orders.edit`. Un rol que solo puede ABRIR el detalle
                (Preparación tiene `orders.read` y nada más de órdenes) veía el
                campo y podía reasignar el reparto: un control que mentía sobre
                lo que el perfil puede hacer. Sin la capacidad se muestra el
                valor como texto, que es información, no una promesa. */}
            <div className="mt-3 flex items-center justify-between border-t border-gray-200/60 pt-2.5 dark:border-gray-800">
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {pedidosStore.tieneCapacidad("carrier_shipment")
                  ? "Courier / Guía de envío:"
                  : "Repartidor asignado:"}
              </span>
              {puedeEditarPedido() ? (
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
                  className="h-7.5 w-52 rounded-lg border border-gray-200 bg-white px-2.5 text-right text-xs text-gray-800 placeholder:text-gray-400 focus:border-secondary-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              ) : (
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {pedido.repartidor?.trim() ? pedido.repartidor : "Sin asignar"}
                </span>
              )}
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
            {puedeConfirmarPedido() && (
              <button
                type="button"
                onClick={() => {
                  pedidosStore.togglePagado(pedido.id);
                }}
                className="text-xs font-semibold text-secondary-600 hover:underline dark:text-brand-400"
              >
                {pedido.pagado ? `Marcar como ${ETIQUETA_PAGO.sinPagar.toLowerCase()}` : `Marcar como ${ETIQUETA_PAGO.pagado.toLowerCase()}`}
              </button>
            )}
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
              <span className={pedido.pagado ? "font-semibold text-accent-600" : "font-semibold text-brand-600"}>
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
              <div className="mt-1 flex items-center justify-between font-semibold text-accent-600 dark:text-accent-400">
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

        {/* Registro de Auditoría y Trazabilidad por Operador */}
        {pedido.auditoria && pedido.auditoria.length > 0 && (
          <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-white/[0.02]">
            <div className="flex items-center justify-between mb-2.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-800 dark:text-white/90">
                🛡️ Trazabilidad por Operador
              </span>
              <span className="text-[11px] text-gray-400 font-medium">
                {pedido.auditoria.length} evento{pedido.auditoria.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {pedido.auditoria.map((aud) => (
                <div
                  key={aud.id}
                  className="flex items-start justify-between gap-2 text-xs border-l-2 border-brand-500 pl-2.5 py-0.5"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 dark:text-white truncate">
                      {aud.accion}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                      Por:{" "}
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {aud.operadorNombre}
                      </span>
                      {aud.operadorCargo && ` (${aud.operadorCargo})`}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] text-gray-400">
                    {new Date(aud.fecha).toLocaleTimeString("es-CO", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
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

export default DetallePedidoModal;

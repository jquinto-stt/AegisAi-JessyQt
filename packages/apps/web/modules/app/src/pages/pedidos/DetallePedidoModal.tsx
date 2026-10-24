import { useState } from "react";
import { observer } from "mobx-react-lite";
import {
  ArrowUturnLeftIcon,
  BanknotesIcon,
  BuildingStorefrontIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon,
  InboxIcon,
  MapPinIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  TruckIcon,
  UserCircleIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

import { Modal } from "@/elements/ui/modal";
import { Button } from "@/elements/ui/button";
import { Badge } from "@/elements/ui/badge";
import {
  pedidosStore,
  ETIQUETA_PAGO,
  puedeEscribirCliente,
  puedeConfirmarPedido,
  puedeEditarPedido,
} from "@/stores";
import type { Pedido } from "@/stores/pedidos.store";
import { BUSINESS_PROFILES } from "@/domain/pedidos/pedidos.profiles";
import { fechaHora } from "./detalle/detalle.utils";
import { HistorialEstadosTab } from "./detalle/HistorialEstadosTab";
import { AutomatizacionesTab } from "./detalle/AutomatizacionesTab";
import { TabVacio } from "./detalle/TabVacio";

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
// ── Por qué hay pestañas (23/10) ───────────────────────────────────────────
//
// Todo cabía en una columna, pero no se leía: el resumen del envío, los items,
// el pago, las notas y la auditoría competían por la misma mirada y el operador
// tenía que bajar para responder «¿por dónde va esto?». Las pestañas separan
// TRES preguntas distintas —qué es (Resumen/Detalle), por dónde va (Historial),
// y qué se le dijo al cliente (Automatizaciones)— sin esconder ninguna detrás
// de un menú.

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
    <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18a8 8 0 01-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1112 20z" />
  </svg>
);

const TABS = [
  { id: "resumen", label: "Resumen" },
  { id: "detalle", label: "Detalle" },
  { id: "historial", label: "Historial de Estados" },
  { id: "automatizaciones", label: "Automatizaciones" },
  { id: "novedades", label: "Novedades" },
  { id: "devoluciones", label: "Devoluciones" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** Bloque de dato del resumen: icono, rótulo y valor. */
const BloqueDato = ({
  icono,
  label,
  valor,
  nota,
  children,
}: {
  icono: React.ReactNode;
  label: string;
  valor?: string;
  nota?: string;
  children?: React.ReactNode;
}) => (
  <div className="flex flex-col items-center px-2 text-center">
    <span className="flex size-10 items-center justify-center text-gray-400 dark:text-gray-500">
      {icono}
    </span>
    <p className="mt-1 text-xs font-semibold text-ink-title dark:text-white">{label}</p>
    {valor && <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">{valor}</p>}
    {nota && <p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">{nota}</p>}
    {children}
  </div>
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
    const [tab, setTab] = useState<TabId>("resumen");
    const [repartidorInput, setRepartidorInput] = useState(pedido.repartidor ?? "");

    const subtotal = pedidosStore.subtotalItems(pedido);
    const total = pedidosStore.totalPedido(pedido);
    const cambio = pedidosStore.cambioRequerido(pedido);
    const etiquetaEstado = pedidosStore.estadoLabel(pedido.estado);

    const queryMaps = [pedido.direccionEntrega?.calle, pedido.direccionEntrega?.barrio]
      .filter(Boolean)
      .join(", ");
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryMaps)}`;

    const confirmado = pedido.estado !== "nuevo" && pedido.estado !== "programado";
    const conRecaudo = pedido.metodoPago === "efectivo" || pedido.metodoPago === "contra_entrega";

    // Alertas: solo las que el pedido puede sostener con datos. Una lista de
    // alertas inventadas enseña a ignorar la sección.
    const alertas: string[] = [];
    if (pedido.modalidad === "domicilio" && !pedido.direccionEntrega?.calle) {
      alertas.push("El pedido no tiene dirección de entrega.");
    }
    if (!pedido.pagado) alertas.push(`Pago ${ETIQUETA_PAGO.sinPagar.toLowerCase()}.`);
    if (pedidosStore.esUrgente(pedido)) {
      alertas.push(
        `Lleva ${pedidosStore.minutosEnEstado(pedido)} min en «${etiquetaEstado}», por encima del objetivo.`,
      );
    }

    return (
      <Modal isOpen onClose={onClose} showCloseButton={false} className="max-w-4xl p-0 overflow-hidden">
        {/* Cabecera: título + cierre */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 sm:px-8">
          <h2 className="text-lg font-bold text-ink-title dark:text-white">Detalle del pedido</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar el detalle"
            className="-mr-1 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 cursor-pointer dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <XMarkIcon className="size-5" />
          </button>
        </div>

        {/* Pestañas */}
        <div className="mt-3 flex gap-1 overflow-x-auto border-b border-gray-100 px-4 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={tab === t.id}
              className={`relative shrink-0 whitespace-nowrap px-3 pb-2.5 pt-1.5 text-xs sm:text-sm transition-colors cursor-pointer ${
                tab === t.id
                  ? "font-semibold text-ink-title dark:text-white"
                  : "font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {t.label}
              <span
                className={`absolute inset-x-2 -bottom-px h-0.5 rounded-full transition-colors ${
                  tab === t.id ? "bg-brand-500" : "bg-transparent"
                }`}
              />
            </button>
          ))}
        </div>

        {/* Contenido. `min-h` para que el modal no cambie de alto al saltar
            entre pestañas: una ventana que se encoge y crece con cada clic se
            lee como un fallo, no como un cambio de sección. */}
        <div className="max-h-[64vh] min-h-[320px] overflow-y-auto px-6 py-5 sm:px-8">
          {tab === "resumen" && (
            <div>
              {/* Identificación */}
              <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
                <div>
                  <span className="text-xs text-gray-400">N° orden: </span>
                  <span className="text-xs font-semibold text-ink-title dark:text-white">
                    {pedido.numero}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-400">Fecha de creación: </span>
                  <span className="text-xs font-semibold text-ink-title dark:text-white">
                    {fechaHora(pedido.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Estado: </span>
                  <Badge color={pedidosStore.estadoBadgeColor(pedido.estado)} size="sm">
                    {etiquetaEstado}
                  </Badge>
                </div>
              </div>

              {/* Cuatro datos del envío */}
              <div className="mt-6 grid grid-cols-2 gap-y-5 sm:grid-cols-4">
                <BloqueDato
                  icono={<ClipboardDocumentCheckIcon className="size-8" />}
                  label="Estado de confirmación"
                  valor={confirmado ? "Confirmado" : "Para confirmación manual"}
                />
                <BloqueDato
                  icono={<ShoppingBagIcon className="size-8" />}
                  label="Tipo de envío"
                  valor={conRecaudo ? "Con recaudo" : "Sin recaudo"}
                  nota={pedidosStore.modalidadLabel(pedido.modalidad)}
                />
                <BloqueDato
                  icono={<CalendarDaysIcon className="size-8" />}
                  label="Fecha de entrega"
                  valor={
                    pedido.finishedAt
                      ? fechaHora(pedido.finishedAt)
                      : pedido.programadoPara
                        ? fechaHora(pedido.programadoPara)
                        : "No se ha calculado"
                  }
                />
                <BloqueDato
                  icono={<TruckIcon className="size-8" />}
                  label="Transportadora"
                  valor={pedido.repartidor?.trim() || "Sin asignar"}
                />
              </div>

              {/* Destino */}
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-title dark:text-white">
                    <UserCircleIcon className="size-4 text-gray-400" />
                    Destino
                  </p>
                  {pedido.direccionEntrega?.calle ? (
                    <div className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-300">
                      <p className="font-semibold text-gray-800 dark:text-white">
                        {pedido.direccionEntrega.calle}
                      </p>
                      {(pedido.direccionEntrega.barrio || pedido.direccionEntrega.referencia) && (
                        <p className="text-gray-500 dark:text-gray-400">
                          {[pedido.direccionEntrega.barrio, pedido.direccionEntrega.referencia]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                      {pedido.direccionEntrega.indicaciones && (
                        <p className="italic text-gray-500 dark:text-gray-400">
                          "{pedido.direccionEntrega.indicaciones}"
                        </p>
                      )}
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-secondary-600 hover:underline dark:text-brand-400"
                      >
                        <MapPinIcon className="size-3.5" />
                        Abrir en Google Maps
                      </a>
                    </div>
                  ) : (
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-gray-400 dark:text-gray-500">
                      <MapPinIcon className="size-3.5" />
                      No se ha confirmado la dirección
                    </p>
                  )}
                </div>

                {/* Alertas */}
                <div>
                  <p className="text-xs font-semibold text-ink-title dark:text-white">Alertas</p>
                  {alertas.length === 0 ? (
                    <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                      No hay alertas para mostrar
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1.5">
                      {alertas.map((a) => (
                        <li
                          key={a}
                          className="flex items-start gap-1.5 text-xs text-brand-700 dark:text-brand-300"
                        >
                          <ExclamationTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Guía / repartidor: es una ESCRITURA sobre la logística, así que
                  exige `orders.edit`. Sin la capacidad se muestra el valor como
                  texto, que es información y no una promesa. */}
              {pedido.modalidad === "domicilio" && (
                <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3.5 py-2.5 dark:border-gray-800">
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
              )}
            </div>
          )}

          {tab === "detalle" && (
            <div>
              {/* Modalidad y origen */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                    Modalidad
                  </p>
                  <p className="mt-1 text-sm text-gray-800 dark:text-white/90">
                    {pedidosStore.modalidadLabel(pedido.modalidad)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                    Origen
                  </p>
                  <p className="mt-1 text-sm text-gray-800 dark:text-white/90">
                    {pedido.origen === "whatsapp" ? "WhatsApp" : "Operador"}
                  </p>
                </div>
              </div>

              {/* Consumo en salón / mesa */}
              {pedido.modalidad === "en_sitio" && (
                <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-white/[0.02]">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-800 dark:text-white/90">
                    <BuildingStorefrontIcon className="size-4 text-gray-400" />
                    Consumo en salón / Mesa
                  </span>
                  <p className="mt-1.5 text-xs text-gray-700 dark:text-gray-300">
                    {pedido.notas?.match(/Mesa:?\s*[^·\n]+/i)?.[0] ?? "Servicio en salón / mesa"}
                  </p>
                </div>
              )}

              {/* Items y valores */}
              <div className="mt-5">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
                  {pedidosStore.config.perfilComercial &&
                  BUSINESS_PROFILES[pedidosStore.config.perfilComercial]
                    ? BUSINESS_PROFILES[pedidosStore.config.perfilComercial].labels.itemPlural
                    : "Items"}{" "}
                  y valores
                </p>
                {pedido.items.length === 0 ? (
                  <p className="text-sm text-gray-400">Sin items detallados.</p>
                ) : (
                  <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 dark:divide-white/5 dark:border-gray-800">
                    {pedido.items.map((it, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                        <span className="text-gray-700 dark:text-gray-300">
                          {it.cantidad}× {it.nombre}
                        </span>
                        {it.precio !== undefined && (
                          <span className="text-gray-500 dark:text-gray-400">
                            ${(it.precio * it.cantidad).toLocaleString()}
                          </span>
                        )}
                      </div>
                    ))}

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
                        <span className="text-gray-800 dark:text-white/90">
                          ${total.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Pago */}
              <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-white/[0.02]">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                    <BanknotesIcon className="size-4 text-gray-400" />
                    Información de Pago
                  </span>
                  {puedeConfirmarPedido() && (
                    <button
                      type="button"
                      onClick={() => pedidosStore.togglePagado(pedido.id)}
                      className="text-xs font-semibold text-secondary-600 hover:underline cursor-pointer dark:text-brand-400"
                    >
                      {pedido.pagado
                        ? `Marcar como ${ETIQUETA_PAGO.sinPagar.toLowerCase()}`
                        : `Marcar como ${ETIQUETA_PAGO.pagado.toLowerCase()}`}
                    </button>
                  )}
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-400">Método: </span>
                    <span className="font-medium capitalize text-gray-700 dark:text-gray-300">
                      {pedido.metodoPago ? pedido.metodoPago.replace("_", " ") : "No especificado"}
                    </span>
                  </div>
                  <div>
                    {/* «Pago», no «Estado»: el badge de estado del pedido está
                        arriba y este campo es el estado de PAGO, otro eje. */}
                    <span className="text-gray-400">Pago: </span>
                    <span
                      className={
                        pedido.pagado
                          ? "font-semibold text-accent-600"
                          : "font-semibold text-brand-600"
                      }
                    >
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
                <div className="mt-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Notas</p>
                  <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{pedido.notas}</p>
                </div>
              )}

              {/* Trazabilidad por operador */}
              {pedido.auditoria && pedido.auditoria.length > 0 && (
                <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-white/[0.02]">
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-800 dark:text-white/90">
                      <ShieldCheckIcon className="size-4 text-gray-400" />
                      Trazabilidad por Operador
                    </span>
                    <span className="text-[11px] font-medium text-gray-400">
                      {pedido.auditoria.length} evento{pedido.auditoria.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="max-h-36 space-y-2 overflow-y-auto pr-1">
                    {pedido.auditoria.map((aud) => (
                      <div
                        key={aud.id}
                        className="flex items-start justify-between gap-2 border-l-2 border-brand-500 py-0.5 pl-2.5 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-gray-800 dark:text-white">
                            {aud.accion}
                          </p>
                          <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
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
            </div>
          )}

          {tab === "historial" && <HistorialEstadosTab pedido={pedido} />}

          {tab === "automatizaciones" && <AutomatizacionesTab pedido={pedido} />}

          {tab === "novedades" && (
            <TabVacio
              icono={<InboxIcon className="size-10" />}
              titulo="¡Ups! Aún no posees novedades para este pedido"
            />
          )}

          {tab === "devoluciones" && (
            <TabVacio
              icono={<ArrowUturnLeftIcon className="size-10" />}
              titulo="Aún no posees devoluciones para este pedido"
            />
          )}
        </div>

        {/* Pie */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4 sm:px-8 dark:border-gray-800">
          {puedeEscribirCliente() && (
            <Button
              size="sm"
              variant="ghost"
              startIcon={<WhatsAppIcon />}
              onClick={onChat}
              className="!text-[#25D366] hover:!bg-[#25D366]/10"
            >
              WhatsApp
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </Modal>
    );
  },
);

export default DetallePedidoModal;

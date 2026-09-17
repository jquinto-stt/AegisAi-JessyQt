import { useState, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { useNavigate } from "react-router";
import { Badge } from "@/elements/ui/badge";
import { Avatar } from "@/elements/ui/avatar";
import { Modal } from "@/elements/ui/modal";
import { conversacionesStore } from "@/stores/conversaciones.store";
import { sessionStore } from "@/stores/session.store";
import {
  pedidosStore,
  type Pedido,
  type Modalidad,
  type MetodoPago,
  type DireccionEntrega,
} from "@/stores/pedidos.store";
import { puedeCrearPedido, puedeMoverA } from "@/stores/acceso.utils";
import { avanzarPedido } from "@/pages/pedidos/pedidos.notificaciones";
import { AVATAR_MAP, inicialesDe, statusDe } from "../conversaciones.utils";

// ═══════════════════════════════════════════════════════════════════════════
// PIPELINE CRM DEL CONTACTO
// ═══════════════════════════════════════════════════════════════════════════

export type EtapaCrmCliente =
  | "nuevo"
  | "en_conversacion"
  | "interesado"
  | "cliente"
  | "perdido";

interface EtapaConfig {
  id: EtapaCrmCliente;
  label: string;
}

export const ETAPAS_CRM: ReadonlyArray<EtapaConfig> = [
  { id: "nuevo", label: "Nuevo" },
  { id: "en_conversacion", label: "En conversación" },
  { id: "interesado", label: "Interesado" },
  { id: "cliente", label: "Cliente" },
  { id: "perdido", label: "Perdido" },
];

export function calcularEtapaAutomatica(
  pedidosCount: number,
  estadoConv: string
): EtapaCrmCliente {
  if (pedidosCount > 0) return "cliente";
  if (estadoConv === "atendida" || estadoConv === "en_espera") return "interesado";
  if (estadoConv === "abierta") return "en_conversacion";
  return "nuevo";
}

export function getPasoProgreso(
  etapaId: EtapaCrmCliente,
  actual: EtapaCrmCliente
): "completado" | "activo" | "pendiente" {
  if (actual === "perdido") {
    if (etapaId === "perdido") return "activo";
    if (etapaId === "nuevo") return "completado";
    return "pendiente";
  }

  const orden: EtapaCrmCliente[] = [
    "nuevo",
    "en_conversacion",
    "interesado",
    "cliente",
  ];
  const idxActual = orden.indexOf(actual);
  const idxPaso = orden.indexOf(etapaId);

  if (etapaId === "perdido") {
    return "pendiente";
  }

  if (idxPaso === idxActual) return "activo";
  if (idxPaso < idxActual) return "completado";
  return "pendiente";
}

// ═══════════════════════════════════════════════════════════════════════════
// VOCABULARIO DE ESTADO — se DELEGA, no se re-declara
// ═══════════════════════════════════════════════════════════════════════════
//
// Aquí vivía una tabla propia (`ESTADO_PREP_META`) con la etiqueta y el color de
// cada estado del pipeline. Era una SEGUNDA FUENTE DE VERDAD frente a la que ya
// tiene `pedidosStore`, y había divergido en dos estados:
//
//   estado        pedidosStore.estadoBadgeColor   ESTADO_PREP_META
//   confirmado    "primary"                        "info"      ← divergía
//   en_camino     "primary"                        "warning"   ← divergía
//
// Consecuencia visible: el MISMO pedido en `confirmado` se pintaba azul en el
// Historial (que sí usa el selector del store) y gris-azul en este panel. Dos
// superficies, un solo dato, dos colores.
//
// El arreglo no es sincronizar la tabla, es ELIMINARLA: la etiqueta y el color
// se leen de `pedidosStore.estadoLabel()` / `estadoBadgeColor()`, que ya honran
// los alias configurados en Configuración. Así este panel no puede volver a
// divergir, y hereda gratis cualquier estado o alias nuevo.

const money = (n: number) => `$${n.toLocaleString("es-CO")}`;

// ═══════════════════════════════════════════════════════════════════════════
// MODAL DE CREACIÓN RÁPIDA DE PEDIDO REAL CON LOGÍSTICA
// ═══════════════════════════════════════════════════════════════════════════

interface CrearPedidoModalProps {
  isOpen: boolean;
  onClose: () => void;
  clienteNombre: string;
  clienteTelefono: string;
}

const CrearPedidoRapidoModal = observer(
  ({
    isOpen,
    onClose,
    clienteNombre,
    clienteTelefono,
  }: CrearPedidoModalProps) => {
    const navigate = useNavigate();
    const catalogo = pedidosStore.config.catalogo;
    const [modalidad, setModalidad] = useState<Modalidad>("domicilio");
    const [notas, setNotas] = useState("");
    const [cantidades, setCantidades] = useState<Record<string, number>>(() => {
      const initial: Record<string, number> = {};
      if (catalogo[0]) initial[catalogo[0].id] = 1;
      return initial;
    });

    // Logística y Pago
    const direccionesGuardadas = pedidosStore.direccionesDe(clienteTelefono);
    const [calle, setCalle] = useState(() => direccionesGuardadas[0]?.calle ?? "");
    const [barrio, setBarrio] = useState(() => direccionesGuardadas[0]?.barrio ?? "");
    const [referencia, setReferencia] = useState(() => direccionesGuardadas[0]?.referencia ?? "");
    const [costoEnvio, setCostoEnvio] = useState<number>(5000);
    const [metodoPago, setMetodoPago] = useState<MetodoPago>("efectivo");

    const setQty = (id: string, delta: number) => {
      setCantidades((prev) => {
        const current = prev[id] ?? 0;
        const next = Math.max(0, current + delta);
        return { ...prev, [id]: next };
      });
    };

    const itemsSeleccionados = catalogo
      .filter((c) => (cantidades[c.id] ?? 0) > 0)
      .map((c) => ({
        nombre: c.nombre,
        cantidad: cantidades[c.id],
        precio: c.precio,
      }));

    const subtotal = itemsSeleccionados.reduce(
      (sum, it) => sum + (it.precio ?? 0) * it.cantidad,
      0,
    );
    const envio = modalidad === "domicilio" ? Math.max(0, Number(costoEnvio) || 0) : 0;
    const totalCalculado = subtotal + envio;

    const handleConfirmar = () => {
      if (itemsSeleccionados.length === 0) return;
      pedidosStore.crearPedido({
        cliente: clienteNombre,
        telefono: clienteTelefono,
        origen: "whatsapp",
        modalidad,
        items: itemsSeleccionados,
        notas: notas.trim() || undefined,
        direccionEntrega:
          modalidad === "domicilio" && calle.trim()
            ? {
                calle: calle.trim(),
                barrio: barrio.trim() || undefined,
                referencia: referencia.trim() || undefined,
              }
            : undefined,
        costoEnvio: modalidad === "domicilio" ? envio : undefined,
        metodoPago,
      });
      onClose();
    };

    return (
      <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg p-5 sm:p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
          <div>
            <h3 className="text-base font-bold text-gray-800 dark:text-white/90">
              Nuevo Pedido para {clienteNombre}
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Teléfono: {clienteTelefono}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/5"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar">
          {/* Modalidad de entrega */}
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              Modalidad de entrega
            </label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setModalidad("domicilio")}
                className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-medium transition-colors ${
                  modalidad === "domicilio"
                    ? "border-brand-500 bg-brand-50/70 text-brand-600 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-400"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                }`}
              >
                🛵 Domicilio
              </button>
              <button
                type="button"
                onClick={() => setModalidad("retiro")}
                className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-medium transition-colors ${
                  modalidad === "retiro"
                    ? "border-brand-500 bg-brand-50/70 text-brand-600 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-400"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                }`}
              >
                🏪 Retiro en local
              </button>
            </div>
          </div>

          {/* Dirección si es domicilio */}
          {modalidad === "domicilio" && (
            <div className="rounded-xl border border-gray-200/80 bg-gray-50/50 p-3 space-y-2.5 dark:border-gray-800 dark:bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Dirección de entrega
                </span>
                {direccionesGuardadas.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCalle(direccionesGuardadas[0].calle);
                      if (direccionesGuardadas[0].barrio) setBarrio(direccionesGuardadas[0].barrio);
                      if (direccionesGuardadas[0].referencia) setReferencia(direccionesGuardadas[0].referencia);
                    }}
                    className="text-[10px] font-semibold text-brand-600 hover:underline dark:text-brand-400"
                  >
                    📍 Usar guardada
                  </button>
                )}
              </div>

              <input
                type="text"
                placeholder="Dirección / Calle y número *"
                value={calle}
                onChange={(e) => setCalle(e.target.value)}
                className="h-8 w-full rounded-lg border border-gray-200 bg-white px-2.5 text-xs text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Barrio / Sector"
                  value={barrio}
                  onChange={(e) => setBarrio(e.target.value)}
                  className="h-8 w-full rounded-lg border border-gray-200 bg-white px-2.5 text-xs text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="Apto / Casa / Torre"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  className="h-8 w-full rounded-lg border border-gray-200 bg-white px-2.5 text-xs text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-gray-500">Costo de envío:</span>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={costoEnvio}
                  onChange={(e) => setCostoEnvio(Math.max(0, Number(e.target.value) || 0))}
                  className="h-7 w-24 rounded-lg border border-gray-200 bg-white px-2 text-right text-xs text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Método de pago */}
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              Método de pago
            </label>
            <div className="mt-1.5 grid grid-cols-4 gap-1.5">
              {[
                { id: "efectivo", label: "Efectivo" },
                { id: "transferencia", label: "Transf." },
                { id: "tarjeta", label: "Tarjeta" },
                { id: "contra_entrega", label: "C. Entrega" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMetodoPago(m.id as MetodoPago)}
                  className={`rounded-lg border py-1 text-[11px] font-medium transition-colors ${
                    metodoPago === m.id
                      ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-300"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Selección de productos reales del catálogo */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                Productos del catálogo
              </label>
              <span className="text-[11px] font-semibold text-gray-500">
                Subtotal: {money(subtotal)}
              </span>
            </div>

            <div className="mt-2 divide-y divide-gray-100 rounded-xl border border-gray-200/80 bg-gray-50/50 p-2 dark:divide-gray-800 dark:border-gray-800 dark:bg-white/[0.02]">
              {catalogo.map((cat) => {
                const qty = cantidades[cat.id] ?? 0;
                return (
                  <div key={cat.id} className="flex items-center justify-between py-2 px-1">
                    <div>
                      <p className="text-xs font-medium text-gray-800 dark:text-white/90">
                        {cat.nombre}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {money(cat.precio)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQty(cat.id, -1)}
                        className="flex h-6 w-6 items-center justify-center rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300"
                      >
                        -
                      </button>
                      <span className="min-w-4 text-center text-xs font-bold text-gray-800 dark:text-white">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQty(cat.id, 1)}
                        className="flex h-6 w-6 items-center justify-center rounded-lg bg-gray-200 text-xs font-semibold text-gray-800 hover:bg-gray-300 dark:bg-white/10 dark:text-white"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notas de entrega */}
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              Notas del pedido (opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: Apto 402, timbre blanco, salsa aparte"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="mt-1 h-9 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>

        {/* Acciones del Modal */}
        <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate(
                `/pedidos/crear?cliente=${encodeURIComponent(clienteNombre)}&telefono=${encodeURIComponent(clienteTelefono)}`,
              );
            }}
            className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            Abrir formulario avanzado →
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={itemsSeleccionados.length === 0}
              onClick={handleConfirmar}
              className="rounded-xl bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 disabled:opacity-50"
            >
              Crear Pedido ({money(totalCalculado)})
            </button>
          </div>
        </div>
      </Modal>
    );
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// TARJETA DE PEDIDO EN LA LISTA
// ═══════════════════════════════════════════════════════════════════════════

const PedidoItemCard = observer(({ pedido }: { pedido: Pedido }) => {
  const pagado = pedido.pagado === true;
  const total = pedidosStore.totalPedido(pedido);
  const cambio = pedidosStore.cambioRequerido(pedido);

  const resumen = pedido.items
    .map((it) => `${it.cantidad}× ${it.nombre}`)
    .join(", ");

  const siguiente = pedidosStore.siguienteEstado(pedido);
  const puedeAvanzar = siguiente !== null && puedeMoverA(siguiente);

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-gray-200/80 bg-white p-3.5 shadow-2xs dark:border-gray-800 dark:bg-gray-900/60">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-gray-800 dark:text-white/90">
            {pedido.numero}
          </span>
          <span className="text-[10px] text-gray-400 capitalize">
            • {pedidosStore.modalidadLabel(pedido.modalidad)}
          </span>
        </div>
        <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
          {total > 0 ? money(total) : ""}
        </span>
      </div>

      <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
        {resumen}
      </p>

      {/* Detalle de entrega y logística si es domicilio */}
      {pedido.modalidad === "domicilio" && pedido.direccionEntrega && (
        <div className="flex flex-col gap-0.5 rounded-lg bg-gray-50 px-2.5 py-1.5 text-[11px] text-gray-600 dark:bg-white/[0.03] dark:text-gray-300">
          <div className="flex items-center gap-1.5 font-medium">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-brand-500 shrink-0"
            >
              <rect x="1" y="3" width="15" height="13" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
            <span className="truncate">{pedido.direccionEntrega.calle}</span>
            {pedido.direccionEntrega.barrio && (
              <span className="text-gray-400">({pedido.direccionEntrega.barrio})</span>
            )}
          </div>
          {pedido.repartidor && (
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
              Repartidor: {pedido.repartidor}
            </div>
          )}
        </div>
      )}

      {/* Badges de Estado y Pago */}
      <div className="flex flex-wrap items-center justify-between gap-1 pt-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge color={pedidosStore.estadoBadgeColor(pedido.estado)} size="xs">
            {pedidosStore.estadoLabel(pedido.estado)}
          </Badge>
          <Badge
            variant={pagado ? "solid" : "light"}
            color={pagado ? "success" : "warning"}
            size="xs"
          >
            {pagado ? "Pagado" : "Pendiente"}
          </Badge>
          {pedido.metodoPago && (
            <span className="rounded-md border border-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 capitalize dark:border-gray-700 dark:text-gray-400">
              {pedido.metodoPago.replace("_", " ")}
              {cambio > 0 && ` (Vuelto: ${money(cambio)})`}
            </span>
          )}
        </div>

        {puedeAvanzar && (
          <button
            type="button"
            onClick={() => avanzarPedido(pedido.id)}
            title={`Avanzar a ${pedidosStore.estadoLabel(siguiente)}`}
            className="rounded-lg bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700 transition-colors hover:bg-gray-200 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/20"
          >
            Avanzar →
          </button>
        )}
      </div>
    </li>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// PANEL DE CONTEXTO PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export const PanelContexto = observer(({ convId }: { convId: string | null }) => {
  const navigate = useNavigate();
  const [copiado, setCopiado] = useState(false);
  const [modalCrearOpen, setModalCrearOpen] = useState(false);
  const [notasContacto, setNotasContacto] = useState<string>(() => {
    return localStorage.getItem(`crm_notas_${convId}`) ?? "";
  });

  const conv = convId ? conversacionesStore.getConversacion(convId) : undefined;

  if (!conv || !convId) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-xs text-gray-400">
        Selecciona una conversación para ver la información del contacto.
      </div>
    );
  }

  const { nombre, telefono } = conv.contacto;
  const pedidos = pedidosStore.porTelefono(telefono);
  const avatarSrc = AVATAR_MAP[conv.id] || "";

  const totalGastado = pedidos.reduce((acc, p) => {
    return (
      acc +
      p.items.reduce((sum, it) => sum + (it.precio ?? 0) * it.cantidad, 0)
    );
  }, 0);

  const [etapaManual, setEtapaManual] = useState<EtapaCrmCliente | null>(() => {
    return (localStorage.getItem(`crm_etapa_${telefono}`) as EtapaCrmCliente) || null;
  });

  useEffect(() => {
    const guardada = localStorage.getItem(`crm_etapa_${telefono}`) as EtapaCrmCliente | null;
    setEtapaManual(guardada);
  }, [telefono]);

  const etapaActiva: EtapaCrmCliente =
    etapaManual ?? calcularEtapaAutomatica(pedidos.length, conv.estado);

  const cambiarEtapa = (nueva: EtapaCrmCliente) => {
    setEtapaManual(nueva);
    localStorage.setItem(`crm_etapa_${telefono}`, nueva);
  };

  const restablecerAuto = () => {
    setEtapaManual(null);
    localStorage.removeItem(`crm_etapa_${telefono}`);
  };

  const copiarTelefono = () => {
    navigator.clipboard.writeText(telefono);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const guardarNotas = (texto: string) => {
    setNotasContacto(texto);
    localStorage.setItem(`crm_notas_${convId}`, texto);
  };

  const [plantillaEnviada, setPlantillaEnviada] = useState<string | null>(null);

  const enviarPlantilla = (tipo: "menu" | "ubicacion" | "pago") => {
    if (!convId) return;

    // Si la conversación la atiende el bot, tomarla automáticamente para el asesor
    // de modo que el mensaje pueda despacharse sin ser bloqueado por la guarda de modo.
    const convActual = conversacionesStore.getConversacion(convId);
    if (convActual && convActual.atencion !== "humano") {
      const operadorId =
        sessionStore.accessContext.operadorId ??
        sessionStore.accessContext.rolId ??
        "desconocido";
      conversacionesStore.tomar(convId, operadorId);
    }

    let mensaje = "";
    if (tipo === "menu") {
      const itemsTexto = pedidosStore.config.catalogo
        .map((c) => `• ${c.nombre} - ${money(c.precio)}`)
        .join("\n");
      mensaje = `¡Hola ${nombre}! Te comparto nuestro menú actual:\n\n${itemsTexto}\n\n¿Qué te gustaría pedir?`;
    } else if (tipo === "ubicacion") {
      mensaje = `Por favor compártenos tu dirección exacta y cualquier indicación (apartamento, barrio o punto de referencia) para coordinar la entrega.`;
    } else if (tipo === "pago") {
      mensaje = `Puedes realizar tu pago por transferencia bancaria (Bancolombia / Nequi) al número 300-555-1122. Envíame el comprobante por aquí una vez realizado.`;
    }

    if (mensaje) {
      conversacionesStore.enviarComoNegocio(convId, mensaje);
      setPlantillaEnviada(tipo);
      setTimeout(() => setPlantillaEnviada(null), 2000);
    }
  };

  return (
    <div className="flex flex-col gap-3 pb-3">
      {/* ── 1. Tarjeta de Perfil del Cliente ── */}
      <div className="flex flex-col items-center rounded-2xl border border-gray-200/80 bg-gray-50/60 p-3.5 text-center dark:border-gray-800 dark:bg-white/[0.02]">
        <Avatar
          src={avatarSrc}
          alt=""
          initials={inicialesDe(nombre)}
          size="large"
          status={statusDe(conv.estado)}
        />
        <h3 className="mt-2 text-sm font-bold text-gray-800 dark:text-white/90">
          {nombre}
        </h3>

        {/* Teléfono y copiar */}
        <button
          type="button"
          onClick={copiarTelefono}
          title="Copiar número de teléfono"
          className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-gray-200/80 bg-white px-2.5 py-0.5 text-xs text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900 dark:border-gray-700 dark:bg-white/5 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:text-white"
        >
          <span className="font-mono text-[11px]">{telefono}</span>
          {copiado ? (
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-emerald-500"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-400"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>

        {/* Dirección frecuente (Memoria CRM) */}
        {(() => {
          const dirs = pedidosStore.direccionesDe(telefono);
          if (dirs.length === 0) return null;
          const principal = dirs[0];
          return (
            <div className="mt-3 flex w-full items-center gap-2 rounded-xl border border-gray-200/60 bg-white/80 px-3 py-1.5 text-left text-xs text-gray-700 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 text-brand-500"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="truncate font-medium">{principal.calle}</span>
              {principal.barrio && (
                <span className="shrink-0 text-gray-400">({principal.barrio})</span>
              )}
            </div>
          );
        })()}

        {/* Métricas del Contacto */}
        <div className="mt-3 grid w-full grid-cols-2 gap-2 border-t border-gray-200/60 pt-3 dark:border-gray-800">
          <div className="rounded-xl bg-white/70 p-2 text-center dark:bg-white/[0.02]">
            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Pedidos
            </p>
            <p className="text-base font-bold text-gray-800 dark:text-white">
              {pedidos.length}
            </p>
          </div>
          <div className="rounded-xl bg-white/70 p-2 text-center dark:bg-white/[0.02]">
            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Total gastado
            </p>
            <p className="text-base font-bold text-gray-800 dark:text-white">
              {money(totalGastado)}
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. Etapa del Pipeline CRM (Compacto horizontal) ── */}
      <div className="rounded-2xl border border-gray-200/80 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-white/[0.02]">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Pipeline
            </label>
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                etapaActiva === "cliente"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : etapaActiva === "perdido"
                    ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"
                    : etapaActiva === "interesado"
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                      : "bg-gray-200/70 text-gray-800 dark:bg-white/10 dark:text-gray-200"
              }`}
            >
              {ETAPAS_CRM.find((e) => e.id === etapaActiva)?.label ?? etapaActiva}
            </span>
          </div>

          {etapaManual ? (
            <button
              type="button"
              onClick={restablecerAuto}
              title="Restablecer a detección automática según pedidos y chat"
              className="text-[10px] font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              Manual (auto ↺)
            </button>
          ) : (
            <span
              className="text-[10px] text-gray-400 dark:text-gray-500"
              title="Calculada automáticamente según pedidos y estado del chat"
            >
              Auto
            </span>
          )}
        </div>

        {/* Barra de progreso interactiva segmentada en 5 pasos */}
        <div className="mt-2.5 grid grid-cols-5 gap-1">
          {ETAPAS_CRM.map((etapa) => {
            const estado = getPasoProgreso(etapa.id, etapaActiva);
            const isCompleted = estado === "completado";
            const isActive = estado === "activo";

            let barColor = "bg-gray-200 hover:bg-gray-300 dark:bg-white/10 dark:hover:bg-white/20";
            if (isActive) {
              barColor =
                etapa.id === "perdido"
                  ? "bg-rose-500"
                  : etapa.id === "cliente"
                    ? "bg-emerald-500"
                    : "bg-brand-500 shadow-2xs";
            } else if (isCompleted) {
              barColor = "bg-gray-700 hover:bg-gray-800 dark:bg-gray-400 dark:hover:bg-gray-300";
            }

            return (
              <button
                key={etapa.id}
                type="button"
                onClick={() => cambiarEtapa(etapa.id)}
                title={`${etapa.label} (${isActive ? "Actual" : isCompleted ? "Completado" : "Pendiente"}) — Clic para cambiar`}
                className="group flex flex-col items-center gap-1 focus:outline-hidden"
              >
                <div
                  className={`h-1.5 w-full rounded-full transition-all ${barColor} ${
                    isActive ? "scale-y-125" : ""
                  }`}
                />
                <span
                  className={`truncate text-[9.5px] transition-colors ${
                    isActive
                      ? "font-bold text-gray-900 dark:text-white"
                      : isCompleted
                        ? "font-medium text-gray-600 dark:text-gray-400"
                        : "text-gray-400 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300"
                  }`}
                >
                  {etapa.id === "en_conversacion" ? "En conv." : etapa.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 3. Acciones Rápidas del Operador ── */}
      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Acciones rápidas
        </label>

        {/* Botón Crear Pedido Real (con SVG) */}
        {puedeCrearPedido() && (
          <button
            type="button"
            onClick={() => setModalCrearOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-2.5 text-xs font-semibold text-white shadow-2xs transition-all hover:bg-brand-600 hover:shadow-xs active:scale-[0.99]"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            <span>Crear pedido</span>
          </button>
        )}

        {/* Botones de Plantillas al Chat con 1 Click (con SVG y feedback reactivo) */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => enviarPlantilla("menu")}
            title="Enviar menú con precios al chat"
            className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-[11px] font-medium shadow-2xs transition-all ${
              plantillaEnviada === "menu"
                ? "border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "border-gray-200/80 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white"
            }`}
          >
            {plantillaEnviada === "menu" ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-500 dark:text-gray-400"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            )}
            <span>{plantillaEnviada === "menu" ? "¡Enviado!" : "Menú"}</span>
          </button>

          <button
            type="button"
            onClick={() => enviarPlantilla("ubicacion")}
            title="Solicitar dirección de entrega al cliente"
            className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-[11px] font-medium shadow-2xs transition-all ${
              plantillaEnviada === "ubicacion"
                ? "border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "border-gray-200/80 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white"
            }`}
          >
            {plantillaEnviada === "ubicacion" ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-500 dark:text-gray-400"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            )}
            <span>{plantillaEnviada === "ubicacion" ? "¡Enviado!" : "Dirección"}</span>
          </button>

          <button
            type="button"
            onClick={() => enviarPlantilla("pago")}
            title="Enviar datos bancarios para pago"
            className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-[11px] font-medium shadow-2xs transition-all ${
              plantillaEnviada === "pago"
                ? "border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "border-gray-200/80 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white"
            }`}
          >
            {plantillaEnviada === "pago" ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-500 dark:text-gray-400"
              >
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
            )}
            <span>{plantillaEnviada === "pago" ? "¡Enviado!" : "Pago"}</span>
          </button>
        </div>
      </div>

      {/* ── 4. Notas Internas del Cliente ── */}
      <div>
        <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Notas internas del cliente
        </label>
        <textarea
          rows={2}
          value={notasContacto}
          onChange={(e) => guardarNotas(e.target.value)}
          placeholder="Notas solo visibles para el equipo..."
          className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/70 p-2.5 text-xs text-gray-800 placeholder:text-gray-400 transition-colors focus:border-brand-500 focus:bg-white focus:outline-hidden dark:border-gray-800 dark:bg-gray-900 dark:text-white"
        />
      </div>

      {/* ── 5. Historial de Pedidos del Contacto ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Pedidos del cliente ({pedidos.length})
          </label>
          {pedidos.length > 0 && (
            <button
              type="button"
              onClick={() => navigate("/pedidos")}
              className="text-[11px] font-semibold text-brand-600 hover:underline dark:text-brand-400"
            >
              Ver Kanban →
            </button>
          )}
        </div>

        {pedidos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200/90 bg-gray-50/40 p-3 text-center dark:border-gray-800 dark:bg-white/[0.01]">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Sin pedidos registrados aún
            </p>
            <button
              type="button"
              onClick={() => setModalCrearOpen(true)}
              className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-brand-500 hover:underline"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Cargar primer pedido</span>
            </button>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {pedidos.map((pedido) => (
              <PedidoItemCard key={pedido.id} pedido={pedido} />
            ))}
          </ul>
        )}
      </div>

      {/* Modal de creación rápida */}
      <CrearPedidoRapidoModal
        isOpen={modalCrearOpen}
        onClose={() => setModalCrearOpen(false)}
        clienteNombre={nombre}
        clienteTelefono={telefono}
      />
    </div>
  );
});

export default PanelContexto;

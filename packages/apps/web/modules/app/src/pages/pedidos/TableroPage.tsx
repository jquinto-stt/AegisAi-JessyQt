import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Badge } from "@/elements/ui/badge";
import { Button } from "@/elements/ui/button";
import { Modal } from "@/elements/ui/modal";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/elements/ui/table";
import { SearchInput } from "@/elements";
import {
  pedidosStore,
  ETIQUETA_PAGO,
  puedeMoverA,
  puedeCancelarPedido,
  puedeConfirmarPedido,
  puedeEscribirCliente,
  puedeVerProgramados,
  puedeGestionarProgramados,
  puedeCrearPedido,
  puedeGuardarConfig,
} from "@/stores";
import type { Pedido, PedidoEstado, Modalidad } from "@/stores/pedidos.store";
import { retardoEscalonado } from "@/utils";
import { useFlipLista } from "@/hooks/useFlipLista";
import { ProgramarModal } from "./ProgramarModal";
import { DetallePedidoModal } from "./DetallePedidoModal";
import {
  avanzarPedido,
  cancelarPedido,
} from "./pedidos.notificaciones";
import { BUSINESS_PROFILES } from "@/domain/pedidos/pedidos.profiles";
import { ChatDrawer } from "@/pages/conversaciones/components/ChatDrawer";
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  EllipsisHorizontalIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

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

// ═══════════════════════════════════════════════════════════════════════════
// ENVOLTURA DE TARJETA DEL KANBAN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Cuánto tiempo conserva una tarjeta su animación de entrada.
 *
 * 500 ms = el retardo máximo del escalonado (`retardoEscalonado`, tope 240 ms)
 * más los 240 ms que dura `entrada-lista`, con margen.
 */
const VENTANA_ENTRADA_MS = 500;

/**
 * `TarjetaKanban` — la envoltura que lleva `data-flip` y la animación de entrada.
 *
 * Existe por una razón concreta, y es la única forma de resolverla: **una
 * animación de CSS se reinicia cuando su nodo se mueve dentro del DOM.** React
 * reordena una lista moviendo nodos con `insertBefore`, así que al reordenar el
 * tablero —ordenar, filtrar— las tarjetas que React recoloca **volvían a
 * desvanecerse** como si acabaran de aparecer.
 *
 * ## El diagnóstico costó dos intentos, y el primero fue la hipótesis equivocada
 *
 * Se creyó que el culpable era el `animation-delay`, que sale del índice y por
 * tanto cambia al reordenar. Se congeló el retardo por tarjeta y **el problema
 * siguió**: medido, la tarjeta que se re-disparaba tenía un retardo idéntico
 * antes y después (`0s` → `0s`). El retardo no era la causa; el movimiento del
 * nodo sí. Congelarlo, además, traía su propio defecto: la primera vez que se ve
 * una tarjeta puede caer en mitad de la carga desde Supabase, así que se
 * congelaba un índice transitorio y el escalonado salía arbitrario.
 *
 * ## La solución: una ventana acotada
 *
 * Pasado `VENTANA_ENTRADA_MS` se retiran la clase y el retardo, y **un elemento
 * sin `animation-name` no puede reiniciar nada**. La entrada se conserva entera
 * —el escalonado del montaje sigue igual— y deja de ser un suceso repetible.
 *
 * De paso arregla un segundo re-disparo del mismo origen: al mover un pedido, la
 * clase es `animate-aterrizaje` mientras `recienMovidoId` sigue puesto; al
 * limpiarse, la clase volvía a `animate-entrada-lista` y la tarjeta se
 * desvanecía **1,2 s después de haber llegado**. Con la ventana ya no hay clase
 * que cambiar a esa altura. El aro de resalte no depende de esto: lo pinta
 * `PedidoCard` con `esRecienMovido`.
 */
const TarjetaKanban = ({
  pedidoId,
  animacion,
  retardo,
  children,
}: {
  pedidoId: string;
  animacion: string;
  retardo: string;
  children: React.ReactNode;
}) => {
  const [animando, setAnimando] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setAnimando(false), VENTANA_ENTRADA_MS);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div
      data-flip={pedidoId}
      className={animando ? animacion : undefined}
      style={animando ? { animationDelay: retardo } : undefined}
    >
      {children}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// TARJETA DE PEDIDO
// ═══════════════════════════════════════════════════════════════════════════


const PedidoCard = observer(
  ({
    pedido,
    esRecienMovido = false,
    puedeArrastrar = false,
    onDragChange,
    onDetalle,
    onCancelar,
    onConfirmarEntrega,
    onChat,
  }: {
    pedido: Pedido;
    esRecienMovido?: boolean;
    /**
     * ¿La sesión puede mover este pedido a ALGUNA otra columna?
     *
     * Se calcula en `ColumnaKanban`, que es quien conoce la lista de columnas.
     * Sin esto la tarjeta era `draggable` siempre: se dejaba agarrar, se veía la
     * ranura de destino y al soltar **no pasaba nada** — el peor tipo de control,
     * porque promete una acción que la sesión no puede ejecutar.
     */
    puedeArrastrar?: boolean;
    onDragChange?: (id: string, isDragging: boolean) => void;
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

    const primerItemNombre = pedido.items?.[0]?.nombre;
    const [isDragging, setIsDragging] = useState(false);

    // Ranura visual en el lugar de origen mientras se arrastra
    if (isDragging) {
      return (
        <div
          onDragEnd={() => {
            setIsDragging(false);
            onDragChange?.(pedido.id, false);
          }}
          className="relative select-none rounded-2xl border-2 border-dashed border-brand-400 bg-brand-50/60 dark:bg-brand-950/30 p-5 text-center min-h-[140px] flex flex-col items-center justify-center gap-2 animate-pulse transition-all shadow-inner"
        >
          <div className="flex size-7 items-center justify-center rounded-full bg-brand-500/15 text-brand-600 dark:text-brand-300 font-bold text-xs font-mono">
            {pedido.numero || "P-000"}
          </div>
          <p className="text-xs font-bold text-brand-700 dark:text-brand-300">
            Moviendo {pedido.numero}...
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Suelta en cualquier columna de destino
          </p>
        </div>
      );
    }

    return (
      <div
        role="button"
        tabIndex={0}
        draggable={puedeArrastrar}
        onDragStart={(e) => {
          if (!puedeArrastrar) return;
          e.dataTransfer.setData("text/plain", pedido.id);
          e.dataTransfer.effectAllowed = "move";
          // Esperar al siguiente ciclo para que el navegador capture la tarjeta completa y nítida
          setTimeout(() => {
            setIsDragging(true);
            onDragChange?.(pedido.id, true);
          }, 0);
        }}
        onDragEnd={() => {
          setIsDragging(false);
          onDragChange?.(pedido.id, false);
        }}
        onClick={onDetalle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onDetalle();
          }
        }}
        className={`group relative select-none rounded-2xl border bg-white p-4 sm:p-5 shadow-theme-xs transition-all duration-300 ease-out hover:shadow-theme-md hover:-translate-y-0.5 hover:border-secondary-300 dark:bg-gray-900/90 dark:hover:border-brand-600 ${
          puedeArrastrar ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
        } ${
          esRecienMovido
            ? "animate-aterrizaje ring-2 ring-brand-500 shadow-theme-xl border-brand-400 bg-brand-50/20 dark:bg-brand-950/30"
            : urgente
            ? "border-error-300 dark:border-error-800"
            : "border-gray-100 dark:border-gray-800"
        }`}
      >
        {/* Cabecera de la tarjeta: Cliente + Número de pedido y Grip handle de manipulación */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm sm:text-base font-bold text-ink-title dark:text-white truncate leading-snug">
              {pedido.cliente || `Pedido ${pedido.numero || ""}`}
            </h3>
            <p className="mt-0.5 text-xs font-mono font-semibold text-gray-500 dark:text-gray-400">
              {pedido.numero || "P-000"}
            </p>
          </div>

          {/* Símbolo de puntos 2x3 para indicar que la tarjeta se manipula/arrastra */}
          <div
            className="flex size-7 items-center justify-center rounded-lg text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-colors shrink-0 cursor-grab active:cursor-grabbing"
            title="Arrastrar para mover de columna"
            aria-label="Arrastrar pedido"
          >
            <svg
              className="size-4 text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300 transition-colors"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <circle cx="9" cy="6" r="1.75" />
              <circle cx="15" cy="6" r="1.75" />
              <circle cx="9" cy="12" r="1.75" />
              <circle cx="15" cy="12" r="1.75" />
              <circle cx="9" cy="18" r="1.75" />
              <circle cx="15" cy="18" r="1.75" />
            </svg>
          </div>
        </div>

        {/* Descripción de ítems (menciona los productos exactamente una vez) */}
        {(descripcionItems || primerItemNombre) && (
          <p className="mt-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium line-clamp-2">
            {descripcionItems || primerItemNombre}
          </p>
        )}

        {/* Metadatos inferiores: Fecha/Tiempo y Tag */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-50 dark:border-gray-800/60 text-xs text-gray-400 dark:text-gray-400">
          <div className="flex items-center gap-1.5 font-medium">
            <CalendarDaysIcon className="size-3.5 text-gray-400" />
            <span className="text-[11px] sm:text-xs text-gray-600 dark:text-gray-300">
              {fechaAmigable()}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                pedidosStore.togglePagado(pedido.id);
              }}
              title={pedido.pagado ? "Pedido pagado. Clic para marcar como pendiente" : "Pendiente de pago. Clic para registrar pago"}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer select-none flex items-center gap-1.5 ${
                pedido.pagado
                  ? "bg-accent-50 text-accent-700 hover:bg-accent-100 dark:bg-accent-950/40 dark:text-accent-300"
                  : "bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-950/40 dark:text-brand-300 ring-1 ring-inset ring-brand-300/60 dark:ring-brand-800"
              }`}
            >
              <span className={`size-1.5 rounded-full ${pedido.pagado ? "bg-accent-500" : "bg-brand-500"}`} />
              <span>{pedido.pagado ? "Pagado" : "Por cobrar"}</span>
            </button>

            {puedeEscribir && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChat();
                }}
                className="flex items-center gap-1 rounded-lg border border-accent-200 bg-accent-50/70 hover:bg-accent-100 px-2 py-1 text-[11px] font-medium text-accent-700 dark:border-accent-800 dark:bg-accent-950/40 dark:text-accent-300 transition-colors cursor-pointer"
                title="Abrir chat con el cliente"
              >
                <WhatsAppIcon />
                <span>Chat</span>
              </button>
            )}
          </div>
        </div>

        {/* Barra de acciones operativas (Avanzar estado a la izquierda / Cancelar a la derecha) */}
        {!sinAcciones && (
          <div className="mt-3 flex items-center justify-between gap-3 pt-1" onClick={stop}>
            <div>
              {siguiente && puedeAvanzar && (
                <button
                  type="button"
                  onClick={handleAvanzar}
                  className="rounded-lg bg-brand-500 hover:bg-brand-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-theme-xs transition-colors cursor-pointer"
                >
                  {pedidosStore.estadoLabel(siguiente)} →
                </button>
              )}
            </div>

            {puedeCancelar && (
              <button
                type="button"
                onClick={onCancelar}
                className="text-xs font-medium text-error-500 hover:text-error-600 hover:underline transition-colors cursor-pointer px-1 py-1"
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
// MODAL: CONFIRMAR CANCELACIÓN (con motivo opcional)
// ═══════════════════════════════════════════════════════════════════════════

const inputBase =
  "w-full rounded-lg border bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:text-white/90 dark:placeholder:text-white/30";
const inputOk = "border-gray-300 focus:border-secondary-300 focus:ring-secondary-500/20 dark:border-gray-700";

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
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-50 text-accent-500 dark:bg-accent-500/10">
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
        (clickable ? "cursor-pointer hover:border-secondary-300 dark:hover:border-brand-500 " : "") +
        (focusId === p.id
          ? "border-secondary-500 bg-secondary-50 ring-2 ring-brand-500/30 dark:border-accent-500 dark:bg-brand-500/10"
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
          <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-secondary-600 dark:text-brand-400">
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
                className="text-xs font-medium text-secondary-600 hover:text-secondary-600 dark:text-brand-400"
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
              className="text-xs font-medium text-secondary-600 hover:text-secondary-600 dark:text-brand-400"
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
            className="mt-3 w-full rounded-xl border border-dashed border-gray-200 py-2.5 text-center text-xs font-medium text-gray-500 transition-colors hover:border-secondary-300 hover:text-secondary-600 dark:border-gray-800 dark:text-gray-400 dark:hover:border-brand-500"
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
              className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-secondary-300 focus:outline-hidden focus:ring-3 focus:ring-secondary-500/20 dark:border-gray-700 dark:text-white/90"
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
    // por `channels.respond`, cancelar por `orders.cancel`.
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
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-secondary-50 hover:text-secondary-600 dark:text-gray-200 dark:hover:bg-brand-500/10"
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
                <TableCell header>Pago</TableCell>
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
                      {/* Registrar/deshacer un pago es la MISMA acción que el
                          «Marcar como pagado» del detalle, así que la gobierna
                          la misma capacidad (`orders.confirm`). Estaba sin
                          guarda: la vista Lista era una segunda superficie que
                          cobraba sin permiso mientras la del detalle sí lo
                          comprobaba. Sin la capacidad queda como indicador de
                          solo lectura, que informa sin prometer. */}
                      {puedeConfirmarPedido() ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            pedidosStore.togglePagado(p.id);
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer select-none ${
                            p.pagado
                              ? "bg-accent-50 text-accent-700 hover:bg-accent-100 dark:bg-accent-950/40 dark:text-accent-300"
                              : "bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-950/40 dark:text-brand-300 ring-1 ring-inset ring-brand-300/60 dark:ring-brand-800"
                          }`}
                          title={p.pagado ? "Pagado (clic para marcar como pendiente)" : "Pendiente de pago (clic para registrar pago)"}
                        >
                          <span className={`size-1.5 rounded-full ${p.pagado ? "bg-accent-500" : "bg-brand-500"}`} />
                          {p.pagado ? "Pagado" : "Por cobrar"}
                        </button>
                      ) : (
                        <Badge color={p.pagado ? "success" : "warning"} size="sm">
                          {p.pagado ? "Pagado" : "Por cobrar"}
                        </Badge>
                      )}
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
      // El rótulo decía «Kanban», que es jerga de metodología: describe cómo está
      // hecha la vista, no lo que el usuario ve. Se cambia a «Tabla» (09/10) — la
      // CLAVE sigue siendo `kanban`, porque viaja en el almacenamiento
      // (`loadVista`/`saveVista`) y renombrarla invalidaría la preferencia de
      // quien ya la tenía guardada.
      label: "Tabla",
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

interface ColumnaKanbanProps {
  estado: PedidoEstado;
  colIndex: number;
  columnas: PedidoEstado[];
  items: Pedido[];
  recienMovidoId?: string | null;
  /**
   * Mueve un pedido a otra columna. **Obligatorio**: es el embudo único por el
   * que pasa la autorización del arrastre. Antes era opcional y el `else`
   * llamaba `pedidosStore.moverAColumna` directo — un SEGUNDO camino de
   * escritura que se saltaba `puedeMoverA`. Un dueño por acción.
   */
  onMoverPedido: (id: string, destino: PedidoEstado) => void;
  onDragChange?: (id: string, isDragging: boolean) => void;
  menuColumnaId: string | null;
  setMenuColumnaId: (id: string | null) => void;
  setNuevoLabelEdit: (label: string) => void;
  setModalRenombrar: (val: { id: string; label: string } | null) => void;
  onDetalle: (id: string) => void;
  onCancelar: (id: string) => void;
  onConfirmarEntrega: (id: string) => void;
  onChat: (id: string) => void;
}

const ColumnaKanban = observer(({
  estado,
  colIndex,
  columnas,
  items,
  recienMovidoId,
  onMoverPedido,
  onDragChange,
  menuColumnaId,
  setMenuColumnaId,
  setNuevoLabelEdit,
  setModalRenombrar,
  onDetalle,
  onCancelar,
  onConfirmarEntrega,
  onChat,
}: ColumnaKanbanProps) => {
  const [isDragOver, setIsDragOver] = useState(false);

  // ¿Puede la sesión soltar un pedido en ALGUNA columna distinta de esta? Se
  // resuelve una vez por columna, no por tarjeta: depende de la sesión y de la
  // lista de columnas, no del pedido. Si es `false`, las tarjetas no se dejan
  // agarrar — ver `puedeArrastrar` en `PedidoCard`.
  const puedeSoltarEnAlguna = columnas.some((destino) => destino !== estado && puedeMoverA(destino));

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (!isDragOver) setIsDragOver(true);
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDragOver(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const id = e.dataTransfer.getData("text/plain");
        if (id) onMoverPedido(id, estado);
      }}
      className={`flex flex-col h-full max-h-full min-h-0 rounded-3xl transition-all duration-200 ease-out overflow-hidden p-3 sm:p-4 ${
        isDragOver
          ? "bg-brand-50/70 ring-2 ring-brand-400/80 border-brand-300 dark:bg-brand-950/40 dark:border-brand-500/60 dark:ring-brand-500/40 scale-[1.01]"
          : "bg-gray-50/90 dark:bg-white/[0.02] border border-gray-100/80 dark:border-gray-800/60"
      }`}
    >
      {/* Cabecera de la columna con nombre, contador suave y botón de tres puntos */}
      <div className="shrink-0 mb-3 flex items-center justify-between px-1.5 pt-1 relative">
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm sm:text-base font-bold text-ink-title dark:text-white">
            {pedidosStore.estadoLabel(estado)}
          </h2>
          <span className="flex size-6 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-700 shadow-theme-xs border border-gray-100 dark:border-gray-700/80 dark:bg-gray-800 dark:text-gray-200">
            {items.length}
          </span>
        </div>

        {puedeGuardarConfig() && (
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
              <EllipsisHorizontalIcon className="size-4" />
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
                <PencilIcon className="size-3.5 text-gray-400" />
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
                  <ArrowLeftIcon className="size-3.5 text-gray-400" />
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
                  <ArrowRightIcon className="size-3.5 text-gray-400" />
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
                <TrashIcon className="size-3.5 text-error-500" />
                <span>Eliminar columna</span>
              </button>
            </div>
          )}
        </div>
      )}
      </div>

      {/* Lista de tarjetas Kanban con scroll interno independiente */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-3.5 [scrollbar-width:thin] transition-all">
        {/* Ranura animada de destino cuando se arrastra sobre esta columna */}
        {isDragOver && (
          <div className="rounded-2xl border-2 border-dashed border-brand-500 bg-brand-50/70 dark:bg-brand-950/40 p-4 flex items-center justify-center gap-2.5 text-center animate-pulse transition-all shadow-theme-xs select-none">
            <ArrowDownTrayIcon className="size-4.5 text-brand-500 animate-bounce" />
            <div className="text-left">
              <span className="text-xs font-bold text-brand-700 dark:text-brand-300 block">
                Soltar pedido aquí
              </span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                Se moverá a {pedidosStore.estadoLabel(estado)}
              </span>
            </div>
          </div>
        )}

        {items.map((p, i) => {
          const esRecienMovido = p.id === recienMovidoId;
          return (
            <TarjetaKanban
              key={p.id}
              pedidoId={p.id}
              animacion={esRecienMovido ? "animate-aterrizaje" : "animate-entrada-lista"}
              retardo={esRecienMovido ? "0ms" : retardoEscalonado(i)}
            >
              <PedidoCard
                pedido={p}
                esRecienMovido={esRecienMovido}
                puedeArrastrar={puedeSoltarEnAlguna}
                onDragChange={onDragChange}
                onDetalle={() => onDetalle(p.id)}
                onCancelar={() => onCancelar(p.id)}
                onConfirmarEntrega={() => onConfirmarEntrega(p.id)}
                onChat={() => onChat(p.id)}
              />
            </TarjetaKanban>
          );
        })}
        {items.length === 0 && !isDragOver && (
          <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200/80 py-12 text-center text-xs font-medium text-gray-400 dark:border-gray-800/80">
            Sin pedidos
          </div>
        )}
      </div>
    </div>
  );
});

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
 *   | Abrir WhatsApp del cliente      | `channels.respond`   |
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
  const [busquedaTablero, setBusquedaTablero] = useState("");
  /** El campo de búsqueda se muestra bajo demanda desde la lupa de la barra. */
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);

  type FiltroPago = "todos" | "pendientes" | "pagados";
  const [filtroPago, setFiltroPago] = useState<FiltroPago>("todos");

  // Gestión dinámica de columnas
  const [menuColumnaId, setMenuColumnaId] = useState<string | null>(null);
  const [modalNuevaColumna, setModalNuevaColumna] = useState(false);
  const [nuevoNombreColumna, setNuevoNombreColumna] = useState("");
  const [modalRenombrar, setModalRenombrar] = useState<{ id: string; label: string } | null>(null);
  const [nuevoLabelEdit, setNuevoLabelEdit] = useState("");

  const [focusId, setFocusId] = useState<string | null>(null);
  const [vista, setVista] = useState<VistaTablero>(loadVista);
  // Rastreo de arrastre activo y última tarjeta reubicada para animación de aterrizaje
  const [, setArrastrandoId] = useState<string | null>(null);
  const [recienMovidoId, setRecienMovidoId] = useState<string | null>(null);

  // Embudo ÚNICO de todo movimiento por arrastre. `puedeMoverA(destino)` es la
  // misma compuerta que usan los botones de avance: sin ella, arrastrar era el
  // único camino del tablero que NO pasaba por autorización — un Vendedor podía
  // soltar un pedido en `en_preparacion` (no tiene `preparation.manage`) y
  // Preparación podía soltarlo en `confirmado` (no tiene `orders.confirm`).
  // El movimiento se ignora en silencio a propósito: la tarjeta ya no es
  // arrastrable hacia un destino sin capacidad (ver `puedeArrastrar`), así que
  // llegar aquí significa que el destino cambió mientras se arrastraba.
  const handleMoverPedido = (id: string, destino: PedidoEstado) => {
    if (!puedeMoverA(destino)) return;
    setRecienMovidoId(id);
    pedidosStore.moverAColumna(id, destino);
    setTimeout(() => {
      setRecienMovidoId(null);
    }, 1200);
  };

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
  // Enfoque y filtros al llegar desde el dashboard o URL:
  // ?detalle=<id> (abre modal detalle)
  // ?estado=<estado o e1,e2> (filtra columnas/lista por esa etapa)
  // ?pago=<pendientes|pagados|todos> (filtra por estado de pago; lo emite el
  //   donut de pagos — es su única superficie desde el 09/10, cuando se retiró
  //   el selector de la barra del tablero)
  // ?focus=<id> (resalta pedido programado)
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

    // ?estado=<estado> → filtra la columna o conjunto de estados en el tablero.
    const est = searchParams.get("estado");
    if (est) {
      setColumnaFiltroActiva(est);
      next.delete("estado");
      cambiar = true;
    }

    // ?pago=<pendientes|pagados|todos> → aplica el filtro de pagos.
    const pagoParam = searchParams.get("pago");
    if (pagoParam === "pendientes" || pagoParam === "pagados" || pagoParam === "todos") {
      setFiltroPago(pagoParam);
      next.delete("pago");
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
  }, [searchParams, setSearchParams]);

  const columnas = pedidosStore.columnasTablero;
  const detalle = detalleId ? pedidosStore.getPedido(detalleId) ?? null : null;
  const paraCancelar = cancelarId ? pedidosStore.getPedido(cancelarId) ?? null : null;
  const paraEntrega = entregaId ? pedidosStore.getPedido(entregaId) ?? null : null;
  const paraReprogramar = reprogramarId ? pedidosStore.getPedido(reprogramarId) ?? null : null;

  const pedidosDeColumna = (estado: PedidoEstado): Pedido[] => {
    let list = pedidosStore.porEstado(estado);
    if (filtroPago === "pendientes") {
      list = list.filter((p) => !p.pagado);
    } else if (filtroPago === "pagados") {
      list = list.filter((p) => Boolean(p.pagado));
    }
    const q = busquedaTablero.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const clienteMatch = p.cliente?.toLowerCase().includes(q);
        const numeroMatch = p.numero?.toLowerCase().includes(q);
        const itemsMatch = p.items?.some((it) => it.nombre.toLowerCase().includes(q));
        return clienteMatch || numeroMatch || itemsMatch;
      });
    }
    // Orden FIJO: más recientes primero. Era el criterio por defecto del
    // selector de orden, que se retiró el 09/10 junto con el filtro de pago del
    // popover «Filtrar y ordenar». Se deja escrito aquí y no en un `sort` que
    // nadie configura: un orden que ya no se puede cambiar no es un ajuste, es
    // la forma en que el tablero presenta la columna.
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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

  // ── «Modo Cocina / KDS» — RETIRADO el 09/10 ──────────────────────────────
  //
  // Aquí vivía una vista que estrechaba el tablero a dos columnas
  // (`en_preparacion` y `listo`) y se auto-activaba para los perfiles de
  // preparación, con un botón para que el admin la encendiera a mano.
  //
  // Se retira porque el producto **no es un restaurante**: el perfil comercial
  // es configurable y puede ser venta de ropa, ferretería o cualquier otro
  // retail. Una pantalla que se pliega sola por el nombre del rol y habla de
  // «cocina» y «comandas» deja de ser neutral en cuanto el negocio cambia, y
  // el tablero es la pantalla que más se mira.
  //
  // Qué NO se toca: la capacidad `preparation.manage` sigue gobernando las
  // etapas de preparación (avanzar a `en_preparacion`, `listo`, `en_camino` y
  // `entregado`), y `en_preparacion` sigue siendo una etapa del pipeline. Lo
  // retirado es la VISTA, no la autorización ni el flujo.

  // Filtrado de columnas visibles según la pestaña seleccionada
  const columnasVisibles = columnas.filter((estado) => {
    if (columnaFiltroActiva === "all") return true;
    if (columnaFiltroActiva.includes(",")) {
      return columnaFiltroActiva.split(",").map((s) => s.trim()).includes(estado);
    }
    return estado === columnaFiltroActiva;
  });

  // FLIP del tablero. La firma describe el orden actual —cada columna visible y
  // los pedidos que tiene, en orden—, así que el efecto solo se dispara cuando
  // algo cambió de sitio de verdad. Sin ella habría que medir en cada render, y
  // el store tiene un `tick` por segundo: sería forzar un cálculo de layout cada
  // segundo para descubrir que nada se movió.
  const firmaTablero = columnasVisibles
    .map((estado) => `${estado}:${pedidosDeColumna(estado).map((p) => p.id).join(",")}`)
    .join("|");
  const tableroRef = useFlipLista<HTMLDivElement>(firmaTablero);

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
            <span className="whitespace-nowrap">Todas las tareas</span>
            <span
              className={`flex size-5.5 items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                columnaFiltroActiva === "all"
                  ? "bg-secondary-50 text-secondary-600 dark:bg-accent-950 dark:text-accent-400"
                  : "bg-gray-200/80 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              {totalTareasGlobal}
            </span>
          </button>

          {columnas.map((estado) => {
            const count = pedidosDeColumna(estado).length;
            const activa =
              columnaFiltroActiva === estado ||
              (columnaFiltroActiva.includes(",") &&
                columnaFiltroActiva.split(",").map((s) => s.trim()).includes(estado));
            return (
              <button
                key={estado}
                type="button"
                onClick={() => setColumnaFiltroActiva(columnaFiltroActiva === estado ? "all" : estado)}
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
                      ? "bg-secondary-50 text-secondary-600 dark:bg-accent-950 dark:text-accent-400 font-bold"
                      : "bg-gray-200/80 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Acciones derechas: Chips de filtros activos + Buscador (lupa) + VistaToggle + Crear pedido */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-end lg:self-auto">
          {/* Chip de filtro activo de pago */}
          {filtroPago !== "todos" && (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:border-brand-900 dark:bg-brand-950/60 dark:text-brand-300">
              <span>Pago: {filtroPago === "pagados" ? "Pagados" : "Por cobrar"}</span>
              <button
                type="button"
                onClick={() => setFiltroPago("todos")}
                className="hover:text-brand-900 dark:hover:text-white cursor-pointer"
                title="Quitar filtro de pago"
              >
                <XMarkIcon className="size-3.5" />
              </button>
            </span>
          )}

          {/* Chip de filtro activo de etapa */}
          {columnaFiltroActiva !== "all" && (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-secondary-200 bg-secondary-50 px-3 py-1.5 text-xs font-semibold text-secondary-700 dark:border-accent-900 dark:bg-accent-950/60 dark:text-accent-300">
              <span>
                Etapa:{" "}
                {columnaFiltroActiva.includes(",")
                  ? columnaFiltroActiva
                      .split(",")
                      .map((s) => pedidosStore.estadoLabel(s.trim() as PedidoEstado))
                      .join(" + ")
                  : pedidosStore.estadoLabel(columnaFiltroActiva as PedidoEstado)}
              </span>
              <button
                type="button"
                onClick={() => setColumnaFiltroActiva("all")}
                className="hover:text-secondary-900 dark:hover:text-white cursor-pointer"
                title="Ver todas las etapas"
              >
                <XMarkIcon className="size-3.5" />
              </button>
            </span>
          )}

          {/* ── Buscador: se abre y se cierra con la lupa ────────────────────
              Antes el buscador vivía dentro de un popover que abría el botón
              «Filtrar y ordenar»; después pasó a estar en línea, y ahora se
              muestra bajo demanda desde la lupa.

              Va a la IZQUIERDA del selector de vista: la lupa y el buscador son
              el control de la izquierda del conmutador, que así queda pegado a
              «Añadir pedido» —la acción de la barra— y no emparedado entre dos
              controles.

              Con él se retiraron el selector de estado de pago y el de orden
              (09/10). El de PAGO sigue existiendo como filtro, pero su superficie
              ya no está aquí: lo pone el donut de pagos navegando a
              `/pedidos?pago=…`, y cuando está activo se ve y se quita con el chip
              «Pago: …» de esta misma barra. El de ORDEN se retira entero —no
              tenía otra superficie— y el tablero queda con un orden fijo: más
              recientes primero, que era su valor por defecto.

              Al cerrar el buscador se LIMPIA el término, y no es un detalle: un
              campo escondido con un filtro vivo deja el tablero recortado sin que
              se vea por qué — justo el control que miente que este proyecto no
              acepta. */}
          {buscadorAbierto ? (
            <SearchInput
              autoFocus
              value={busquedaTablero}
              onChange={(e) => setBusquedaTablero(e.target.value)}
              onClear={() => setBusquedaTablero("")}
              placeholder="Cliente, # pedido, producto…"
              className="h-10 w-48 sm:w-64 shrink-0"
              aria-label="Buscar pedidos en el tablero"
            />
          ) : null}

          <button
            type="button"
            onClick={() => {
              // Al cerrar se limpia: ver el docblock de arriba.
              if (buscadorAbierto) setBusquedaTablero("");
              setBuscadorAbierto((v) => !v);
            }}
            aria-expanded={buscadorAbierto}
            aria-label={buscadorAbierto ? "Ocultar el buscador" : "Buscar pedidos"}
            title={buscadorAbierto ? "Ocultar el buscador" : "Buscar pedidos"}
            className={`flex size-10 shrink-0 items-center justify-center rounded-xl border transition-colors cursor-pointer ${
              buscadorAbierto
                ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-950/40 dark:text-brand-300"
                : "border-gray-200/90 bg-white text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
            }`}
          >
            <MagnifyingGlassIcon className="size-4" />
          </button>

          {/* Selector de vista: Tabla / Lista */}
          <VistaToggle vista={vista} onChange={cambiarVista} />

          {/* Botón "+ Añadir pedido" (Navega a /pedidos/crear).
              Va en el naranja de marca (`bg-brand-500`), el mismo relleno que el
              «Crear pedido» de Inicio: es la acción principal de la barra, y en
              `gray-900` se leía como un control neutro más, al lado del resto de
              controles de filtrado. */}
          {puedeCrearPedido() && (
            <button
              type="button"
              onClick={() => navigate("/pedidos/crear")}
              className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 text-xs sm:text-sm font-semibold shadow-theme-xs transition-colors cursor-pointer shrink-0"
            >
              <PlusIcon className="size-4 stroke-2" />
              <span>Añadir pedido</span>
            </button>
          )}
        </div>
      </div>

      {/* PEDIDOS PROGRAMADOS PARA FECHAS FUTURAS */}
      {verProgramados && (
        <ProgramadosSection
          onCancelar={(p) => abrirCancelar(p.id)}
          onReprogramar={(p) => abrirReprogramar(p.id)}
          onVerTodos={() => setVerTodosProgramados(true)}
          onDetalle={(id) => setDetalleId(id)}
          focusId={focusId}
        />
      )}

      {/* Tablero — vista Kanban o Lista */}
      {vista === "kanban" ? (
        <div
          ref={tableroRef}
          className={`animate-aparecer flex-1 min-h-0 h-full overflow-x-auto grid grid-cols-1 gap-6 ${
            columnasVisibles.length === 1
              ? "max-w-md w-full mr-auto"
              : columnasVisibles.length === 2
              ? "md:grid-cols-2 max-w-3xl w-full mr-auto"
              : columnasVisibles.length === 3
              ? "md:grid-cols-2 xl:grid-cols-3 max-w-5xl w-full mr-auto"
              : columnasVisibles.length === 4
              ? "md:grid-cols-2 xl:grid-cols-4 w-full"
              : "md:grid-cols-2 xl:grid-cols-5 w-full"
          }`}
        >
          {columnasVisibles.map((estado, colIndex) => {
            const items = pedidosDeColumna(estado);
            return (
              <ColumnaKanban
                key={estado}
                estado={estado}
                colIndex={colIndex}
                columnas={columnas}
                items={items}
                recienMovidoId={recienMovidoId}
                onMoverPedido={handleMoverPedido}
                onDragChange={(id, dragging) => setArrastrandoId(dragging ? id : null)}
                menuColumnaId={menuColumnaId}
                setMenuColumnaId={setMenuColumnaId}
                setNuevoLabelEdit={setNuevoLabelEdit}
                setModalRenombrar={setModalRenombrar}
                onDetalle={(id) => setDetalleId(id)}
                onCancelar={abrirCancelar}
                onConfirmarEntrega={abrirEntrega}
                onChat={(id) => setChatDrawerPedidoId(id)}
              />
            );
          })}
        </div>
      ) : (
        <ListaView
          pedidos={columnasVisibles.flatMap((estado) => pedidosDeColumna(estado))}
          onDetalle={(id) => setDetalleId(id)}
          onCancelar={abrirCancelar}
          onConfirmarEntrega={abrirEntrega}
          onChat={(id) => setChatDrawerPedidoId(id)}
        />
      )}

      {detalle && (
        <DetallePedidoModal
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

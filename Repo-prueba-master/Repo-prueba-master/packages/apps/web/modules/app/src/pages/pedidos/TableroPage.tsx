import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Badge } from "@/elements/ui/badge";
import { Button } from "@/elements/ui/button";
import { Modal } from "@/elements/ui/modal";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/elements/ui/table";
import { pedidosStore } from "@/stores";
import type { Pedido, PedidoEstado, Modalidad } from "@/stores/pedidos.store";
import { ProgramarModal } from "./ProgramarModal";

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

/** Abre WhatsApp del cliente en una pestaña nueva (wa.me, solo dígitos). */
const abrirWhatsApp = (telefono: string) => {
  const numero = telefono.replace(/[^\d]/g, "");
  window.open(`https://wa.me/${numero}`, "_blank", "noopener,noreferrer");
};

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
// TARJETA DE PEDIDO
// ═══════════════════════════════════════════════════════════════════════════

const PedidoCard = observer(
  ({
    pedido,
    onDetalle,
    onCancelar,
    onConfirmarEntrega,
  }: {
    pedido: Pedido;
    onDetalle: () => void;
    /** Solicita confirmación de cancelación (modal en el padre). */
    onCancelar: () => void;
    /** Solicita confirmación del paso final →Entregado (modal en el padre). */
    onConfirmarEntrega: () => void;
  }) => {
    const urgente = pedidosStore.esUrgente(pedido);
    const siguiente = pedidosStore.siguienteEstado(pedido);
    const mins = pedidosStore.minutosEnEstado(pedido);

    // El avance a `entregado` es irreversible: pide confirmación. El resto de
    // pasos son reversibles de facto (siguen en curso) y avanzan directo.
    const handleAvanzar = () => {
      if (siguiente === "entregado") onConfirmarEntrega();
      else pedidosStore.avanzar(pedido.id);
    };

    // Evita que un click en la zona de acciones abra el detalle.
    const stop = (e: React.MouseEvent) => e.stopPropagation();

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onDetalle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onDetalle();
          }
        }}
        className={`cursor-pointer rounded-xl border bg-white p-4 shadow-theme-sm transition-colors hover:border-brand-300 hover:shadow-theme-md dark:bg-white/[0.03] dark:hover:border-brand-700 ${
          urgente
            ? "border-error-200 dark:border-error-500/30"
            : "border-gray-200 dark:border-gray-800"
        }`}
      >
        {/* Encabezado: número + modalidad */}
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="text-left">
            <p className="text-sm font-bold text-gray-800 dark:text-white/90">{pedido.numero}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">{pedido.cliente}</p>
          </div>
          <Badge color="light" size="sm">{pedidosStore.modalidadLabel(pedido.modalidad)}</Badge>
        </div>

        {/* Items resumidos */}
        {pedido.items.length > 0 && (
          <p className="mb-2 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
            {pedidosStore.resumenItems(pedido)}
          </p>
        )}

        {/* Tiempo en estado + urgencia */}
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs text-gray-400">Hace {mins} min en este estado</span>
          {urgente && <Badge color="error" size="xs">Urgente</Badge>}
          {pedido.origen === "whatsapp" && <Badge color="success" size="xs">WhatsApp</Badge>}
        </div>

        {/* Acciones primarias (no propagan el click al cuerpo) */}
        <div className="flex flex-wrap items-center gap-2" onClick={stop}>
          {siguiente && (
            <Button size="sm" onClick={handleAvanzar}>
              {pedidosStore.estadoLabel(siguiente)}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            startIcon={<WhatsAppIcon />}
            onClick={() => abrirWhatsApp(pedido.telefono)}
            className="!text-[#17b363] hover:!bg-[#17b363]/10"
          >
            WhatsApp
          </Button>
        </div>

        {/* Acción destructiva separada (evita misclicks junto a "avanzar") */}
        <div className="mt-2 border-t border-gray-100 pt-2 dark:border-gray-800" onClick={stop}>
          <button
            type="button"
            onClick={onCancelar}
            className="text-xs font-medium text-error-500 hover:text-error-600 dark:text-error-400"
          >
            Cancelar pedido
          </button>
        </div>
      </div>
    );
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// DETALLE (modal)
// ═══════════════════════════════════════════════════════════════════════════

const DetalleModal = observer(({ pedido, onClose }: { pedido: Pedido; onClose: () => void }) => {
  const total = pedidosStore.totalPedido(pedido);
  return (
    <Modal isOpen onClose={onClose} className="max-w-lg p-6 sm:p-8">
      {/* Encabezado: título + estado debajo. pr-12 reserva espacio para la X. */}
      <div className="mb-5 pr-12">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">{pedido.numero}</h2>
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

      {/* Items */}
      <div className="mb-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Items</p>
        {pedido.items.length === 0 ? (
          <p className="text-sm text-gray-400">Sin items detallados.</p>
        ) : (
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
            {pedido.items.map((it, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-gray-700 dark:text-gray-300">{it.cantidad}× {it.nombre}</span>
                {it.precio !== undefined && (
                  <span className="text-gray-500 dark:text-gray-400">${(it.precio * it.cantidad).toLocaleString()}</span>
                )}
              </div>
            ))}
            {total > 0 && (
              <div className="flex items-center justify-between px-3 py-2 text-sm font-semibold">
                <span className="text-gray-800 dark:text-white/90">Total</span>
                <span className="text-gray-800 dark:text-white/90">${total.toLocaleString()}</span>
              </div>
            )}
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
        <Button size="sm" variant="ghost" startIcon={<WhatsAppIcon />} onClick={() => abrirWhatsApp(pedido.telefono)} className="!text-[#17b363] hover:!bg-[#17b363]/10">
          WhatsApp
        </Button>
        <Button size="sm" variant="outline" onClick={onClose}>Cerrar</Button>
      </div>
    </Modal>
  );
});

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
      const notaMotivo = motivo.trim();
      if (notaMotivo) {
        // El motivo es opcional; si se indica, se anexa a las notas del pedido.
        pedido.notas = pedido.notas
          ? `${pedido.notas}\nCancelado: ${notaMotivo}`
          : `Cancelado: ${notaMotivo}`;
      }
      pedidosStore.cancelar(pedido.id);
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
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Cancelar {pedido.numero}</h2>
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
      pedidosStore.avanzar(pedido.id);
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
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Marcar como entregado</h2>
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
      <div className="flex shrink-0 flex-col items-end gap-1.5" onClick={stop}>
        <Button size="sm" onClick={() => pedidosStore.activarAhora(p.id)}>Activar ahora</Button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onReprogramar(p)}
            className="text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
          >
            Reprogramar
          </button>
          <span className="text-gray-300 dark:text-gray-700">·</span>
          <button
            type="button"
            onClick={() => onCancelar(p)}
            className="text-xs font-medium text-error-500 hover:text-error-600 dark:text-error-400"
          >
            Cancelar
          </button>
        </div>
      </div>
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
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">Próximos programados</h2>
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
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Pedidos programados</h2>
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
  }: {
    pedido: Pedido;
    onAvanzar: (p: Pedido) => void;
    onCancelar: (id: string) => void;
  }) => {
    const [open, setOpen] = useState(false);
    const siguiente = pedidosStore.siguienteEstado(pedido);

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
            {siguiente && (
              <button
                type="button"
                onClick={run(() => onAvanzar(pedido))}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-600 dark:text-gray-200 dark:hover:bg-brand-500/10"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 7l5 5-5 5" /></svg>
                Avanzar a "{pedidosStore.estadoLabel(siguiente)}"
              </button>
            )}
            <button
              type="button"
              onClick={run(() => abrirWhatsApp(pedido.telefono))}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#17b363] hover:bg-[#17b363]/10"
            >
              <WhatsAppIcon />
              Abrir WhatsApp
            </button>
            <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
            <button
              type="button"
              onClick={run(() => onCancelar(pedido.id))}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              Cancelar pedido
            </button>
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
  }: {
    pedidos: Pedido[];
    onDetalle: (id: string) => void;
    onCancelar: (id: string) => void;
    onConfirmarEntrega: (id: string) => void;
  }) => {
    if (pedidos.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center text-sm text-gray-400 dark:border-gray-800">
          No hay pedidos en curso.
        </div>
      );
    }

    const handleAvanzar = (p: Pedido) => {
      if (pedidosStore.siguienteEstado(p) === "entregado") onConfirmarEntrega(p.id);
      else pedidosStore.avanzar(p.id);
    };

    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
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
              {pedidos.map((p) => {
                const urgente = pedidosStore.esUrgente(p);
                return (
                  // Fila entera clicable → abre el detalle (patrón DropdownTable).
                  <TableRow
                    key={p.id}
                    onClick={() => onDetalle(p.id)}
                    className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03]"
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
                      <AccionesMenu pedido={p} onAvanzar={handleAvanzar} onCancelar={onCancelar} />
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
    <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-gray-800 dark:bg-gray-800/50">
      {opciones.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
            (vista === o.id
              ? "bg-white text-gray-800 shadow-theme-xs dark:bg-gray-900 dark:text-white"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400")
          }
          aria-pressed={vista === o.id}
        >
          {o.icon}
          {o.label}
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
 */
export const TableroPage = observer(() => {
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [cancelarId, setCancelarId] = useState<string | null>(null);
  const [entregaId, setEntregaId] = useState<string | null>(null);
  const [reprogramarId, setReprogramarId] = useState<string | null>(null);
  const [verTodosProgramados, setVerTodosProgramados] = useState(false);
  const [filtro, setFiltro] = useState<Modalidad | typeof FILTRO_TODAS>(FILTRO_TODAS);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [vista, setVista] = useState<VistaTablero>(loadVista);

  const cambiarVista = (v: VistaTablero) => {
    setVista(v);
    saveVista(v);
  };

  const [searchParams, setSearchParams] = useSearchParams();

  // Activación automática de programados: arranca el tick al montar el tablero
  // y lo detiene al desmontar (mock: solo con la pestaña abierta).
  useEffect(() => {
    pedidosStore.iniciarTick();
    return () => pedidosStore.detenerTick();
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
  // Fix #1 (modalidad): muestra las de config + las presentes en pedidos activos.
  const modalidades = pedidosStore.modalidadesTablero;
  const detalle = detalleId ? pedidosStore.getPedido(detalleId) ?? null : null;
  const paraCancelar = cancelarId ? pedidosStore.getPedido(cancelarId) ?? null : null;
  const paraEntrega = entregaId ? pedidosStore.getPedido(entregaId) ?? null : null;
  const paraReprogramar = reprogramarId ? pedidosStore.getPedido(reprogramarId) ?? null : null;

  const pedidosDeColumna = (estado: PedidoEstado): Pedido[] =>
    pedidosStore.porEstado(estado).filter((p) => filtro === FILTRO_TODAS || p.modalidad === filtro);

  return (
    <>
      <PageMeta title="Tablero de pedidos" description="Flujo de pedidos en vivo, de nuevo a entregado" />

      {/* Encabezado */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">Tablero de pedidos</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {pedidosStore.totalEnCurso} pedido{pedidosStore.totalEnCurso === 1 ? "" : "s"} en curso
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Filtro de modalidad */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Modalidad:</span>
            <div className="flex flex-wrap gap-1.5">
              <FiltroChip label="Todas" activo={filtro === FILTRO_TODAS} onClick={() => setFiltro(FILTRO_TODAS)} />
              {modalidades.map((m) => (
                <FiltroChip
                  key={m}
                  label={pedidosStore.modalidadLabel(m)}
                  activo={filtro === m}
                  onClick={() => setFiltro(m)}
                />
              ))}
            </div>
          </div>

          {/* Selector de vista: Kanban / Lista */}
          <VistaToggle vista={vista} onChange={cambiarVista} />
        </div>
      </div>

      {/* Pedidos programados (arriba del kanban, no como columna del pipeline) */}
      <ProgramadosSection
        focusId={focusId}
        onCancelar={(p) => setCancelarId(p.id)}
        onReprogramar={(p) => setReprogramarId(p.id)}
        onVerTodos={() => setVerTodosProgramados(true)}
        onDetalle={(id) => setDetalleId(id)}
      />

      {/* Tablero — vista Kanban o Lista según preferencia */}
      {vista === "kanban" ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
          {columnas.map((estado) => {
            const items = pedidosDeColumna(estado);
            return (
              <div key={estado} className="rounded-2xl bg-gray-50 p-2 dark:bg-white/[0.02]">
                <div className="mb-3 flex items-center justify-between px-2 pt-1">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${pedidosStore.estadoDotClass(estado)}`} />
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {pedidosStore.estadoLabel(estado)}
                    </h2>
                  </div>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {items.length}
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {items.map((p) => (
                    <PedidoCard
                      key={p.id}
                      pedido={p}
                      onDetalle={() => setDetalleId(p.id)}
                      onCancelar={() => setCancelarId(p.id)}
                      onConfirmarEntrega={() => setEntregaId(p.id)}
                    />
                  ))}
                  {items.length === 0 && (
                    <p className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-xs text-gray-400 dark:border-gray-800">
                      Sin pedidos
                    </p>
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
          onCancelar={(id) => setCancelarId(id)}
          onConfirmarEntrega={(id) => setEntregaId(id)}
        />
      )}

      {detalle && <DetalleModal pedido={detalle} onClose={() => setDetalleId(null)} />}
      {verTodosProgramados && (
        <ProgramadosModal
          onClose={() => setVerTodosProgramados(false)}
          onCancelar={(p) => setCancelarId(p.id)}
          onReprogramar={(p) => setReprogramarId(p.id)}
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

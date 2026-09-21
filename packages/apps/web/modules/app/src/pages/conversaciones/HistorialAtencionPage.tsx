import { useEffect, useMemo, useRef, useState } from "react";
import { observer } from "mobx-react-lite";
import { useNavigate } from "react-router";

import { PageMeta } from "@/shell/meta";
import { Badge } from "@/elements/ui/badge";
import { Button } from "@/elements/ui/button";
import { Card } from "@/elements/ui/card";
import { Checkbox } from "@/elements/form/checkbox";
import { Dropdown, DropdownItem } from "@/elements/ui/dropdown";
import { Input } from "@/elements/form/input";
import { Modal } from "@/elements/ui/modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/elements/ui/table";
import {
  CheckCircleIcon,
  ChevronLeftIcon,
  ListIcon,
  MoreDotIcon,
  TimeIcon,
} from "@/icons";
import {
  claseSegmentoActivo,
  claseSegmentoInactivo,
  claseSegmentoTrack,
} from "@/pages/config-layout";
import {
  conversacionesStore,
  pedidosStore,
  ESTADO_CONVERSACION_BADGE,
  ESTADO_CONVERSACION_LABEL,
  puedeResponderConversacion,
} from "@/stores";
import type { ConversacionCanal } from "@/stores";
import {
  AVATAR_MAP,
  inicialesDe,
  statusDe,
} from "@/pages/conversaciones/conversaciones.utils";
import { retardoEscalonado } from "@/utils";
import {
  ETAPAS_CRM,
  type EtapaCrmCliente,
  calcularEtapaAutomatica,
  getPasoProgreso,
} from "@/pages/conversaciones/components/PanelContexto";

const ETAPA_CRM_BADGE: Record<
  EtapaCrmCliente,
  { label: string; color: "primary" | "info" | "warning" | "success" | "error" }
> = {
  nuevo: { label: "Nuevo", color: "info" },
  en_conversacion: { label: "En conversación", color: "primary" },
  interesado: { label: "Interesado", color: "warning" },
  cliente: { label: "Cliente", color: "success" },
  perdido: { label: "Perdido", color: "error" },
};

// ═══════════════════════════════════════════════════════════════════════════
// Historial de Atención (Support Tickets)
// ═══════════════════════════════════════════════════════════════════════════
//
// Vista tabular del HISTÓRICO de conversaciones del canal. Es una superficie de
// LECTURA: no muta el pipeline salvo la acción explícita "Marcar como resuelto",
// que re-comprueba la capacidad antes de delegar en `conversacionesStore.cerrar`.
//
// Fuente de verdad: TODOS los valores de negocio (conteos, estados, asuntos,
// orden) salen de selectores de `conversacionesStore`. Esta página no cuenta
// arrays, no traduce estados ni formatea etiquetas por su cuenta.
//
// Aislamiento de estado (defecto evitado): el filtro/orden/página/búsqueda del
// historial son estado LOCAL de React (`useState`), NO se escribe en
// `conversacionesStore.busqueda` ni en `.filtro`. Compartir esos campos haría
// que escribir en el buscador del historial filtrara también la bandeja del chat
// en vivo — dos superficies acopladas por un valor efímero de UI.

/** Página de la tabla (tamaño fijo, como el diseño canónico). */
const POR_PAGINA = 10;

/** El diseño canónico pide 10 por página; el seed tiene 4, así que la tabla
 *  muestra todas las que haya y el paginador refleja el total real. */

/**
 * Eje de filtrado rápido de la tabla. NO reutiliza `FiltroBandeja`: aquel eje
 * (`todas`/`no_leidas`/`requieren_atencion`/`cerradas`) responde a "qué necesita
 * mi atención ahora" en la bandeja lateral, mientras que este responde a "cómo
 * terminó el ticket". Son preguntas distintas y mezclarlas daría un filtro que
 * miente en una de las dos superficies.
 */
type FiltroHistorial = "todos" | "resueltos" | "pendientes" | "en_progreso";

const TABS: ReadonlyArray<{ valor: FiltroHistorial; etiqueta: string }> = [
  { valor: "todos", etiqueta: "Todos" },
  { valor: "resueltos", etiqueta: "Resueltos" },
  { valor: "pendientes", etiqueta: "Pendientes" },
  { valor: "en_progreso", etiqueta: "En curso" },
];

/**
 * Columna ordenable. Solo las tres que el diseño canónico marca con flechas:
 * id, cliente y fecha. Ordenar por "asunto" o "estado" no aporta en un historial.
 */
type OrdenColumna = "id" | "cliente" | "fecha";
type DireccionOrden = "asc" | "desc";

/**
 * Formatea un ISO a "12 Feb, 2026" (formato del diseño canónico).
 *
 * Es una utilidad de PRESENTACIÓN pura sobre un dato que ya viene del store
 * (`ultimaActividad`), no una derivación de negocio: no decide nada, solo pinta.
 * Devuelve `"—"` si la fecha es inválida, para renderizar la ausencia como
 * ausencia en vez de "Invalid Date".
 */
const formatearFecha = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const meses = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${String(d.getDate()).padStart(2, "0")} ${meses[d.getMonth()]}, ${d.getFullYear()}`;
};

/**
 * Ticket ID legible derivado del id REAL de la conversación.
 *
 * NO inventa un número a partir de la posición en la tabla: eso haría que el
 * mismo ticket mostrara un id distinto al reordenar o filtrar (un identificador
 * que cambia según la vista no es un identificador). En su lugar deriva un número
 * estable del propio `conv.id`: `"conv-1"` → `"#TCK-001"`. Si el id no tiene
 * parte numérica, se muestra el id crudo antes que fabricar uno.
 */
const ticketId = (convId: string): string => {
  const numero = convId.match(/(\d+)\s*$/)?.[1];
  if (numero === undefined) return convId;
  return `#TCK-${numero.padStart(3, "0")}`;
};

/** Icono de cabecera de una tarjeta KPI: círculo tintado + glifo. */
const KpiIcono = ({
  tono,
  children,
}: {
  tono: "brand" | "warning" | "success";
  children: React.ReactNode;
}) => {
  const tonos: Record<typeof tono, string> = {
    brand:
      "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400",
    warning:
      "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400",
    success:
      "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400",
  };
  return (
    <span
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tonos[tono]}`}
    >
      {children}
    </span>
  );
};

export const HistorialAtencionPage = observer(() => {
  const navigate = useNavigate();

  // ── Estado de UI (local a esta superficie, ver nota de aislamiento arriba) ──
  const [filtro, setFiltro] = useState<FiltroHistorial>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState<{ columna: OrdenColumna; dir: DireccionOrden }>({
    columna: "fecha",
    dir: "desc",
  });
  const [pagina, setPagina] = useState(1);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [menuAbiertoId, setMenuAbiertoId] = useState<string | null>(null);
  const [detalleId, setDetalleId] = useState<string | null>(null);

  // ── Datos: TODO viene del store ─────────────────────────────────────────────
  // `conversaciones` es la colección observable; los predicados de estado viven
  // en el store (`estaResuelta`/`estaPendiente`/`estaEnProgreso`) y los asuntos
  // en `asuntoDe`. Aquí no se recalcula nada de eso.
  const conversaciones = conversacionesStore.conversaciones;
  const puedeResolver = puedeResponderConversacion();

  /**
   * Filas tras filtro + búsqueda + orden. `useMemo` sobre las dependencias
   * observables: el store sigue siendo la fuente, esto solo evita recomputar en
   * cada render.
   */
  const filas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    const coincideFiltro = (c: ConversacionCanal): boolean => {
      switch (filtro) {
        case "resueltos":
          return conversacionesStore.estaResuelta(c);
        case "pendientes":
          return conversacionesStore.estaPendiente(c);
        case "en_progreso":
          return conversacionesStore.estaEnProgreso(c);
        default:
          return true;
      }
    };

    const coincideBusqueda = (c: ConversacionCanal): boolean => {
      if (termino === "") return true;
      // Cliente, teléfono y asunto — los tres campos que el diseño promete.
      const asunto = conversacionesStore.asuntoDe(c.id);
      return (
        c.contacto.nombre.toLowerCase().includes(termino) ||
        c.contacto.telefono.toLowerCase().includes(termino) ||
        asunto.toLowerCase().includes(termino)
      );
    };

    const filtradas = conversaciones.filter(
      (c) => coincideFiltro(c) && coincideBusqueda(c),
    );

    const signo = orden.dir === "asc" ? 1 : -1;
    return filtradas.slice().sort((a, b) => {
      switch (orden.columna) {
        case "id":
          return a.id.localeCompare(b.id) * signo;
        case "cliente":
          return a.contacto.nombre.localeCompare(b.contacto.nombre) * signo;
        default:
          return a.ultimaActividad.localeCompare(b.ultimaActividad) * signo;
      }
    });
    // `conversaciones` y los predicados del store se leen dentro; el memo se
    // recomputa cuando cambia la colección o los controles de esta vista.
  }, [conversaciones, filtro, busqueda, orden]);

  // ── Paginación ──────────────────────────────────────────────────────────────
  const totalPaginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA));

  // Guarda: si un filtro reduce el total, la página actual puede quedar fuera de
  // rango y la tabla aparecería vacía sin motivo. Se reencuadra al cambiar.
  useEffect(() => {
    if (pagina > totalPaginas) setPagina(totalPaginas);
  }, [pagina, totalPaginas]);

  const inicio = (pagina - 1) * POR_PAGINA;
  const filasPagina = filas.slice(inicio, inicio + POR_PAGINA);
  const desde = filas.length === 0 ? 0 : inicio + 1;
  const hasta = Math.min(inicio + POR_PAGINA, filas.length);

  // ── Selección múltiple ──────────────────────────────────────────────────────
  const todasPaginaSeleccionadas =
    filasPagina.length > 0 &&
    filasPagina.every((c) => seleccionados.has(c.id));

  const alternarTodas = (marcar: boolean) => {
    const siguiente = new Set(seleccionados);
    for (const c of filasPagina) {
      if (marcar) siguiente.add(c.id);
      else siguiente.delete(c.id);
    }
    setSeleccionados(siguiente);
  };

  const alternarUna = (id: string, marcar: boolean) => {
    const siguiente = new Set(seleccionados);
    if (marcar) siguiente.add(id);
    else siguiente.delete(id);
    setSeleccionados(siguiente);
  };

  // ── Acciones de fila ────────────────────────────────────────────────────────

  /**
   * "Abrir en Chat": navega a la consola y deja seleccionada esta conversación.
   * `seleccionar` es la acción canónica del store (fija `seleccionadaId` y marca
   * leído), así que la consola abre en el hilo correcto sin estado duplicado.
   */
  const abrirEnChat = (convId: string) => {
    conversacionesStore.seleccionar(convId);
    navigate("/conversaciones");
  };

  /**
   * "Marcar como resuelto": re-comprueba la capacidad aunque el botón esté
   * oculto (defensa en profundidad — la doctrina exige que toda mutación se
   * vuelva a validar en el punto de escritura, no solo al pintar la UI).
   * Delega en `cerrar`, que ya es fail-safe ante conversación inexistente o ya
   * cerrada.
   */
  const marcarResuelto = (convId: string) => {
    if (!puedeResolver) return;
    conversacionesStore.cerrar(convId);
  };

  // El detalle se resuelve contra el store; si la conversación desapareciera, el
  // modal sencillamente no se pinta (ausencia explícita, sin fallback inventado).
  const detalle =
    detalleId !== null ? conversacionesStore.getConversacion(detalleId) : undefined;

  /** Cambia la columna de orden; en la misma columna, invierte la dirección. */
  const ordenarPor = (columna: OrdenColumna) => {
    setOrden((prev) =>
      prev.columna === columna
        ? { columna, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { columna, dir: columna === "fecha" ? "desc" : "asc" },
    );
  };

  const flecha = (columna: OrdenColumna) => {
    if (orden.columna !== columna) return null;
    return (
      <span className="ml-1 text-gray-400 dark:text-gray-500">
        {orden.dir === "asc" ? "▲" : "▼"}
      </span>
    );
  };

  return (
    <>
      <PageMeta
        title="Historial de atención"
        description="Histórico de tickets de soporte del canal — estado, cliente y resolución"
      />

      {/* ── Conmutador Chat en vivo / Historial ──
          Mismo control que en `/conversaciones`, y mismas tres cadenas de
          color: se importan de `@/pages/config-layout` en vez de repetirlas.
          El activo va en el naranja de marca. */}
      <div className="mb-3 flex items-center justify-between">
        <div className={claseSegmentoTrack}>
          <button
            type="button"
            onClick={() => navigate("/conversaciones")}
            className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors ${claseSegmentoInactivo}`}
          >
            Chat en vivo
          </button>
          <button
            type="button"
            aria-current="page"
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${claseSegmentoActivo}`}
          >
            Historial de atención
          </button>
        </div>
      </div>

      {/* ── Tres tarjetas KPI ── */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <div className="flex items-center gap-4">
            <KpiIcono tono="brand">
              <ListIcon className="h-5 w-5" />
            </KpiIcono>
            <div className="min-w-0">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Tickets totales
              </p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white/90">
                {conversacionesStore.totalTickets}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <KpiIcono tono="warning">
              <TimeIcon className="h-5 w-5" />
            </KpiIcono>
            <div className="min-w-0">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Tickets pendientes
              </p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white/90">
                {conversacionesStore.ticketsPendientes}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <KpiIcono tono="success">
              <CheckCircleIcon className="h-5 w-5" />
            </KpiIcono>
            <div className="min-w-0">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Tickets resueltos
              </p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white/90">
                {conversacionesStore.ticketsResueltos}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Tabla principal ── */}
      <Card className="p-0 sm:p-0">
        {/* Cabecera de la tarjeta: título + buscador + botón de filtro */}
        <div className="flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-ink-title dark:text-white/90">
              Tickets de soporte
            </h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Histórico de conversaciones atendidas del canal
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-full sm:w-64">
              <Input
                type="search"
                placeholder="Buscar por cliente, teléfono o asunto..."
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setPagina(1);
                }}
                aria-label="Buscar tickets"
              />
            </div>
          </div>
        </div>

        {/* Pestañas de filtro rápido */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-gray-200 px-5 py-3 no-scrollbar dark:border-gray-800">
          {TABS.map((t) => {
            const activo = filtro === t.valor;
            return (
              <button
                key={t.valor}
                type="button"
                onClick={() => {
                  setFiltro(t.valor);
                  setPagina(1);
                }}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  activo
                    ? "bg-brand-500 text-white shadow-theme-xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200/80 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"
                }`}
              >
                {t.etiqueta}
              </button>
            );
          })}
        </div>

        {/* Tabla */}
        {filas.length === 0 ? (
          // Estado vacío FUERA de la tabla: `TableCell` no acepta `colSpan`, así
          // que una fila vacía dentro del `<table>` descuadraría las columnas.
          <div className="flex flex-col items-center justify-center gap-2 px-5 py-14 text-center">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              No se encontraron tickets
            </p>
            <p className="max-w-sm text-xs text-gray-500 dark:text-gray-400">
              {busqueda.trim() !== ""
                ? "Ningún ticket coincide con la búsqueda. Prueba con otro término."
                : "No hay tickets en esta categoría."}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell header className="w-12">
                  <Checkbox
                    checked={todasPaginaSeleccionadas}
                    onChange={(marcar) => alternarTodas(marcar)}
                    aria-label="Seleccionar todos los tickets de la página"
                  />
                </TableCell>
                <TableCell header>
                  <button
                    type="button"
                    onClick={() => ordenarPor("id")}
                    className="inline-flex items-center uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    Ticket {flecha("id")}
                  </button>
                </TableCell>
                <TableCell header>
                  <button
                    type="button"
                    onClick={() => ordenarPor("cliente")}
                    className="inline-flex items-center uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    Solicitado por {flecha("cliente")}
                  </button>
                </TableCell>
                <TableCell header>Asunto</TableCell>
                <TableCell header>
                  <button
                    type="button"
                    onClick={() => ordenarPor("fecha")}
                    className="inline-flex items-center uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    Fecha {flecha("fecha")}
                  </button>
                </TableCell>
                <TableCell header>Estado</TableCell>
                <TableCell header>Etapa CRM</TableCell>
                <TableCell header className="w-16">
                  <span className="sr-only">Acciones</span>
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filasPagina.map((conv, i) => {
                const asunto = conversacionesStore.asuntoDe(conv.id);
                const seleccionada = seleccionados.has(conv.id);
                const resuelta = conversacionesStore.estaResuelta(conv);

                return (
                  <TableRow
                    key={conv.id}
                    // El escalonado se calcula sobre el índice DENTRO DE LA PÁGINA, no sobre
                    // el ticket global: la tabla está paginada, y usar el índice absoluto
                    // dejaría la página 3 arrancando en 1,2 s de retardo.
                    style={{ animationDelay: retardoEscalonado(i) }}
                    className="animate-entrada-lista hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                  >
                    <TableCell>
                      <Checkbox
                        checked={seleccionada}
                        onChange={(marcar) => alternarUna(conv.id, marcar)}
                        aria-label={`Seleccionar ticket de ${conv.contacto.nombre}`}
                      />
                    </TableCell>

                    <TableCell>
                      <button
                        type="button"
                        onClick={() => setDetalleId(conv.id)}
                        className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                      >
                        {ticketId(conv.id)}
                      </button>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-xs font-semibold text-gray-600 dark:bg-white/10 dark:text-gray-300">
                          {AVATAR_MAP[conv.id] ? (
                            <img
                              src={AVATAR_MAP[conv.id]}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            inicialesDe(conv.contacto.nombre)
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-800 dark:text-white/90">
                            {conv.contacto.nombre}
                          </p>
                          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                            {conv.contacto.telefono}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      {/*
                        El asunto viene del store (`asuntoDe`). Si el hilo no
                        tiene ningún mensaje del cliente, se renderiza la
                        ausencia explícitamente en vez de un texto de relleno.
                      */}
                      {asunto === "" ? (
                        <span className="text-xs italic text-gray-400 dark:text-gray-500">
                          Sin mensaje del cliente
                        </span>
                      ) : (
                        <span className="line-clamp-2">{asunto}</span>
                      )}
                    </TableCell>

                    <TableCell className="whitespace-nowrap">
                      {formatearFecha(conv.ultimaActividad)}
                    </TableCell>

                    <TableCell>
                      <Badge
                        size="sm"
                        color={ESTADO_CONVERSACION_BADGE[conv.estado]}
                      >
                        {ESTADO_CONVERSACION_LABEL[conv.estado]}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {(() => {
                        const tel = conv.contacto.telefono;
                        const guardada = localStorage.getItem(`crm_etapa_${tel}`) as EtapaCrmCliente | null;
                        const pedidos = pedidosStore.porTelefono(tel);
                        const etapa = guardada ?? calcularEtapaAutomatica(pedidos.length, conv.estado);
                        const meta = ETAPA_CRM_BADGE[etapa];
                        return (
                          <Badge size="sm" color={meta.color}>
                            {meta.label}
                          </Badge>
                        );
                      })()}
                    </TableCell>

                    <TableCell>
                      <div className="relative inline-block">
                        <button
                          type="button"
                          onClick={() =>
                            setMenuAbiertoId(
                              menuAbiertoId === conv.id ? null : conv.id,
                            )
                          }
                          className="dropdown-toggle flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/5 dark:hover:text-gray-300"
                          aria-label={`Acciones del ticket ${ticketId(conv.id)}`}
                          aria-haspopup="menu"
                          aria-expanded={menuAbiertoId === conv.id}
                        >
                          <MoreDotIcon className="h-5 w-5" />
                        </button>

                        <Dropdown
                          isOpen={menuAbiertoId === conv.id}
                          onClose={() => setMenuAbiertoId(null)}
                          className="w-56 p-1.5"
                        >
                          <DropdownItem
                            onItemClick={() => {
                              setMenuAbiertoId(null);
                              abrirEnChat(conv.id);
                            }}
                            className="text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                          >
                            Abrir en chat
                          </DropdownItem>

                          <DropdownItem
                            onItemClick={() => {
                              setMenuAbiertoId(null);
                              setDetalleId(conv.id);
                            }}
                            className="text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                          >
                            Ver detalle del ticket
                          </DropdownItem>

                          {/*
                            "Marcar como resuelto" se OCULTA si el rol no puede
                            responder el canal (la doctrina prefiere ocultar la
                            acción que el rol no puede ejecutar antes que
                            mostrarla deshabilitada) y también si el ticket ya
                            está resuelto: una acción que no haría nada es ruido.
                          */}
                          {puedeResolver && !resuelta && (
                            <DropdownItem
                              onItemClick={() => {
                                setMenuAbiertoId(null);
                                marcarResuelto(conv.id);
                              }}
                              className="text-xs text-success-600 hover:bg-success-50 dark:text-success-400 dark:hover:bg-success-500/10"
                            >
                              Marcar como resuelto
                            </DropdownItem>
                          )}
                        </Dropdown>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Pie: recuento + paginador numérico */}
        {filas.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Mostrando {desde} a {hasta} de {filas.length}
              {seleccionados.size > 0 && ` · ${seleccionados.size} seleccionados`}
            </p>

            <nav
              aria-label="Paginación de tickets"
              className="flex items-center gap-1.5"
            >
              <button
                type="button"
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina <= 1}
                aria-label="Página anterior"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>

              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPagina(n)}
                  aria-current={n === pagina ? "page" : undefined}
                  className={`h-8 min-w-8 rounded-lg px-2 text-xs font-medium transition-colors ${
                    n === pagina
                      ? "bg-brand-500 text-white shadow-theme-xs"
                      : "border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5"
                  }`}
                >
                  {n}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={pagina >= totalPaginas}
                aria-label="Página siguiente"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5"
              >
                {/* No existe un icono "chevron-right": se rota el izquierdo,
                    que es el patrón que ya usa el resto de la plataforma. */}
                <ChevronLeftIcon className="h-4 w-4 rotate-180" />
              </button>
            </nav>
          </div>
        )}
      </Card>

      {/* ── Modal de detalle ── */}
      {detalle !== undefined && (
        <Modal
          isOpen
          onClose={() => setDetalleId(null)}
          className="max-w-lg p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-ink-title dark:text-white/90">
                {ticketId(detalle.id)}
              </h3>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                {detalle.contacto.nombre} · {detalle.contacto.telefono}
              </p>
            </div>
            <Badge size="sm" color={ESTADO_CONVERSACION_BADGE[detalle.estado]}>
              {ESTADO_CONVERSACION_LABEL[detalle.estado]}
            </Badge>
          </div>

          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500 dark:text-gray-400">Asunto</dt>
              <dd className="max-w-[60%] text-right font-medium text-gray-800 dark:text-white/90">
                {conversacionesStore.asuntoDe(detalle.id) || "Sin mensaje del cliente"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500 dark:text-gray-400">Fecha</dt>
              <dd className="font-medium text-gray-800 dark:text-white/90">
                {formatearFecha(detalle.ultimaActividad)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500 dark:text-gray-400">Atención</dt>
              <dd className="font-medium text-gray-800 dark:text-white/90">
                {detalle.atencion === "humano" ? "Asesor humano" : "Bot"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500 dark:text-gray-400">No leídos</dt>
              <dd className="font-medium text-gray-800 dark:text-white/90">
                {detalle.noLeidos}
              </dd>
            </div>
          </dl>

          {/* ── Etapa del Pipeline CRM ── */}
          <div className="mt-5 rounded-xl border border-gray-200/80 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
            <div className="mb-2.5 flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Etapa del pipeline CRM
              </label>
              {(() => {
                const tel = detalle.contacto.telefono;
                const manual = localStorage.getItem(`crm_etapa_${tel}`);
                if (!manual) return <span className="text-[10px] text-gray-400">Auto</span>;
                return (
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem(`crm_etapa_${tel}`);
                      setDetalleId(detalle.id);
                    }}
                    className="text-[10px] font-medium text-brand-600 hover:underline dark:text-brand-400"
                  >
                    Manual (restablecer)
                  </button>
                );
              })()}
            </div>

            <div className="relative flex flex-col pt-0.5">
              {ETAPAS_CRM.map((etapa, idx) => {
                const tel = detalle.contacto.telefono;
                const guardada = localStorage.getItem(`crm_etapa_${tel}`) as EtapaCrmCliente | null;
                const pedidos = pedidosStore.porTelefono(tel);
                const etapaActiva = guardada ?? calcularEtapaAutomatica(pedidos.length, detalle.estado);
                const estado = getPasoProgreso(etapa.id, etapaActiva);
                const isLast = idx === ETAPAS_CRM.length - 1;
                const isCompleted = estado === "completado";
                const isActive = estado === "activo";

                return (
                  <button
                    key={etapa.id}
                    type="button"
                    onClick={() => {
                      localStorage.setItem(`crm_etapa_${tel}`, etapa.id);
                      setDetalleId(detalle.id);
                    }}
                    title={`Cambiar etapa a: ${etapa.label}`}
                    className="group relative flex items-start gap-3 py-1.5 text-left transition-colors"
                  >
                    {!isLast && (
                      <div
                        className={`absolute left-[9px] top-[18px] w-[2px] h-[calc(100%-2px)] ${
                          isCompleted ? "bg-gray-700 dark:bg-gray-400" : "bg-gray-200 dark:bg-gray-800"
                        }`}
                      />
                    )}
                    <div className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center">
                      {isCompleted ? (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-800 text-white shadow-theme-xs dark:bg-gray-200 dark:text-gray-900">
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      ) : isActive ? (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500/15 ring-3 ring-brand-500/20 dark:bg-brand-500/20 dark:ring-brand-500/30">
                          <div className="h-3 w-3 rounded-full bg-gray-900 dark:bg-white" />
                        </div>
                      ) : (
                        <div className="flex h-4.5 w-4.5 items-center justify-center rounded-full border-2 border-gray-300 bg-white transition-colors group-hover:border-gray-500 dark:border-gray-700 dark:bg-gray-900" />
                      )}
                    </div>
                    <div className="flex flex-1 items-center justify-between">
                      <span
                        className={`text-xs transition-colors ${
                          isActive
                            ? "font-bold text-gray-900 dark:text-white"
                            : isCompleted
                              ? "font-medium text-gray-700 dark:text-gray-300"
                              : "text-gray-500 group-hover:text-gray-800 dark:text-gray-400 dark:group-hover:text-gray-200"
                        }`}
                      >
                        {etapa.label}
                      </span>
                      {isActive && (
                        <span className="text-[10px] font-semibold text-brand-600 dark:text-brand-400">
                          Actual
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDetalleId(null)}>
              Cerrar
            </Button>
            {puedeResolver && !conversacionesStore.estaResuelta(detalle) && (
              <Button
                size="sm"
                onClick={() => {
                  marcarResuelto(detalle.id);
                  setDetalleId(null);
                }}
              >
                Marcar como resuelto
              </Button>
            )}
          </div>
        </Modal>
      )}
    </>
  );
});

export default HistorialAtencionPage;

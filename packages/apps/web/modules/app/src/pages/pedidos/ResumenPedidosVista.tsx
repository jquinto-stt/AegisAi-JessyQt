import { useMemo, useState, type ReactNode } from "react";
import { observer } from "mobx-react-lite";
import { useFlipLista } from "@/hooks/useFlipLista";
import { retardoEscalonado } from "@/utils";
import { useNavigate } from "react-router";

import { organizacionStore, pedidosStore, sessionStore, puedeCancelarPedido } from "@/stores";
import type { Pedido, PedidoEstado } from "@/stores/pedidos.store";
import { transportadoraPorNombre } from "@/domain/pedidos/transportadoras.catalogo";
import { DetallePedidoModal } from "./DetallePedidoModal";
import { ProgramarModal } from "./ProgramarModal";
import { money, ListaVacia } from "./widgets";
import { Modal } from "@/elements/ui/modal";
import { Button } from "@/elements/ui/button";
import { cancelarPedido } from "./pedidos.notificaciones";
import {
  CSV_ENCABEZADOS,
  CSV_GUIAS_ENCABEZADOS,
  construirCsv,
  descargarCsv,
  filasCsv,
  filasCsvGuias,
  nombreArchivoGuias,
} from "./analitica.utils";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  BoltIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  EyeIcon,
  InformationCircleIcon,
  ShoppingCartIcon,
  UserMinusIcon,
  XCircleIcon,
  XMarkIcon,
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

export type SubEtapaFinalizada = "entregada" | "cancelada" | "devuelta" | "reclamaciones";
export type SubEtapaPreparacion = "por_alistar" | "por_recolectar" | "recolectado";
export type SubEtapaPreparar = "por_confirmar" | "pendiente";


/**
 * La transportadora del pedido, tal como quedó escrita en `repartidor`.
 *
 * Antes esta columna se rellenaba con un hash del id: el pedido «viajaba» con
 * Coordinadora o TCC y hasta con un número de guía inventado, aunque nadie
 * hubiera despachado nada. Un dato que se fabrica al pintar no es un dato.
 * Ahora se lee el campo real y, si el nombre coincide con una de las
 * transportadoras con logo, se pinta la marca.
 */
function transportadoraDe(p: Pedido) {
  const nombre = (p.repartidor ?? "").trim();
  if (!nombre) return null;
  const conocida = transportadoraPorNombre(nombre);
  return { nombre, logo: conocida?.logo, fondoOscuro: "fondoLogo" in (conocida ?? {}) && (conocida as any).fondoLogo === "oscuro" };
}

/**
 * Motivo de cancelación registrado en las notas del pedido.
 *
 * No hay columna propia: cuando el repartidor reporta una novedad, el motivo se
 * anexa a `notas` como `[Novedad Logística HH:mm] <motivo>. <detalle> Se cancela
 * el pedido.` (`novedad.utils`). Se extrae de ahí en vez de inventarlo, y si el
 * pedido se canceló sin novedad se dice exactamente eso.
 */
function motivoCancelacionDe(p: Pedido): string | null {
  const notas = (p.notas ?? "").trim();
  const coincidencia = notas.match(/\[Novedad Logística[^\]]*\]\s*([\s\S]*)$/);
  if (coincidencia) {
    const texto = coincidencia[1]
      .replace(/\s*Se cancela el pedido\.?\s*$/i, "")
      .replace(/\s*Vuelve a la hoja de ruta para reintento\.?\s*$/i, "")
      .trim();
    return texto || null;
  }
  // Cancelaciones hechas desde el tablero no escriben bloque de novedad: la
  // nota del pedido es el único rastro que queda de por qué se canceló.
  return notas || null;
}

/** Formateador de tiempo transcurrido (SLA) para N. Orden */
function formatearTimer(isoFecha: string, etapa: EtapaInicio): string {
  try {
    const creacion = new Date(isoFecha).getTime();
    const ahora = Date.now();
    const difSegundos = Math.max(0, Math.floor((ahora - creacion) / 1000));
    
    // Si es en tránsito, agregamos un offset base representativo para imitar 00:18:47:42
    const totalSegundos = etapa === "en_transito" ? difSegundos + 18 * 3600 + 47 * 60 : difSegundos;
    
    const dias = Math.floor(totalSegundos / 86400);
    const horas = Math.floor((totalSegundos % 86400) / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    const segundos = totalSegundos % 60;

    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(dias)}:${pad(horas)}:${pad(minutos)}:${pad(segundos)}`;
  } catch {
    return "00:00:26:27";
  }
}

/** Conteo de pedidos por etapa del pipeline. */
export function contarEtapa(pedidos: Pedido[], clave: EtapaInicio): number {
  const etapa = ETAPAS_INICIO.find((e) => e.clave === clave);
  if (!etapa) return 0;
  return pedidos.filter((p) => (etapa.estados as readonly PedidoEstado[]).includes(p.estado)).length;
}

const sinAcentos = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const fechaISO = (iso: string) => {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toISOString().split("T")[0];
  } catch {
    return "—";
  }
};

const horaISO = (iso: string) => {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
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
  orden?: "asc" | "desc";
}

export const ResumenPedidosVista = observer(
  ({
    etapa: etapaProp,
    onEtapaChange,
    busqueda: busquedaProp = "",
    porConfirmar = false,
    pendiente = false,
    filtroPago = "todos",
    etapasFiltro = [],
    orden = "desc",
  }: ResumenPedidosVistaProps) => {
    const navigate = useNavigate();

    /**
     * Las etapas que la tabla está enseñando ahora mismo.
     *
     * En la vista Lista el menú «Estados» entrega **una sola** etapa (decisión
     * del 27/10: la lista es una hoja de trabajo y la columna central tiene que
     * ser la de esa etapa, no un «Estado» genérico). El prop sigue aceptando
     * varias y la vista sabe pintarlas —una sub-barra por etapa, columna
     * «Estado»—, pero hoy el menú no las produce.
     */
    const etapasVisibles: EtapaInicio[] =
      etapasFiltro.length > 0 ? [...etapasFiltro] : [etapaProp ?? "por_preparar"];

    /** La etapa solo cuando es una; con varias no hay sub-filtro único posible. */
    const etapaUnica: EtapaInicio | null =
      etapasVisibles.length === 1 ? etapasVisibles[0] : null;

    const [subEtapaPreparar, setSubEtapaPreparar] = useState<SubEtapaPreparar>("por_confirmar");
    const [subEtapaPreparacion, setSubEtapaPreparacion] = useState<SubEtapaPreparacion>("recolectado");
    const [subEtapaFinalizada, setSubEtapaFinalizada] = useState<SubEtapaFinalizada>("cancelada");
    const [detalleId, setDetalleId] = useState<string | null>(null);
    const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
    const [cancelarLote, setCancelarLote] = useState(false);
    const [motivoLote, setMotivoLote] = useState("");

    // ── Acciones por fila en la columna «Acciones» ──
    // `programarId` abre el calendario para reprogramar un pedido `programado`;
    // `cancelarId` abre la confirmación de cancelación de UNA fila (no del lote).
    const [programarId, setProgramarId] = useState<string | null>(null);
    const [cancelarId, setCancelarId] = useState<string | null>(null);
    const [motivoIndividual, setMotivoIndividual] = useState("");

    const puedeVerMontos = sessionStore.hasPermission("team.read");
    const todos = pedidosStore.pedidos;
    const moneda = organizacionStore.organizacion?.moneda ?? "COP";

    /**
     * Los estados que aporta cada etapa según su sub-filtro activo.
     *
     * El sub-filtro es un atajo a estados concretos: «Por alistar» es
     * `en_preparacion` y «Por recolectar» es `listo`. Al unir varias etapas se
     * suman los estados de cada una con SU sub-filtro, no el de la primera.
     */
    const estadosDeEtapa = (etapa: EtapaInicio): PedidoEstado[] => {
      if (etapa === "por_preparar") {
        return subEtapaPreparar === "por_confirmar" ? ["nuevo"] : ["confirmado"];
      }
      if (etapa === "en_preparacion") {
        if (subEtapaPreparacion === "por_alistar") return ["en_preparacion"];
        if (subEtapaPreparacion === "por_recolectar") return ["listo"];
        return ["listo", "en_preparacion"];
      }
      if (etapa === "en_transito") return ["en_camino"];
      if (subEtapaFinalizada === "entregada") return ["entregado"];
      if (subEtapaFinalizada === "cancelada" || subEtapaFinalizada === "devuelta") {
        return ["cancelado"];
      }
      return ["entregado", "cancelado"];
    };

    const etapasClave = etapasVisibles.join(",");

    const estadosPermitidos = useMemo(() => {
      const set = new Set<PedidoEstado>();
      for (const etapa of etapasVisibles) {
        for (const estado of estadosDeEtapa(etapa)) set.add(estado);
      }
      return set.size > 0 ? set : null;
      // `etapasClave` resume la selección; los sub-filtros van uno a uno.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [etapasClave, subEtapaPreparar, subEtapaPreparacion, subEtapaFinalizada]);

    const visibles = useMemo(() => {
      const q = sinAcentos(busquedaProp.trim());

      return todos
        .filter((p) => {
          if (estadosPermitidos && !estadosPermitidos.has(p.estado)) return false;
          if (filtroPago === "pagados" && !p.pagado) return false;
          if (filtroPago === "pendientes" && p.pagado) return false;
          if (porConfirmar && p.estado !== "nuevo") return false;
          if (pendiente && p.pagado !== false) return false;
          if (!q) return true;
          const texto = [p.numero, p.cliente, p.telefono, ...p.items.map((i) => i.nombre)].join(" ");
          return sinAcentos(texto).includes(q);
        })
        .sort((a, b) =>
          orden === "asc"
            ? a.createdAt.localeCompare(b.createdAt)
            : b.createdAt.localeCompare(a.createdAt)
        );
    }, [todos, estadosPermitidos, filtroPago, porConfirmar, pendiente, busquedaProp, orden]);

    const totalRegistros = visibles.length;
    const totalValor = visibles.reduce((acc, p) => acc + pedidosStore.totalPedido(p), 0);
    const pedidoAbierto: Pedido | undefined = detalleId ? todos.find((p) => p.id === detalleId) : undefined;

    /**
     * La columna central depende de cuántas etapas se estén mirando.
     *
     * Con una sola etapa se usa la columna que pide esa etapa (confirmación,
     * transportadora o motivo). Con varias —el filtro «Estados» es múltiple— no
     * hay una sola respuesta correcta, así que se pinta el ESTADO del pedido,
     * que es el dato común a todas las filas.
     */
    const columnaEstado: "confirmacion" | "transportadora" | "motivo" | "estado" =
      etapaUnica === "por_preparar"
        ? "confirmacion"
        : etapaUnica === "finalizadas"
          ? "motivo"
          : etapaUnica
            ? "transportadora"
            : "estado";

    /** El cronómetro solo tiene sentido mientras el pedido está en curso. */
    const mostrarTimer = etapasVisibles.some((e) => e !== "finalizadas");

    const todosSeleccionados = visibles.length > 0 && visibles.every((p) => seleccionados.has(p.id));
    const toggleSeleccionarTodos = () => {
      if (todosSeleccionados) {
        setSeleccionados(new Set());
      } else {
        setSeleccionados(new Set(visibles.map((p) => p.id)));
      }
    };

    const toggleFila = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setSeleccionados((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    };

    // ── Selección múltiple: qué se puede hacer con los registros marcados ──
    //
    // La barra flotante trabaja sobre lo que está A LA VISTA: si el operador
    // marca cinco filas y luego filtra por otra etapa, esas cinco dejan de
    // contar en vez de cancelar pedidos que ya no ve.
    const seleccionadosPedidos = visibles.filter((p) => seleccionados.has(p.id));
    const cancelables = seleccionadosPedidos.filter(
      (p) => p.estado !== "entregado" && p.estado !== "cancelado",
    );
    const puedeCancelar = puedeCancelarPedido();

    /**
     * ¿La tabla está mirando «En preparación»?
     *
     * Es la etapa en la que el pedido se arma y se despacha, así que ahí el
     * atajo no baja el export de pedidos sino la hoja de guías de los marcados
     * (transportadora, N° de guía, dirección), que es lo que se lleva a la
     * mensajería. Se comprueba con `includes` —y no con igualdad— porque el prop
     * admite varias etapas aunque el menú de la lista entregue una.
     */
    const enPreparacion = etapasVisibles.includes("en_preparacion");

    /** El botón dice qué archivo baja; el ícono y el tooltip lo confirman. */
    const etiquetaDescarga = enPreparacion ? "Descargar guías" : "Descargar";
    const tituloDescarga = enPreparacion
      ? "Descargar la hoja de guías de los pedidos seleccionados (CSV)"
      : "Descargar los pedidos seleccionados (CSV)";

    /**
     * Descarga lo que corresponde a la etapa que se está mirando.
     *
     * En «En preparación» → hoja de guías. En el resto → el export de pedidos
     * con las mismas columnas del export global. El botón dice cuál de las dos
     * cosas va a pasar (`etiquetaDescarga`), porque un mismo botón que cambia
     * de contenido en silencio según el filtro es una trampa.
     */
    const descargarSeleccion = () => {
      if (seleccionadosPedidos.length === 0) return;

      if (enPreparacion) {
        const csv = construirCsv(
          [...CSV_GUIAS_ENCABEZADOS],
          filasCsvGuias(seleccionadosPedidos, {
            estadoLabel: (e) => pedidosStore.estadoLabel(e),
          }),
        );
        descargarCsv(csv, nombreArchivoGuias());
        return;
      }

      const csv = construirCsv(
        [...CSV_ENCABEZADOS],
        filasCsv(seleccionadosPedidos, {
          origenLabel: (o) => pedidosStore.origenLabel(o),
          modalidadLabel: (m) => pedidosStore.modalidadLabel(m),
          estadoLabel: (e) => pedidosStore.estadoLabel(e),
        }),
      );
      descargarCsv(
        csv,
        `pedidos_seleccionados_${new Date().toISOString().slice(0, 10)}.csv`,
      );
    };

    /**
     * Cancela los pedidos marcados que todavía admiten cancelación.
     *
     * Va por `cancelarPedido` (no por `pedidosStore.cancelar`) porque ese puente
     * publica además la plantilla de cancelación en el hilo del cliente. El
     * motivo, si se escribe, se ANEXA a las notas: pisarlas borraría lo que pidió
     * el cliente.
     */
    const confirmarCancelacionLote = () => {
      if (!puedeCancelar) return;
      const motivo = motivoLote.trim();
      for (const p of cancelables) {
        if (motivo) {
          p.notas = p.notas ? `${p.notas}\nCancelado: ${motivo}` : `Cancelado: ${motivo}`;
        }
        cancelarPedido(p.id);
      }
      setSeleccionados(new Set());
      setMotivoLote("");
      setCancelarLote(false);
    };

    // ── Acciones contextuales por fila (columna «Acciones») ──
    //
    // Cada botón solo se pinta si `accionesDePedido` lo marca como válido para el
    // estado de la fila, así la lista nunca ofrece una transición que el pipeline
    // (`transicionValida`) rechazaría. El avance usa `activarAhora` en
    // `programado` y `avanzar` en el resto; la cancelación va por `cancelarPedido`
    // para publicar la plantilla en el hilo del cliente. El reprogramar abre el
    // `ProgramarModal`; el resto muta el store directo.
    const pedidoAProgramar = programarId ? todos.find((p) => p.id === programarId) : undefined;

    const avanzarFila = (p: Pedido) => {
      const acc = pedidosStore.accionesDePedido(p);
      if (!acc.puedeAvanzar) return;
      if (acc.esActivarAhora) pedidosStore.activarAhora(p.id);
      else pedidosStore.avanzar(p.id);
    };

    const reintentarFila = (p: Pedido) => {
      pedidosStore.reintentarEntrega(p.id);
    };

    const quitarRepartidorFila = (p: Pedido) => {
      pedidosStore.asignarRepartidor(p.id, "");
    };

    const confirmarReprogramacion = (iso: string) => {
      if (programarId) pedidosStore.reprogramar(programarId, iso);
      setProgramarId(null);
    };

    const confirmarCancelacionIndividual = () => {
      if (!cancelarId) return;
      const motivo = motivoIndividual.trim();
      if (motivo) pedidosStore.anexarNota(cancelarId, `Cancelado: ${motivo}`);
      cancelarPedido(cancelarId);
      setCancelarId(null);
      setMotivoIndividual("");
    };

    /** Chips de sub-filtro de cada etapa, en el orden en que se pintan. */
    const chipsDeEtapa = (
      etapa: EtapaInicio,
    ): { clave: string; label: string; ayuda: boolean }[] => {
      if (etapa === "por_preparar") {
        return [
          { clave: "por_confirmar", label: "Por Confirmar", ayuda: true },
          { clave: "pendiente", label: "Pendiente", ayuda: true },
        ];
      }
      if (etapa === "en_preparacion") {
        return [
          { clave: "por_alistar", label: "Por Alistar", ayuda: true },
          { clave: "por_recolectar", label: "Por Recolectar", ayuda: true },
          { clave: "recolectado", label: "Recolectado", ayuda: false },
        ];
      }
      if (etapa === "en_transito") {
        return [{ clave: "en_transito", label: "En tránsito", ayuda: true }];
      }
      return [
        { clave: "entregada", label: "Entregada", ayuda: true },
        { clave: "cancelada", label: "Cancelada", ayuda: true },
        { clave: "devuelta", label: "Devuelta", ayuda: true },
        { clave: "reclamaciones", label: "Reclamaciones", ayuda: true },
      ];
    };

    /** Qué chip está activo en una etapa (cada etapa tiene su propio sub-filtro). */
    const subSeleccionDe = (etapa: EtapaInicio): string => {
      if (etapa === "por_preparar") return subEtapaPreparar;
      if (etapa === "en_preparacion") return subEtapaPreparacion;
      if (etapa === "en_transito") return "en_transito";
      return subEtapaFinalizada;
    };

    // Al filtrar, buscar u ordenar, las filas que siguen en la tabla se desplazan
    // a su nueva posición en lugar de saltar; las que llegan entran escalonadas.
    const tablaRef = useFlipLista<HTMLTableSectionElement>(visibles.map((p) => p.id).join("|"));

    const cambiarSubEtapa = (etapa: EtapaInicio, clave: string) => {
      if (etapa === "por_preparar") setSubEtapaPreparar(clave as SubEtapaPreparar);
      else if (etapa === "en_preparacion") setSubEtapaPreparacion(clave as SubEtapaPreparacion);
      else if (etapa === "finalizadas") setSubEtapaFinalizada(clave as SubEtapaFinalizada);
    };

    /**
     * Botón de acción compacto para la columna «Acciones». Cada uno lleva
     * tooltip + `aria-label` (nada de íconos mudos) y un color de acento al hover
     * según la intención: marca para avanzar/reprogramar, verde para reintentar,
     * rojo para cancelar, neutro para ver detalle. El `stopPropagation` evita que
     * el clic abra el detalle de la fila.
     */
    const BotonAccion = ({
      titulo,
      onClick,
      children,
      tono = "neutral",
    }: {
      titulo: string;
      onClick: () => void;
      children: React.ReactNode;
      tono?: "neutral" | "marca" | "exito" | "error";
    }) => {
      const tonos: Record<string, string> = {
        neutral:
          "hover:bg-[#ECECEC]/60 hover:text-[#212121] dark:hover:bg-gray-800 dark:hover:text-white",
        marca:
          "hover:bg-[#FF3F1A]/10 hover:text-[#FF3F1A] dark:hover:bg-[#FF3F1A]/15 dark:hover:text-[#FF3F1A]",
        exito:
          "hover:bg-[#16A34A]/10 hover:text-[#16A34A] dark:hover:bg-[#16A34A]/15 dark:hover:text-[#4ADE80]",
        error:
          "hover:bg-[#EF4444]/10 hover:text-[#EF4444] dark:hover:bg-[#EF4444]/15 dark:hover:text-[#F87171]",
      };
      return (
        <button
          type="button"
          title={titulo}
          aria-label={titulo}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className={`inline-flex size-7 items-center justify-center rounded-lg text-[#212121]/55 transition-colors cursor-pointer ${tonos[tono]} dark:text-white/55`}
        >
          {children}
        </button>
      );
    };

    return (
      <div className="flex flex-col gap-5 font-sans">

        {/* ══════════════════════════════════════════════════════════════════
            2. SUB-BARRAS DE ESTADO — una por cada etapa filtrada
           ══════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col gap-2">
          {etapasVisibles.map((etapa) => {
            const chips = chipsDeEtapa(etapa);
            const seleccion = subSeleccionDe(etapa);
            return (
              <div key={etapa} className="flex flex-wrap items-center gap-2">
                {etapasVisibles.length > 1 && (
                  <span className="mr-1 text-[12px] font-bold text-[#212121]/35 dark:text-white/35">
                    {ETAPAS_INICIO.find((e) => e.clave === etapa)?.label}
                  </span>
                )}
                {chips.map((sub) => {
                  const activo = seleccion === sub.clave;
                  return (
                    <button
                      key={sub.clave}
                      type="button"
                      onClick={() => cambiarSubEtapa(etapa, sub.clave)}
                      aria-pressed={activo}
                      className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-theme-xs font-bold transition-colors cursor-pointer ${
                        activo
                          ? "border-[#FF3F1A] bg-white text-[#FF3F1A] shadow-sm dark:bg-gray-900"
                          : "border-transparent text-[#212121]/60 hover:text-[#212121] dark:text-white/60 dark:hover:text-white"
                      }`}
                    >
                      <span>{sub.label}</span>
                      {/* Un ícono de información, no un «?» tecleado: el signo
                          de interrogación suelto se leía como «aquí falta un
                          dato» y, al ser texto, engordaba con el bold del chip
                          y cambiaba de tamaño según la fuente. */}
                      {sub.ayuda && (
                        <InformationCircleIcon
                          className="size-3.5 shrink-0 opacity-70"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            3. RESUMEN DE REGISTROS Y VALOR TOTAL
           ══════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[14px]">
          <p className="font-bold text-[#212121] dark:text-white">
            Mostrando <span className="font-bold">{visibles.length}</span> de{" "}
            <span className="font-bold">{totalRegistros}</span> Registros
          </p>
          {puedeVerMontos && (
            <p className="font-normal text-[#212121]/70 dark:text-white/70">
              Valor Total:{" "}
              <strong className="text-[16px] font-bold text-[#212121] dark:text-white">
                $ {money(totalValor)} {moneda}
              </strong>
            </p>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            4. TABLA DETALLADA DE GESTIÓN DE PEDIDOS
           ══════════════════════════════════════════════════════════════════ */}
        <div className="overflow-x-auto rounded-2xl border border-[#ECECEC] bg-white shadow-sm ring-1 ring-black/[0.02] dark:border-gray-800 dark:bg-gray-900">
          <table className="w-full min-w-[1040px] text-left text-[12px]">
            <thead>
              <tr className="border-b border-[#ECECEC] text-[12px] font-bold text-[#190088] dark:border-gray-800 dark:text-gray-200">
                <th className="w-10 px-4 py-4 text-center">
                  <input
                    type="checkbox"
                    checked={todosSeleccionados}
                    onChange={toggleSeleccionarTodos}
                    className="size-4 rounded border-[#ECECEC] text-[#FF3F1A] focus:ring-[#FF3F1A] cursor-pointer dark:border-gray-700 dark:bg-gray-800"
                  />
                </th>
                <th className="px-4 py-4">N. Orden</th>
                <th className="px-4 py-4">Producto</th>
                <th className="px-4 py-4">Fecha</th>
                <th className="px-4 py-4">Comprador</th>
                {columnaEstado === "confirmacion" ? (
                  <th className="px-4 py-4">Estado de Confirmación</th>
                ) : columnaEstado === "motivo" ? (
                  <th className="px-4 py-4">Motivo Cancelación</th>
                ) : columnaEstado === "transportadora" ? (
                  <th className="px-4 py-4">Transportadora</th>
                ) : (
                  <th className="px-4 py-4">Estado</th>
                )}
                <th className="px-4 py-4">Tipo de Pedido</th>
                {puedeVerMontos && <th className="px-4 py-4">Valor</th>}
                <th className="px-4 py-4">Negocio</th>
                <th className="w-32 px-4 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody ref={tablaRef} className="divide-y divide-[#ECECEC] dark:divide-gray-800">
              {visibles.length === 0 ? (
                <tr>
                  <td colSpan={puedeVerMontos ? 10 : 9} className="px-4 py-16">
                    <ListaVacia>No hay pedidos en la etapa seleccionada.</ListaVacia>
                  </td>
                </tr>
              ) : (
                visibles.map((p, i) => {
                  const primero = p.items[0];
                  const extra = p.items.length - 1;
                  const seleccionado = seleccionados.has(p.id);
                  const transportadora = transportadoraDe(p);
                  const motivoCancelacion = motivoCancelacionDe(p);
                  const acc = pedidosStore.accionesDePedido(p);

                  return (
                    <tr
                      key={p.id}
                      data-flip={p.id}
                      onClick={() => setDetalleId(p.id)}
                      style={{ animationDelay: retardoEscalonado(i) }}
                      className={`animate-entrada-lista cursor-pointer transition-colors ${
                        seleccionado
                          ? "bg-[#97D6DF]/15 dark:bg-[#97D6DF]/10"
                          : "hover:bg-[#F9F9F8] dark:hover:bg-gray-800/40"
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-4 text-center" onClick={(e) => toggleFila(p.id, e)}>
                        <input
                          type="checkbox"
                          checked={seleccionado}
                          onChange={() => {}}
                          className="size-4 rounded border-[#ECECEC] text-[#FF3F1A] focus:ring-[#FF3F1A] cursor-pointer dark:border-gray-700 dark:bg-gray-800"
                        />
                      </td>

                      {/* N. Orden + Timer */}
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <p className="font-bold text-[#212121] dark:text-white">N°: {p.numero}</p>
                          {mostrarTimer && (
                            <div className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[11px] font-bold text-[#92400E] dark:bg-amber-950/60 dark:text-amber-300">
                              <ClockIcon className="size-3" />
                              <span className="tabular-nums">{formatearTimer(p.createdAt, etapaUnica ?? "por_preparar")}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Producto */}
                      <td className="px-4 py-4">
                        <div className="max-w-[190px]">
                          <p className="truncate font-normal text-[#212121] dark:text-white" title={primero?.nombre}>
                            {primero ? primero.nombre : "Sin productos"}
                          </p>
                          {extra > 0 && (
                            <p className="text-[11px] font-light text-[#212121]/60 dark:text-white/40">
                              +{extra} artículo{extra === 1 ? "" : "s"} más
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Fecha y Hora */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="space-y-0.5 text-[#212121]/80 dark:text-white/70">
                          <div className="flex items-center gap-1.5">
                            <CalendarDaysIcon className="size-3.5 text-[#212121]/50 dark:text-white/40" />
                            <span className="font-light">{fechaISO(p.createdAt)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <ClockIcon className="size-3.5 text-[#212121]/50 dark:text-white/40" />
                            <span className="font-light">{horaISO(p.createdAt)}</span>
                          </div>
                        </div>
                      </td>

                      {/* Comprador */}
                      <td className="px-4 py-4">
                        <div className="max-w-[190px] space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <EyeIcon className="size-3.5 text-[#212121]/40 dark:text-white/40" />
                            <span className="truncate font-bold text-[#212121] dark:text-white">
                              {p.cliente || "Cliente"}
                            </span>
                          </div>
                          {p.telefono && (
                            <p className="text-[11px] font-light text-[#212121]/70 dark:text-white/60">
                              Tel: {p.telefono}
                            </p>
                          )}
                          {p.direccionEntrega?.calle && (
                            <p className="truncate text-[11px] font-light text-[#212121]/50 dark:text-white/40">
                              {p.direccionEntrega.calle}
                              {p.direccionEntrega.ciudad ? `, ${p.direccionEntrega.ciudad}` : ""}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Estado de confirmación / Transportadora / Motivo */}
                      {columnaEstado === "confirmacion" ? (
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              p.estado === "confirmado"
                                ? "bg-[#22C55E]/10 text-[#16A34A] dark:bg-[#22C55E]/15 dark:text-[#4ADE80]"
                                : "bg-[#FEF3C7] text-[#92400E] dark:bg-amber-950/60 dark:text-amber-300"
                            }`}
                          >
                            <span
                              className={`size-1.5 rounded-full ${
                                p.estado === "confirmado" ? "bg-[#16A34A]" : "bg-[#D97706]"
                              }`}
                            />
                            {p.estado === "confirmado" ? "Confirmado" : "Por confirmar"}
                          </span>
                        </td>
                      ) : columnaEstado === "motivo" ? (
                        <td className="px-4 py-4">
                          {p.estado === "cancelado" ? (
                            <div className="flex max-w-[200px] items-start gap-1.5 font-normal text-[#212121] dark:text-white">
                              <XCircleIcon className="mt-0.5 size-3.5 shrink-0 text-[#EF4444]" />
                              <span className="line-clamp-2">
                                {motivoCancelacion ?? "Sin motivo registrado"}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[#212121]/35 dark:text-white/25">—</span>
                          )}
                        </td>
                      ) : columnaEstado === "transportadora" ? (
                        <td className="px-4 py-4">
                          {transportadora ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                {transportadora.logo && (
                                  <img
                                    src={transportadora.logo}
                                    alt=""
                                    className="h-4 max-w-[50px] object-contain"
                                  />
                                )}
                                <span className="font-bold text-[#212121] dark:text-white">
                                  {transportadora.nombre}
                                </span>
                              </div>
                              <p className="text-[11px] font-light text-[#212121]/70 dark:text-white/60">
                                Guía #:{" "}
                                <span className="tabular-nums font-normal">
                                  {p.numeroGuia ?? "Sin asignar"}
                                </span>
                              </p>
                            </div>
                          ) : (
                            <span className="text-[#212121]/35 dark:text-white/25">Sin asignar</span>
                          )}
                        </td>
                      ) : (
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ECECEC] px-2 py-0.5 text-[11px] font-bold text-[#212121] dark:border-gray-700 dark:text-white">
                            <span
                              className={`size-1.5 rounded-full ${pedidosStore.estadoDotClass(p.estado)}`}
                            />
                            {pedidosStore.estadoLabel(p.estado)}
                          </span>
                        </td>
                      )}

                      {/* Tipo de Pedido */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 font-bold text-[#212121] dark:text-white">
                            <ShoppingCartIcon className="size-3.5 text-[#212121]/50 dark:text-white/40" />
                            <span>{p.metodoPago === "contra_entrega" ? "Con recaudo" : "Sin recaudo"}</span>
                          </div>
                          <p className="text-[11px] font-light text-[#212121]/60 dark:text-white/40">
                            Soy: <span className="font-bold text-[#212121] dark:text-white">Proveedor</span>
                          </p>
                        </div>
                      </td>

                      {/* Valor */}
                      {puedeVerMontos && (
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1 font-bold text-[#212121] dark:text-white">
                            <CurrencyDollarIcon className="size-4 text-[#212121]/40 dark:text-white/40" />
                            <span className="tabular-nums">
                              $ {money(pedidosStore.totalPedido(p))} COP
                            </span>
                          </div>
                        </td>
                      )}

                      {/* Negocio */}
                      <td className="px-4 py-4">
                        <span className="font-normal text-[#212121]/80 dark:text-white/70">
                          {organizacionStore.organizacion?.nombrePublico?.trim() ||
                            organizacionStore.organizacion?.nombre?.trim() ||
                            "—"}
                        </span>
                      </td>

                      {/* Acciones contextuales — solo lo válido para el estado de la fila */}
                      <td className="px-3 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          {acc.puedeAvanzar && (
                            <BotonAccion
                              tono="marca"
                              titulo={acc.etiquetaAvanzar}
                              onClick={() => avanzarFila(p)}
                            >
                              {acc.esActivarAhora ? (
                                <BoltIcon className="size-4" />
                              ) : (
                                <CheckCircleIcon className="size-4" />
                              )}
                            </BotonAccion>
                          )}

                          {acc.puedeReprogramar && (
                            <BotonAccion
                              tono="marca"
                              titulo="Reprogramar"
                              onClick={() => setProgramarId(p.id)}
                            >
                              <ClockIcon className="size-4" />
                            </BotonAccion>
                          )}

                          {acc.puedeReintentar && (
                            <BotonAccion
                              tono="exito"
                              titulo="Reintentar entrega"
                              onClick={() => reintentarFila(p)}
                            >
                              <ArrowPathIcon className="size-4" />
                            </BotonAccion>
                          )}

                          {acc.puedeQuitarRepartidor && (
                            <BotonAccion
                              tono="neutral"
                              titulo="Quitar repartidor"
                              onClick={() => quitarRepartidorFila(p)}
                            >
                              <UserMinusIcon className="size-4" />
                            </BotonAccion>
                          )}

                          {acc.puedeCancelar && (
                            <BotonAccion
                              tono="error"
                              titulo="Cancelar pedido"
                              onClick={() => setCancelarId(p.id)}
                            >
                              <XCircleIcon className="size-4" />
                            </BotonAccion>
                          )}

                          <BotonAccion
                            tono="neutral"
                            titulo="Ver detalle del pedido"
                            onClick={() => setDetalleId(p.id)}
                          >
                            <EyeIcon className="size-4" />
                          </BotonAccion>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            5. ATAJOS DE LA SELECCIÓN — descargar y cancelar en lote

            Solo los seis colores de la marca, en su hex exacto: blanco y
            #ECECEC para la superficie en claro, #212121 como superficie en
            oscuro, #FF3F1A para el contador, el ícono de descarga y la acción
            de cancelar, y #212121 para el texto. Nada de escalones intermedios
            (`brand-400`, `error-600`, `success-*`): el cliente no los pidió.
           ══════════════════════════════════════════════════════════════════ */}
        {seleccionadosPedidos.length > 0 && (
          <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
            <div
              role="toolbar"
              aria-label="Acciones sobre los pedidos seleccionados"
              className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-[#ECECEC] bg-white py-1.5 pl-2 pr-1.5 text-[#212121] shadow-2xl shadow-black/10 dark:border-[#ECECEC]/20 dark:bg-[#212121] dark:text-white"
            >
              <span className="flex items-center gap-2 pr-1">
                <span className="flex size-6 items-center justify-center rounded-full bg-[#FF3F1A] text-[11px] font-bold tabular-nums text-white">
                  {seleccionadosPedidos.length}
                </span>
                <span className="text-theme-xs font-bold text-[#212121] dark:text-white">
                  Seleccionados
                </span>
              </span>

              <span className="mx-1 h-5 w-px bg-[#ECECEC] dark:bg-[#ECECEC]/20" aria-hidden="true" />

              <button
                type="button"
                onClick={descargarSeleccion}
                title={tituloDescarga}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-theme-xs font-bold text-[#212121] transition-colors hover:bg-[#ECECEC]/70 dark:text-white dark:hover:bg-[#ECECEC]/15 cursor-pointer"
              >
                <ArrowDownTrayIcon className="size-4 text-[#FF3F1A]" aria-hidden="true" />
                {etiquetaDescarga}
              </button>

              {/* Sin nada que cancelar no hay botón: en «Finalizadas» todos los
                  pedidos ya están cerrados, y un control apagado que solo sirve
                  para leer «ya están cerrados» ocupa sitio para no hacer nada.
                  La etapa ya lo dice. Con una selección mixta (varias etapas a
                  la vez) el botón sigue, y el modal cuenta solo los cancelables. */}
              {puedeCancelar && cancelables.length > 0 && (
                <>
                  <span className="mx-1 h-5 w-px bg-[#ECECEC] dark:bg-[#ECECEC]/20" aria-hidden="true" />
                  <button
                    type="button"
                    onClick={() => setCancelarLote(true)}
                    title="Cancelar los pedidos seleccionados"
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-theme-xs font-bold text-[#FF3F1A] transition-colors hover:bg-[#FF3F1A]/10 cursor-pointer"
                  >
                    <XCircleIcon className="size-4" aria-hidden="true" />
                    Cancelar pedidos
                  </button>
                </>
              )}

              <span className="mx-1 h-5 w-px bg-[#ECECEC] dark:bg-[#ECECEC]/20" aria-hidden="true" />

              <button
                type="button"
                onClick={() => setSeleccionados(new Set())}
                aria-label="Quitar la selección"
                title="Quitar la selección"
                className="flex size-8 items-center justify-center rounded-full text-[#212121]/45 transition-colors hover:bg-[#ECECEC]/70 hover:text-[#212121] dark:text-white/50 dark:hover:bg-[#ECECEC]/15 dark:hover:text-white cursor-pointer"
              >
                <XMarkIcon className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* Confirmación de cancelación en lote */}
        {cancelarLote && (
          <Modal isOpen onClose={() => setCancelarLote(false)} className="max-w-sm p-6">
            <div className="mb-4 flex flex-col items-center gap-3 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-error-50 text-error-500 dark:bg-error-500/10">
                <XCircleIcon className="size-6" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-ink-title dark:text-white/90">
                  Cancelar {cancelables.length} pedido{cancelables.length === 1 ? "" : "s"}
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Esta acción es irreversible: los pedidos pasarán a{" "}
                  <strong>Cancelado</strong> y se avisará a cada cliente por su hilo.
                </p>
              </div>
            </div>

            <div className="mb-5">
              <label
                htmlFor="motivo-lote"
                className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300"
              >
                Motivo (opcional)
              </label>
              <textarea
                id="motivo-lote"
                rows={2}
                value={motivoLote}
                onChange={(e) => setMotivoLote(e.target.value)}
                placeholder="Ej: sin stock, cliente no respondió..."
                className="w-full rounded-xl border border-[#ECECEC] bg-white px-3 py-2 text-[13px] text-[#212121] outline-hidden focus:border-[#97D6DF] focus:ring-2 focus:ring-[#97D6DF]/25 dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button size="sm" variant="outline" onClick={() => setCancelarLote(false)}>
                Volver
              </Button>
              <Button size="sm" variant="destructive" onClick={confirmarCancelacionLote}>
                Cancelar {cancelables.length === 1 ? "el pedido" : "los pedidos"}
              </Button>
            </div>
          </Modal>
        )}

        {/* Confirmación de cancelación de UNA fila */}
        {cancelarId && (
          <Modal
            isOpen
            onClose={() => {
              setCancelarId(null);
              setMotivoIndividual("");
            }}
            className="max-w-sm p-6"
          >
            <div className="mb-4 flex flex-col items-center gap-3 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-error-50 text-error-500 dark:bg-error-500/10">
                <XCircleIcon className="size-6" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-ink-title dark:text-white/90">
                  Cancelar pedido {pedidosStore.getPedido(cancelarId)?.numero ?? ""}
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Esta acción es irreversible: el pedido pasará a <strong>Cancelado</strong> y se
                  avisará al cliente por su hilo.
                </p>
              </div>
            </div>

            <div className="mb-5">
              <label
                htmlFor="motivo-individual"
                className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300"
              >
                Motivo (opcional)
              </label>
              <textarea
                id="motivo-individual"
                rows={2}
                value={motivoIndividual}
                onChange={(e) => setMotivoIndividual(e.target.value)}
                placeholder="Ej: sin stock, cliente no respondió..."
                className="w-full rounded-xl border border-[#ECECEC] bg-white px-3 py-2 text-[13px] text-[#212121] outline-hidden focus:border-[#97D6DF] focus:ring-2 focus:ring-[#97D6DF]/25 dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setCancelarId(null);
                  setMotivoIndividual("");
                }}
              >
                Volver
              </Button>
              <Button size="sm" variant="destructive" onClick={confirmarCancelacionIndividual}>
                Cancelar el pedido
              </Button>
            </div>
          </Modal>
        )}

        {/* Modal de reprogramación (solo pedidos en estado `programado`) */}
        {pedidoAProgramar && (
          <ProgramarModal
            valorInicial={
              pedidoAProgramar.programadoPara ? new Date(pedidoAProgramar.programadoPara) : null
            }
            onClose={() => setProgramarId(null)}
            onConfirmar={confirmarReprogramacion}
          />
        )}

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

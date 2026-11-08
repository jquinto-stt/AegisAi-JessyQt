import { useState, useMemo } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import {
  pedidosStore,
  conversacionesStore,
  esperaValidacionPago,
  puedeMoverA,
  puedeCrearPedido,
  ATENCION_LABEL,
  etiquetaEstado,
  type Pedido,
  type PedidoEstado,
} from "@/stores";
import { avanzarPedido, confirmarPagoPedido } from "./pedidos.notificaciones";
import { money, relativo } from "./widgets";
import { CanalAvatar } from "@/pages/conversaciones";
import {
  ArrowUpRightIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  DocumentTextIcon,
  FlagIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlayIcon,
  PlusIcon,
  SparklesIcon,
  TruckIcon,
  TvIcon,
} from "@heroicons/react/24/outline";

export interface AdminDashboardViewProps {
  onVerDetalle: (pedidoId: string) => void;
  onOpenChat: (convId: string) => void;
  onOpenChatPedido: (pedidoId: string) => void;
  onOpenCalendario: () => void;
  onOpenDisplay: () => void;
  onOpenClientes: () => void;
  onOpenCrearPedido?: () => void;
  fechaTexto: string;
  botonSilenciar?: ReactNode;
}

type FiltroRapidoPago = "todos" | "pagados" | "por_cobrar";
type WorkspaceTab = "operacion" | "actividad" | "chats";

function formatHoraCorta(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function splitMoneyParts(amount: number): { main: string; decimals: string } {
  const rounded = Math.round(amount);
  return {
    main: `$ ${rounded.toLocaleString("es-CO")}`,
    decimals: ".00",
  };
}

function badgeStylePorEstado(estado: PedidoEstado): {
  bg: string;
  text: string;
  dot: string;
} {
  switch (estado) {
    case "nuevo":
    case "confirmado":
      return {
        bg: "bg-[#FF3F1A]/10 dark:bg-[#FF3F1A]/20 border-[#FF3F1A]/30",
        text: "text-[#FF3F1A]",
        dot: "bg-[#FF3F1A]",
      };
    default:
      return {
        bg: "bg-[#190088]/[0.06] dark:bg-white/10 border-[#190088]/20 dark:border-white/15",
        text: "text-[#190088] dark:text-white",
        dot: "bg-[#190088] dark:bg-white",
      };
  }
}

function nodoColorPorIndice(idx: number): string {
  return idx % 2 === 0
    ? "bg-[#190088]/10 text-[#190088] dark:bg-white/15 dark:text-white"
    : "bg-[#FF3F1A]/15 text-[#FF3F1A]";
}

export const AdminDashboardView = observer(
  ({
    onVerDetalle,
    onOpenChat,
    onOpenChatPedido,
    onOpenCalendario,
    onOpenDisplay,
    onOpenCrearPedido,
    fechaTexto,
    botonSilenciar,
  }: AdminDashboardViewProps) => {
    const navigate = useNavigate();

    const [busqueda, setBusqueda] = useState("");
    const [notaRapida, setNotaRapida] = useState("");
    const [pedidoFocoId, setPedidoFocoId] = useState<string | null>(null);
    const [selectorAbierto, setSelectorAbierto] = useState(false);
    const [filtroPago, setFiltroPago] = useState<FiltroRapidoPago>("todos");
    const [tabActiva, setTabActiva] = useState<WorkspaceTab>("operacion");

    const puedeCrear = puedeCrearPedido();
    const todosLosPedidos = pedidosStore.pedidos;

    // Lista priorizada para el selector de orden en foco
    const listaPriorizada = useMemo(() => {
      const activos = pedidosStore.enCurso();
      const resto = todosLosPedidos.filter(
        (p) => !activos.some((a) => a.id === p.id),
      );
      return [...activos, ...resto];
    }, [todosLosPedidos]);

    const pedidoFoco: Pedido | undefined = useMemo(() => {
      if (pedidoFocoId) {
        const encontrado = pedidosStore.getPedido(pedidoFocoId);
        if (encontrado) return encontrado;
      }
      return (
        listaPriorizada.find((p) => p.estado === "nuevo") ||
        listaPriorizada.find((p) => p.estado === "en_preparacion") ||
        listaPriorizada.find((p) => p.estado === "listo") ||
        listaPriorizada[0]
      );
    }, [pedidoFocoId, listaPriorizada]);

    const indiceFoco = useMemo(() => {
      if (!pedidoFoco) return -1;
      return listaPriorizada.findIndex((p) => p.id === pedidoFoco.id);
    }, [listaPriorizada, pedidoFoco]);

    const ciclarPedidoFoco = (delta: number) => {
      if (listaPriorizada.length === 0) return;
      const nextIdx =
        (Math.max(0, indiceFoco) + delta + listaPriorizada.length) %
        listaPriorizada.length;
      setPedidoFocoId(listaPriorizada[nextIdx].id);
    };

    // Métricas globales del turno
    const metricas = useMemo(() => {
      let totalTurno = 0;
      let totalRecaudado = 0;
      let totalPendiente = 0;
      let pagadosCount = 0;
      let pendientesCount = 0;

      for (const p of todosLosPedidos) {
        if (p.estado === "cancelado") continue;
        const monto = pedidosStore.totalPedido(p);
        totalTurno += monto;
        if (p.pagado) {
          totalRecaudado += monto;
          pagadosCount += 1;
        } else {
          totalPendiente += monto;
          pendientesCount += 1;
        }
      }

      return {
        totalTurno,
        totalRecaudado,
        totalPendiente,
        pagadosCount,
        pendientesCount,
      };
    }, [todosLosPedidos]);

    const montoHero =
      filtroPago === "pagados"
        ? metricas.totalRecaudado
        : filtroPago === "por_cobrar"
          ? metricas.totalPendiente
          : metricas.totalTurno;

    const heroCurrency = splitMoneyParts(montoHero);

    // Conteos de las 5 etapas que navegan al Tablero filtrando por estado
    const conteosBarra = useMemo(() => {
      return {
        entregados: todosLosPedidos.filter((p) => p.estado === "entregado")
          .length,
        enCamino: todosLosPedidos.filter((p) => p.estado === "en_camino")
          .length,
        cocinaListos: todosLosPedidos.filter(
          (p) => p.estado === "en_preparacion" || p.estado === "listo",
        ).length,
        nuevosConfirmados: todosLosPedidos.filter(
          (p) => p.estado === "nuevo" || p.estado === "confirmado",
        ).length,
        programados: todosLosPedidos.filter((p) => p.estado === "programado")
          .length,
      };
    }, [todosLosPedidos]);

    // Filtrado unificado para el listado central
    const pedidosFiltrados = useMemo(() => {
      const q = busqueda.trim().toLowerCase();

      return todosLosPedidos.filter((p) => {
        if (filtroPago === "pagados" && !p.pagado) return false;
        if (filtroPago === "por_cobrar" && p.pagado) return false;

        if (q) {
          const match =
            p.numero.toLowerCase().includes(q) ||
            p.cliente.toLowerCase().includes(q) ||
            p.telefono.toLowerCase().includes(q) ||
            p.items.some((it) => it.nombre.toLowerCase().includes(q));
          if (!match) return false;
        }

        return true;
      });
    }, [todosLosPedidos, filtroPago, busqueda]);

    const enCursoList = useMemo(
      () =>
        pedidosFiltrados
          .filter(
            (p) =>
              p.estado !== "entregado" &&
              p.estado !== "cancelado" &&
              p.estado !== "programado",
          )
          .sort(
            (a, b) =>
              pedidosStore.minutosEnEstado(b) - pedidosStore.minutosEnEstado(a),
          ),
      [pedidosFiltrados],
    );

    const completadosList = useMemo(
      () =>
        pedidosFiltrados
          .filter((p) => p.estado === "entregado")
          .sort((a, b) =>
            (b.finishedAt ?? b.createdAt).localeCompare(
              a.finishedAt ?? a.createdAt,
            ),
          ),
      [pedidosFiltrados],
    );

    const eventosAuditoria = useMemo(() => {
      const lista: {
        id: string;
        fecha: string;
        accion: string;
        operadorNombre: string;
        pedido: Pedido;
      }[] = [];

      for (const p of todosLosPedidos) {
        if (p.auditoria && p.auditoria.length > 0) {
          for (const ev of p.auditoria) {
            lista.push({
              id: `${p.id}-${ev.id}`,
              fecha: ev.fecha,
              accion: ev.accion,
              operadorNombre: ev.operadorNombre,
              pedido: p,
            });
          }
        }
      }

      return lista.sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 8);
    }, [todosLosPedidos]);

    const pedidosConComprobante = useMemo(() => {
      const porValidar = todosLosPedidos.filter(
        (p) => p.estado !== "cancelado" && esperaValidacionPago(p),
      );
      const prioritarios = [
        ...(pedidoFoco ? [pedidoFoco] : []),
        ...porValidar,
        ...todosLosPedidos.filter((p) => p.estado !== "cancelado"),
      ];
      const vistos = new Set<string>();
      const unicos: Pedido[] = [];
      for (const p of prioritarios) {
        if (!vistos.has(p.id)) {
          vistos.add(p.id);
          unicos.push(p);
        }
        if (unicos.length >= 2) break;
      }
      return unicos;
    }, [pedidoFoco, todosLosPedidos]);

    const convFoco = pedidoFoco
      ? conversacionesStore.porTelefono(pedidoFoco.telefono)
      : undefined;

    const siguienteEstadoFoco = pedidoFoco
      ? pedidosStore.siguienteEstado(pedidoFoco)
      : null;
    const puedeAvanzarFoco = puedeMoverA(siguienteEstadoFoco);

    const handleAvanzarFoco = () => {
      if (!pedidoFoco || !puedeAvanzarFoco) return;
      avanzarPedido(pedidoFoco.id);
    };

    const handleGuardarNotaRapida = () => {
      const texto = notaRapida.trim();
      if (!texto || !pedidoFoco) return;
      pedidosStore.anexarNota(pedidoFoco.id, texto);
      setNotaRapida("");
    };

    return (
      <div
        data-testid="admin-dashboard-view"
        className="space-y-6 font-sans text-[#212121] dark:text-[#ECECEC]"
      >
        {/* ═══════════════════════════════════════════════════════════════════
            1. BARRA CONTEXTUAL SUPERIOR
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Izquierda: Selector de Orden en Foco */}
          <div className="relative flex items-center gap-2">
            <div className="flex items-center rounded-full bg-white dark:bg-[#1E1E22] border border-[#ECECEC] dark:border-white/10 p-1 pl-4 pr-1.5 shadow-theme-xs">
              <button
                type="button"
                onClick={() => setSelectorAbierto((v) => !v)}
                className="flex items-center gap-2.5 text-left pr-2 cursor-pointer"
              >
                <span className="text-[16px] leading-normal font-bold text-[#190088] dark:text-white truncate max-w-[180px] sm:max-w-[220px]">
                  {pedidoFoco ? pedidoFoco.cliente : "Sin pedidos activos"}
                </span>
                {pedidoFoco && (
                  <span className="inline-flex items-center rounded-full bg-[#190088] text-white px-2.5 py-0.5 text-[12px] leading-normal font-bold">
                    {pedidoFoco.numero}
                  </span>
                )}
              </button>

              <div className="flex items-center gap-0.5 border-l border-[#ECECEC] dark:border-white/10 pl-1">
                <button
                  type="button"
                  onClick={() => ciclarPedidoFoco(-1)}
                  title="Orden anterior"
                  aria-label="Orden anterior"
                  className="flex size-7 items-center justify-center rounded-full text-[#212121]/70 hover:bg-[#ECECEC] dark:text-[#ECECEC]/70 dark:hover:bg-white/10 cursor-pointer"
                >
                  <ChevronLeftIcon className="size-3.5 stroke-[2.5]" />
                </button>
                <button
                  type="button"
                  onClick={() => ciclarPedidoFoco(1)}
                  title="Siguiente orden"
                  aria-label="Siguiente orden"
                  className="flex size-7 items-center justify-center rounded-full text-[#212121]/70 hover:bg-[#ECECEC] dark:text-[#ECECEC]/70 dark:hover:bg-white/10 cursor-pointer"
                >
                  <ChevronRightIcon className="size-3.5 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {selectorAbierto && listaPriorizada.length > 0 && (
              <div className="absolute left-0 top-12 z-30 w-72 rounded-2xl bg-white dark:bg-[#1E1E22] border border-[#ECECEC] dark:border-white/10 shadow-xl p-2 max-h-72 overflow-y-auto">
                <div className="px-2.5 py-1.5 text-[12px] leading-normal font-bold uppercase tracking-wider text-[#190088] dark:text-white">
                  Seleccionar orden ({listaPriorizada.length})
                </div>
                {listaPriorizada.slice(0, 12).map((p) => {
                  const activo = pedidoFoco?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPedidoFocoId(p.id);
                        setSelectorAbierto(false);
                      }}
                      className={`w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-[12px] leading-normal transition-colors cursor-pointer ${activo
                          ? "bg-[#190088] text-white font-bold"
                          : "text-[#212121] dark:text-[#ECECEC] font-normal hover:bg-[#ECECEC]/60 dark:hover:bg-white/[0.06]"
                        }`}
                    >
                      <div className="min-w-0">
                        <span className="font-bold mr-1.5">{p.numero}</span>
                        <span className="truncate">{p.cliente}</span>
                      </div>
                      <span className="shrink-0 text-[12px] leading-normal font-light opacity-80">
                        {pedidosStore.estadoLabel(p.estado)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Centro: Buscador único */}
          <div className="relative flex-1 max-w-md mx-auto lg:mx-4">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#212121]/60 dark:text-[#ECECEC]/50" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar pedido, cliente o teléfono…"
              className="h-10 w-full rounded-full bg-white dark:bg-[#1E1E22] border border-[#ECECEC] dark:border-white/10 pl-10 pr-4 text-[14px] leading-normal font-normal text-[#212121] dark:text-[#ECECEC] placeholder:text-[#212121]/50 dark:placeholder:text-[#ECECEC]/40 focus:outline-hidden focus:ring-2 focus:ring-[#190088]/20 shadow-theme-xs"
            />
          </div>

          {/* Derecha: Sonido + Pantalla KDS */}
          <div className="flex items-center gap-2">
            {botonSilenciar}

            <button
              type="button"
              onClick={onOpenDisplay}
              title="Modo Enfoque / Pantalla de turnos"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-white dark:bg-[#1E1E22] border border-[#ECECEC] dark:border-white/10 px-4 text-[14px] leading-normal font-bold text-[#190088] dark:text-white hover:border-[#190088]/30 transition-colors cursor-pointer shadow-theme-xs"
            >
              <TvIcon className="size-4" />
              <span className="hidden sm:inline">Pantalla KDS</span>
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            2. HERO FINANCIERO DEL TURNO
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-baseline">
              <span className="text-[36px] leading-tight font-bold text-[#190088] dark:text-white">
                {heroCurrency.main}
              </span>
              <span className="text-[24px] leading-snug font-light text-[#212121]/60 dark:text-[#ECECEC]/60 ml-0.5">
                {heroCurrency.decimals}
              </span>
            </div>
            <p className="mt-1 text-[14px] leading-normal font-light text-[#212121]/70 dark:text-[#ECECEC]/70">
              {filtroPago === "pagados"
                ? `Recaudado en el turno · ${metricas.pagadosCount} órdenes pagadas`
                : filtroPago === "por_cobrar"
                  ? `Pendiente por cobrar o validar · ${metricas.pendientesCount} órdenes`
                  : `Facturación total del turno · ${todosLosPedidos.length} órdenes`}
            </p>
          </div>

          {/* Derecha: Avance de etapa + Filtros rápidos en Azul (#190088) y Naranja (#FF3F1A) */}
          <div className="flex flex-wrap items-center gap-2.5">
            {pedidoFoco && (
              <button
                type="button"
                onClick={handleAvanzarFoco}
                disabled={!puedeAvanzarFoco}
                title={
                  siguienteEstadoFoco
                    ? `Avanzar ${pedidoFoco.numero} a ${pedidosStore.estadoLabel(siguienteEstadoFoco)}`
                    : `${pedidoFoco.numero} en ${pedidosStore.estadoLabel(pedidoFoco.estado)}`
                }
                className="inline-flex items-center gap-2.5 rounded-full bg-white dark:bg-[#1E1E22] border border-[#ECECEC] dark:border-white/10 px-4 py-2 text-[14px] leading-normal font-normal text-[#212121] dark:text-[#ECECEC] hover:border-[#190088]/30 dark:hover:border-white/20 transition-all cursor-pointer disabled:opacity-60 shadow-theme-xs"
              >
                <ClockIcon className="size-4 text-[#190088] dark:text-white" />
                <span>
                  {pedidoFoco.numero}:{" "}
                  <strong className="font-bold text-[#190088] dark:text-white">
                    {relativo(pedidosStore.minutosEnEstado(pedidoFoco))}
                  </strong>
                </span>
                {siguienteEstadoFoco && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-[#190088] text-white">
                    <PlayIcon className="size-3 fill-current" />
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                setFiltroPago((prev) =>
                  prev === "pagados" ? "todos" : "pagados",
                )
              }
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[14px] leading-normal font-bold transition-all cursor-pointer shadow-theme-xs ${filtroPago === "pagados"
                  ? "bg-[#190088] text-white border-[#190088]"
                  : "bg-white dark:bg-[#1E1E22] text-[#190088] dark:text-white border-[#190088]/25 dark:border-white/15 hover:border-[#190088]"
                }`}
            >
              <span>Cobrados ({metricas.pagadosCount})</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setFiltroPago((prev) =>
                  prev === "por_cobrar" ? "todos" : "por_cobrar",
                )
              }
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[14px] leading-normal font-bold transition-all cursor-pointer shadow-theme-xs ${filtroPago === "por_cobrar"
                  ? "bg-[#FF3F1A] text-white border-[#FF3F1A]"
                  : "bg-white dark:bg-[#1E1E22] text-[#FF3F1A] border-[#FF3F1A]/30 hover:border-[#FF3F1A]"
                }`}
            >
              <span>Por cobrar ({metricas.pendientesCount})</span>
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            3. BARRA DE ETAPAS (Navega al Tablero filtrando por cada etapa)
        ═══════════════════════════════════════════════════════════════════ */}
        <div>
          <div className="mb-2.5 flex items-center justify-between text-[14px] leading-normal">
            <span className="font-bold text-[#190088] dark:text-white">
              Flujo operativo del turno · Ir al tablero por etapa
            </span>

            <button
              type="button"
              onClick={onOpenCalendario}
              className="inline-flex items-center gap-1.5 text-[14px] leading-normal font-normal text-[#212121]/70 dark:text-[#ECECEC]/70 hover:text-[#190088] dark:hover:text-white cursor-pointer"
            >
              <FlagIcon className="size-3.5 text-[#FF3F1A]" />
              <span className="capitalize">{fechaTexto}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {/* 1. Nuevos & Confirmados -> filtra en Tablero */}
            <button
              type="button"
              onClick={() => navigate("/pedidos?estado=nuevo")}
              className="group flex h-11 items-center justify-between rounded-full border border-[#FF3F1A]/35 bg-white dark:bg-[#1E1E22] px-4 text-[14px] leading-normal font-bold text-[#190088] dark:text-white hover:border-[#FF3F1A] transition-all cursor-pointer shadow-theme-xs"
            >
              <span className="truncate">
                Nuevos & Confirm. · {conteosBarra.nuevosConfirmados}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FF3F1A] text-white px-2.5 py-0.5 text-[12px] leading-normal font-bold">
                <span>Ver</span>
                <ArrowUpRightIcon className="size-3 stroke-[2.5]" />
              </span>
            </button>

            {/* 2. En cocina & Listos -> filtra en Tablero */}
            <button
              type="button"
              onClick={() => navigate("/pedidos?estado=en_preparacion")}
              className="group flex h-11 items-center justify-between rounded-full border border-[#ECECEC] dark:border-white/10 bg-white dark:bg-[#1E1E22] px-4 text-[14px] leading-normal font-bold text-[#190088] dark:text-white hover:border-[#190088] dark:hover:border-white/40 transition-all cursor-pointer shadow-theme-xs"
            >
              <span className="truncate">
                En cocina & Listos · {conteosBarra.cocinaListos}
              </span>
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#190088]/10 text-[#190088] dark:bg-white/10 dark:text-white group-hover:bg-[#190088] group-hover:text-white transition-colors">
                <ClockIcon className="size-3.5 stroke-[2.4]" />
              </span>
            </button>

            {/* 3. En camino -> filtra en Tablero */}
            <button
              type="button"
              onClick={() => navigate("/pedidos?estado=en_camino")}
              className="group flex h-11 items-center justify-between rounded-full border border-[#ECECEC] dark:border-white/10 bg-white dark:bg-[#1E1E22] px-4 text-[14px] leading-normal font-bold text-[#190088] dark:text-white hover:border-[#190088] dark:hover:border-white/40 transition-all cursor-pointer shadow-theme-xs"
            >
              <span className="truncate">
                En camino · {conteosBarra.enCamino}
              </span>
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#190088]/10 text-[#190088] dark:bg-white/10 dark:text-white group-hover:bg-[#190088] group-hover:text-white transition-colors">
                <TruckIcon className="size-3.5 stroke-[2.2]" />
              </span>
            </button>

            {/* 4. Programados -> filtra en Vista Lista Programados */}
            <button
              type="button"
              onClick={() => navigate("/pedidos?vista=lista&estado=programado")}
              className="group flex h-11 items-center justify-between rounded-full border border-[#ECECEC] dark:border-white/10 bg-white dark:bg-[#1E1E22] px-4 text-[14px] leading-normal font-bold text-[#190088] dark:text-white hover:border-[#FF3F1A] transition-all cursor-pointer shadow-theme-xs"
            >
              <span className="truncate">
                Programados · {conteosBarra.programados}
              </span>
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#FF3F1A]/10 text-[#FF3F1A] group-hover:bg-[#FF3F1A] group-hover:text-white transition-colors">
                <ArrowUpRightIcon className="size-3.5 stroke-[2.5]" />
              </span>
            </button>

            {/* 5. Entregados -> filtra en Vista Lista Entregados */}
            <button
              type="button"
              onClick={() => navigate("/pedidos?vista=lista&estado=entregado")}
              className="group flex h-11 items-center justify-between rounded-full border border-[#ECECEC] dark:border-white/10 bg-white dark:bg-[#1E1E22] px-4 text-[14px] leading-normal font-bold text-[#190088] dark:text-white hover:border-[#190088] dark:hover:border-white/40 transition-all cursor-pointer shadow-theme-xs"
            >
              <span className="truncate">
                Entregados · {conteosBarra.entregados}
              </span>
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#190088]/10 text-[#190088] dark:bg-white/10 dark:text-white group-hover:bg-[#190088] group-hover:text-white transition-colors">
                <CheckIcon className="size-3.5 stroke-[2.8]" />
              </span>
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            4. GRILLA PRINCIPAL (Carpetas Limpias + Panel Operativo)
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ── COLUMNA IZQUIERDA: 2 TARJETAS CARPETA (Solo Azul #190088 y Naranja #FF3F1A) ── */}
          <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-6">
            {/* CARPETA 1: DETALLES DEL CLIENTE (Pestaña Azul #190088) */}
            <div className="relative pt-8">
              <div className="absolute top-0 left-0 z-10 flex h-10 w-44 items-center gap-2 rounded-t-[22px] bg-[#190088] text-white px-4 font-bold text-[16px] leading-normal">
                <InformationCircleIcon className="size-4 stroke-[2.2]" />
                <span>Detalles</span>
              </div>

              {pedidoFoco && (
                <div className="absolute top-0 right-1 z-10">
                  <button
                    type="button"
                    onClick={() => onVerDetalle(pedidoFoco.id)}
                    title="Abrir ficha completa del pedido"
                    className="flex size-8 items-center justify-center rounded-full bg-white dark:bg-[#1E1E22] border border-[#ECECEC] dark:border-white/10 text-[#190088] dark:text-white hover:border-[#190088] transition-colors cursor-pointer shadow-theme-xs"
                  >
                    <PencilSquareIcon className="size-3.5" />
                  </button>
                </div>
              )}

              <div className="rounded-b-[26px] rounded-tr-[26px] bg-white dark:bg-[#18181B] border border-[#ECECEC] dark:border-white/10 p-5 shadow-theme-xs">
                {pedidoFoco ? (
                  <div className="space-y-3.5">
                    <div className="border-b border-[#ECECEC] dark:border-white/10 pb-2.5">
                      <p className="text-[12px] leading-normal font-light text-[#212121]/70 dark:text-[#ECECEC]/60">
                        Cliente
                      </p>
                      <p className="text-[16px] leading-normal font-bold text-[#190088] dark:text-white truncate">
                        {pedidoFoco.cliente}
                      </p>
                    </div>

                    <div className="border-b border-[#ECECEC] dark:border-white/10 pb-2.5">
                      <p className="text-[12px] leading-normal font-light text-[#212121]/70 dark:text-[#ECECEC]/60">
                        Modalidad & Ubicación
                      </p>
                      <p className="text-[14px] leading-normal font-bold text-[#212121] dark:text-[#ECECEC] line-clamp-2">
                        {pedidoFoco.direccionEntrega?.calle
                          ? `${pedidoFoco.direccionEntrega.calle}${pedidoFoco.direccionEntrega.barrio
                            ? `, ${pedidoFoco.direccionEntrega.barrio}`
                            : ""
                          }`
                          : pedidoFoco.notas ||
                          pedidosStore.modalidadLabel(pedidoFoco.modalidad)}
                      </p>
                    </div>

                    <div className="border-b border-[#ECECEC] dark:border-white/10 pb-2.5">
                      <p className="text-[12px] leading-normal font-light text-[#212121]/70 dark:text-[#ECECEC]/60">
                        Teléfono
                      </p>
                      <p className="text-[14px] leading-normal font-bold text-[#212121] dark:text-[#ECECEC]">
                        {pedidoFoco.telefono}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        convFoco
                          ? onOpenChat(convFoco.id)
                          : onOpenChatPedido(pedidoFoco.id)
                      }
                      className="w-full flex items-center justify-between rounded-full bg-[#190088]/[0.06] dark:bg-white/10 border border-[#190088]/15 dark:border-white/10 px-4 py-2 text-[14px] leading-normal font-bold text-[#190088] dark:text-white hover:bg-[#190088] hover:text-white transition-colors cursor-pointer"
                    >
                      <span className="inline-flex items-center gap-2">
                        <ChatBubbleLeftRightIcon className="size-4" />
                        <span>
                          {convFoco
                            ? `Chat (${convFoco.canal})`
                            : "Abrir conversación"}
                        </span>
                      </span>
                      <span className="text-[12px] leading-normal font-normal">
                        →
                      </span>
                    </button>
                  </div>
                ) : (
                  <p className="py-6 text-center text-[12px] leading-normal font-normal text-[#212121]/70 dark:text-[#ECECEC]/60">
                    No hay pedidos seleccionados.
                  </p>
                )}
              </div>
            </div>

            {/* CARPETA 2: COBRO DE LA ORDEN EN FOCO (Pestaña Naranja #FF3F1A) */}
            <div className="relative pt-8">
              <div className="absolute top-0 left-0 z-10 flex h-10 w-48 items-center gap-2 rounded-t-[22px] bg-[#FF3F1A] text-white px-4 font-bold text-[16px] leading-normal">
                <SparklesIcon className="size-4 stroke-[2.2]" />
                <span>Cobro de Orden</span>
              </div>

              {pedidoFoco && (
                <div className="absolute top-0 right-1 z-10">
                  <button
                    type="button"
                    onClick={() => pedidosStore.togglePagado(pedidoFoco.id)}
                    title={
                      pedidoFoco.pagado
                        ? "Marcar como pendiente de cobro"
                        : "Marcar orden como pagada"
                    }
                    className="flex size-8 items-center justify-center rounded-full bg-white dark:bg-[#1E1E22] border border-[#ECECEC] dark:border-white/10 text-[#190088] dark:text-white hover:border-[#FF3F1A] transition-colors cursor-pointer shadow-theme-xs"
                  >
                    <CheckCircleIcon className="size-4" />
                  </button>
                </div>
              )}

              <div className="rounded-b-[26px] rounded-tr-[26px] bg-white dark:bg-[#18181B] border border-[#ECECEC] dark:border-white/10 p-5 shadow-theme-xs">
                {pedidoFoco ? (
                  <div className="space-y-3.5">
                    <div className="border-b border-[#ECECEC] dark:border-white/10 pb-2.5">
                      <p className="text-[12px] leading-normal font-light text-[#212121]/70 dark:text-[#ECECEC]/60">
                        Total {pedidoFoco.numero}
                      </p>
                      <p className="text-[24px] leading-snug font-bold text-[#190088] dark:text-white">
                        {money(pedidosStore.totalPedido(pedidoFoco))}
                      </p>
                    </div>

                    <div className="border-b border-[#ECECEC] dark:border-white/10 pb-2.5">
                      <p className="text-[12px] leading-normal font-light text-[#212121]/70 dark:text-[#ECECEC]/60">
                        Subtotal & Envío
                      </p>
                      <p className="text-[14px] leading-normal font-normal text-[#212121] dark:text-[#ECECEC]">
                        Productos:{" "}
                        <strong className="font-bold">
                          {money(pedidosStore.subtotalItems(pedidoFoco))}
                        </strong>
                        {pedidoFoco.costoEnvio
                          ? ` · Envío: ${money(pedidoFoco.costoEnvio)}`
                          : " · Sin envío"}
                      </p>
                    </div>

                    <div>
                      <p className="text-[12px] leading-normal font-light text-[#212121]/70 dark:text-[#ECECEC]/60">
                        Medio & Estado de pago
                      </p>
                      <p className="text-[14px] leading-normal font-bold text-[#190088] dark:text-white">
                        {pedidosStore.medioPagoLabel(pedidoFoco.metodoPago)} ·{" "}
                        <span
                          className={
                            pedidoFoco.pagado
                              ? "text-[#190088] dark:text-white"
                              : "text-[#FF3F1A]"
                          }
                        >
                          {pedidoFoco.pagado ? "Pagado" : "Por cobrar"}
                        </span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="py-4 text-center text-[12px] leading-normal font-light">
                    Sin orden seleccionada
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── COLUMNA DERECHA / CENTRAL: PANEL CON 3 PESTAÑAS ── */}
          <div className="lg:col-span-8 xl:col-span-9 flex flex-col">
            <div className="flex flex-wrap items-center gap-2 pb-2 lg:pb-0">
              {(
                [
                  {
                    id: "operacion",
                    label: "Operación",
                    count: enCursoList.length + completadosList.length,
                  },
                  {
                    id: "actividad",
                    label: "Actividad",
                    count: eventosAuditoria.length,
                  },
                  {
                    id: "chats",
                    label: "Chats",
                    count: conversacionesStore.conversaciones.length,
                  },
                ] as { id: WorkspaceTab; label: string; count: number }[]
              ).map((tab) => {
                const activa = tabActiva === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTabActiva(tab.id)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 text-[14px] leading-normal font-bold transition-all cursor-pointer ${activa
                        ? "rounded-t-[20px] rounded-b-none bg-[#190088] text-white lg:-mb-px z-10"
                        : "rounded-full bg-white dark:bg-[#1E1E22] border border-[#ECECEC] dark:border-white/10 text-[#212121] dark:text-[#ECECEC] hover:border-[#190088]/30 mb-1 font-normal shadow-theme-xs"
                      }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[12px] leading-normal font-bold ${activa
                          ? "bg-[#FF3F1A] text-white"
                          : "bg-[#ECECEC] text-[#190088] dark:bg-white/10 dark:text-white"
                        }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="rounded-[28px] rounded-tl-none bg-white dark:bg-[#18181B] border border-[#ECECEC] dark:border-white/10 p-5 sm:p-6 shadow-theme-xs">
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                {/* ── COLUMNA INTERNA IZQUIERDA (xl:col-span-7): Línea de tiempo ── */}
                <div className="xl:col-span-7 flex flex-col justify-between min-h-[450px]">
                  {tabActiva === "operacion" && (
                    <div className="space-y-6">
                      <div>
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="text-[24px] leading-snug font-bold text-[#190088] dark:text-white">
                            En curso
                          </h3>
                          <span className="text-[12px] leading-normal font-normal text-[#212121]/70 dark:text-white/60">
                            {enCursoList.length} órdenes
                          </span>
                        </div>

                        {enCursoList.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-[#ECECEC] dark:border-white/10 p-6 text-center text-[12px] leading-normal font-light text-[#212121]/70 dark:text-white/60">
                            No hay órdenes en curso con el filtro actual.
                          </div>
                        ) : (
                          <div className="relative space-y-2.5 before:absolute before:left-4 before:top-4 before:bottom-4 before:w-px before:bg-[#ECECEC] dark:before:bg-white/10">
                            {enCursoList.slice(0, 5).map((p, idx) => {
                              const esFoco = pedidoFoco?.id === p.id;
                              const badge = badgeStylePorEstado(p.estado);
                              const primerItem = p.items[0];
                              const tituloOrden = primerItem
                                ? `${primerItem.cantidad}× ${primerItem.nombre}${p.items.length > 1
                                  ? ` +${p.items.length - 1}`
                                  : ""
                                }`
                                : "Pedido";

                              return (
                                <div
                                  key={p.id}
                                  className="relative flex items-center gap-3"
                                >
                                  <button
                                    type="button"
                                    onClick={() => setPedidoFocoId(p.id)}
                                    className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-[12px] leading-normal font-bold cursor-pointer ${nodoColorPorIndice(
                                      idx,
                                    )}`}
                                  >
                                    {pedidosStore.minutosEnEstado(p)}m
                                  </button>

                                  <div
                                    onClick={() => setPedidoFocoId(p.id)}
                                    className={`flex flex-1 items-center justify-between gap-2.5 rounded-2xl border px-3.5 py-2.5 transition-all cursor-pointer ${esFoco
                                        ? "bg-[#190088]/[0.04] dark:bg-white/[0.08] border-[#190088] dark:border-white/40"
                                        : "bg-white dark:bg-[#22232D] border-[#ECECEC] dark:border-white/10 hover:border-[#190088]/30"
                                      }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          avanzarPedido(p.id);
                                        }}
                                        title="Avanzar a la siguiente etapa"
                                        className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-[#190088]/40 dark:border-white/30 hover:border-[#FF3F1A] hover:bg-[#FF3F1A] text-transparent hover:text-white transition-colors cursor-pointer"
                                      >
                                        <CheckIcon className="size-3 stroke-[3]" />
                                      </button>

                                      <div className="min-w-0">
                                        <p className="text-[16px] leading-normal font-bold text-[#190088] dark:text-white truncate">
                                          <span className="mr-1.5">
                                            {p.numero}
                                          </span>
                                          {tituloOrden}
                                        </p>
                                        <p className="text-[12px] leading-normal font-normal text-[#212121]/70 dark:text-[#ECECEC]/60 truncate">
                                          {p.cliente} ·{" "}
                                          {pedidosStore.modalidadLabel(
                                            p.modalidad,
                                          )}{" "}
                                          ·{" "}
                                          <span className="font-bold text-[#212121] dark:text-[#ECECEC]">
                                            {money(
                                              pedidosStore.totalPedido(p),
                                            )}
                                          </span>
                                        </p>
                                      </div>
                                    </div>

                                    <span
                                      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[12px] leading-normal font-bold ${badge.bg} ${badge.text}`}
                                    >
                                      <span
                                        className={`size-1.5 rounded-full ${badge.dot}`}
                                      />
                                      {pedidosStore.estadoLabel(p.estado)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Sección 2: Completados */}
                      <div>
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="text-[24px] leading-snug font-bold text-[#190088] dark:text-white">
                            Completados
                          </h3>
                          <span className="text-[12px] leading-normal font-normal text-[#212121]/70 dark:text-[#ECECEC]/60">
                            {completadosList.length} entregados
                          </span>
                        </div>

                        {completadosList.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-[#ECECEC] dark:border-white/10 p-4 text-center text-[12px] leading-normal font-light text-[#212121]/70 dark:text-[#ECECEC]/60">
                            Sin entregas cerradas en este filtro.
                          </div>
                        ) : (
                          <div className="relative space-y-2.5 before:absolute before:left-4 before:top-4 before:bottom-4 before:w-px before:bg-[#ECECEC] dark:before:bg-white/10">
                            {completadosList.slice(0, 3).map((p) => {
                              const esFoco = pedidoFoco?.id === p.id;
                              return (
                                <div
                                  key={p.id}
                                  className="relative flex items-center gap-3"
                                >
                                  <div className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#190088] text-white">
                                    <CheckIcon className="size-4 stroke-[2.5]" />
                                  </div>

                                  <div
                                    onClick={() => setPedidoFocoId(p.id)}
                                    className={`flex flex-1 items-center justify-between gap-2.5 rounded-2xl border px-3.5 py-2.5 transition-all cursor-pointer ${esFoco
                                        ? "bg-[#190088]/[0.04] dark:bg-white/[0.08] border-[#190088] dark:border-white/40"
                                        : "bg-[#FAFAFA] dark:bg-[#1E1E22] border-[#ECECEC] dark:border-white/10 hover:border-[#190088]/20"
                                      }`}
                                  >
                                    <div className="min-w-0">
                                      <p className="text-[16px] leading-normal font-bold text-[#190088] dark:text-white truncate">
                                        <span className="mr-1.5">
                                          {p.numero}
                                        </span>
                                        {p.cliente}
                                      </p>
                                      <p className="text-[12px] leading-normal font-normal text-[#212121]/70 dark:text-[#ECECEC]/60 truncate">
                                        {pedidosStore.resumenItems(p)} ·{" "}
                                        <span className="font-bold text-[#212121] dark:text-[#ECECEC]">
                                          {money(pedidosStore.totalPedido(p))}
                                        </span>
                                      </p>
                                    </div>

                                    <span className="inline-flex shrink-0 items-center rounded-full bg-[#190088]/10 dark:bg-white/10 px-2.5 py-0.5 text-[12px] leading-normal font-bold text-[#190088] dark:text-white">
                                      Entregado
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {tabActiva === "actividad" && (
                    <div className="space-y-3">
                      <h3 className="text-[24px] leading-snug font-bold text-[#190088] dark:text-white">
                        Historial de Actividad
                      </h3>
                      <div className="relative space-y-2.5 before:absolute before:left-4 before:top-4 before:bottom-4 before:w-px before:bg-[#ECECEC] dark:before:bg-white/10">
                        {eventosAuditoria.map((ev, idx) => (
                          <div
                            key={ev.id}
                            className="relative flex items-center gap-3"
                          >
                            <div
                              className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-[12px] leading-normal font-bold ${nodoColorPorIndice(
                                idx,
                              )}`}
                            >
                              {formatHoraCorta(ev.fecha)}
                            </div>
                            <div
                              onClick={() => setPedidoFocoId(ev.pedido.id)}
                              className="flex flex-1 items-center justify-between gap-2 rounded-2xl bg-[#FAFAFA] dark:bg-[#1E1E22] border border-[#ECECEC] dark:border-white/10 px-3.5 py-2.5 hover:border-[#190088]/20 cursor-pointer"
                            >
                              <div className="min-w-0">
                                <p className="text-[16px] leading-normal font-bold text-[#190088] dark:text-white truncate">
                                  <span className="mr-1.5">
                                    {ev.pedido.numero}
                                  </span>
                                  {ev.accion}
                                </p>
                                <p className="text-[12px] leading-normal font-normal text-[#212121]/70 dark:text-[#ECECEC]/60 truncate">
                                  {ev.operadorNombre} · {ev.pedido.cliente}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {tabActiva === "chats" && (
                    <div className="space-y-3">
                      <h3 className="text-[24px] leading-snug font-bold text-[#190088] dark:text-white">
                        Conversaciones Activas
                      </h3>
                      <div className="space-y-2">
                        {conversacionesStore.conversaciones
                          .slice(0, 6)
                          .map((conv) => {
                            const pAsoc = pedidosStore.pedidoActivoDe(
                              conv.contacto.telefono,
                            );
                            const urgente =
                              conversacionesStore.requiereAtencionHumana(conv);
                            return (
                              <div
                                key={conv.id}
                                onClick={() => onOpenChat(conv.id)}
                                className="flex items-center justify-between gap-3 rounded-2xl bg-[#FAFAFA] dark:bg-[#1E1E22] border border-[#ECECEC] dark:border-white/10 px-3.5 py-2.5 hover:border-[#190088]/20 cursor-pointer"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <CanalAvatar
                                    canal={conv.canal}
                                    nombre={conv.contacto.nombre}
                                    size="medium"
                                    status={urgente ? "busy" : "online"}
                                  />
                                  <div className="min-w-0">
                                    <p className="text-[16px] leading-normal font-bold text-[#190088] dark:text-white truncate">
                                      {conv.contacto.nombre}
                                      {pAsoc && (
                                        <span className="ml-2 text-[12px] leading-normal font-normal text-[#212121]/70 dark:text-[#ECECEC]/60">
                                          ({pAsoc.numero})
                                        </span>
                                      )}
                                    </p>
                                    <p className="text-[12px] leading-normal font-normal text-[#212121]/70 dark:text-[#ECECEC]/60 truncate">
                                      {etiquetaEstado(conv.estado)} ·{" "}
                                      {ATENCION_LABEL[conv.atencion]}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {urgente && (
                                    <span className="rounded-full bg-[#FF3F1A] text-white px-2.5 py-0.5 text-[12px] leading-normal font-bold">
                                      Pide asesor
                                    </span>
                                  )}
                                  <span className="text-[12px] leading-normal font-light text-[#212121]/70 dark:text-[#ECECEC]/60">
                                    {relativo(
                                      conversacionesStore.minutosEsperando(
                                        conv,
                                      ),
                                    )}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Barra Flotante Inferior */}
                  <div className="mt-6 flex items-center gap-2 rounded-full bg-[#190088] dark:bg-[#1E1E22] dark:border dark:border-white/15 p-1.5 pl-4 text-white shadow-theme-xs">
                    <DocumentTextIcon className="size-4 text-white/70 shrink-0" />
                    <input
                      type="text"
                      value={notaRapida}
                      onChange={(e) => setNotaRapida(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleGuardarNotaRapida();
                      }}
                      placeholder={
                        pedidoFoco
                          ? `Agregar nota rápida a ${pedidoFoco.numero}…`
                          : "Escribe una nota operativa…"
                      }
                      className="flex-1 bg-transparent text-[14px] leading-normal font-normal text-white placeholder:text-white/60 focus:outline-hidden"
                    />
                    {notaRapida.trim() && pedidoFoco ? (
                      <button
                        type="button"
                        onClick={handleGuardarNotaRapida}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#FF3F1A] px-3.5 py-2 text-[14px] leading-normal font-bold text-white hover:bg-[#FF3F1A]/90 transition-opacity cursor-pointer shrink-0"
                      >
                        <span>Guardar nota</span>
                      </button>
                    ) : (
                      puedeCrear && (
                        <button
                          type="button"
                          onClick={() => onOpenCrearPedido ? onOpenCrearPedido() : navigate("/pedidos/crear")}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#FF3F1A] px-4 py-2 text-[14px] leading-normal font-bold text-white hover:bg-[#FF3F1A]/90 transition-opacity cursor-pointer shrink-0"
                        >
                          <PlusIcon className="size-3.5 stroke-[2.8]" />
                          <span>Nuevo pedido</span>
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* ── COLUMNA INTERNA DERECHA (xl:col-span-5): Comprobantes ── */}
                <div className="xl:col-span-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[24px] leading-snug font-bold text-[#190088] dark:text-white">
                      Comprobantes
                    </h3>
                    <span className="text-[12px] leading-normal font-light text-[#212121]/70 dark:text-[#ECECEC]/60">
                      Orden en foco
                    </span>
                  </div>

                  {pedidosConComprobante.map((p, idx) => {
                    const subtotal = pedidosStore.subtotalItems(p);
                    const envio = p.costoEnvio ?? 0;
                    const total = pedidosStore.totalPedido(p);
                    const porValidar = esperaValidacionPago(p);

                    return (
                      <div
                        key={p.id}
                        onClick={() => setPedidoFocoId(p.id)}
                        className="rounded-3xl bg-[#FAFAFA] dark:bg-[#1E1E22] border border-[#ECECEC] dark:border-white/10 p-4 transition-all hover:border-[#190088]/30 dark:hover:border-white/20 cursor-pointer shadow-theme-xs"
                      >
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="min-w-0">
                            <p className="text-[12px] leading-normal font-light text-[#212121]/70 dark:text-[#ECECEC]/60">
                              {formatHoraCorta(p.createdAt)} · {p.numero}
                            </p>
                            <h4 className="text-[16px] leading-normal font-bold text-[#190088] dark:text-white truncate">
                              {idx === 0
                                ? `Comanda · ${p.cliente}`
                                : `Por validar · ${p.cliente}`}
                            </h4>
                          </div>

                          {porValidar && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void confirmarPagoPedido(
                                  p.id,
                                  p.metodoPago ?? "transferencia",
                                );
                              }}
                              className="rounded-full bg-[#FF3F1A] text-white px-3 py-1 text-[12px] leading-normal font-bold hover:opacity-90 cursor-pointer shrink-0"
                            >
                              Validar ✓
                            </button>
                          )}
                        </div>

                        <div className="rounded-2xl bg-white dark:bg-[#141417] border border-[#ECECEC] dark:border-white/10 p-3.5">
                          <div className="flex items-center justify-between border-b border-[#ECECEC] dark:border-white/10 pb-2 mb-2">
                            <span className="text-[14px] leading-normal font-bold text-[#190088] dark:text-white">
                              {p.numero} ·{" "}
                              {pedidosStore.medioPagoLabel(p.metodoPago)}
                            </span>

                            <span
                              className={`rounded-md px-2 py-0.5 text-[12px] leading-normal font-bold uppercase tracking-wider ${p.pagado
                                  ? "bg-[#190088] text-white"
                                  : "bg-[#FF3F1A] text-white"
                                }`}
                            >
                              {p.pagado
                                ? "PAGADO"
                                : porValidar
                                  ? "POR VALIDAR"
                                  : "PENDIENTE"}
                            </span>
                          </div>

                          <div className="space-y-1 text-[12px] leading-normal">
                            {p.items.slice(0, 3).map((it, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between text-[#212121] dark:text-[#ECECEC] font-normal"
                              >
                                <span className="truncate pr-2">
                                  <strong className="font-bold">
                                    {it.cantidad}×
                                  </strong>{" "}
                                  {it.nombre}
                                </span>
                                <span className="font-bold shrink-0">
                                  {money((it.precio ?? 0) * it.cantidad)}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-dashed border-[#ECECEC] dark:border-white/10 flex items-center justify-between">
                            <span className="text-[12px] leading-normal font-light text-[#212121]/70 dark:text-[#ECECEC]/60">
                              Subtotal {money(subtotal)}
                              {envio > 0 ? ` + Envío ${money(envio)}` : ""}
                            </span>
                            <span className="text-[16px] leading-normal font-bold text-[#190088] dark:text-white">
                              {money(total)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

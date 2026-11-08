import { useState, useMemo } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import {
  pedidosStore,
  sessionStore,
  organizacionStore,
  conversacionesStore,
  esperaValidacionPago,
  puedeMoverA,
  puedeCrearPedido,
  ATENCION_LABEL,
  etiquetaEstado,
  type Pedido,
  type PedidoEstado,
} from "@/stores";
import type { CanalId } from "@/stores/conversaciones.types";
import { avanzarPedido, confirmarPagoPedido } from "./pedidos.notificaciones";
import { money, relativo } from "./widgets";
import { CanalAvatar } from "@/pages/conversaciones";
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  DocumentTextIcon,
  EllipsisHorizontalIcon,
  EyeIcon,
  FlagIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlayIcon,
  PlusIcon,
  SparklesIcon,
  TruckIcon,
  TvIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

export interface AdminDashboardViewProps {
  onVerDetalle: (pedidoId: string) => void;
  onOpenChat: (convId: string) => void;
  onOpenChatPedido: (pedidoId: string) => void;
  onOpenCalendario: () => void;
  onOpenDisplay: () => void;
  onOpenClientes: () => void;
  fechaTexto: string;
  botonSilenciar?: ReactNode;
}

type FiltroRapidoPago = "todos" | "pagados" | "por_cobrar";
type FiltroSegmentoPipeline =
  | "todos"
  | "entregados"
  | "en_camino"
  | "cocina_listos"
  | "nuevos_confirmados"
  | "programados";

type WorkspaceTab =
  | "operacion"
  | "actividad"
  | "chats"
  | "programados"
  | "validacion"
  | "tickets";

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

const CANALES_CIRCULARES: {
  id: CanalId;
  label: string;
  short: string;
}[] = [
  { id: "whatsapp", label: "WhatsApp", short: "WA" },
  { id: "instagram", label: "Instagram", short: "IG" },
  { id: "telegram", label: "Telegram", short: "TG" },
  { id: "messenger", label: "Messenger", short: "MS" },
  { id: "tiktok", label: "TikTok", short: "TK" },
];

function badgeStylePorEstado(estado: PedidoEstado): {
  bg: string;
  text: string;
  dot: string;
} {
  switch (estado) {
    case "entregado":
      return {
        bg: "bg-[#97D6DF]/25 border-[#97D6DF]/50 dark:bg-[#97D6DF]/20 dark:border-[#97D6DF]/40",
        text: "text-[#190088] dark:text-[#97D6DF]",
        dot: "bg-[#190088] dark:bg-[#97D6DF]",
      };
    case "en_camino":
      return {
        bg: "bg-[#190088] border-[#190088]",
        text: "text-white",
        dot: "bg-[#97D6DF]",
      };
    case "listo":
    case "en_preparacion":
      return {
        bg: "bg-[#EFE6D3] border-[#EFE6D3] dark:bg-[#EFE6D3]/20 dark:border-[#EFE6D3]/40",
        text: "text-[#190088] dark:text-[#EFE6D3]",
        dot: "bg-[#FF3F1A]",
      };
    case "confirmado":
      return {
        bg: "bg-[#97D6DF]/20 border-[#97D6DF]/50 dark:bg-[#97D6DF]/15 dark:border-[#97D6DF]/30",
        text: "text-[#190088] dark:text-[#97D6DF]",
        dot: "bg-[#190088] dark:bg-[#97D6DF]",
      };
    case "nuevo":
      return {
        bg: "bg-[#FF3F1A]/15 border-[#FF3F1A]/40 dark:bg-[#FF3F1A]/20 dark:border-[#FF3F1A]/50",
        text: "text-[#FF3F1A]",
        dot: "bg-[#FF3F1A]",
      };
    case "programado":
      return {
        bg: "bg-[#ECECEC] dark:bg-white/10 border-[#ECECEC] dark:border-white/15",
        text: "text-[#212121] dark:text-[#ECECEC]",
        dot: "bg-[#190088] dark:bg-[#97D6DF]",
      };
    default:
      return {
        bg: "bg-[#ECECEC] dark:bg-white/10 border-[#ECECEC] dark:border-white/15",
        text: "text-[#212121]/70 dark:text-[#ECECEC]/70",
        dot: "bg-[#212121]/50 dark:bg-[#ECECEC]/50",
      };
  }
}

function nodoColorPorIndice(idx: number): string {
  const palettes = [
    "bg-[#97D6DF] text-[#190088]",
    "bg-[#EFE6D3] text-[#190088]",
    "bg-[#190088] text-white",
    "bg-[#FF3F1A]/20 text-[#FF3F1A]",
  ];
  return palettes[idx % palettes.length];
}

export const AdminDashboardView = observer(
  ({
    onVerDetalle,
    onOpenChat,
    onOpenChatPedido,
    onOpenCalendario,
    onOpenDisplay,
    onOpenClientes,
    fechaTexto,
    botonSilenciar,
  }: AdminDashboardViewProps) => {
    const navigate = useNavigate();

    const [busqueda, setBusqueda] = useState("");
    const [notaRapida, setNotaRapida] = useState("");
    const [pedidoFocoId, setPedidoFocoId] = useState<string | null>(null);
    const [selectorAbierto, setSelectorAbierto] = useState(false);
    const [filtroPago, setFiltroPago] = useState<FiltroRapidoPago>("todos");
    const [filtroSegmento, setFiltroSegmento] =
      useState<FiltroSegmentoPipeline>("todos");
    const [tabActiva, setTabActiva] = useState<WorkspaceTab>("operacion");

    const puedeCrear = puedeCrearPedido();
    const todosLosPedidos = pedidosStore.pedidos;

    // Lista priorizada para el selector de foco
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

    // Métricas financieras reales desde pedidosStore
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

    // Monto principal mostrado en el Hero según el filtro rápido de cobro
    const montoHero =
      filtroPago === "pagados"
        ? metricas.totalRecaudado
        : filtroPago === "por_cobrar"
          ? metricas.totalPendiente
          : metricas.totalTurno;

    const heroCurrency = splitMoneyParts(montoHero);

    // Conteos de las 5 etapas de la barra segmentada
    const conteosBarra = useMemo(() => {
      const entregados = todosLosPedidos.filter(
        (p) => p.estado === "entregado",
      ).length;
      const enCamino = todosLosPedidos.filter(
        (p) => p.estado === "en_camino",
      ).length;
      const cocinaListos = todosLosPedidos.filter(
        (p) => p.estado === "en_preparacion" || p.estado === "listo",
      ).length;
      const nuevosConfirmados = todosLosPedidos.filter(
        (p) => p.estado === "nuevo" || p.estado === "confirmado",
      ).length;
      const programados = todosLosPedidos.filter(
        (p) => p.estado === "programado",
      ).length;

      return {
        entregados,
        enCamino,
        cocinaListos,
        nuevosConfirmados,
        programados,
      };
    }, [todosLosPedidos]);

    // Filtrado de pedidos para el panel central
    const pedidosFiltrados = useMemo(() => {
      const q = busqueda.trim().toLowerCase();
      const qNota = notaRapida.trim().toLowerCase();

      return todosLosPedidos.filter((p) => {
        if (filtroPago === "pagados" && !p.pagado) return false;
        if (filtroPago === "por_cobrar" && p.pagado) return false;

        if (filtroSegmento === "entregados" && p.estado !== "entregado")
          return false;
        if (filtroSegmento === "en_camino" && p.estado !== "en_camino")
          return false;
        if (
          filtroSegmento === "cocina_listos" &&
          p.estado !== "en_preparacion" &&
          p.estado !== "listo"
        )
          return false;
        if (
          filtroSegmento === "nuevos_confirmados" &&
          p.estado !== "nuevo" &&
          p.estado !== "confirmado"
        )
          return false;
        if (filtroSegmento === "programados" && p.estado !== "programado")
          return false;

        if (q) {
          const match =
            p.numero.toLowerCase().includes(q) ||
            p.cliente.toLowerCase().includes(q) ||
            p.telefono.toLowerCase().includes(q) ||
            p.items.some((it) => it.nombre.toLowerCase().includes(q));
          if (!match) return false;
        }

        if (qNota) {
          const matchNota =
            p.numero.toLowerCase().includes(qNota) ||
            p.cliente.toLowerCase().includes(qNota) ||
            (p.notas ?? "").toLowerCase().includes(qNota) ||
            p.items.some((it) => it.nombre.toLowerCase().includes(qNota));
          if (!matchNota) return false;
        }

        return true;
      });
    }, [todosLosPedidos, filtroPago, filtroSegmento, busqueda, notaRapida]);

    const enCursoList = useMemo(
      () =>
        pedidosFiltrados
          .filter(
            (p) =>
              p.estado !== "entregado" &&
              p.estado !== "cancelado" &&
              (filtroSegmento === "programados" || p.estado !== "programado"),
          )
          .sort(
            (a, b) =>
              pedidosStore.minutosEnEstado(b) - pedidosStore.minutosEnEstado(a),
          ),
      [pedidosFiltrados, filtroSegmento],
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

    const porValidarList = useMemo(
      () =>
        todosLosPedidos.filter(
          (p) => p.estado !== "cancelado" && esperaValidacionPago(p),
        ),
      [todosLosPedidos],
    );

    // Eventos de auditoría combinados para la pestaña Actividad
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
        } else {
          lista.push({
            id: `${p.id}-created`,
            fecha: p.createdAt,
            accion: `Orden registrada (${pedidosStore.estadoLabel(p.estado)})`,
            operadorNombre:
              p.origen === "whatsapp" ? "Bot WhatsApp" : "Operador en turno",
            pedido: p,
          });
        }
      }

      return lista.sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 12);
    }, [todosLosPedidos]);

    // Comprobantes / Tickets para la columna derecha ("Comprobantes & Tickets")
    const pedidosConComprobante = useMemo(() => {
      const prioritarios = [
        ...(pedidoFoco ? [pedidoFoco] : []),
        ...porValidarList,
        ...todosLosPedidos.filter((p) => p.estado !== "cancelado"),
      ];
      const vistos = new Set<string>();
      const unicos: Pedido[] = [];
      for (const p of prioritarios) {
        if (!vistos.has(p.id)) {
          vistos.add(p.id);
          unicos.push(p);
        }
        if (unicos.length >= 3) break;
      }
      return unicos;
    }, [pedidoFoco, porValidarList, todosLosPedidos]);

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

    const nombreAdmin =
      organizacionStore.usuario?.nombre ||
      sessionStore.operadorSimulado?.nombre ||
      "Admin";

    const seleccionarSegmento = (seg: FiltroSegmentoPipeline) => {
      setFiltroSegmento((prev) => (prev === seg ? "todos" : seg));
    };

    return (
      <div
        data-testid="admin-dashboard-view"
        className="space-y-6 font-sans text-[#212121] dark:text-[#ECECEC]"
      >
        {/* ═══════════════════════════════════════════════════════════════════
            1. TOP NAVIGATION / CONTEXT BAR (Direct on Page Surface)
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Selected Order / Client Switcher Pill */}
          <div className="relative flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/pedidos")}
              title="Ir al tablero completo de pedidos"
              className="flex size-10 items-center justify-center rounded-full bg-white dark:bg-[#1E1E22] border border-[#ECECEC] dark:border-white/10 text-[#190088] dark:text-white hover:bg-[#ECECEC]/50 dark:hover:bg-white/10 transition-colors cursor-pointer shadow-theme-xs"
            >
              <ArrowLeftIcon className="size-4 stroke-[2.2]" />
            </button>

            <div className="flex items-center rounded-full bg-white dark:bg-[#1E1E22] border border-[#ECECEC] dark:border-white/10 p-1 pl-3.5 pr-1.5 shadow-theme-xs">
              <button
                type="button"
                onClick={() => setSelectorAbierto((v) => !v)}
                className="flex items-center gap-2.5 text-left pr-2 cursor-pointer"
              >
                <span className="text-[16px] leading-normal font-bold text-[#190088] dark:text-white truncate max-w-[160px] sm:max-w-[210px]">
                  {pedidoFoco ? pedidoFoco.cliente : "Sin pedidos activos"}
                </span>
                {pedidoFoco && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#190088] text-white dark:bg-[#97D6DF] dark:text-[#190088] px-2.5 py-0.5 text-[12px] leading-normal font-bold">
                    {pedidoFoco.numero} ·{" "}
                    {pedidosStore.modalidadLabel(pedidoFoco.modalidad)}
                  </span>
                )}
              </button>

              <div className="flex items-center gap-0.5 border-l border-[#ECECEC] dark:border-white/10 pl-1">
                <button
                  type="button"
                  onClick={() => ciclarPedidoFoco(-1)}
                  title="Pedido anterior"
                  aria-label="Pedido anterior"
                  className="flex size-7 items-center justify-center rounded-full text-[#212121]/70 hover:bg-[#ECECEC] dark:text-[#ECECEC]/70 dark:hover:bg-white/10 cursor-pointer"
                >
                  <ChevronLeftIcon className="size-3.5 stroke-[2.5]" />
                </button>
                <button
                  type="button"
                  onClick={() => ciclarPedidoFoco(1)}
                  title="Siguiente pedido"
                  aria-label="Siguiente pedido"
                  className="flex size-7 items-center justify-center rounded-full text-[#212121]/70 hover:bg-[#ECECEC] dark:text-[#ECECEC]/70 dark:hover:bg-white/10 cursor-pointer"
                >
                  <ChevronRightIcon className="size-3.5 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* Dropdown de selección rápida de cliente/pedido */}
            {selectorAbierto && listaPriorizada.length > 0 && (
              <div className="absolute left-12 top-12 z-30 w-80 rounded-2xl bg-white dark:bg-[#1E1E22] border border-[#ECECEC] dark:border-white/10 shadow-xl p-2 max-h-72 overflow-y-auto">
                <div className="px-2.5 py-1.5 text-[12px] leading-normal font-bold uppercase tracking-wider text-[#190088] dark:text-[#97D6DF]">
                  Inspeccionar orden ({listaPriorizada.length})
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
                      className={`w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-[12px] leading-normal transition-colors cursor-pointer ${
                        activo
                          ? "bg-[#190088] text-white dark:bg-[#97D6DF] dark:text-[#190088] font-bold"
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

          {/* Center: Search Bar + Quick Create `+` Button */}
          <div className="flex flex-1 max-w-md items-center gap-2 mx-auto lg:mx-4">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#212121]/60 dark:text-[#ECECEC]/50" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar pedido, cliente o teléfono…"
                className="h-10 w-full rounded-full bg-white dark:bg-[#1E1E22] border border-[#ECECEC] dark:border-white/10 pl-10 pr-4 text-[14px] leading-normal font-normal text-[#212121] dark:text-[#ECECEC] placeholder:text-[#212121]/50 dark:placeholder:text-[#ECECEC]/40 focus:outline-hidden focus:ring-2 focus:ring-[#190088]/20 dark:focus:ring-[#97D6DF]/30 shadow-theme-xs"
              />
            </div>

            {puedeCrear && (
              <button
                type="button"
                onClick={() => navigate("/pedidos/crear")}
                title="Crear nuevo pedido"
                aria-label="Crear nuevo pedido"
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FF3F1A] text-white hover:bg-[#FF3F1A]/90 transition-opacity cursor-pointer shadow-theme-xs"
              >
                <PlusIcon className="size-4 stroke-[2.5]" />
              </button>
            )}
          </div>

          {/* Right: Action Icons & Admin Profile Pill */}
          <div className="flex items-center gap-2">
            {botonSilenciar}

            <button
              type="button"
              onClick={onOpenClientes}
              title="Bandeja de clientes y chats"
              className="relative flex size-10 items-center justify-center rounded-full bg-white dark:bg-[#1E1E22] border border-[#ECECEC] dark:border-white/10 text-[#212121] dark:text-[#ECECEC] hover:text-[#190088] dark:hover:text-[#97D6DF] transition-colors cursor-pointer shadow-theme-xs"
            >
              <UsersIcon className="size-4" />
              {conversacionesStore.totalRequierenAtencion > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-[#FF3F1A] text-[12px] leading-normal font-bold text-white">
                  {conversacionesStore.totalRequierenAtencion}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onOpenDisplay}
              title="Modo Enfoque / Pantalla KDS"
              className="flex size-10 items-center justify-center rounded-full bg-white dark:bg-[#1E1E22] border border-[#ECECEC] dark:border-white/10 text-[#212121] dark:text-[#ECECEC] hover:text-[#190088] dark:hover:text-[#97D6DF] transition-colors cursor-pointer shadow-theme-xs"
            >
              <TvIcon className="size-4" />
            </button>

            <button
              type="button"
              onClick={onOpenCalendario}
              title="Abrir calendario de pedidos"
              className="flex size-10 items-center justify-center rounded-full bg-white dark:bg-[#1E1E22] border border-[#ECECEC] dark:border-white/10 text-[#212121] dark:text-[#ECECEC] hover:text-[#190088] dark:hover:text-[#97D6DF] transition-colors cursor-pointer shadow-theme-xs"
            >
              <CalendarDaysIcon className="size-4" />
            </button>

            {/* Admin Profile Badge */}
            <div className="hidden sm:flex items-center gap-2 rounded-full bg-white dark:bg-[#1E1E22] border border-[#ECECEC] dark:border-white/10 py-1 pl-1.5 pr-3 shadow-theme-xs">
              <div className="flex size-7 items-center justify-center rounded-full bg-[#EFE6D3] text-[#190088] text-[12px] leading-normal font-bold">
                {nombreAdmin.slice(0, 2).toUpperCase()}
              </div>
              <span className="text-[12px] leading-normal font-bold text-[#190088] dark:text-white truncate max-w-[110px]">
                {nombreAdmin}
              </span>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            2. HERO ROW (Big Revenue Metric + Live SLA & Cobrados / Por cobrar Pills)
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Giant Formatted Revenue Metric (36px Bold + 24px Light) */}
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
                ? `Ingresos cobrados y validados · ${metricas.pagadosCount} pedidos pagados`
                : filtroPago === "por_cobrar"
                  ? `Monto pendiente por cobrar / validar · ${metricas.pendientesCount} pedidos`
                  : `Ingresos del turno · ${todosLosPedidos.length} pedidos totales`}
            </p>
          </div>

          {/* Right: Live SLA Timer Pill + Detail `+` + Cobrados (#97D6DF) + Por cobrar (#FF3F1A) + `⋯` */}
          <div className="flex flex-wrap items-center gap-2.5">
            {pedidoFoco && (
              <button
                type="button"
                onClick={handleAvanzarFoco}
                disabled={!puedeAvanzarFoco}
                title={
                  siguienteEstadoFoco
                    ? `Clic para avanzar ${pedidoFoco.numero} a ${pedidosStore.estadoLabel(siguienteEstadoFoco)}`
                    : `${pedidoFoco.numero} en estado ${pedidosStore.estadoLabel(pedidoFoco.estado)}`
                }
                className="inline-flex items-center gap-2.5 rounded-full bg-white dark:bg-[#1E1E22] border border-[#ECECEC] dark:border-white/10 px-4 py-2 text-[14px] leading-normal font-normal text-[#212121] dark:text-[#ECECEC] hover:border-[#190088]/30 dark:hover:border-white/20 transition-all cursor-pointer disabled:opacity-60 shadow-theme-xs"
              >
                <ClockIcon className="size-4 text-[#190088] dark:text-[#97D6DF]" />
                <span>
                  En etapa:{" "}
                  <strong className="font-bold text-[#190088] dark:text-[#97D6DF]">
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

            {pedidoFoco && (
              <button
                type="button"
                onClick={() => onVerDetalle(pedidoFoco.id)}
                title={`Ver detalle completo de ${pedidoFoco.numero}`}
                className="flex size-10 items-center justify-center rounded-full bg-white dark:bg-[#1E1E22] border border-[#ECECEC] dark:border-white/10 text-[#190088] dark:text-white hover:bg-[#ECECEC]/50 dark:hover:bg-white/10 transition-colors cursor-pointer shadow-theme-xs"
              >
                <PlusIcon className="size-4 stroke-[2.2]" />
              </button>
            )}

            {/* Cyan NECTO Pill ("Cobrados") */}
            <button
              type="button"
              onClick={() =>
                setFiltroPago((prev) =>
                  prev === "pagados" ? "todos" : "pagados",
                )
              }
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[14px] leading-normal font-bold transition-all cursor-pointer bg-[#97D6DF] text-[#190088] shadow-theme-xs ${
                filtroPago === "pagados"
                  ? "ring-2 ring-[#190088] dark:ring-white"
                  : "hover:opacity-90"
              }`}
            >
              <span>Cobrados ({metricas.pagadosCount})</span>
              <span className="text-[12px] leading-normal font-bold">↗</span>
            </button>

            {/* Naranja NECTO Pill ("Por cobrar") */}
            <button
              type="button"
              onClick={() =>
                setFiltroPago((prev) =>
                  prev === "por_cobrar" ? "todos" : "por_cobrar",
                )
              }
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[14px] leading-normal font-bold transition-all cursor-pointer bg-[#FF3F1A] text-white shadow-theme-xs ${
                filtroPago === "por_cobrar"
                  ? "ring-2 ring-[#190088] dark:ring-white"
                  : "hover:opacity-90"
              }`}
            >
              <span>Por cobrar ({metricas.pendientesCount})</span>
              <span className="text-[12px] leading-normal font-bold">↘</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/pedidos")}
              title="Abrir Tablero Kanban completo"
              className="flex size-10 items-center justify-center rounded-full bg-white dark:bg-[#1E1E22] border border-[#ECECEC] dark:border-white/10 text-[#212121] dark:text-[#ECECEC] hover:bg-[#ECECEC]/50 dark:hover:bg-white/10 transition-colors cursor-pointer shadow-theme-xs"
            >
              <EllipsisHorizontalIcon className="size-5" />
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            3. SEGMENTED PIPELINE PROGRESS BAR (5 Stages + Date Flag)
        ═══════════════════════════════════════════════════════════════════ */}
        <div>
          <div className="mb-2.5 flex items-center justify-between text-[14px] leading-normal">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#190088] dark:text-white">
                Flujo operativo del turno
              </span>
              {filtroSegmento !== "todos" && (
                <button
                  type="button"
                  onClick={() => setFiltroSegmento("todos")}
                  className="rounded-full bg-[#ECECEC] dark:bg-white/10 px-2.5 py-0.5 text-[12px] leading-normal font-bold text-[#190088] dark:text-[#97D6DF] hover:opacity-80 cursor-pointer"
                >
                  Mostrar todas las etapas ×
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onOpenCalendario}
              className="inline-flex items-center gap-1.5 text-[14px] leading-normal font-normal text-[#212121]/70 dark:text-[#ECECEC]/70 hover:text-[#190088] dark:hover:text-white cursor-pointer"
            >
              <FlagIcon className="size-3.5 text-[#190088] dark:text-[#97D6DF]" />
              <span className="capitalize">{fechaTexto}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {/* Segment 1: Entregados (#97D6DF Cyan NECTO) */}
            <button
              type="button"
              onClick={() => seleccionarSegmento("entregados")}
              className={`flex h-11 items-center justify-between rounded-full px-4 text-[14px] leading-normal font-bold transition-all cursor-pointer bg-[#97D6DF] text-[#190088] shadow-theme-xs ${
                filtroSegmento === "entregados"
                  ? "ring-2 ring-[#190088] dark:ring-white scale-[1.01]"
                  : "hover:opacity-95"
              }`}
            >
              <span className="truncate">
                Entregados · {conteosBarra.entregados}
              </span>
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#190088]/15 text-[#190088]">
                <CheckIcon className="size-3 stroke-[3]" />
              </span>
            </button>

            {/* Segment 2: En camino (#190088 Azul profundo NECTO) */}
            <button
              type="button"
              onClick={() => seleccionarSegmento("en_camino")}
              className={`flex h-11 items-center justify-between rounded-full px-4 text-[14px] leading-normal font-bold transition-all cursor-pointer bg-[#190088] text-white shadow-theme-xs ${
                filtroSegmento === "en_camino"
                  ? "ring-2 ring-[#FF3F1A] scale-[1.01]"
                  : "hover:opacity-95"
              }`}
            >
              <span className="truncate">
                En camino · {conteosBarra.enCamino}
              </span>
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
                <TruckIcon className="size-3 stroke-[2.5]" />
              </span>
            </button>

            {/* Segment 3: En cocina & Listos (#EFE6D3 Cream NECTO) */}
            <button
              type="button"
              onClick={() => seleccionarSegmento("cocina_listos")}
              className={`flex h-11 items-center justify-between rounded-full px-4 text-[14px] leading-normal font-bold transition-all cursor-pointer bg-[#EFE6D3] text-[#190088] shadow-theme-xs ${
                filtroSegmento === "cocina_listos"
                  ? "ring-2 ring-[#190088] dark:ring-white scale-[1.01]"
                  : "hover:opacity-95"
              }`}
            >
              <span className="truncate">
                En cocina & Listos · {conteosBarra.cocinaListos}
              </span>
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#190088]/15 text-[#190088]">
                <ClockIcon className="size-3.5 stroke-[2.4]" />
              </span>
            </button>

            {/* Segment 4: Nuevos & Confirmados (#FF3F1A Naranja NECTO) */}
            <button
              type="button"
              onClick={() => seleccionarSegmento("nuevos_confirmados")}
              className={`flex h-11 items-center justify-between rounded-full border border-[#FF3F1A]/30 bg-[#FF3F1A]/10 dark:bg-[#FF3F1A]/20 dark:border-[#FF3F1A]/40 px-4 text-[14px] leading-normal font-bold text-[#FF3F1A] transition-all cursor-pointer shadow-theme-xs ${
                filtroSegmento === "nuevos_confirmados"
                  ? "ring-2 ring-[#FF3F1A] scale-[1.01]"
                  : "hover:bg-[#FF3F1A]/15"
              }`}
            >
              <span className="truncate">
                Nuevos & Confirm. · {conteosBarra.nuevosConfirmados}
              </span>
              <span className="rounded-full bg-[#FF3F1A] text-white px-2 py-0.5 text-[12px] leading-normal font-bold">
                Activos
              </span>
            </button>

            {/* Segment 5: Programados (#ECECEC Gris claro) */}
            <button
              type="button"
              onClick={() => seleccionarSegmento("programados")}
              className={`flex h-11 items-center justify-between rounded-full border border-[#ECECEC] dark:border-white/10 bg-[#ECECEC] text-[#212121] dark:bg-white/10 dark:text-[#ECECEC] px-4 text-[14px] leading-normal font-normal transition-all cursor-pointer shadow-theme-xs ${
                filtroSegmento === "programados"
                  ? "ring-2 ring-[#190088] dark:ring-white font-bold"
                  : "hover:opacity-90"
              }`}
            >
              <span className="truncate">Programados</span>
              <span className="font-bold">{conteosBarra.programados}</span>
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            4. MAIN 12-COLUMN GRID (Left Folder Cards + Right Workspace)
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ── LEFT COLUMN: STACKED FOLDER-TAB CARDS ── */}
          <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-6">
            {/* CARD 1: CREAM FOLDER CARD (#EFE6D3 — Detalles del Cliente) */}
            <div className="relative pt-8">
              {/* Folder Top Tab (Left) */}
              <div className="absolute top-0 left-0 z-10 flex h-10 w-44 items-center gap-2 rounded-t-[22px] bg-[#EFE6D3] text-[#190088] dark:bg-[#1E1E22] dark:text-[#EFE6D3] dark:border-t dark:border-x dark:border-white/10 px-4 font-bold text-[16px] leading-normal">
                <InformationCircleIcon className="size-4 stroke-[2.2]" />
                <span>Detalles</span>
              </div>

              {/* Top-Right Recess Action Buttons */}
              <div className="absolute top-0 right-1 z-10 flex items-center gap-1.5">
                {pedidoFoco && (
                  <>
                    <button
                      type="button"
                      onClick={() => onVerDetalle(pedidoFoco.id)}
                      title="Ver / Editar ficha del pedido"
                      className="flex size-8 items-center justify-center rounded-full bg-white dark:bg-[#1E1E22] border border-[#ECECEC] dark:border-white/10 text-[#190088] dark:text-white hover:scale-105 transition-transform cursor-pointer shadow-theme-xs"
                    >
                      <PencilSquareIcon className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        convFoco
                          ? onOpenChat(convFoco.id)
                          : onOpenChatPedido(pedidoFoco.id)
                      }
                      title="Abrir conversación del cliente"
                      className="flex size-8 items-center justify-center rounded-full bg-white dark:bg-[#1E1E22] border border-[#ECECEC] dark:border-white/10 text-[#190088] dark:text-white hover:scale-105 transition-transform cursor-pointer shadow-theme-xs"
                    >
                      <ChatBubbleLeftRightIcon className="size-3.5" />
                    </button>
                  </>
                )}
              </div>

              {/* Cream Folder Body */}
              <div className="rounded-b-[26px] rounded-tr-[26px] bg-[#EFE6D3] text-[#212121] dark:bg-[#1E1E22] dark:text-[#ECECEC] dark:border dark:border-white/10 p-5 shadow-theme-xs">
                {pedidoFoco ? (
                  <div className="space-y-3.5">
                    <div className="border-b border-[#190088]/10 dark:border-white/10 pb-2.5">
                      <p className="text-[12px] leading-normal font-light text-[#212121]/70 dark:text-[#ECECEC]/60">
                        Cliente
                      </p>
                      <p className="text-[16px] leading-normal font-bold text-[#190088] dark:text-white truncate">
                        {pedidoFoco.cliente}
                      </p>
                    </div>

                    <div className="border-b border-[#190088]/10 dark:border-white/10 pb-2.5">
                      <p className="text-[12px] leading-normal font-light text-[#212121]/70 dark:text-[#ECECEC]/60">
                        Orden & Modalidad
                      </p>
                      <p className="text-[14px] leading-normal font-bold text-[#212121] dark:text-[#ECECEC]">
                        {pedidoFoco.numero} ·{" "}
                        {pedidosStore.modalidadLabel(pedidoFoco.modalidad)} (
                        {pedidosStore.estadoLabel(pedidoFoco.estado)})
                      </p>
                    </div>

                    <div className="border-b border-[#190088]/10 dark:border-white/10 pb-2.5">
                      <p className="text-[12px] leading-normal font-light text-[#212121]/70 dark:text-[#ECECEC]/60">
                        Dirección / Notas de entrega
                      </p>
                      <p className="text-[14px] leading-normal font-normal text-[#212121] dark:text-[#ECECEC] line-clamp-2">
                        {pedidoFoco.direccionEntrega?.calle
                          ? `${pedidoFoco.direccionEntrega.calle}${
                              pedidoFoco.direccionEntrega.barrio
                                ? `, ${pedidoFoco.direccionEntrega.barrio}`
                                : ""
                            }`
                          : pedidoFoco.notas || "Retiro directo en mostrador"}
                      </p>
                    </div>

                    <div className="border-b border-[#190088]/10 dark:border-white/10 pb-2.5">
                      <p className="text-[12px] leading-normal font-light text-[#212121]/70 dark:text-[#ECECEC]/60">
                        Teléfono de contacto
                      </p>
                      <p className="text-[14px] leading-normal font-bold text-[#212121] dark:text-[#ECECEC]">
                        {pedidoFoco.telefono}
                      </p>
                    </div>

                    {/* Circular Channel Buttons Row */}
                    <div className="pt-1 flex items-center justify-between gap-1.5">
                      {CANALES_CIRCULARES.map((c) => {
                        const esCanalCliente =
                          (convFoco?.canal ?? "whatsapp") === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() =>
                              convFoco
                                ? onOpenChat(convFoco.id)
                                : onOpenChatPedido(pedidoFoco.id)
                            }
                            title={`${c.label} — Abrir chat con ${pedidoFoco.cliente}`}
                            className={`flex size-9 items-center justify-center rounded-full text-[12px] leading-normal font-bold transition-transform hover:scale-105 cursor-pointer shadow-theme-xs ${
                              esCanalCliente
                                ? "bg-[#190088] text-white dark:bg-[#97D6DF] dark:text-[#190088]"
                                : "bg-white text-[#190088] dark:bg-white/10 dark:text-[#ECECEC] hover:bg-[#ECECEC]/50"
                            }`}
                          >
                            {c.short}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="py-6 text-center text-[12px] leading-normal font-normal text-[#212121]/70 dark:text-[#ECECEC]/60">
                    No hay pedidos seleccionados.
                  </p>
                )}
              </div>
            </div>

            {/* CARD 2: CYAN FOLDER CARD (#97D6DF — Ingresos & Cobro) */}
            <div className="relative pt-8">
              {/* Folder Top Tab (Left) */}
              <div className="absolute top-0 left-0 z-10 flex h-10 w-48 items-center gap-2 rounded-t-[22px] bg-[#97D6DF] text-[#190088] dark:bg-[#1E1E22] dark:text-[#97D6DF] dark:border-t dark:border-x dark:border-white/10 px-4 font-bold text-[16px] leading-normal">
                <SparklesIcon className="size-4 stroke-[2.2]" />
                <span>Ingresos & Cobro</span>
              </div>

              {/* Top-Right Recess Action Buttons */}
              <div className="absolute top-0 right-1 z-10 flex items-center gap-1.5">
                {pedidoFoco && (
                  <button
                    type="button"
                    onClick={() => pedidosStore.togglePagado(pedidoFoco.id)}
                    title={
                      pedidoFoco.pagado
                        ? "Marcar como pendiente de cobro"
                        : "Marcar pedido como pagado"
                    }
                    className="flex size-8 items-center justify-center rounded-full bg-white dark:bg-[#1E1E22] border border-[#ECECEC] dark:border-white/10 text-[#190088] dark:text-white hover:scale-105 transition-transform cursor-pointer shadow-theme-xs"
                  >
                    <CheckCircleIcon className="size-4" />
                  </button>
                )}
              </div>

              {/* Cyan Folder Body */}
              <div className="rounded-b-[26px] rounded-tr-[26px] bg-[#97D6DF]/20 border border-[#97D6DF]/40 text-[#212121] dark:bg-[#1E1E22] dark:text-[#ECECEC] dark:border dark:border-white/10 p-5 shadow-theme-xs">
                <div className="space-y-3.5">
                  <div className="border-b border-[#190088]/10 dark:border-white/10 pb-2.5">
                    <p className="text-[12px] leading-normal font-light text-[#212121]/70 dark:text-[#ECECEC]/60">
                      Valor orden enfocada
                    </p>
                    <p className="text-[16px] leading-normal font-bold text-[#190088] dark:text-[#97D6DF]">
                      {pedidoFoco
                        ? `${money(pedidosStore.totalPedido(pedidoFoco))} · ${
                            pedidoFoco.pagado ? "Pagado" : "Por cobrar"
                          }`
                        : "$ 0"}
                    </p>
                  </div>

                  <div className="border-b border-[#190088]/10 dark:border-white/10 pb-2.5">
                    <p className="text-[12px] leading-normal font-light text-[#212121]/70 dark:text-[#ECECEC]/60">
                      Recaudado en el turno
                    </p>
                    <p className="text-[14px] leading-normal font-bold text-[#212121] dark:text-[#ECECEC]">
                      {money(metricas.totalRecaudado)} ({metricas.pagadosCount}{" "}
                      órdenes)
                    </p>
                  </div>

                  <div className="border-b border-[#190088]/10 dark:border-white/10 pb-2.5">
                    <p className="text-[12px] leading-normal font-light text-[#212121]/70 dark:text-[#ECECEC]/60">
                      Pendiente por validar / cobrar
                    </p>
                    <p className="text-[14px] leading-normal font-bold text-[#212121] dark:text-[#ECECEC]">
                      {money(metricas.totalPendiente)} (
                      {metricas.pendientesCount} órdenes)
                    </p>
                  </div>

                  <div>
                    <p className="text-[12px] leading-normal font-light text-[#212121]/70 dark:text-[#ECECEC]/60">
                      Ingreso & Medio de pago
                    </p>
                    <p className="text-[14px] leading-normal font-normal text-[#212121] dark:text-[#ECECEC]">
                      {pedidoFoco
                        ? `${formatHoraCorta(pedidoFoco.createdAt)} · ${pedidosStore.medioPagoLabel(
                            pedidoFoco.metodoPago,
                          )}`
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT / CENTER WORKSPACE (Folder-Tab Container with 6 Tabs + 2 Inner Columns) ── */}
          <div className="lg:col-span-8 xl:col-span-9 flex flex-col">
            {/* Folder Tab Bar Header */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pb-2 lg:pb-0">
              {(
                [
                  {
                    id: "operacion",
                    label: "Operación",
                    count: enCursoList.length,
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
                  {
                    id: "programados",
                    label: "Programados",
                    count: conteosBarra.programados,
                  },
                  {
                    id: "validacion",
                    label: "Validación",
                    count: porValidarList.length,
                  },
                  {
                    id: "tickets",
                    label: "Comprobantes",
                    count: pedidosConComprobante.length,
                  },
                ] as { id: WorkspaceTab; label: string; count: number }[]
              ).map((tab) => {
                const activa = tabActiva === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTabActiva(tab.id)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 text-[14px] leading-normal font-bold transition-all cursor-pointer ${
                      activa
                        ? "rounded-t-[20px] rounded-b-none bg-[#190088] text-white dark:bg-[#18181B] dark:border-t dark:border-x dark:border-white/10 lg:-mb-px z-10"
                        : "rounded-full bg-white dark:bg-[#1E1E22] border border-[#ECECEC] dark:border-white/10 text-[#212121] dark:text-[#ECECEC] hover:bg-[#ECECEC]/50 dark:hover:bg-white/10 mb-1 font-normal shadow-theme-xs"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[12px] leading-normal font-bold ${
                        activa
                          ? "bg-[#97D6DF] text-[#190088]"
                          : "bg-[#ECECEC] text-[#212121] dark:bg-white/10 dark:text-[#ECECEC]"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Main Workspace Card Surface (bg-white light, #18181B dark) */}
            <div className="rounded-[28px] rounded-tl-none bg-white dark:bg-[#18181B] border border-[#ECECEC] dark:border-white/10 p-5 sm:p-6 shadow-theme-xs">
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                {/* ── INNER LEFT COLUMN (xl:col-span-7): Timeline & Operational Lists ── */}
                <div className="xl:col-span-7 flex flex-col justify-between min-h-[470px]">
                  {tabActiva === "operacion" && (
                    <div className="space-y-6">
                      {/* Section 1: En curso · Por gestionar */}
                      <div>
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="text-[24px] leading-snug font-bold text-[#190088] dark:text-white">
                            En curso · Por gestionar
                          </h3>
                          <span className="text-[12px] leading-normal font-normal text-[#212121]/70 dark:text-white/60">
                            {enCursoList.length} activos
                          </span>
                        </div>

                        {enCursoList.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-[#ECECEC] dark:border-white/10 p-6 text-center text-[12px] leading-normal font-light text-[#212121]/70 dark:text-white/60">
                            No hay pedidos en curso con el filtro actual.
                          </div>
                        ) : (
                          <div className="relative space-y-2.5 before:absolute before:left-4 before:top-4 before:bottom-4 before:w-px before:bg-[#ECECEC] dark:before:bg-white/10">
                            {enCursoList.slice(0, 5).map((p, idx) => {
                              const esFoco = pedidoFoco?.id === p.id;
                              const badge = badgeStylePorEstado(p.estado);
                              const primerItem = p.items[0];
                              const tituloOrden = primerItem
                                ? `${primerItem.cantidad}× ${primerItem.nombre}${
                                    p.items.length > 1
                                      ? ` +${p.items.length - 1}`
                                      : ""
                                  }`
                                : "Pedido sin ítems";

                              return (
                                <div
                                  key={p.id}
                                  className="relative flex items-center gap-3"
                                >
                                  {/* Timeline circular node */}
                                  <button
                                    type="button"
                                    onClick={() => setPedidoFocoId(p.id)}
                                    title={`hace ${relativo(pedidosStore.minutosEnEstado(p))}`}
                                    className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-[12px] leading-normal font-bold cursor-pointer ${nodoColorPorIndice(
                                      idx,
                                    )}`}
                                  >
                                    {pedidosStore.minutosEnEstado(p)}m
                                  </button>

                                  {/* Row Card */}
                                  <div
                                    onClick={() => setPedidoFocoId(p.id)}
                                    className={`flex flex-1 items-center justify-between gap-2.5 rounded-2xl border px-3.5 py-2.5 transition-all cursor-pointer ${
                                      esFoco
                                        ? "bg-white dark:bg-white/[0.08] border-[#190088]/30 dark:border-[#97D6DF]/40"
                                        : "bg-white/80 dark:bg-[#22232D] border-[#ECECEC] dark:border-white/10 hover:border-[#190088]/20 dark:hover:border-white/20"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          avanzarPedido(p.id);
                                        }}
                                        title="Avanzar pedido a la siguiente etapa"
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

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span
                                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[12px] leading-normal font-bold ${badge.bg} ${badge.text}`}
                                      >
                                        <span
                                          className={`size-1.5 rounded-full ${badge.dot}`}
                                        />
                                        {pedidosStore.estadoLabel(p.estado)}
                                      </span>

                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onVerDetalle(p.id);
                                        }}
                                        title="Abrir ficha del pedido"
                                        className="flex size-7 items-center justify-center rounded-full text-[#212121]/60 hover:bg-[#ECECEC] hover:text-[#190088] dark:text-[#ECECEC]/60 dark:hover:bg-white/10 dark:hover:text-white cursor-pointer"
                                      >
                                        <EllipsisHorizontalIcon className="size-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Section 2: Completados · Entregados */}
                      <div>
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="text-[24px] leading-snug font-bold text-[#190088] dark:text-white">
                            Completados · Entregados
                          </h3>
                          <span className="text-[12px] leading-normal font-normal text-[#212121]/70 dark:text-[#ECECEC]/60">
                            {completadosList.length} cerrados
                          </span>
                        </div>

                        {completadosList.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-[#ECECEC] dark:border-white/10 p-4 text-center text-[12px] leading-normal font-light text-[#212121]/70 dark:text-[#ECECEC]/60">
                            Aún no hay entregas cerradas en este filtro.
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
                                  <div className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#97D6DF] text-[#190088]">
                                    <CheckIcon className="size-4 stroke-[2.5]" />
                                  </div>

                                  <div
                                    onClick={() => setPedidoFocoId(p.id)}
                                    className={`flex flex-1 items-center justify-between gap-2.5 rounded-2xl border px-3.5 py-2.5 transition-all cursor-pointer shadow-theme-xs ${
                                      esFoco
                                        ? "bg-white dark:bg-[#1E1E22] border-[#190088]/40 dark:border-[#97D6DF]/40"
                                        : "bg-[#FAFAFA] dark:bg-[#1E1E22] border-[#ECECEC] dark:border-white/10 hover:border-[#190088]/20"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#190088] text-white">
                                        <CheckIcon className="size-3 stroke-[3]" />
                                      </span>
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
                                            {money(
                                              pedidosStore.totalPedido(p),
                                            )}
                                          </span>
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span className="inline-flex items-center gap-1 rounded-full bg-[#97D6DF] px-2.5 py-0.5 text-[12px] leading-normal font-bold text-[#190088]">
                                        Entregado
                                      </span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onVerDetalle(p.id);
                                        }}
                                        className="flex size-7 items-center justify-center rounded-full text-[#212121]/60 hover:bg-[#ECECEC] dark:text-[#ECECEC]/60 dark:hover:bg-white/10 cursor-pointer"
                                      >
                                        <EllipsisHorizontalIcon className="size-4" />
                                      </button>
                                    </div>
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
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-[24px] leading-snug font-bold text-[#190088] dark:text-white">
                          Auditoría & Trazabilidad en vivo
                        </h3>
                        <span className="text-[12px] leading-normal font-light text-[#212121]/70 dark:text-[#ECECEC]/60">
                          Últimos eventos
                        </span>
                      </div>
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
                              onClick={() => {
                                setPedidoFocoId(ev.pedido.id);
                                onVerDetalle(ev.pedido.id);
                              }}
                              className="flex flex-1 items-center justify-between gap-2 rounded-2xl bg-[#FAFAFA] dark:bg-[#1E1E22] border border-[#ECECEC] dark:border-white/10 px-3.5 py-2.5 hover:border-[#190088]/20 cursor-pointer shadow-theme-xs"
                            >
                              <div className="min-w-0">
                                <p className="text-[16px] leading-normal font-bold text-[#190088] dark:text-white truncate">
                                  <span className="mr-1.5">
                                    {ev.pedido.numero}
                                  </span>
                                  {ev.accion}
                                </p>
                                <p className="text-[12px] leading-normal font-normal text-[#212121]/70 dark:text-[#ECECEC]/60 truncate">
                                  Por {ev.operadorNombre} · Cliente:{" "}
                                  {ev.pedido.cliente}
                                </p>
                              </div>
                              <span className="text-[12px] leading-normal font-light text-[#212121]/70 dark:text-[#ECECEC]/60 shrink-0">
                                {formatHoraCorta(ev.fecha)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {tabActiva === "chats" && (
                    <div className="space-y-3">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-[24px] leading-snug font-bold text-[#190088] dark:text-white">
                          Conversaciones Multicanal Activas
                        </h3>
                        <button
                          type="button"
                          onClick={() => navigate("/conversaciones")}
                          className="text-[12px] leading-normal font-bold text-[#190088] dark:text-[#97D6DF] hover:underline cursor-pointer"
                        >
                          Ir a Bandeja →
                        </button>
                      </div>
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
                                className="flex items-center justify-between gap-3 rounded-2xl bg-[#FAFAFA] dark:bg-[#1E1E22] border border-[#ECECEC] dark:border-white/10 px-3.5 py-2.5 hover:border-[#190088]/20 cursor-pointer shadow-theme-xs"
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

                  {tabActiva === "programados" && (
                    <div className="space-y-3">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-[24px] leading-snug font-bold text-[#190088] dark:text-white">
                          Agenda de Pedidos Programados
                        </h3>
                        <button
                          type="button"
                          onClick={onOpenCalendario}
                          className="text-[12px] leading-normal font-bold text-[#190088] dark:text-[#97D6DF] hover:underline cursor-pointer"
                        >
                          Abrir Calendario →
                        </button>
                      </div>
                      {pedidosStore.programados.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[#ECECEC] dark:border-white/10 p-6 text-center text-[12px] leading-normal font-light text-[#212121]/70 dark:text-[#ECECEC]/60">
                          Sin pedidos programados pendientes de activación.
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {pedidosStore.programados.map((p) => (
                            <div
                              key={p.id}
                              onClick={() => setPedidoFocoId(p.id)}
                              className="flex items-center justify-between gap-3 rounded-2xl bg-[#FAFAFA] dark:bg-[#1E1E22] border border-[#ECECEC] dark:border-white/10 px-3.5 py-3 cursor-pointer shadow-theme-xs"
                            >
                              <div className="min-w-0">
                                <p className="text-[16px] leading-normal font-bold text-[#190088] dark:text-white truncate">
                                  <span className="mr-1.5">{p.numero}</span>
                                  {p.cliente} · {pedidosStore.resumenItems(p)}
                                </p>
                                <p className="text-[12px] leading-normal font-normal text-[#212121]/70 dark:text-[#ECECEC]/60">
                                  Programado para:{" "}
                                  {p.programadoPara
                                    ? new Date(
                                        p.programadoPara,
                                      ).toLocaleString("es-CO", {
                                        dateStyle: "medium",
                                        timeStyle: "short",
                                      })
                                    : "Próximo turno"}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  pedidosStore.activarAhora(p.id);
                                }}
                                className="rounded-full bg-[#190088] text-white px-3 py-1 text-[12px] leading-normal font-bold cursor-pointer shrink-0"
                              >
                                Activar ahora
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {tabActiva === "validacion" && (
                    <div className="space-y-3">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-[24px] leading-snug font-bold text-[#190088] dark:text-white">
                          Cola de Validación de Pagos
                        </h3>
                        <span className="text-[12px] leading-normal font-light text-[#212121]/70 dark:text-[#ECECEC]/60">
                          {porValidarList.length} por verificar
                        </span>
                      </div>
                      {porValidarList.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[#ECECEC] dark:border-white/10 p-6 text-center text-[12px] leading-normal font-light text-[#212121]/70 dark:text-[#ECECEC]/60">
                          Todos los pagos por transferencia o tarjeta están al
                          día.
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {porValidarList.map((p) => (
                            <div
                              key={p.id}
                              onClick={() => setPedidoFocoId(p.id)}
                              className="flex items-center justify-between gap-3 rounded-2xl bg-[#FAFAFA] dark:bg-[#1E1E22] border border-[#ECECEC] dark:border-white/10 px-3.5 py-3 cursor-pointer shadow-theme-xs"
                            >
                              <div className="min-w-0">
                                <p className="text-[16px] leading-normal font-bold text-[#190088] dark:text-white truncate">
                                  <span className="mr-1.5">{p.numero}</span>
                                  {p.cliente} ·{" "}
                                  <span>
                                    {money(pedidosStore.totalPedido(p))}
                                  </span>
                                </p>
                                <p className="text-[12px] leading-normal font-normal text-[#212121]/70 dark:text-[#ECECEC]/60">
                                  Medio:{" "}
                                  {pedidosStore.medioPagoLabel(p.metodoPago)} ·{" "}
                                  {pedidosStore.estadoLabel(p.estado)}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void confirmarPagoPedido(
                                    p.id,
                                    p.metodoPago ?? "transferencia",
                                  );
                                }}
                                className="rounded-full bg-[#97D6DF] text-[#190088] px-3 py-1 text-[12px] leading-normal font-bold hover:opacity-90 cursor-pointer shrink-0 shadow-theme-xs"
                              >
                                Validar pago ✓
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {tabActiva === "tickets" && (
                    <div className="space-y-3">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-[24px] leading-snug font-bold text-[#190088] dark:text-white">
                          Facturación & Tickets de Turno
                        </h3>
                        <button
                          type="button"
                          onClick={() => navigate("/pedidos/historial")}
                          className="text-[12px] leading-normal font-bold text-[#190088] dark:text-[#97D6DF] hover:underline cursor-pointer"
                        >
                          Ver Historial →
                        </button>
                      </div>
                      <div className="space-y-2.5">
                        {todosLosPedidos.slice(0, 6).map((p) => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setPedidoFocoId(p.id);
                              onVerDetalle(p.id);
                            }}
                            className="flex items-center justify-between gap-3 rounded-2xl bg-[#FAFAFA] dark:bg-[#1E1E22] border border-[#ECECEC] dark:border-white/10 px-3.5 py-2.5 hover:border-[#190088]/20 cursor-pointer shadow-theme-xs"
                          >
                            <div className="min-w-0">
                              <p className="text-[16px] leading-normal font-bold text-[#190088] dark:text-white truncate">
                                <span className="mr-1.5">{p.numero}</span>
                                {p.cliente}
                              </p>
                              <p className="text-[12px] leading-normal font-normal text-[#212121]/70 dark:text-[#ECECEC]/60 truncate">
                                {pedidosStore.resumenItems(p)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[14px] leading-normal font-bold text-[#190088] dark:text-white">
                                {money(pedidosStore.totalPedido(p))}
                              </span>
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[12px] leading-normal font-bold ${
                                  p.pagado
                                    ? "bg-[#97D6DF] text-[#190088]"
                                    : "bg-[#EFE6D3] text-[#190088]"
                                }`}
                              >
                                {p.pagado ? "Pagado" : "Pendiente"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bottom Floating Action Bar (#190088 Azul profundo NECTO en claro, #1E1E22 en oscuro) */}
                  <div className="mt-6 flex items-center gap-2 rounded-full bg-[#190088] dark:bg-[#1E1E22] dark:border dark:border-white/15 p-1.5 pl-4 text-white shadow-theme-xs">
                    <DocumentTextIcon className="size-4 text-[#97D6DF] shrink-0" />
                    <input
                      type="text"
                      value={notaRapida}
                      onChange={(e) => setNotaRapida(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleGuardarNotaRapida();
                      }}
                      placeholder={
                        pedidoFoco
                          ? `Anexar nota rápida a ${pedidoFoco.numero} o filtrar lista…`
                          : "Filtrar órdenes por nota o producto…"
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
                          onClick={() => navigate("/pedidos/crear")}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#FF3F1A] px-4 py-2 text-[14px] leading-normal font-bold text-white hover:bg-[#FF3F1A]/90 transition-opacity cursor-pointer shrink-0"
                        >
                          <PlusIcon className="size-3.5 stroke-[2.8]" />
                          <span>Nuevo pedido</span>
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* ── INNER RIGHT COLUMN (xl:col-span-5): Comprobantes & Tickets ── */}
                <div className="xl:col-span-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[24px] leading-snug font-bold text-[#190088] dark:text-white">
                      Comprobantes & Tickets
                    </h3>
                    <span className="text-[12px] leading-normal font-light text-[#212121]/70 dark:text-[#ECECEC]/60">
                      Vista previa
                    </span>
                  </div>

                  {pedidosConComprobante.slice(0, 2).map((p, idx) => {
                    const subtotal = pedidosStore.subtotalItems(p);
                    const envio = p.costoEnvio ?? 0;
                    const total = pedidosStore.totalPedido(p);
                    const porValidar = esperaValidacionPago(p);

                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          setPedidoFocoId(p.id);
                          onVerDetalle(p.id);
                        }}
                        className="group rounded-3xl bg-[#FAFAFA] dark:bg-[#1E1E22] border border-[#ECECEC] dark:border-white/10 p-4 transition-all hover:border-[#190088]/30 dark:hover:border-white/20 cursor-pointer shadow-theme-xs"
                      >
                        {/* Card Top Header */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="min-w-0">
                            <p className="text-[12px] leading-normal font-light text-[#212121]/70 dark:text-[#ECECEC]/60">
                              {formatHoraCorta(p.createdAt)} · {p.numero}
                            </p>
                            <h4 className="text-[16px] leading-normal font-bold text-[#190088] dark:text-white truncate">
                              {idx === 0
                                ? `Comprobante de orden · ${p.cliente}`
                                : `Resumen de comanda · ${p.cliente}`}
                            </h4>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenChatPedido(p.id);
                              }}
                              title="Ver chat del comprobante"
                              className="flex size-7 items-center justify-center rounded-full bg-white dark:bg-white/10 border border-[#ECECEC] dark:border-white/10 text-[#190088] dark:text-white hover:bg-[#ECECEC] cursor-pointer"
                            >
                              <ChatBubbleLeftRightIcon className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onVerDetalle(p.id);
                              }}
                              title="Inspeccionar ticket completo"
                              className="flex size-7 items-center justify-center rounded-full bg-[#190088] text-white cursor-pointer"
                            >
                              <EyeIcon className="size-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Miniature Visual Document / Invoice Preview */}
                        <div className="rounded-2xl bg-white dark:bg-[#141417] border border-[#ECECEC] dark:border-white/10 p-3.5">
                          <div className="flex items-center justify-between border-b border-[#ECECEC] dark:border-white/10 pb-2 mb-2">
                            <div>
                              <span className="text-[12px] leading-normal font-light uppercase tracking-wider text-[#212121]/70 dark:text-[#ECECEC]/60 block">
                                NECTO POS · FACTURA
                              </span>
                              <span className="text-[14px] leading-normal font-bold text-[#190088] dark:text-white">
                                {p.numero} ·{" "}
                                {pedidosStore.medioPagoLabel(p.metodoPago)}
                              </span>
                            </div>

                            <span
                              className={`rounded-md px-2 py-0.5 text-[12px] leading-normal font-bold uppercase tracking-wider ${
                                p.pagado
                                  ? "bg-[#97D6DF] text-[#190088]"
                                  : porValidar
                                    ? "bg-[#FF3F1A] text-white"
                                    : "bg-[#EFE6D3] text-[#190088]"
                              }`}
                            >
                              {p.pagado
                                ? "PAGADO"
                                : porValidar
                                  ? "POR VALIDAR"
                                  : "PENDIENTE"}
                            </span>
                          </div>

                          {/* Mini Tabular Items */}
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

                          {/* Totals Footer */}
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

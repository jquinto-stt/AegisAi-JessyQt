import { useState, useEffect, useMemo, useRef } from "react";
import { observer } from "mobx-react-lite";
import { useSearchParams, useNavigate } from "react-router";
import { pedidosStore, organizacionStore, type Pedido, type Modalidad } from "@/stores";
import { Card, Badge, Button } from "@/elements";
import {
  ArrowRightIcon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  BuildingStorefrontIcon,
  CheckBadgeIcon,
  ChevronLeftIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
} from "@heroicons/react/24/outline";

/**
 * Sonido chime sintético suave y profesional para Smart TV.
 */
function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.25, now + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.95);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880.0, now + 0.14); // A5
    gain2.gain.setValueAtTime(0.001, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.35, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.14);
    osc2.stop(now + 1.25);
  } catch {
    // Silencio seguro si el navegador bloquea audio antes de interacción
  }
}

/**
 * DisplayPedidosScreen — Pantalla de Turnos y Sala Oficial Necto.
 * Construida con el sistema de diseño @/elements (Card, Badge, Button):
 * - Estética sobria, profesional y sin iluminaciones neón innecesarias.
 * - Tarjeta Hero en naranja de marca Necto (#FF3F1A / brand-500) con llamado claro a ventanilla.
 * - Tabla estructurada con componentes canónicos de @/elements para los siguientes turnos.
 * - Tipografía clara, legible a gran distancia sin saturación.
 */
export const DisplayPedidosScreen = observer(() => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const modalidadFiltro = (searchParams.get("modalidad") || "todas") as "todas" | Modalidad;
  const initialSonido = searchParams.get("sonido") !== "0";

  const [sonidoHabilitado, setSonidoHabilitado] = useState(initialSonido);
  const [esPantallaCompleta, setEsPantallaCompleta] = useState(false);
  const [horaActual, setHoraActual] = useState(new Date());
  const [idSeleccionado, setIdSeleccionado] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const prevListosCountRef = useRef<number>(0);

  // Reloj en vivo
  useEffect(() => {
    const timer = setInterval(() => setHoraActual(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Monitor de pantalla completa nativo
  useEffect(() => {
    const handler = () => setEsPantallaCompleta(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Pedidos activos según filtro
  const pedidosActivos = useMemo(() => {
    const todos = pedidosStore.enCurso(modalidadFiltro === "todas" ? undefined : modalidadFiltro);
    return todos.filter((p) => p.estado !== "entregado" && p.estado !== "cancelado");
  }, [modalidadFiltro, pedidosStore.pedidos.length]);

  // Turnos listos para retiro vs en preparación / cola
  const pedidosListos = useMemo(() => {
    return pedidosActivos.filter((p) => p.estado === "listo");
  }, [pedidosActivos]);

  const pedidosEnEspera = useMemo(() => {
    return pedidosActivos.filter((p) => p.estado !== "listo");
  }, [pedidosActivos]);

  // Cola combinada ordenada
  const colaOrdenada = useMemo(() => {
    if (pedidosListos.length > 0) {
      return [...pedidosListos, ...pedidosEnEspera];
    }
    return pedidosActivos;
  }, [pedidosListos, pedidosEnEspera, pedidosActivos]);

  // Turno Hero (destacado en la tarjeta principal)
  const turnoHero = useMemo<Pedido | null>(() => {
    if (idSeleccionado) {
      const encontrado = colaOrdenada.find((p) => p.id === idSeleccionado);
      if (encontrado) return encontrado;
    }
    return colaOrdenada[0] || null;
  }, [colaOrdenada, idSeleccionado]);

  // Siguientes turnos (hasta 4 para mantener el orden y espaciado proporcional)
  const turnosSiguientes = useMemo<Pedido[]>(() => {
    if (!turnoHero) return [];
    return colaOrdenada.filter((p) => p.id !== turnoHero.id).slice(0, 4);
  }, [colaOrdenada, turnoHero]);

  // Chime automático cuando un nuevo pedido pasa a listo
  useEffect(() => {
    if (sonidoHabilitado && pedidosListos.length > prevListosCountRef.current) {
      playChime();
    }
    prevListosCountRef.current = pedidosListos.length;
  }, [pedidosListos.length, sonidoHabilitado]);

  // Destino / Módulo legible para el llamado
  const obtenerPuntoEntrega = (p: Pedido | null) => {
    if (!p) return "MÓDULO 1";
    if (p.modalidad === "retiro") return "MÓDULO 2";
    if (p.modalidad === "domicilio") return "DESPACHO 1";
    return `MESA ${p.id.slice(-2).toUpperCase()}`;
  };

  const obtenerInstruccion = (p: Pedido | null) => {
    if (!p) return "Esperando nuevo turno";
    if (p.modalidad === "retiro") return "Pasar a Entrega Mostrador";
    if (p.modalidad === "domicilio") return "Pasar a Despacho Domicilios";
    if (p.modalidad === "en_sitio") return "Servicio en Mesa";
    return "Pasar a Punto de Entrega";
  };

  // Avanzar estado al hacer click o presionar espacio
  const avanzarHero = () => {
    if (!turnoHero) return;
    if (turnoHero.estado === "nuevo" || turnoHero.estado === "confirmado") {
      pedidosStore.moverEstado(turnoHero.id, "en_preparacion");
    } else if (turnoHero.estado === "en_preparacion") {
      pedidosStore.moverEstado(turnoHero.id, "listo");
      if (sonidoHabilitado) playChime();
    } else if (turnoHero.estado === "listo") {
      pedidosStore.moverEstado(turnoHero.id, "entregado");
    }
  };

  // Teclas rápidas
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        avanzarHero();
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      } else if (e.key === "m" || e.key === "M") {
        setSonidoHabilitado((prev) => !prev);
      } else if (e.key === "Escape") {
        if (document.fullscreenElement) {
          document.exitFullscreen?.();
        } else {
          navigate("/pedidos");
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [turnoHero, sonidoHabilitado]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  // Etiqueta de la estación o filtro
  const labelEstacion = useMemo(() => {
    if (modalidadFiltro === "retiro") return "Mostrador & Retiro";
    if (modalidadFiltro === "domicilio") return "Despacho Domicilios";
    if (modalidadFiltro === "en_sitio") return "Salón & Mesas";
    return organizacionStore.organizacion?.nombre || "Atención General";
  }, [modalidadFiltro, organizacionStore.organizacion?.nombre]);

  return (
    <div
      ref={containerRef}
      className="relative flex h-screen w-screen flex-col justify-between overflow-hidden bg-gray-950 text-gray-100 select-none font-sans"
    >
      {/* 1. Header Superior Corporativo Necto */}
      <header className="relative z-10 flex h-20 w-full items-center justify-between border-b border-gray-800/80 bg-gray-950 px-8 sm:px-14">
        {/* Logo NECTO grow together */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/pedidos")}
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80 cursor-pointer"
            title="Volver a Pedidos"
          >
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center">
              NECTO
            </span>
            <div className="flex flex-col text-[9px] font-bold uppercase tracking-widest text-gray-400 leading-[1.1] border-l border-gray-700 pl-2">
              <span>grow</span>
              <span>together</span>
            </div>
          </button>
        </div>

        {/* Estación y Reloj usando Badge de @/elements */}
        <div className="flex items-center gap-4">
          <Badge variant="light" color="light" size="md" className="border border-gray-700/60 bg-gray-800/60 text-gray-200">
            {labelEstacion}
          </Badge>

          <span className="text-base sm:text-lg font-bold text-gray-200 tabular-nums tracking-wide">
            {horaActual.toLocaleTimeString("es-CO", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })}
          </span>
        </div>
      </header>

      {/* 2. Área Central: Tarjeta Hero Necto + Card SIGUIENTES TURNOS */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-8 sm:px-12 lg:px-16 gap-8 lg:gap-12 max-w-[1680px] mx-auto w-full">
        {/* A. Tarjeta Hero Flotante Necto (#FF3F1A / brand-500) */}
        <div className="flex-1 flex justify-center max-w-[660px]">
          <div
            onClick={avanzarHero}
            className="group relative flex w-full flex-col justify-between rounded-3xl bg-brand-500 p-8 sm:p-10 text-white shadow-xl transition-transform duration-200 hover:scale-[1.01] cursor-pointer min-h-[480px] border border-brand-400"
            title="Click o [Espacio] para avanzar pedido"
          >
            {/* Header del Ticket Hero: Icono + Badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex size-10 items-center justify-center rounded-xl bg-white/20">
                  <CheckBadgeIcon className="size-6 text-white stroke-[2.2]" />
                </div>
                <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-white">
                  ¡TU PEDIDO ESTÁ LISTO!
                </h2>
              </div>

              {turnoHero && (
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                  {pedidosStore.modalidadLabel(turnoHero.modalidad)}
                </span>
              )}
            </div>

            {/* Número Principal Colosal y Legible */}
            <div className="my-auto py-4 text-center">
              <span className="block text-7xl sm:text-8xl lg:text-9xl font-black tracking-tight text-white tabular-nums leading-none">
                {turnoHero ? turnoHero.numero : "---"}
              </span>

              {/* Nombre del cliente */}
              <p className="mt-3 text-xl sm:text-2xl font-bold uppercase tracking-wider text-white/95">
                {turnoHero?.cliente || "CLIENTE"}
              </p>

              {/* Subtítulo / Instrucción */}
              <p className="mt-1 text-sm sm:text-base font-medium text-white/80">
                {obtenerInstruccion(turnoHero)}
              </p>
            </div>

            {/* Caja Inferior de Ubicación (MÓDULO DE ENTREGA) */}
            <div className="relative mt-2 flex items-center justify-between rounded-2xl bg-black/20 p-4 sm:p-5 border border-white/15">
              <div>
                <span className="text-[11px] font-black uppercase tracking-widest text-white/70 block mb-0.5">
                  UBICACIÓN
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                    {obtenerPuntoEntrega(turnoHero)}
                  </span>
                  <ArrowRightIcon className="size-6 sm:size-7 text-white stroke-[3]" />
                </div>
              </div>

              {/* Distintivo de Mostrador */}
              <div className="flex items-center gap-2 rounded-xl bg-white/15 px-3.5 py-2">
                <BuildingStorefrontIcon className="size-5 text-white" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  ENTREGA
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* B. Panel Lateral: SIGUIENTES TURNOS usando Card de @/elements */}
        <div className="w-full max-w-[620px] flex flex-col">
          <Card className="flex flex-col rounded-3xl bg-gray-950 border-gray-800 p-7 sm:p-9 shadow-xl min-h-[480px] justify-between">
            <div>
              {/* Título de Sección */}
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-gray-100">
                  SIGUIENTES TURNOS
                </h3>
                <span className="text-xs font-semibold text-gray-400">
                  {turnosSiguientes.length} en espera
                </span>
              </div>

              {/* Encabezado de Columnas */}
              <div className="grid grid-cols-12 items-center text-[11px] font-bold uppercase tracking-wider text-gray-400 pb-3 border-b border-gray-800 mb-3">
                <span className="col-span-4">TURNO</span>
                <span className="col-span-4">CLIENTE</span>
                <span className="col-span-2 text-center">ESTADO</span>
                <span className="col-span-2 text-right">EST. TIEMPO</span>
              </div>

              {/* Filas de Turnos usando Badges canónicos de @/elements */}
              <div className="space-y-3.5">
                {turnosSiguientes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-14 text-gray-500">
                    <p className="text-sm font-semibold">Sin pedidos en espera</p>
                    <p className="text-xs text-gray-600 mt-1">Los próximos turnos se actualizarán en tiempo real</p>
                  </div>
                ) : (
                  turnosSiguientes.map((pedido, idx) => {
                    const esCocina = pedido.estado === "en_preparacion";
                    const minutosEst = esCocina ? Math.max(2, 5 - idx) : 6 + idx * 3;
                    const progreso = esCocina ? 75 : 25;

                    return (
                      <div
                        key={pedido.id}
                        onClick={() => setIdSeleccionado(pedido.id)}
                        className="group flex flex-col rounded-2xl bg-gray-900/60 hover:bg-gray-800/70 border border-gray-800/80 p-4 transition-all cursor-pointer"
                        title="Click para poner en foco"
                      >
                        {/* Fila de datos */}
                        <div className="grid grid-cols-12 items-center mb-2.5">
                          {/* Turno */}
                          <span className="col-span-4 text-xl sm:text-2xl font-black tracking-tight text-white tabular-nums">
                            {pedido.numero}
                          </span>

                          {/* Cliente */}
                          <span className="col-span-4 text-xs sm:text-sm font-medium text-gray-300 truncate pr-2">
                            {pedido.cliente}
                          </span>

                          {/* Estado con Badge canónico de @/elements */}
                          <div className="col-span-2 flex justify-center">
                            {esCocina ? (
                              <Badge variant="light" color="warning" size="xs">
                                En Prep.
                              </Badge>
                            ) : (
                              <Badge variant="light" color="info" size="xs">
                                En Cola
                              </Badge>
                            )}
                          </div>

                          {/* Tiempo Estimado */}
                          <span className="col-span-2 text-right text-xs sm:text-sm font-bold text-gray-300 tabular-nums">
                            +{minutosEst} min
                          </span>
                        </div>

                        {/* Barra de Progreso Discreta y Limpia */}
                        <div className="h-1.5 w-full rounded-full bg-gray-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              esCocina ? "bg-brand-500" : "bg-accent-500"
                            }`}
                            style={{ width: `${progreso}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Pie de Información Limpio (Sin códigos QR improvisados) */}
            <div className="mt-5 flex items-center justify-between pt-4 border-t border-gray-800 text-xs text-gray-400">
              <span>Actualización automática en tiempo real</span>
              <span className="text-gray-300 font-semibold">{pedidosActivos.length} activos en local</span>
            </div>
          </Card>
        </div>
      </main>

      {/* 3. Footer / Barra Inferior con Buttons de @/elements */}
      <footer className="relative z-10 flex h-16 w-full items-center justify-between border-t border-gray-800/80 bg-gray-950 px-8 sm:px-14 text-xs text-gray-400">
        {/* Controles de Salir y Audio con Button de @/elements */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/pedidos")}
            className="border-gray-700 bg-transparent text-gray-300 hover:bg-gray-800 gap-1.5"
          >
            <ChevronLeftIcon className="size-4" />
            <span>Salir</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSonidoHabilitado((prev) => !prev);
              if (!sonidoHabilitado) playChime();
            }}
            className={`gap-1.5 ${
              sonidoHabilitado ? "text-gray-200" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {sonidoHabilitado ? <SpeakerWaveIcon className="size-4" /> : <SpeakerXMarkIcon className="size-4" />}
            <span>{sonidoHabilitado ? "Sonido Activo" : "Silenciado"}</span>
          </Button>
        </div>

        {/* Mensaje Informativo Central */}
        <div className="text-center font-medium text-gray-400 truncate max-w-lg hidden sm:block">
          Por favor acérquese al punto de entrega cuando su número aparezca en pantalla
        </div>

        {/* Pantalla Completa con Button de @/elements */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleFullscreen}
            className="text-gray-300 hover:bg-gray-800 gap-1.5"
          >
            {esPantallaCompleta ? <ArrowsPointingInIcon className="size-4" /> : <ArrowsPointingOutIcon className="size-4" />}
            <span className="hidden md:inline">Pantalla Completa</span>
          </Button>
        </div>
      </footer>
    </div>
  );
});

export default DisplayPedidosScreen;

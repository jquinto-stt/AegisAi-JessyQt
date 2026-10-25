import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Calendar,
  ArrowUpRight,
  Bell,
  Package,
  ShoppingBag,
  TrendingUp,
  Sparkles,
  Layers,
  Truck,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { PageMeta } from "@/shell/meta";
import { organizacionStore } from "@/stores/organizacion.store";
import { uiStore } from "@/stores";
import { LineChart } from "@/elements/ui/line-chart";
import type { ApexOptions } from "apexcharts";
import { tareasDeInicio } from "./tareas-inicio";
import { CifraAnimada, formatoEntero, formatoPesos } from "./CifraAnimada";

/** Se pone en `true` la primera vez que el dashboard se monta en esta carga. */
let introReproducida = false;

/**
 * ¿Toca la entrada coreografiada? Una vez por carga de la app (al entrar o al
 * recargar con F5), no en cada navegación de vuelta al panel: el dashboard se
 * abre muchas veces al día y repetirla siempre se vuelve espera.
 * Se decide una vez al montar, para que un re-render no la corte a la mitad.
 */
function usePrimeraVisitaDeSesion(): boolean {
  const [primera] = useState(() => !introReproducida);
  useEffect(() => {
    introReproducida = true;
  }, []);
  return primera;
}

/** Turno de una pieza en la coreografía de entrada (ver `css/dashboard.css`). */
const turno = (orden: number) => ({ "--orden": orden }) as React.CSSProperties;

interface BannerItem {
  id: string;
  type?: "video" | "image";
  videoUrl?: string;
  imageUrl?: string;
  imageUrlDark?: string;
  title: string;
  alt: string;
  ctaLink: string;
  objectPosition?: string;
}

const BANNERS: BannerItem[] = [
  {
    id: "motion-necto-oficial",
    type: "video",
    videoUrl: "/images/Banners/banner-motion-necto.mp4",
    title: "Más conexiones. Más oportunidades. Crezcamos juntos.",
    alt: "Necto - Presentación Motion Graphics",
    ctaLink: "/conversaciones",
  },
  {
    id: "operacion-conectada",
    type: "image",
    imageUrl: "/images/Banners/banner-operacion.png",
    imageUrlDark: "/images/Banners/banner-operacion-dark.png",
    title: "Toda tu operación, más conectada",
    alt: "Necto - Pedidos, inventario y atención en un mismo entorno",
    ctaLink: "/configuracion?tab=modulos",
  },
  {
    id: "conecta-impulsa-agentes-1",
    type: "image",
    imageUrl: "/images/Banners/1_Conecta, Impulsa e Innova-agentes necto.png",
    imageUrlDark: "/images/Banners/1_Conecta, Impulsa e Innova-agentes necto-dark.png",
    title: "Conecta, Impulsa e Innova con Agentes Necto",
    alt: "Necto - Conecta, Impulsa e Innova con Agentes Necto",
    ctaLink: "/conversaciones",
  },
  {
    id: "conecta-impulsa-agentes-2",
    type: "image",
    imageUrl: "/images/Banners/2_Conecta, Impulsa e Innova-agentes necto.png",
    imageUrlDark: "/images/Banners/2_Conecta, Impulsa e Innova-agentes necto-dark.png",
    title: "Automatización y agentes inteligentes Necto",
    alt: "Necto - Automatización y soporte inteligente",
    ctaLink: "/conversaciones",
  },
  {
    id: "conversaciones-whatsapp",
    type: "image",
    imageUrl: "/images/Banners/banner-conversaciones.png",
    imageUrlDark: "/images/Banners/banner-conversaciones-dark.png",
    title: "Gestiona tus conversaciones, sin salir de Necto",
    alt: "Necto - Centraliza la atención por WhatsApp y conecta con tus procesos",
    ctaLink: "/conversaciones",
    objectPosition: "center 38%",
  },
];

/** Cada cuánto cambia el banner solo cuando no es video interactivo. */
const MS_ROTACION = 8000;

/**
 * Carrusel interactivo y ampliado de novedades de Necto.
 * Soporta banners animados (Motion Graphics a 60fps) y banners estáticos con transición fluida.
 */
const BannerCarrusel = observer(function BannerCarrusel({ onIr, visible }: { onIr: (ruta: string) => void; visible: boolean }) {
  const [activo, setActivo] = useState(0);
  const [anterior, setAnterior] = useState<number | null>(null);
  const [direccion, setDireccion] = useState<1 | -1>(1);
  const [pausado, setPausado] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [docVisible, setDocVisible] = useState(typeof document !== "undefined" ? document.visibilityState === "visible" : true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Escuchar visibilidad de la pestaña para no desfasar animaciones
  useEffect(() => {
    const handleVis = () => setDocVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", handleVis);
    return () => document.removeEventListener("visibilitychange", handleVis);
  }, []);

  // Precarga de banners estáticos light y dark
  useEffect(() => {
    BANNERS.forEach((b) => {
      if (b.type !== "video") {
        if (b.imageUrl) {
          const imgL = new Image();
          imgL.src = b.imageUrl;
        }
        if (b.imageUrlDark) {
          const imgD = new Image();
          imgD.src = b.imageUrlDark;
        }
      }
    });
  }, []);

  const ir = useCallback((destino: number, dir: 1 | -1) => {
    setActivo((prevActivo) => {
      if (destino === prevActivo) return prevActivo;
      setProgreso(0);
      setDireccion(dir);
      setAnterior(prevActivo);
      return destino;
    });
  }, []);

  const siguiente = useCallback(() => {
    setActivo((prevActivo) => {
      const next = (prevActivo + 1) % BANNERS.length;
      setProgreso(0);
      setDireccion(1);
      setAnterior(prevActivo);
      return next;
    });
  }, []);

  const previo = useCallback(() => {
    setActivo((prevActivo) => {
      const prev = (prevActivo - 1 + BANNERS.length) % BANNERS.length;
      setProgreso(0);
      setDireccion(-1);
      setAnterior(prevActivo);
      return prev;
    });
  }, []);

  const actual = BANNERS[activo];
  const esDark = uiStore.theme === "dark";
  const esVideo = actual.type === "video";
  const detenido = pausado || !visible || !docVisible || (esVideo && !isVideoPlaying);

  // Progreso y rotación automática para banners de imagen (resumible en tiempo real)
  useEffect(() => {
    if (esVideo || detenido) return;

    const intervalMs = 50;
    const step = (intervalMs / MS_ROTACION) * 100;

    const timer = setInterval(() => {
      setProgreso((prev) => {
        if (prev + step >= 100) {
          siguiente();
          return 0;
        }
        return prev + step;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [esVideo, detenido, siguiente]);

  // Manejo de pausa y reanudación del video cuando se coloca o quita el cursor
  useEffect(() => {
    if (!videoRef.current || !esVideo) return;
    if (detenido) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
  }, [detenido, esVideo]);

  // Al cambiar de banner a uno de tipo video, reiniciar posición
  useEffect(() => {
    setProgreso(0);
    if (!videoRef.current || !esVideo) return;
    videoRef.current.currentTime = 0;
    if (!detenido) {
      videoRef.current.play().catch(() => {});
    }
  }, [activo, esVideo]);

  const toggleVideoPlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsVideoPlaying(true);
    } else {
      videoRef.current.pause();
      setIsVideoPlaying(false);
    }
  };

  return (
    <div
      className="banner-carrusel relative w-full overflow-hidden rounded-3xl border border-[#ECECEC] bg-[#190088] shadow-xl dark:border-white/10 dark:bg-[#0c004a] group"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
      aria-roledescription="carrusel"
      aria-label="Novedades de Necto"
    >
      <div
        onClick={() => onIr("/404")}
        className="relative block w-full aspect-[21/9] sm:aspect-[24/9] md:aspect-[32/10] max-h-[420px] sm:max-h-[440px] cursor-pointer overflow-hidden text-left"
        title={actual.title}
        role="button"
        tabIndex={0}
      >
        {BANNERS.map((b, idx) => {
          const estado = idx === activo ? (anterior === null ? "fijo" : "entra") : idx === anterior ? "sale" : "oculto";
          if (b.type === "video") {
            return (
              <div
                key={b.id}
                className={`absolute inset-0 h-full w-full banner-carrusel__imagen banner-carrusel__imagen--${estado} ${
                  direccion === 1 ? "desde-derecha" : "desde-izquierda"
                }`}
              >
                <video
                  ref={idx === activo ? videoRef : undefined}
                  src={b.videoUrl}
                  autoPlay={!detenido}
                  muted
                  playsInline
                  onLoadedMetadata={(e) => {
                    if (idx === activo && !detenido) {
                      e.currentTarget.play().catch(() => {});
                    }
                  }}
                  onTimeUpdate={(e) => {
                    if (idx === activo) {
                      const v = e.currentTarget;
                      if (v.duration && !Number.isNaN(v.duration)) {
                        setProgreso((v.currentTime / v.duration) * 100);
                      }
                    }
                  }}
                  onEnded={() => {
                    if (idx === activo) {
                      siguiente();
                    }
                  }}
                  onError={() => {
                    if (idx === activo) {
                      siguiente();
                    }
                  }}
                  className="h-full w-full object-cover object-center"
                />

                {/* Control de pausa/play para el video */}
                <div className="absolute top-4 right-4 z-10">
                  <button
                    type="button"
                    onClick={toggleVideoPlay}
                    aria-label={isVideoPlaying ? "Pausar animación" : "Reanudar animación"}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white/80 backdrop-blur-md transition-all hover:bg-black/70 hover:text-white border border-white/15 cursor-pointer"
                  >
                    {isVideoPlaying ? (
                      <span className="h-3 w-3 flex gap-0.5 justify-center items-center">
                        <span className="w-1 h-3 bg-white rounded-xs" />
                        <span className="w-1 h-3 bg-white rounded-xs" />
                      </span>
                    ) : (
                      <span className="w-0 h-0 ml-0.5 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[8px] border-l-white" />
                    )}
                  </button>
                </div>
              </div>
            );
          }

          const srcImagen = esDark ? b.imageUrlDark : b.imageUrl;
          return (
            <img
              key={b.id}
              src={srcImagen}
              alt={idx === activo ? b.alt : ""}
              aria-hidden={idx !== activo}
              loading="eager"
              draggable={false}
              style={{ objectPosition: b.objectPosition ?? "center center" }}
              className={`absolute inset-0 h-full w-full object-cover banner-carrusel__imagen banner-carrusel__imagen--${estado} ${
                direccion === 1 ? "desde-derecha" : "desde-izquierda"
              }`}
            />
          );
        })}

        {/* Gradiente sutil y llamada a la acción */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />

        <div className="absolute bottom-12 sm:bottom-16 md:bottom-20 right-4 sm:right-6 z-20 flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onIr("/404");
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#FF3F1A] px-4 py-1.5 text-[12px] font-bold text-white shadow-lg transition-all hover:bg-[#e03413] hover:shadow-[#FF3F1A]/30 active:scale-95 cursor-pointer"
          >
            <span>Conoce Necto</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Paginador flotante con miniaturas/píldoras */}
      <div className="absolute bottom-12 sm:bottom-16 md:bottom-20 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/50 px-3.5 py-1.5 backdrop-blur-md border border-white/15">
        <button
          type="button"
          onClick={previo}
          className="cursor-pointer rounded-full p-0.5 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
          aria-label="Banner anterior"
          title="Anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {BANNERS.map((b, idx) => {
          const esActivo = activo === idx;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => ir(idx, idx > activo ? 1 : -1)}
              aria-label={`Ir al banner ${idx + 1}: ${b.title}`}
              aria-current={esActivo ? "true" : undefined}
              className={`relative h-2.5 cursor-pointer overflow-hidden rounded-full transition-[width,background-color] duration-300 ease-out ${
                esActivo ? "w-8 bg-white/35" : "w-2.5 bg-white/70 hover:bg-white"
              }`}
            >
              {esActivo && (
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-[#FF3F1A]"
                  style={{
                    width: `${Math.min(100, Math.max(0, progreso))}%`,
                    transition: detenido
                      ? "none"
                      : esVideo
                      ? "width 200ms linear"
                      : "width 50ms linear",
                  }}
                />
              )}
            </button>
          );
        })}

        <button
          type="button"
          onClick={siguiente}
          className="cursor-pointer rounded-full p-0.5 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
          aria-label="Banner siguiente"
          title="Siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN LINE CHART 2 (ELEMENTS)
// ═══════════════════════════════════════════════════════════════════════════

const lineChartTwoOptions: ApexOptions = {
  legend: {
    show: false,
    position: "top",
    horizontalAlign: "left",
  },
  colors: ["#465FFF", "#97D6DF"],
  chart: {
    fontFamily: "DM Sans, sans-serif",
    height: 310,
    type: "area",
    toolbar: {
      show: false,
    },
  },
  fill: {
    type: "gradient",
    gradient: {
      type: "vertical",
      shadeIntensity: 1,
      opacityFrom: 0.35,
      opacityTo: 0.05,
      stops: [0, 90, 100],
    },
  },
  stroke: {
    curve: "smooth",
    width: [2.5, 2.5],
  },
  markers: {
    size: 0,
    hover: {
      size: 5,
    },
  },
  grid: {
    borderColor: "rgba(255, 255, 255, 0.06)",
    strokeDashArray: 0,
    xaxis: {
      lines: {
        show: false,
      },
    },
    yaxis: {
      lines: {
        show: true,
      },
    },
  },
  dataLabels: {
    enabled: false,
  },
  tooltip: {
    enabled: true,
  },
  xaxis: {
    type: "category",
    categories: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ],
    axisBorder: {
      show: false,
    },
    axisTicks: {
      show: false,
    },
    tooltip: {
      enabled: false,
    },
    labels: {
      style: {
        colors: "#94a3b8",
        fontSize: "12px",
        fontFamily: "DM Sans, sans-serif",
      },
    },
  },
  yaxis: {
    min: 0,
    max: 250,
    tickAmount: 5,
    labels: {
      style: {
        colors: "#94a3b8",
        fontSize: "12px",
        fontFamily: "DM Sans, sans-serif",
      },
    },
  },
};

const lineChartTwoSeries = [
  {
    name: "Series 1",
    data: [180, 190, 170, 160, 175, 165, 170, 205, 230, 210, 240, 235],
  },
  {
    name: "Series 2",
    data: [40, 30, 50, 40, 55, 40, 70, 100, 110, 120, 150, 140],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN LINE CHART 3 (SPARKLINES VENTAS Y UTILIDADES - ELEMENTS)
// ═══════════════════════════════════════════════════════════════════════════

const lineChartThreeVentasData = [
  31.2, 31.0, 31.8, 32.2, 31.9, 32.5, 32.3, 33.1, 32.8, 33.8, 32.2, 33.5,
  34.2, 33.1, 34.5, 34.2, 34.8, 33.4, 33.2, 32.8, 33.5, 32.1, 33.2, 33.6,
  32.4, 32.5, 31.5, 31.8, 31.2, 29.8, 30.5, 31.8, 31.2, 32.4, 31.8, 30.2,
  31.5, 32.2, 31.4, 30.8, 32.6, 33.8, 33.7, 32.2, 32.4, 31.8, 32.6, 33.2,
  33.0, 34.2, 32.8, 32.6, 32.2, 33.4, 33.2, 34.1, 34.2, 33.0, 32.8, 33.4,
  33.2, 34.8, 35.2, 35.5, 35.2, 37.2, 37.8,
];

const lineChartThreeUtilidadesData = [
  21.8, 22.1, 21.9, 22.5, 23.0, 22.8, 23.4, 23.1, 24.0, 23.5, 24.2, 23.8,
  24.6, 24.1, 23.5, 23.9, 23.2, 22.8, 23.5, 22.9, 23.4, 22.1, 21.5, 22.2,
  22.8, 21.9, 22.4, 23.1, 22.8, 21.9, 22.4, 23.2, 22.8, 23.9, 24.1, 23.5,
  24.2, 23.8, 24.5, 24.1, 23.6, 24.2, 23.9, 24.8, 25.2, 25.0, 26.1, 26.8,
];

const sparklineVentasOptions: ApexOptions = {
  chart: {
    type: "area",
    height: 52,
    sparkline: {
      enabled: true,
    },
    animations: {
      enabled: true,
      speed: 600,
    },
  },
  stroke: {
    curve: "smooth",
    width: 2,
  },
  colors: ["#465FFF"],
  fill: {
    type: "gradient",
    gradient: {
      type: "vertical",
      shadeIntensity: 1,
      opacityFrom: 0.45,
      opacityTo: 0.04,
      stops: [0, 100],
    },
  },
  tooltip: {
    enabled: true,
    theme: "dark",
    x: { show: false },
    y: {
      formatter: (val) => `$ ${val.toFixed(2)}M`,
    },
  },
};

const sparklineUtilidadesOptions: ApexOptions = {
  chart: {
    type: "area",
    height: 52,
    sparkline: {
      enabled: true,
    },
    animations: {
      enabled: true,
      speed: 600,
    },
  },
  stroke: {
    curve: "smooth",
    width: 2,
  },
  colors: ["#97D6DF"],
  fill: {
    type: "gradient",
    gradient: {
      type: "vertical",
      shadeIntensity: 1,
      opacityFrom: 0.45,
      opacityTo: 0.04,
      stops: [0, 100],
    },
  },
  tooltip: {
    enabled: true,
    theme: "dark",
    x: { show: false },
    y: {
      formatter: (val) => `$ ${val.toFixed(2)}M`,
    },
  },
};

export const InicioDashboardPage = observer(() => {
  const navigate = useNavigate();
  const [bannerVisible, setBannerVisible] = useState(true);
  const [filtroFecha, setFiltroFecha] = useState("Últimos 30 días");
  const [incluirPendientes, setIncluirPendientes] = useState(true);
  const [acordeonNotifAbierto, setAcordeonNotifAbierto] = useState(true);

  // Nombre del usuario actual
  const usuarioNombre =
    organizacionStore.usuario?.nombre || "Empresario";

  const tareasPendientes = tareasDeInicio().filter((t) => !t.completada);
  const intro = usePrimeraVisitaDeSesion();

  return (
    <>
      <PageMeta
        title="Panel Principal · Necto"
        description="Resumen de tu negocio, métricas y operaciones en Necto."
      />

      <div
        className={`flex-1 w-full min-h-[calc(100vh-140px)] p-4 sm:p-6 lg:p-8 space-y-6 font-sans select-none ${
          intro ? "dashboard-intro" : "animate-in fade-in duration-200"
        }`}
      >
        {/* ══════════════════════════════════════════════════════════════════
            1. BANNER SUPERIOR EXPANDIDO (Motion Graphic + Banners Necto)
            ══════════════════════════════════════════════════════════════════ */}
        <section className="dash-banner relative" aria-label="Novedades">
          <div
            className={`grid transition-[grid-template-rows,opacity] duration-[380ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${
              bannerVisible ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            }`}
            aria-hidden={!bannerVisible}
            {...(!bannerVisible ? { inert: "" } : {})}
          >
            <div className="-mx-3 -mb-5 min-h-0 overflow-hidden px-3 pb-5">
              <BannerCarrusel onIr={navigate} visible={bannerVisible} />
            </div>
          </div>

          {bannerVisible ? (
            <button
              type="button"
              onClick={() => setBannerVisible(false)}
              className="absolute -bottom-3 left-1/2 z-20 flex h-8 w-8 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-white text-[#212121] shadow-md transition-[color,transform] duration-150 ease-out hover:text-[#FF3F1A] active:scale-95 dark:border-white/10 dark:bg-gray-900 dark:text-white"
              title="Contraer banner"
              aria-label="Contraer banner"
            >
              <ChevronUp className="h-4 w-4 stroke-[2.5]" />
            </button>
          ) : (
            <div className="banner-pestana flex w-full justify-center">
              <button
                type="button"
                onClick={() => setBannerVisible(true)}
                className="group inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-[12px] font-bold text-[#212121] shadow-sm transition-[color,transform] duration-150 ease-out hover:text-[#FF3F1A] active:scale-95 dark:border-white/10 dark:bg-gray-900 dark:text-white"
                title="Mostrar banner"
              >
                <span>Mostrar novedades</span>
                <ChevronDown className="h-3.5 w-3.5 stroke-[2.5] text-gray-400 group-hover:text-[#FF3F1A]" />
              </button>
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            2. GRID PRINCIPAL (Superpuesto ligeramente sobre el banner)
            ══════════════════════════════════════════════════════════════════ */}
        <div
          className={`grid grid-cols-1 lg:grid-cols-12 gap-5 items-start ${
            bannerVisible ? "-mt-8 sm:-mt-12 lg:-mt-14 relative z-10 px-1 sm:px-2" : ""
          }`}
        >
          {/* COLUMNA IZQUIERDA (7 Columnas): Saludo compacto + Filtro y Gráfica */}
          <div className="lg:col-span-7 space-y-5">
            {/* Tarjeta única y compacta: Saludo + Filtro de fecha (ampliada un 20%) */}
            <div style={turno(0)} className="dash-pieza w-full max-w-[480px] p-4 sm:p-5 rounded-3xl bg-white dark:bg-gray-900 border border-[#ECECEC] dark:border-gray-800 shadow-lg space-y-3.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-[20px] sm:text-[22px] font-bold text-[#190088] dark:text-white leading-tight">
                    Hola {usuarioNombre}!
                  </h2>
                  <p className="text-[12px] text-[#212121]/60 dark:text-[#ECECEC]/60 font-normal">
                    Éste es el resumen de tu negocio.
                  </p>
                </div>

                {/* Badge circular Pionero con rayo */}
                <div
                  className="dash-destello w-9 h-9 rounded-full bg-[#190088] dark:bg-white/10 border-2 border-white/20 flex items-center justify-center text-white shadow-xs shrink-0"
                  title="Pionero Necto"
                >
                  <Sparkles className="w-4 h-4 text-[#FF3F1A]" />
                </div>
              </div>

              {/* Filtro por fecha dentro de la misma tarjeta */}
              <div className="space-y-1.5 pt-2 border-t border-[#ECECEC]/60 dark:border-white/10">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#212121]/70 dark:text-[#ECECEC]/70">
                  <Calendar className="w-3.5 h-3.5 text-[#190088] dark:text-[#97D6DF]" />
                  <span>Filtrar por fecha</span>
                </div>
                <div className="relative">
                  <select
                    value={filtroFecha}
                    onChange={(e) => setFiltroFecha(e.target.value)}
                    className="w-full px-3 py-1.5 pr-8 rounded-xl border border-[#ECECEC] dark:border-white/10 bg-[#ECECEC]/25 dark:bg-white/5 text-[12px] font-semibold text-[#212121] dark:text-white outline-hidden cursor-pointer appearance-none"
                  >
                    <option value="Hoy">Hoy</option>
                    <option value="Últimos 7 días">Últimos 7 días</option>
                    <option value="Últimos 30 días">Últimos 30 días</option>
                    <option value="Este mes">Este mes</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Encabezado de Estadísticas y Toggle */}
            <div style={turno(2)} className="dash-pieza flex flex-wrap items-center justify-between gap-4 px-1">
              <div>
                <h3 className="text-[20px] font-bold text-[#190088] dark:text-white">
                  Estadísticas
                </h3>
                <p className="text-[12px] text-[#212121]/60 dark:text-[#ECECEC]/60">
                  Última actualización: {new Date().toLocaleDateString("es-CO")}
                </p>
              </div>

              {/* Toggle switch: Incluir pedidos pendientes */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <span className="text-[13px] font-semibold text-[#212121]/80 dark:text-[#ECECEC]/80">
                  Incluir pedidos pendientes por recaudar
                </span>
                <button
                  type="button"
                  onClick={() => setIncluirPendientes(!incluirPendientes)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    incluirPendientes ? "bg-[#FF3F1A]" : "bg-gray-300 dark:bg-gray-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      incluirPendientes ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </label>
            </div>

            {/* Tarjeta con Gráfica Principal de Ventas y Utilidades (Line Chart 2 - Elements) */}
            <div style={turno(3)} className="dash-pieza p-6 rounded-3xl bg-white dark:bg-[#0c101d] border border-[#ECECEC] dark:border-white/[0.08] shadow-xs space-y-4">


              {/* Contenedor del gráfico LineChart de Elements */}
              <div className="w-full -ml-3 sm:-ml-2">
                <LineChart
                  series={lineChartTwoSeries}
                  options={lineChartTwoOptions}
                  height={310}
                />
              </div>

              {/* Indicadores de resumen al pie de la gráfica */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#ECECEC] dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#465FFF]/10 text-[#465FFF] flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-[#212121]/60 dark:text-[#ECECEC]/60">
                      Productos Vendidos
                    </p>
                    <p className="text-[20px] font-bold text-[#212121] dark:text-white">
                      <CifraAnimada valor={2053} formato={formatoEntero} animar={intro} retardo={0.8} />
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#97D6DF]/20 text-[#190088] dark:text-[#97D6DF] flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-[#212121]/60 dark:text-[#ECECEC]/60">
                      Total de Pedidos
                    </p>
                    <p className="text-[20px] font-bold text-[#212121] dark:text-white">
                      <CifraAnimada valor={1388} formato={formatoEntero} animar={intro} retardo={0.8} />
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA (5 Columnas): Notificaciones de Gestión ARRIBA + Cifras horizontales */}
          <div className="lg:col-span-5 space-y-5">
            {/* 1. Notificaciones de Gestión (SUPERIOR DERECHA, TAPA EL BANNER) */}
            <div style={turno(1)} className="dash-pieza p-4 sm:p-5 rounded-3xl bg-white dark:bg-gray-900 border border-[#ECECEC] dark:border-gray-800 shadow-lg space-y-3">
              <div>
                <h4 className="text-[15px] font-bold text-[#190088] dark:text-white">
                  Notificaciones de Gestión
                </h4>
                <p className="text-[11px] text-[#212121]/60 dark:text-[#ECECEC]/60">
                  Éste listado de notificaciones requiere de tu atención.
                </p>
              </div>

              {/* Acordeón compacto */}
              <div className="border border-[#ECECEC] dark:border-white/10 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setAcordeonNotifAbierto(!acordeonNotifAbierto)}
                  className="w-full p-3 flex items-center justify-between text-left bg-gray-50/70 dark:bg-white/5 hover:bg-gray-100/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Package className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-[12px] font-normal text-[#212121] dark:text-white">
                      Tienes <strong className="font-bold">20 pedidos</strong> que requieren atención
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
                      acordeonNotifAbierto ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {acordeonNotifAbierto && (
                  <div className="p-3 bg-white dark:bg-gray-900 border-t border-[#ECECEC] dark:border-gray-800 text-[11px] text-[#212121]/70 dark:text-[#ECECEC]/70 space-y-2">
                    <p>Hay pedidos pendientes de despacho y cobro por validar en el sistema.</p>
                    <Link
                      to="/pedidos"
                      className="inline-flex items-center gap-1 text-[#FF3F1A] font-bold hover:underline"
                    >
                      <span>Gestionar pedidos ahora</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>

              {/* Tareas de puesta en marcha pendientes: misma fuente que el checklist de
                  Inicio, así que cada aviso se quita solo al completarse la tarea. */}
              {tareasPendientes.map((tarea) => (
                <div
                  key={tarea.id}
                  className="p-3 rounded-2xl bg-[#97D6DF]/15 dark:bg-[#97D6DF]/10 border border-[#97D6DF]/40 flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#190088] dark:text-[#97D6DF] shrink-0" />
                      <p className="text-[12px] font-bold text-[#190088] dark:text-[#97D6DF] truncate">
                        {tarea.aviso.titulo}
                      </p>
                    </div>
                    <p className="text-[11px] text-[#212121]/70 dark:text-[#ECECEC]/70 leading-snug">
                      {tarea.aviso.texto}
                    </p>
                  </div>
                  <Link
                    to={tarea.ruta}
                    className="shrink-0 px-3 py-1.5 rounded-xl bg-[#190088] hover:bg-[#190088]/90 text-white text-[11px] font-bold tracking-wide transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <span>{tarea.aviso.accion}</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              ))}
            </div>

            {/* 2. CIFRAS: Ventas y Utilidades en UNA SOLA LÍNEA HORIZONTAL (Line Chart 3 - Elements) */}
            <div style={turno(2)} className="dash-pieza p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#0c101d] border border-[#ECECEC] dark:border-white/[0.08] shadow-xs">
              <div className="grid grid-cols-2 gap-4 divide-x divide-[#ECECEC] dark:divide-gray-800">
                {/* Columna Ventas */}
                <div className="space-y-1.5 pr-2">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#212121]/70 dark:text-[#ECECEC]/70">
                      <span className="w-3.5 h-3.5 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-[9px] font-bold text-[#212121] dark:text-white">
                        $
                      </span>
                      <span>Ventas</span>
                    </span>
                    <span className="dash-insignia inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1 py-0.5 rounded">
                      <ArrowUpRight className="w-3 h-3" />
                      <span>18.73%</span>
                    </span>
                  </div>

                  <p className="text-[16px] sm:text-[18px] font-bold text-[#212121] dark:text-white tracking-tight">
                    <CifraAnimada valor={307711012.94} formato={formatoPesos} animar={intro} retardo={0.7} />
                  </p>

                  {/* Sparkline Line Chart 3 */}
                  <div className="w-full -mx-1 py-0.5 overflow-hidden">
                    <LineChart
                      series={[{ name: "Ventas", data: lineChartThreeVentasData }]}
                      options={sparklineVentasOptions}
                      height={52}
                    />
                  </div>

                  <p className="text-[10px] text-[#212121]/50 dark:text-[#ECECEC]/50 font-medium">
                    Últimos 30 días
                  </p>
                </div>

                {/* Columna Utilidades */}
                <div className="space-y-1.5 pl-4">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#212121]/70 dark:text-[#ECECEC]/70">
                      <TrendingUp className="w-3 h-3 text-[#190088] dark:text-[#97D6DF]" />
                      <span>Utilidades</span>
                    </span>
                    <span className="dash-insignia inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1 py-0.5 rounded">
                      <ArrowUpRight className="w-3 h-3" />
                      <span>16.87%</span>
                    </span>
                  </div>

                  <p className="text-[16px] sm:text-[18px] font-bold text-[#212121] dark:text-white tracking-tight">
                    <CifraAnimada valor={214838216.94} formato={formatoPesos} animar={intro} retardo={0.7} />
                  </p>

                  {/* Sparkline Line Chart 3 */}
                  <div className="w-full -mx-1 py-0.5 overflow-hidden">
                    <LineChart
                      series={[{ name: "Utilidades", data: lineChartThreeUtilidadesData }]}
                      options={sparklineUtilidadesOptions}
                      height={52}
                    />
                  </div>

                  <p className="text-[10px] text-[#212121]/50 dark:text-[#ECECEC]/50 font-medium">
                    Últimos 30 días
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Totales: Productos Vendidos y Total de Pedidos en 2 columnas */}
            <div style={turno(3)} className="dash-pieza p-4 rounded-3xl bg-white dark:bg-gray-900 border border-[#ECECEC] dark:border-gray-800 shadow-xs grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FF3F1A]/10 text-[#FF3F1A] flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-[#212121]/60 dark:text-[#ECECEC]/60">
                    Productos Vendidos
                  </p>
                  <p className="text-[17px] font-bold text-[#212121] dark:text-white">
                    <CifraAnimada valor={2053} formato={formatoEntero} animar={intro} retardo={0.8} />
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#97D6DF]/20 text-[#190088] dark:text-[#97D6DF] flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-[#212121]/60 dark:text-[#ECECEC]/60">
                    Total de Pedidos
                  </p>
                  <p className="text-[17px] font-bold text-[#212121] dark:text-white">
                    <CifraAnimada valor={1388} formato={formatoEntero} animar={intro} retardo={0.8} />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

export default InicioDashboardPage;

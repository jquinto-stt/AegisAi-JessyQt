import React, { useState, useEffect } from "react";
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

interface BannerItem {
  id: string;
  imageUrl: string;
  imageUrlDark: string;
  title: string;
  alt: string;
  ctaLink: string;
  objectPosition?: string;
}

const BANNERS: BannerItem[] = [
  {
    id: "operacion-conectada",
    imageUrl: "/images/Banners/banner-operacion.png",
    imageUrlDark: "/images/Banners/banner-operacion-dark.png",
    title: "Toda tu operación, más conectada",
    alt: "Necto - Pedidos, inventario y atención en un mismo entorno",
    ctaLink: "/configuracion?tab=modulos",
  },
  {
    id: "pedidos-inventario",
    imageUrl: "/images/Banners/banner-pedidos.png",
    imageUrlDark: "/images/Banners/banner-pedidos-dark.png",
    title: "Pedidos e inventario, en un solo lugar",
    alt: "Necto - Gestiona tus pedidos y controla tu stock",
    ctaLink: "/pedidos",
  },
  {
    id: "conversaciones-whatsapp",
    imageUrl: "/images/Banners/banner-conversaciones.png",
    imageUrlDark: "/images/Banners/banner-conversaciones-dark.png",
    title: "Gestiona tus conversaciones, sin salir de Necto",
    alt: "Necto - Centraliza la atención por WhatsApp y conecta con tus procesos",
    ctaLink: "/conversaciones",
    // Ajuste fino: suficiente para que 'Gestiona tus' no se corte sin dejar espacio vacío arriba
    objectPosition: "center 38%",
  },
];

/** Cada cuánto cambia el banner solo. */
const MS_ROTACION = 7000;

/**
 * Carrusel de novedades del inicio.
 *
 * ── Por qué así ──────────────────────────────────────────────────────────
 *
 * Antes era una sola `<img>` a la que se le cambiaba el `src`: el
 * `transition-opacity` nunca corría (no hay dos estados que interpolar) y el
 * cambio era un corte seco, con parpadeo si la imagen siguiente no estaba en
 * caché. Ahora las tres imágenes están apiladas en la misma celda —precargadas,
 * con el mismo alto— y la que entra se funde con un leve desplazamiento en la
 * dirección de la navegación mientras la que sale se va al lado contrario.
 *
 * El indicador activo es una píldora que se llena durante los 7 s: dice que el
 * banner cambia solo y cuánto falta. Al pasar el mouse o enfocar el carrusel se
 * pausa, y navegar a mano reinicia la cuenta.
 */
const BannerCarrusel = observer(function BannerCarrusel({ onIr, visible }: { onIr: (ruta: string) => void; visible: boolean }) {
  const [activo, setActivo] = useState(0);
  const [anterior, setAnterior] = useState<number | null>(null);
  const [direccion, setDireccion] = useState<1 | -1>(1);
  const [pausado, setPausado] = useState(false);

  // Precarga de banners light y dark para transición inmediata sin parpadeo
  useEffect(() => {
    BANNERS.forEach((b) => {
      const imgL = new Image();
      imgL.src = b.imageUrl;
      const imgD = new Image();
      imgD.src = b.imageUrlDark;
    });
  }, []);

  const ir = (destino: number, dir: 1 | -1) => {
    if (destino === activo) return;
    setDireccion(dir);
    setAnterior(activo);
    setActivo(destino);
  };
  const siguiente = () => ir((activo + 1) % BANNERS.length, 1);
  const previo = () => ir((activo - 1 + BANNERS.length) % BANNERS.length, -1);

  // Plegado no rota: nadie lo está viendo.
  const detenido = pausado || !visible;

  // Un temporizador por banner: navegar a mano reinicia la cuenta y pausar la congela.
  useEffect(() => {
    if (detenido) return;
    const t = setTimeout(siguiente, MS_ROTACION);
    return () => clearTimeout(t);
    // `siguiente` depende de `activo`, que ya está en las dependencias.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, detenido]);

  const actual = BANNERS[activo];
  const esDark = uiStore.theme === "dark";

  return (
    <div
      className="banner-carrusel relative w-full overflow-hidden rounded-3xl border border-[#ECECEC] bg-[#FAF7F2] shadow-lg dark:border-white/10 dark:bg-[#1E1C2E]"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
      aria-roledescription="carrusel"
      aria-label="Novedades de Necto"
    >
      {/* Las tres imágenes en la misma celda: el alto lo pone la primera y nada salta. */}
      <button
        type="button"
        onClick={() => onIr(actual.ctaLink)}
        className="grid w-full cursor-pointer text-left [&>*]:col-start-1 [&>*]:row-start-1"
        title={actual.title}
        aria-label={actual.title}
      >
        {BANNERS.map((b, idx) => {
          // Al cargar, el primero ya está ahí: solo se anima cuando el banner cambia.
          const estado = idx === activo ? (anterior === null ? "fijo" : "entra") : idx === anterior ? "sale" : "oculto";
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
              className={`h-auto max-h-[300px] w-full object-cover sm:max-h-[320px] banner-carrusel__imagen banner-carrusel__imagen--${estado} ${
                direccion === 1 ? "desde-derecha" : "desde-izquierda"
              }`}
            />
          );
        })}
      </button>

      {/* Paginador */}
      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-xs dark:bg-black/60">
        <button
          type="button"
          onClick={previo}
          className="cursor-pointer rounded-full p-0.5 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
          aria-label="Banner anterior"
          title="Anterior"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        {BANNERS.map((b, idx) => {
          const esActivo = activo === idx;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => ir(idx, idx > activo ? 1 : -1)}
              aria-label={`Ir al banner ${idx + 1}`}
              aria-current={esActivo ? "true" : undefined}
              className={`relative h-2 cursor-pointer overflow-hidden rounded-full transition-[width,background-color] duration-300 ease-out ${
                esActivo ? "w-6 bg-white/35" : "w-2 bg-white/70 hover:bg-white"
              }`}
            >
              {esActivo && (
                <span
                  key={activo}
                  className="banner-carrusel__progreso absolute inset-0 origin-left rounded-full bg-[#FF3F1A]"
                  style={{ animationDuration: `${MS_ROTACION}ms`, animationPlayState: detenido ? "paused" : "running" }}
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
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
});

export const InicioDashboardPage = observer(() => {
  const navigate = useNavigate();
  const [bannerVisible, setBannerVisible] = useState(true);
  const [filtroFecha, setFiltroFecha] = useState("Últimos 30 días");
  const [incluirPendientes, setIncluirPendientes] = useState(true);
  const [acordeonNotifAbierto, setAcordeonNotifAbierto] = useState(true);

  // Nombre del usuario actual
  const usuarioNombre =
    organizacionStore.usuario?.nombre || "Empresario";

  // Comprobar si faltan tareas iniciales
  const tareasPendientes = organizacionStore.modulosActivos.length === 0;


  return (
    <>
      <PageMeta
        title="Panel Principal · Necto"
        description="Resumen de tu negocio, métricas y operaciones en Necto."
      />

      <div className="flex-1 w-full min-h-[calc(100vh-140px)] p-4 sm:p-6 lg:p-8 space-y-6 font-sans select-none animate-in fade-in duration-200">
        {/* Banner de alerta si la persona saltó el checklist inicial */}
        {tareasPendientes && (
          <div className="w-full p-4 rounded-2xl bg-[#EFE6D3]/60 dark:bg-[#1E1C2E] border border-[#FF3F1A]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FF3F1A]/10 text-[#FF3F1A] flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-[#190088] dark:text-white">
                  Tienes tareas de inicio pendientes
                </p>
                <p className="text-[12px] text-[#212121]/70 dark:text-[#ECECEC]/70">
                  Saltaste la configuración inicial. Instala tus módulos para activar ventas, cocina y delivery.
                </p>
              </div>
            </div>

            <Link
              to="/inicio"
              className="shrink-0 px-4 py-2 rounded-xl bg-[#FF3F1A] hover:bg-[#e03413] text-white text-[12px] font-bold tracking-wide transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Volver al formulario de inicio</span>
            </Link>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            1. BANNER CAROUSEL SUPERIOR (Colapsable con flecha abajo fuera)
            ══════════════════════════════════════════════════════════════════ */}
        {/* Se pliega y despliega con su alto (filas 1fr ↔ 0fr): lo de abajo sube
            y baja acompañándolo en vez de saltar. Plegado, el carrusel se pausa. */}
        <section className="relative" aria-label="Novedades">
          <div
            className={`grid transition-[grid-template-rows,opacity] duration-[380ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${
              bannerVisible ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            }`}
            aria-hidden={!bannerVisible}
            // Plegado no debe recibir foco ni clics.
            {...(!bannerVisible ? { inert: "" } : {})}
          >
            {/* El relleno deja ver la sombra: el recorte del pliegue la cortaría. */}
            <div className="-mx-3 -mb-5 min-h-0 overflow-hidden px-3 pb-5">
              <BannerCarrusel onIr={navigate} visible={bannerVisible} />
            </div>
          </div>

          {bannerVisible ? (
            <button
              type="button"
              onClick={() => setBannerVisible(false)}
              className="absolute -bottom-3 left-1/2 z-20 flex h-8 w-8 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-white text-[#212121] shadow-md transition-[color,transform] duration-150 ease-out hover:text-[#FF3F1A] active:scale-95 dark:border-white/20 dark:bg-[#1E1C2E] dark:text-white"
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
                className="group inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-[12px] font-bold text-[#212121] shadow-sm transition-[color,transform] duration-150 ease-out hover:text-[#FF3F1A] active:scale-95 dark:border-white/20 dark:bg-[#1E1C2E] dark:text-white"
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
            <div className="w-full max-w-[480px] p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#1E1C2E] border border-[#ECECEC] dark:border-white/10 shadow-lg space-y-3.5">
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
                  className="w-9 h-9 rounded-full bg-[#190088] dark:bg-white/10 border-2 border-white/20 flex items-center justify-center text-white shadow-xs shrink-0"
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
            <div className="flex flex-wrap items-center justify-between gap-4 px-1">
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

            {/* Tarjeta con Gráfica Principal de Ventas y Utilidades */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#1E1C2E] border border-[#ECECEC] dark:border-white/10 shadow-xs space-y-6">
              {/* Leyenda de la gráfica */}
              <div className="flex items-center gap-6 text-[13px] font-bold">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#FF3F1A]" />
                  <span className="text-[#212121] dark:text-white">Ventas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#97D6DF]" />
                  <span className="text-[#212121] dark:text-white">Utilidades</span>
                </div>
              </div>

              {/* Área Gráfica Interactiva (SVG Wave Gradient Necto) */}
              <div className="w-full h-64 sm:h-72 relative">
                <svg
                  viewBox="0 0 800 240"
                  preserveAspectRatio="none"
                  className="w-full h-full overflow-visible"
                >
                  <defs>
                    {/* Gradiente Ventas (Naranja Necto) */}
                    <linearGradient id="gradVentas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF3F1A" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#FF3F1A" stopOpacity="0.0" />
                    </linearGradient>

                    {/* Gradiente Utilidades (Cyan Necto) */}
                    <linearGradient id="gradUtilidades" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#97D6DF" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#97D6DF" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Líneas guía de fondo */}
                  <line x1="0" y1="60" x2="800" y2="60" stroke="#ECECEC" strokeDasharray="4 4" strokeWidth="1" className="dark:stroke-white/10" />
                  <line x1="0" y1="120" x2="800" y2="120" stroke="#ECECEC" strokeDasharray="4 4" strokeWidth="1" className="dark:stroke-white/10" />
                  <line x1="0" y1="180" x2="800" y2="180" stroke="#ECECEC" strokeDasharray="4 4" strokeWidth="1" className="dark:stroke-white/10" />

                  {/* Curva Ventas: Relleno y Trazo */}
                  <path
                    d="M0,170 Q100,50 200,90 T400,60 T600,100 T800,40 L800,240 L0,240 Z"
                    fill="url(#gradVentas)"
                  />
                  <path
                    d="M0,170 Q100,50 200,90 T400,60 T600,100 T800,40"
                    fill="none"
                    stroke="#FF3F1A"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />

                  {/* Curva Utilidades: Relleno y Trazo */}
                  <path
                    d="M0,200 Q100,120 200,150 T400,120 T600,160 T800,110 L800,240 L0,240 Z"
                    fill="url(#gradUtilidades)"
                  />
                  <path
                    d="M0,200 Q100,120 200,150 T400,120 T600,160 T800,110"
                    fill="none"
                    stroke="#97D6DF"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              {/* Indicadores de resumen al pie de la gráfica */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#ECECEC] dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FF3F1A]/10 text-[#FF3F1A] flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-[#212121]/60 dark:text-[#ECECEC]/60">
                      Productos Vendidos
                    </p>
                    <p className="text-[20px] font-bold text-[#212121] dark:text-white">
                      2,053
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
                      1,388
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA (5 Columnas): Notificaciones de Gestión ARRIBA + Cifras horizontales */}
          <div className="lg:col-span-5 space-y-5">
            {/* 1. Notificaciones de Gestión (SUPERIOR DERECHA, TAPA EL BANNER) */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#1E1C2E] border border-[#ECECEC] dark:border-white/10 shadow-lg space-y-3">
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
                  <div className="p-3 bg-white dark:bg-[#1E1C2E] border-t border-[#ECECEC] dark:border-white/10 text-[11px] text-[#212121]/70 dark:text-[#ECECEC]/70 space-y-2">
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

              {/* Notificación de Configuración: Instalar módulo pendiente */}
              <div className="p-3 rounded-2xl bg-[#97D6DF]/15 dark:bg-[#97D6DF]/10 border border-[#97D6DF]/40 flex items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#190088] dark:text-[#97D6DF] shrink-0" />
                    <p className="text-[12px] font-bold text-[#190088] dark:text-[#97D6DF] truncate">
                      Configuración: Instalar módulo
                    </p>
                  </div>
                  <p className="text-[11px] text-[#212121]/70 dark:text-[#ECECEC]/70 leading-snug">
                    Saltaste este paso. Instala tus módulos (WhatsApp, Catálogo, etc.) para operar.
                  </p>
                </div>
                <Link
                  to="/configuracion?tab=modulos"
                  className="shrink-0 px-3 py-1.5 rounded-xl bg-[#190088] hover:bg-[#190088]/90 text-white text-[11px] font-bold tracking-wide transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <span>Instalar módulo</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* 2. CIFRAS: Ventas y Utilidades en UNA SOLA LÍNEA HORIZONTAL (compactas) */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#1E1C2E] border border-[#ECECEC] dark:border-white/10 shadow-xs">
              <div className="grid grid-cols-2 gap-4 divide-x divide-[#ECECEC] dark:divide-white/10">
                {/* Columna Ventas */}
                <div className="space-y-1.5 pr-2">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#212121]/70 dark:text-[#ECECEC]/70">
                      <span className="w-3.5 h-3.5 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-[9px] font-bold text-[#212121] dark:text-white">
                        $
                      </span>
                      <span>Ventas</span>
                    </span>
                    <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1 py-0.5 rounded">
                      <ArrowUpRight className="w-3 h-3" />
                      <span>18.73%</span>
                    </span>
                  </div>

                  <p className="text-[16px] sm:text-[18px] font-bold text-[#212121] dark:text-white tracking-tight">
                    $ 307.711.012,94
                  </p>

                  {/* Sparkline verde */}
                  <div className="h-6 w-full">
                    <svg viewBox="0 0 200 36" preserveAspectRatio="none" className="w-full h-full">
                      <path
                        d="M0,28 Q30,10 60,20 T120,8 T160,18 T200,6 L200,36 L0,36 Z"
                        fill="#22c55e"
                        fillOpacity="0.2"
                      />
                      <path
                        d="M0,28 Q30,10 60,20 T120,8 T160,18 T200,6"
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="2.5"
                      />
                    </svg>
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
                    <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1 py-0.5 rounded">
                      <ArrowUpRight className="w-3 h-3" />
                      <span>16.87%</span>
                    </span>
                  </div>

                  <p className="text-[16px] sm:text-[18px] font-bold text-[#212121] dark:text-white tracking-tight">
                    $ 214.838.216,94
                  </p>

                  {/* Sparkline azul */}
                  <div className="h-6 w-full">
                    <svg viewBox="0 0 200 36" preserveAspectRatio="none" className="w-full h-full">
                      <path
                        d="M0,30 Q40,15 80,24 T140,12 T200,8 L200,36 L0,36 Z"
                        fill="#38bdf8"
                        fillOpacity="0.25"
                      />
                      <path
                        d="M0,30 Q40,15 80,24 T140,12 T200,8"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="2.5"
                      />
                    </svg>
                  </div>

                  <p className="text-[10px] text-[#212121]/50 dark:text-[#ECECEC]/50 font-medium">
                    Últimos 30 días
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Totales: Productos Vendidos y Total de Pedidos en 2 columnas */}
            <div className="p-4 rounded-3xl bg-white dark:bg-[#1E1C2E] border border-[#ECECEC] dark:border-white/10 shadow-xs grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FF3F1A]/10 text-[#FF3F1A] flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-[#212121]/60 dark:text-[#ECECEC]/60">
                    Productos Vendidos
                  </p>
                  <p className="text-[17px] font-bold text-[#212121] dark:text-white">
                    2053
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
                    1388
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

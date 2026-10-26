import { useState } from "react";
import { ShellDropdown } from "@/shell/header/ShellDropdown";
import { BellIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";

import { observer } from "mobx-react-lite";
import { useNavigate } from "react-router";
import { inventarioStore, sessionStore, type AlertaInventario } from "@/stores";

/**
 * Notificaciones: Soporta tarjetas ricas con insignias de categoría, fecha,
 * descartar con papelera, indicador de no leída (punto rosa) e ilustración de NECTO.
 */
const CLAVE_VISTAS = "necto.notificaciones.vistas";
const CLAVE_DESCARTADAS = "necto.notificaciones.descartadas";

function leerVistas(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(CLAVE_VISTAS) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function guardarVistas(ids: string[]) {
  try {
    localStorage.setItem(CLAVE_VISTAS, JSON.stringify(ids));
  } catch {
    // Sin almacenamiento persistente disponible
  }
}

function leerDescartadas(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(CLAVE_DESCARTADAS) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function guardarDescartadas(ids: string[]) {
  try {
    localStorage.setItem(CLAVE_DESCARTADAS, JSON.stringify(ids));
  } catch {
    // Sin almacenamiento persistente disponible
  }
}

export interface TarjetaNotificacion {
  id: string;
  categoria: string;
  categoriaColor?: {
    bg: string;
    text: string;
  };
  fecha: string;
  titulo: string;
  detalle: string;
  ruta?: string;
  banner?: "necto" | "ninguno";
}

/**
 * Banner Anuncio Oficial de NECTO.
 * Presenta el isotipo geométrico N oficial, colores de marca (#FF3F1A, #190088, #97D6DF),
 * mockup de módulos sincronizados (WhatsApp, Inventario, Órdenes) y la lupa de exploración con destellos.
 */
function BannerAnuncioNecto() {
  return (
    <div className="relative mt-3.5 overflow-hidden rounded-[18px] border border-[#E2EEFC] bg-gradient-to-br from-[#FFFFFF] via-[#F6F9FE] to-[#EEF5FF] p-3.5 shadow-[0_2px_12px_rgba(25,0,136,0.05)] select-none dark:border-white/10 dark:from-[#141A29] dark:via-[#111624] dark:to-[#0D121D]">
      <svg
        className="h-auto w-full"
        viewBox="0 0 330 115"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Glow ambiental sutil */}
        <ellipse cx="60" cy="55" rx="50" ry="40" fill="#FF3F1A" opacity="0.06" />
        <ellipse cx="250" cy="60" rx="60" ry="45" fill="#190088" opacity="0.07" />

        {/* ─── Identidad NECTO (Izquierda) ─── */}
        <g id="necto-brand-group" transform="translate(18, 22)">
          {/* Contenedor del Isotipo N Oficial con gradiente de marca */}
          <rect
            x="0"
            y="6"
            width="42"
            height="42"
            rx="12"
            fill="#0F0A26"
            stroke="#190088"
            strokeWidth="1.2"
          />
          <g transform="translate(7.5, 13.5) scale(0.6)">
            {/* Isotipo Necto Oficial */}
            <path
              d="M32.8588 29.4693L30.0813 32.3566C29.5321 32.9215 28.622 32.9372 28.0571 32.3723L20.1954 24.5107C19.301 23.6163 17.7789 24.2439 17.7789 25.515V31.2896C17.7789 32.0742 17.1512 32.7019 16.3666 32.7019H12.8516C12.067 32.7019 11.4394 32.0742 11.4394 31.2896V16.0528C11.4394 15.6762 11.5806 15.3153 11.8474 15.0485L14.719 12.1769C15.2682 11.6277 16.1312 11.6277 16.6961 12.1455L32.796 27.4451C33.3609 27.9786 33.3766 28.8887 32.8431 29.4536L32.8588 29.4693Z"
              fill="#FF3F1A"
            />
            <path
              d="M33.2511 12.8046V15.2682C33.2511 16.1469 32.5449 16.8688 31.6505 16.8688H26.0956C24.6833 16.8688 23.9772 15.174 24.9501 14.1698L27.3195 11.7061C27.6177 11.3923 28.0257 11.2197 28.465 11.2197H31.6505C32.5292 11.2197 33.2511 11.9258 33.2511 12.8203V12.8046Z"
              fill="#FFFFFF"
            />
          </g>

          {/* Textos de Marca NECTO */}
          <text
            x="49"
            y="24"
            fill="#0F0A26"
            className="dark:fill-white"
            fontSize="14"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, sans-serif"
            letterSpacing="-0.4px"
          >
            NECTO
          </text>
          {/* Pill PRO */}
          <rect x="100" y="14" width="28" height="13" rx="4" fill="#FF3F1A" opacity="0.15" />
          <text
            x="114"
            y="23.5"
            fill="#FF3F1A"
            fontSize="7.5"
            fontWeight="800"
            textAnchor="middle"
            fontFamily="system-ui, sans-serif"
          >
            PRO
          </text>

          <text
            x="49"
            y="37"
            fill="#190088"
            className="dark:fill-[#97D6DF]"
            fontSize="9.5"
            fontWeight="700"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            Toda tu operación
          </text>
          <text
            x="49"
            y="49"
            fill="#64748B"
            className="dark:fill-gray-300"
            fontSize="8.5"
            fontWeight="500"
            fontFamily="system-ui, sans-serif"
          >
            más conectada.
          </text>
        </g>

        {/* ─── Flecha discontinua curva conectora ─── */}
        <path
          d="M168 62 C 178 60, 184 55, 191 50"
          stroke="#FF3F1A"
          strokeWidth="1.6"
          strokeDasharray="2.5 2.5"
          strokeLinecap="round"
          fill="none"
        />
        <polygon points="193,47 192,53 187,50" fill="#FF3F1A" />

        {/* ─── Mockup de Plataforma con Módulos Necto ─── */}
        <g id="necto-platform-mockup" transform="translate(195, 24)">
          {/* Ventana de la plataforma */}
          <rect
            x="0"
            y="0"
            width="124"
            height="78"
            rx="7"
            fill="white"
            className="dark:fill-[#1E2538]"
            stroke="#CBDCF5"
            strokeWidth="1"
          />

          {/* Barra superior en azul índigo Necto */}
          <path
            d="M0 7C0 3.134 3.134 0 7 0H117C120.866 0 124 3.134 124 7V13H0V7Z"
            fill="#190088"
          />
          {/* Controles de ventana */}
          <circle cx="6" cy="6.5" r="1.5" fill="#FF3F1A" />
          <circle cx="11" cy="6.5" r="1.5" fill="#97D6DF" />
          <circle cx="16" cy="6.5" r="1.5" fill="white" opacity="0.8" />

          {/* Módulo 1: WhatsApp */}
          <g transform="translate(6, 18)">
            <rect
              width="35"
              height="50"
              rx="4"
              fill="#FFFFFF"
              className="dark:fill-[#161D2B]"
              stroke="#E2EDFB"
              strokeWidth="0.8"
            />
            {/* Icono WhatsApp verde */}
            <rect x="11.5" y="5" width="12" height="12" rx="3" fill="#DCFCE7" />
            <path
              d="M15 11C15 11 16 12.5 17.5 12.5C19 12.5 20 11.5 20 11.5"
              stroke="#16A34A"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <circle cx="17.5" cy="9.5" r="1.5" fill="#16A34A" />
            <rect x="7" y="21" width="21" height="2" rx="1" fill="#E2E8F0" />
            {/* Pill WhatsApp */}
            <rect x="4" y="34" width="27" height="9" rx="4" fill="#F0FDF4" />
            <text
              x="17.5"
              y="40.5"
              fill="#16A34A"
              fontSize="4.8"
              fontWeight="700"
              textAnchor="middle"
            >
              WhatsApp
            </text>
          </g>

          {/* Módulo 2: Inventario */}
          <g transform="translate(44.5, 18)">
            <rect
              width="35"
              height="50"
              rx="4"
              fill="#FFFFFF"
              className="dark:fill-[#161D2B]"
              stroke="#E2EDFB"
              strokeWidth="0.8"
            />
            {/* Icono caja inventario naranja Necto */}
            <rect x="11.5" y="5" width="12" height="12" rx="3" fill="#FFEDD5" />
            <path
              d="M14 10L17.5 8L21 10L17.5 12L14 10Z"
              stroke="#EA580C"
              strokeWidth="1"
              strokeLinejoin="round"
              fill="#FED7AA"
            />
            <path d="M14 10V14L17.5 16V12" stroke="#EA580C" strokeWidth="1" strokeLinejoin="round" />
            <path d="M21 10V14L17.5 16V12" stroke="#EA580C" strokeWidth="1" strokeLinejoin="round" />
            <rect x="7" y="21" width="21" height="2" rx="1" fill="#E2E8F0" />
            {/* Pill Inventario */}
            <rect x="4" y="34" width="27" height="9" rx="4" fill="#FFF7ED" />
            <text
              x="17.5"
              y="40.5"
              fill="#EA580C"
              fontSize="4.8"
              fontWeight="700"
              textAnchor="middle"
            >
              Inventario
            </text>
          </g>

          {/* Módulo 3: Pedidos */}
          <g transform="translate(83, 18)">
            <rect
              width="35"
              height="50"
              rx="4"
              fill="#FFFFFF"
              className="dark:fill-[#161D2B]"
              stroke="#E2EDFB"
              strokeWidth="0.8"
            />
            {/* Icono carrito / órdenes cyan */}
            <rect x="11.5" y="5" width="12" height="12" rx="3" fill="#E0F2FE" />
            <path
              d="M14 9H15L16 14H20L21 10H15.5"
              stroke="#0284C7"
              strokeWidth="1.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="16.5" cy="15.5" r="0.8" fill="#0284C7" />
            <circle cx="19.5" cy="15.5" r="0.8" fill="#0284C7" />
            <rect x="7" y="21" width="21" height="2" rx="1" fill="#E2E8F0" />
            {/* Pill Pedidos */}
            <rect x="4" y="34" width="27" height="9" rx="4" fill="#F0F9FF" />
            <text
              x="17.5"
              y="40.5"
              fill="#0284C7"
              fontSize="4.8"
              fontWeight="700"
              textAnchor="middle"
            >
              Órdenes
            </text>
          </g>
        </g>

        {/* ─── Lupa Flotante 3D con Destellos Magenta/Naranja ─── */}
        <g id="necto-lens" transform="translate(264, 14)">
          {/* Destellos de brillo rosa / magenta como en la referencia */}
          <line
            x1="32"
            y1="5"
            x2="38"
            y2="3"
            stroke="#E11D48"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <line
            x1="33"
            y1="11"
            x2="40"
            y2="11"
            stroke="#E11D48"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <line
            x1="26"
            y1="0"
            x2="28"
            y2="-5"
            stroke="#E11D48"
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* Sombra de la lupa */}
          <circle cx="16" cy="19" r="16" fill="#000000" opacity="0.08" />

          {/* Mango de la lupa */}
          <line
            x1="27"
            y1="28"
            x2="38"
            y2="39"
            stroke="#190088"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <line
            x1="27"
            y1="28"
            x2="38"
            y2="39"
            stroke="#FF3F1A"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Aro exterior de la lupa en azul índigo Necto */}
          <circle
            cx="15"
            cy="15"
            r="16"
            fill="#F4F8FE"
            stroke="#190088"
            strokeWidth="3.5"
            className="dark:fill-[#1e293b]"
          />

          {/* Mini isotipo N reflectado en la lupa */}
          <g transform="translate(10, 9)">
            <path
              d="M8.5 7.5L7.8 8.2C7.6 8.4 7.4 8.4 7.2 8.2L5.2 6.2C5 6 4.6 6.1 4.6 6.4V7.9C4.6 8.1 4.4 8.3 4.2 8.3H3.3C3.1 8.3 2.9 8.1 2.9 7.9V3.9C2.9 3.8 2.9 3.7 3 3.6L3.8 2.9C3.9 2.8 4.1 2.8 4.3 2.9L8.5 7C8.6 7.1 8.6 7.3 8.5 7.5Z"
              fill="#FF3F1A"
            />
            <path
              d="M8.6 3V3.6C8.6 3.8 8.4 4 8.2 4H6.8C6.4 4 6.2 3.6 6.5 3.3L7.1 2.7C7.2 2.6 7.3 2.6 7.4 2.6H8.2C8.4 2.6 8.6 2.8 8.6 3Z"
              fill="#190088"
            />
          </g>

          {/* Brillo de cristal curvo */}
          <path
            d="M4 11 A 13 13 0 0 1 18 3"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.85"
          />
        </g>
      </svg>
    </div>
  );
}

const NotificationDropdown = observer(function NotificationDropdown() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [vistas, setVistas] = useState<Set<string>>(leerVistas);
  const [descartadas, setDescartadas] = useState<Set<string>>(leerDescartadas);

  // 1. Notificaciones reales de inventario
  const alertasInventario = sessionStore.modulos.includes("inventarios")
    ? inventarioStore.alertas()
    : [];

  const tarjetasInventario: TarjetaNotificacion[] = alertasInventario.map(
    (a: AlertaInventario) => ({
      id: a.id,
      categoria:
        a.tono === "alerta" ? "Inventario Crítico" : a.tono === "aviso" ? "Reorden" : "Aviso",
      categoriaColor:
        a.tono === "alerta"
          ? {
              bg: "bg-rose-100 dark:bg-rose-950/60",
              text: "text-rose-700 dark:text-rose-300",
            }
          : a.tono === "aviso"
            ? {
                bg: "bg-amber-100 dark:bg-amber-950/60",
                text: "text-amber-800 dark:text-amber-300",
              }
            : {
                bg: "bg-blue-100 dark:bg-blue-950/60",
                text: "text-blue-800 dark:text-blue-300",
              },
      fecha: "Hoy",
      titulo: a.titulo,
      detalle: a.detalle,
      ruta: a.ruta,
      banner: "ninguno",
    })
  );

  // 2. Tarjeta Anuncio Oficial NECTO (destacada y contextual a la plataforma de operaciones)
  const tarjetasDestacadas: TarjetaNotificacion[] = [
    {
      id: "anuncio-necto-operaciones",
      categoria: "Anuncio Necto",
      categoriaColor: {
        bg: "bg-[#FFF0ED] dark:bg-orange-950/60",
        text: "text-[#FF3F1A] dark:text-orange-300",
      },
      fecha: "Hoy",
      titulo: "Toda tu operación, más conectada",
      detalle:
        "Sincroniza en tiempo real tus conversaciones de WhatsApp, control de inventario y despacho de pedidos.",
      banner: "necto",
      ruta: "/configuracion",
    },
  ];

  // Lista combinada y filtrada por descartadas
  const todasLasNotificaciones = [...tarjetasDestacadas, ...tarjetasInventario].filter(
    (t) => !descartadas.has(t.id)
  );

  const hayNoLeidas = todasLasNotificaciones.some((t) => !vistas.has(t.id));

  function closeDropdown() {
    setIsOpen(false);
  }

  const handleClick = () => {
    setIsOpen((v) => !v);
  };

  const marcarComoLeida = (id: string) => {
    if (!vistas.has(id)) {
      const nuevoSet = new Set(vistas);
      nuevoSet.add(id);
      setVistas(nuevoSet);
      guardarVistas(Array.from(nuevoSet));
    }
  };

  const eliminarNotificacion = (id: string) => {
    const nuevoDescartadas = new Set(descartadas);
    nuevoDescartadas.add(id);
    setDescartadas(nuevoDescartadas);
    guardarDescartadas(Array.from(nuevoDescartadas));
  };

  const ir = (ruta?: string) => {
    closeDropdown();
    if (ruta) navigate(ruta);
  };

  const restablecerNotificaciones = () => {
    setDescartadas(new Set());
    guardarDescartadas([]);
  };

  return (
    <div className="relative">
      {/* Botón trigger circular con campana outline y punto de notificación */}
      <button
        type="button"
        className="relative flex items-center justify-center text-gray-600 transition-colors bg-white border border-gray-200/90 rounded-full dropdown-toggle hover:text-gray-900 h-11 w-11 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white cursor-pointer"
        onClick={handleClick}
        title="Notificaciones"
        aria-label="Notificaciones"
      >
        <span
          className={`absolute right-1 top-1 z-10 size-2.5 rounded-full bg-[#E11D48] ring-2 ring-white dark:ring-gray-900 ${
            !hayNoLeidas ? "hidden" : "block"
          }`}
        />
        <svg
          className="size-5 stroke-current fill-none"
          viewBox="0 0 24 24"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      </button>

      {/* Menú desplegable redondeado de Notificaciones */}
      <ShellDropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-16 sm:right-0 mt-3 flex w-[360px] sm:w-[415px] flex-col rounded-[26px] border border-gray-100/90 bg-white p-5 shadow-2xl dark:border-gray-800/80 dark:bg-gray-900 z-50 animate-entrada-menu font-sans"
      >
        {/* Cabecera del panel (Campana + Notificaciones + Botón cerrar X) */}
        <div className="flex items-center justify-between pb-3.5">
          <div className="flex items-center gap-2.5">
            <BellIcon className="size-5 stroke-[1.8] text-gray-800 dark:text-gray-100" />
            <h3 className="text-[17px] font-bold text-gray-900 dark:text-white tracking-tight">
              Notificaciones
            </h3>
          </div>
          <button
            type="button"
            onClick={closeDropdown}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
            aria-label="Cerrar notificaciones"
          >
            <XMarkIcon className="size-5 stroke-[1.8]" />
          </button>
        </div>

        {/* Lista de tarjetas de notificaciones */}
        {todasLasNotificaciones.length === 0 ? (
          <div className="py-10 text-center">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-orange-50 text-[#FF3F1A] dark:bg-white/5 dark:text-orange-400">
              <BellIcon className="size-6 stroke-[1.5]" />
            </div>
            <p className="text-[14px] font-semibold text-gray-800 dark:text-gray-200">
              Todo en orden
            </p>
            <p className="mt-1 text-[12px] text-gray-500 dark:text-gray-400">
              No tienes notificaciones pendientes.
            </p>
            {descartadas.size > 0 && (
              <button
                type="button"
                onClick={restablecerNotificaciones}
                className="mt-4 text-[12px] font-medium text-[#FF3F1A] hover:underline dark:text-orange-400 cursor-pointer"
              >
                Restablecer novedades de ejemplo
              </button>
            )}
          </div>
        ) : (
          <div className="flex max-h-[460px] flex-col space-y-3.5 overflow-y-auto pr-1 custom-scrollbar">
            {todasLasNotificaciones.map((item) => {
              const estaLeida = vistas.has(item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    marcarComoLeida(item.id);
                    if (item.ruta && item.banner !== "necto") ir(item.ruta);
                  }}
                  className="group relative rounded-[20px] bg-[#F0F6FE] border border-[#E2EEFC] p-4 sm:p-4.5 transition-all hover:border-blue-200/80 dark:bg-[#1A2234] dark:border-white/10 dark:hover:border-white/20"
                >
                  {/* Punto flotante rosa/magenta de notificación no leída en la esquina superior izquierda */}
                  {!estaLeida && (
                    <span
                      className="absolute -top-1 -left-1 size-2.5 rounded-full bg-[#E11D48] ring-2 ring-white dark:ring-gray-900 shadow-xs"
                      title="No leída"
                      aria-label="No leída"
                    />
                  )}

                  {/* Fila superior: Insignia de categoría + Fecha + Botón eliminar */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`rounded-full px-3 py-0.5 text-[11px] font-semibold tracking-wide ${
                        item.categoriaColor
                          ? `${item.categoriaColor.bg} ${item.categoriaColor.text}`
                          : "bg-[#FFF0ED] text-[#FF3F1A]"
                      }`}
                    >
                      {item.categoria}
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-gray-400 dark:text-gray-400 font-normal">
                        {item.fecha}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          eliminarNotificacion(item.id);
                        }}
                        className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 transition-colors p-0.5 rounded cursor-pointer"
                        title="Eliminar notificación"
                        aria-label="Eliminar notificación"
                      >
                        <TrashIcon className="size-4 stroke-[1.7]" />
                      </button>
                    </div>
                  </div>

                  {/* Título de la notificación */}
                  <h4 className="mt-2 text-[15px] font-bold text-gray-900 dark:text-white leading-snug">
                    {item.titulo}
                  </h4>

                  {/* Detalle / descripción */}
                  <p className="mt-1 text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed font-normal">
                    {item.detalle}
                  </p>

                  {/* Banner gráfico estilizado si la tarjeta lo requiere */}
                  {item.banner === "necto" && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        marcarComoLeida(item.id);
                        ir(item.ruta);
                      }}
                      className="cursor-pointer transition-transform active:scale-[0.99]"
                    >
                      <BannerAnuncioNecto />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pie de configuración */}
        <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
          <button
            type="button"
            onClick={() => ir("/inventarios/config?seccion=reorden")}
            className="w-full rounded-xl py-2 text-center text-[13px] font-semibold text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white cursor-pointer"
          >
            Configurar avisos
          </button>
        </div>
      </ShellDropdown>
    </div>
  );
});

export default NotificationDropdown;



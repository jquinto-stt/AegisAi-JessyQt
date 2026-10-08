import { useState, useRef, useEffect, useMemo } from "react";
import { CalenderIcon, ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from "@/icons";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES Y HELPERS DE FECHA
// ═══════════════════════════════════════════════════════════════════════════

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DIAS_SEMANA = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const parseYmd = (str?: string): Date | null => {
  if (!str) return null;
  const parts = str.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

/** Formatea YYYY-MM-DD como "DD/MM/AAAA" */
const formatoCorto = (str?: string): string => {
  if (!str) return "";
  const [y, m, d] = str.split("-");
  return `${d}/${m}/${y}`;
};

export interface PresetRango {
  id: string;
  label: string;
  hint?: string;
  getRango: () => { desde: string; hasta: string } | null;
}

export const PRESETS_DEFECTO: PresetRango[] = [
  {
    id: "7d",
    label: "Últimos 7 días",
    hint: "Última semana",
    getRango: () => {
      const hoy = new Date();
      const d = new Date();
      d.setDate(hoy.getDate() - 6);
      return { desde: ymd(d), hasta: ymd(hoy) };
    },
  },
  {
    id: "30d",
    label: "Últimos 30 días",
    hint: "Último mes",
    getRango: () => {
      const hoy = new Date();
      const d = new Date();
      d.setDate(hoy.getDate() - 29);
      return { desde: ymd(d), hasta: ymd(hoy) };
    },
  },
  {
    id: "mes",
    label: "Este mes",
    hint: "Mes en curso",
    getRango: () => {
      const hoy = new Date();
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      return { desde: ymd(inicio), hasta: ymd(hoy) };
    },
  },
  {
    id: "todo",
    label: "Todo el historial",
    hint: "Sin límite de fecha",
    getRango: () => null,
  },
];

export interface CalendarioRangoDropdownProps {
  desde?: string;
  hasta?: string;
  onChange: (desde: string, hasta: string) => void;
  onLimpiar?: () => void;
  etiquetaActiva?: string;
  alineacion?: "left" | "right";
  compacto?: boolean;
  presets?: PresetRango[];
  placeholder?: string;
}

export const CalendarioRangoDropdown = ({
  desde = "",
  hasta = "",
  onChange,
  onLimpiar,
  etiquetaActiva,
  alineacion = "left",
  compacto = false,
  presets = PRESETS_DEFECTO,
  placeholder = "Seleccionar fechas",
}: CalendarioRangoDropdownProps) => {
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  // Fechas en proceso de selección dentro del modal
  const [tempDesde, setTempDesde] = useState(desde);
  const [tempHasta, setTempHasta] = useState(hasta);
  const [hoverFecha, setHoverFecha] = useState<string | null>(null);

  // Mes y año del calendario mostrado
  const hoyStr = ymd(new Date());
  const refDate = parseYmd(hasta) || parseYmd(desde) || new Date();
  const [ano, setAno] = useState(refDate.getFullYear());
  const [mes, setMes] = useState(refDate.getMonth());

  // Sincronizar temp al abrir o cambiar props
  useEffect(() => {
    if (abierto) {
      setTempDesde(desde);
      setTempHasta(hasta);
      const target = parseYmd(hasta) || parseYmd(desde) || new Date();
      setAno(target.getFullYear());
      setMes(target.getMonth());
    }
  }, [abierto, desde, hasta]);

  // Cerrar al hacer click afuera o tecla Escape
  useEffect(() => {
    const handleClickAfuera = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };

    if (abierto) {
      document.addEventListener("mousedown", handleClickAfuera);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickAfuera);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [abierto]);

  // Cuadrícula del mes (Lunes = 0)
  const celdasMes = useMemo(() => {
    const primerDia = new Date(ano, mes, 1);
    const startOffset = (primerDia.getDay() + 6) % 7; // Lunes = 0
    const totalDias = new Date(ano, mes + 1, 0).getDate();

    const celdas: ({ dia: number; ymd: string } | null)[] = [];
    for (let i = 0; i < startOffset; i++) celdas.push(null);
    for (let d = 1; d <= totalDias; d++) {
      celdas.push({ dia: d, ymd: `${ano}-${pad(mes + 1)}-${pad(d)}` });
    }
    while (celdas.length % 7 !== 0) celdas.push(null);
    return celdas;
  }, [ano, mes]);

  const mesAnterior = () => {
    if (mes === 0) {
      setMes(11);
      setAno((y) => y - 1);
    } else {
      setMes((m) => m - 1);
    }
  };

  const mesSiguiente = () => {
    if (mes === 11) {
      setMes(0);
      setAno((y) => y + 1);
    } else {
      setMes((m) => m + 1);
    }
  };

  const manejarClickDia = (fechaStr: string) => {
    // Si no hay fecha de inicio o ya había un rango completo definido, arrancar nueva selección
    if (!tempDesde || (tempDesde && tempHasta)) {
      setTempDesde(fechaStr);
      setTempHasta("");
    } else {
      // Había tempDesde pero no tempHasta
      if (fechaStr < tempDesde) {
        setTempDesde(fechaStr);
        setTempHasta(tempDesde);
      } else {
        setTempHasta(fechaStr);
      }
    }
  };

  const aplicarPreset = (p: PresetRango) => {
    const res = p.getRango();
    if (!res) {
      setTempDesde("");
      setTempHasta("");
      onChange("", "");
      if (onLimpiar) onLimpiar();
      setAbierto(false);
      return;
    }
    setTempDesde(res.desde);
    setTempHasta(res.hasta);
    onChange(res.desde, res.hasta);
    setAbierto(false);
  };

  const aplicar = () => {
    if (tempDesde && !tempHasta) {
      // Si solo marcó una fecha, asumimos ese día puntual
      onChange(tempDesde, tempDesde);
    } else {
      onChange(tempDesde, tempHasta);
    }
    setAbierto(false);
  };

  const limpiar = () => {
    setTempDesde("");
    setTempHasta("");
    onChange("", "");
    if (onLimpiar) onLimpiar();
    setAbierto(false);
  };

  // Texto del disparador (Trigger)
  const textoTrigger = useMemo(() => {
    if (etiquetaActiva) return etiquetaActiva;
    if (desde && hasta) {
      return desde === hasta ? formatoCorto(desde) : `${formatoCorto(desde)} – ${formatoCorto(hasta)}`;
    }
    if (desde) return `Desde ${formatoCorto(desde)}`;
    if (hasta) return `Hasta ${formatoCorto(hasta)}`;
    return placeholder;
  }, [etiquetaActiva, desde, hasta, placeholder]);

  const hayFiltroActivo = Boolean(desde || hasta);

  return (
    <div ref={contenedorRef} className="relative inline-block text-left">
      {/* Botón Disparador */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className={
            compacto
              ? `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                  hayFiltroActivo
                    ? "bg-white dark:bg-gray-900 border-[#FF3F1A]/40 text-[#FF3F1A] dark:text-[#FF3F1A]"
                    : "bg-gray-50 dark:bg-gray-950 border-gray-200/80 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900"
                }`
              : `inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold shadow-theme-xs transition-colors cursor-pointer ${
                  hayFiltroActivo
                    ? "bg-white dark:bg-gray-900 border-gray-200/90 dark:border-gray-800 text-gray-900 dark:text-white"
                    : "bg-white dark:bg-gray-900 border-gray-200/90 dark:border-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`
          }
        >
          <CalenderIcon className={`w-3.5 h-3.5 shrink-0 ${hayFiltroActivo ? "text-[#FF3F1A]" : "text-gray-400"}`} />
          <span>{textoTrigger}</span>
          <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400 ml-0.5" />
        </button>

        {hayFiltroActivo && onLimpiar && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              limpiar();
            }}
            className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 text-xs cursor-pointer"
            title="Limpiar fechas"
          >
            ✕
          </button>
        )}
      </div>

      {/* Popover Desplegable */}
      {abierto && (
        <div
          className={`absolute top-full mt-2 z-50 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-2xl p-4 w-[330px] sm:w-[350px] animate-in fade-in zoom-in-95 duration-100 ${
            alineacion === "right" ? "right-0" : "left-0"
          }`}
        >
          {/* Fila de atajos / presets rápidos */}
          {presets.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pb-3 mb-3 border-b border-gray-100 dark:border-gray-800">
              {presets.map((p) => {
                const rng = p.getRango();
                const esActivo =
                  (!rng && !tempDesde && !tempHasta) ||
                  (rng && tempDesde === rng.desde && tempHasta === rng.hasta);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => aplicarPreset(p)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors cursor-pointer ${
                      esActivo
                        ? "bg-[#FF3F1A] text-white font-bold"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Navegación Mes y Año */}
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-bold text-gray-900 dark:text-white">
              {MESES[mes]} {ano}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={mesAnterior}
                className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 cursor-pointer"
                title="Mes anterior"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={mesSiguiente}
                className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 cursor-pointer"
                title="Mes siguiente"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {DIAS_SEMANA.map((d) => (
              <span key={d} className="text-[11px] font-bold text-gray-400 dark:text-gray-500">
                {d}
              </span>
            ))}
          </div>

          {/* Cuadrícula de días */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {celdasMes.map((c, i) => {
              if (!c) return <div key={`empty-${i}`} className="h-8 w-8" />;

              const fecha = c.ymd;
              const esHoy = fecha === hoyStr;
              const esInicio = fecha === tempDesde;
              const esFin = fecha === tempHasta;

              // Rango efectivo (considerando hover dinámico si hay tempDesde y no tempHasta)
              const finEfectivo = tempHasta || (tempDesde && hoverFecha && hoverFecha >= tempDesde ? hoverFecha : "");
              const enRango = tempDesde && finEfectivo && fecha >= tempDesde && fecha <= finEfectivo;

              return (
                <button
                  key={c.ymd}
                  type="button"
                  onClick={() => manejarClickDia(fecha)}
                  onMouseEnter={() => {
                    if (tempDesde && !tempHasta) setHoverFecha(fecha);
                  }}
                  className={`h-8 w-8 rounded-lg text-xs font-medium transition-all flex items-center justify-center cursor-pointer relative ${
                    esInicio || esFin
                      ? "bg-[#FF3F1A] text-white font-bold shadow-xs z-10"
                      : enRango
                      ? "bg-[#FF3F1A]/10 text-[#FF3F1A] dark:bg-[#FF3F1A]/20 dark:text-[#FF3F1A] font-semibold"
                      : esHoy
                      ? "border border-gray-300 dark:border-gray-700 font-bold text-gray-900 dark:text-white"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {c.dia}
                </button>
              );
            })}
          </div>

          {/* Resumen del rango y botones de acción */}
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
            <div className="text-[11px] text-gray-500 dark:text-gray-400">
              {tempDesde && tempHasta ? (
                <span>
                  {formatoCorto(tempDesde)} – {formatoCorto(tempHasta)}
                </span>
              ) : tempDesde ? (
                <span>Desde {formatoCorto(tempDesde)}</span>
              ) : (
                <span>Ningún rango seleccionado</span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {(tempDesde || tempHasta) && (
                <button
                  type="button"
                  onClick={limpiar}
                  className="px-2.5 py-1 text-[11px] font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
                >
                  Limpiar
                </button>
              )}
              <button
                type="button"
                onClick={aplicar}
                className="px-3 py-1 bg-[#FF3F1A] hover:bg-[#e03716] text-white font-bold text-[11px] rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

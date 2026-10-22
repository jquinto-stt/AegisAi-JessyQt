/**
 * Lenguaje visual del módulo Inventario.
 *
 * Identidad NECTO (ver `CLAUDE.md` en la raíz):
 *   · DM Sans en tres pesos: `font-light` (300), `font-normal` (400), `font-bold` (700).
 *   · Cinco tamaños: `text-title-md` (36), `text-theme-2xl` (24), `text-theme-md` (16),
 *     `text-theme-sm` (14), `text-theme-xs` (12).
 *   · Títulos en `text-ink-title` (#190088), texto en `text-ink-body` (#212121).
 *
 * Reglas de composición (pantallas de trabajo, no páginas de marketing):
 *   · El color va en los datos y en UNA acción por pantalla. El naranja de marca
 *     marca la acción principal, la pestaña activa y el dato que importa; el resto
 *     de la interfaz es tinta y grises.
 *   · Superficies planas: borde de 1px o un paso de tono, nunca sombra en reposo.
 *     La sombra queda para lo que flota (menús, panel lateral, diálogos).
 *   · Sin iconos en cuadros de color. Un indicador es una etiqueta y una cifra.
 *   · Títulos de pantalla a 24px; la cifra que responde la pregunta de la pantalla
 *     es la más grande.
 *   · Tablas: cabecera gris en minúscula inicial, sin banda de fondo; cifras a la
 *     derecha con dígitos tabulares; un solo distintivo de estado por fila.
 */
import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Mail, MessageCircle, Phone, Search, X } from "lucide-react";
import type {
  EstadoConteo,
  EstadoOrdenCompra,
  EstadoStock,
  TipoMovimiento,
} from "@/domain/inventario/inventario.domain";
import {
  ETIQUETA_ESTADO_CONTEO,
  ETIQUETA_ESTADO_OC,
  ETIQUETA_ESTADO_STOCK,
  ETIQUETA_TIPO_MOVIMIENTO,
} from "@/domain/inventario/inventario.domain";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

// ═══════════════════════════════════════════════════════════════════════════
// PÁGINA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fila de título de una pantalla. `resumen` es el hallazgo del día en una frase
 * («3 artículos agotados; 2 órdenes en camino»), no una explicación de la
 * interfaz. Las pestañas, si las hay, van justo debajo sobre una regla de 1px.
 */
export function PaginaInventario({
  titulo,
  resumen,
  acciones,
  pestanas,
  children,
}: {
  titulo: string;
  resumen?: React.ReactNode;
  acciones?: React.ReactNode;
  pestanas?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full font-sans text-theme-sm text-ink-body dark:text-gray-300">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-theme-2xl font-bold tracking-tight text-ink-title dark:text-white">{titulo}</h1>
          {resumen && <p className="mt-1 text-theme-sm text-gray-600 dark:text-gray-400">{resumen}</p>}
        </div>
        {acciones && <div className="flex shrink-0 flex-wrap items-center gap-2">{acciones}</div>}
      </header>
      {pestanas && <div className="mt-5">{pestanas}</div>}
      <div className={pestanas ? "mt-5 space-y-6" : "mt-6 space-y-6"}>{children}</div>
    </div>
  );
}

/** Bloque con borde de 1px y sin sombra. `titulo` en 16px; `accion` a la derecha (un enlace, un filtro). */
export function Tarjeta({
  titulo,
  detalle,
  accion,
  sinRelleno = false,
  className,
  children,
}: {
  titulo?: string;
  detalle?: React.ReactNode;
  accion?: React.ReactNode;
  sinRelleno?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cx("rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-white/[0.02]", className)}>
      {(titulo || accion) && (
        <div className="flex items-start justify-between gap-3 px-5 pt-4">
          <div className="min-w-0">
            {titulo && <h2 className="text-theme-md font-bold text-ink-title dark:text-white">{titulo}</h2>}
            {detalle && <p className="mt-0.5 text-theme-xs text-gray-600 dark:text-gray-400">{detalle}</p>}
          </div>
          {accion && <div className="shrink-0">{accion}</div>}
        </div>
      )}
      <div className={sinRelleno ? (titulo || accion ? "pt-3" : undefined) : "p-5 pt-3"}>{children}</div>
    </section>
  );
}

/** Enlace de texto de una tarjeta («Ver todo»). */
export function EnlaceTexto({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md text-theme-sm font-bold text-ink-title hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:text-white"
    >
      {children}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// INDICADORES
// ═══════════════════════════════════════════════════════════════════════════

export interface Indicador {
  etiqueta: string;
  valor: string;
  /** Una línea gris bajo la cifra: la base de comparación o el siguiente paso. */
  nota?: React.ReactNode;
  /** La cifra que responde la pregunta de la pantalla: más grande y en negrita. */
  principal?: boolean;
  /** Pinta la cifra en el color de alerta (solo si de verdad pide atención). */
  alerta?: boolean;
}

/**
 * Un solo contenedor dividido por líneas de 1px, etiqueta encima y cifra debajo.
 * En móvil pasa a dos columnas; si el número es impar, la última celda ocupa
 * toda la fila para no dejar media fila vacía.
 */
export function FranjaIndicadores({ items }: { items: Indicador[] }) {
  const impar = items.length % 2 === 1;
  return (
    <div
      className={cx(
        "grid grid-cols-2 overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10",
        items.length >= 4 ? "lg:grid-cols-4" : items.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2",
      )}
    >
      {items.map((it, i) => (
        <div
          key={it.etiqueta}
          className={cx(
            "border-gray-200 px-5 py-4 dark:border-white/10",
            // Divisores: en móvil cuadrícula de 2; en escritorio una sola fila.
            i % 2 === 1 ? "border-l" : "",
            i >= 2 ? "border-t lg:border-t-0" : "",
            i > 0 && i % 2 === 0 ? "lg:border-l" : "",
            impar && i === items.length - 1 ? "col-span-2 lg:col-span-1" : "",
          )}
        >
          <p className="text-theme-xs text-gray-600 dark:text-gray-400">{it.etiqueta}</p>
          <p
            className={cx(
              "mt-1 tabular-nums tracking-tight",
              it.principal ? "text-title-md font-bold leading-tight" : "text-theme-2xl font-normal",
              it.alerta ? "text-error-600 dark:text-error-400" : "text-ink-title dark:text-white",
            )}
          >
            {it.valor}
          </p>
          {it.nota && <p className="mt-1 text-theme-xs text-gray-600 dark:text-gray-400">{it.nota}</p>}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// NIVEL DE EXISTENCIAS — el elemento propio del módulo
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Una pista tan larga como el stock máximo y la parte llena hasta el stock
 * actual. Se lee de un vistazo si un artículo está sano, cerca de pedir o
 * vacío, sin pintar la fila entera.
 *
 *   · normal / exceso → relleno gris neutro (exceso: la pista llena entera);
 *     así solo lo que pide atención lleva color
 *   · bajo           → relleno naranja de marca
 *   · agotado        → pista vacía; el estado lo dice el texto de la fila
 *
 * La pista no lleva marcas superpuestas: el punto de reorden sigue en el texto
 * de la fila y en la etiqueta accesible, no como un indicador sobre la barra.
 */
export function NivelStock({
  stock,
  puntoReorden,
  stockMaximo,
  estado,
  ancho = "w-24",
}: {
  stock: number;
  puntoReorden: number;
  stockMaximo: number;
  estado: EstadoStock;
  ancho?: string;
}) {
  const escala = Math.max(stockMaximo, puntoReorden + 1, stock, 1);
  const lleno = Math.min(100, (stock / escala) * 100);
  const relleno =
    estado === "bajo" ? "bg-brand-500" : estado === "agotado" ? "bg-transparent" : "bg-gray-400 dark:bg-gray-500";
  return (
    <span
      className={cx("relative inline-block h-1.5 shrink-0 rounded-full bg-gray-200 dark:bg-white/10", ancho)}
      role="img"
      aria-label={`${stock} en existencia; punto de reorden ${puntoReorden}; máximo ${stockMaximo}`}
    >
      <span
        className={cx("absolute inset-0 origin-left rounded-full transition-transform duration-300 ease-out motion-reduce:transition-none", relleno)}
        style={{ transform: `scaleX(${lleno / 100})` }}
      />
    </span>
  );
}

/** Barra de avance (recepción de una orden, progreso de un conteo). La proporción es la real. */
export function BarraAvance({ valor, total, ancho = "w-24" }: { valor: number; total: number; ancho?: string }) {
  const pct = total > 0 ? Math.min(100, (valor / total) * 100) : 0;
  return (
    <span className={cx("relative inline-block h-1.5 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10", ancho)}>
      <span
        className="absolute inset-0 origin-left rounded-full bg-ink-title/80 transition-transform duration-300 ease-out motion-reduce:transition-none dark:bg-white/80"
        style={{ transform: `scaleX(${pct / 100})` }}
      />
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DISTINTIVOS DE ESTADO
// ═══════════════════════════════════════════════════════════════════════════

type TonoDistintivo = "neutro" | "exito" | "aviso" | "error" | "info";

const DISTINTIVO: Record<TonoDistintivo, string> = {
  neutro: "bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-300",
  exito: "bg-success-50 text-success-800 dark:bg-success-500/15 dark:text-success-300",
  aviso: "bg-warning-50 text-warning-800 dark:bg-warning-500/15 dark:text-warning-300",
  error: "bg-error-50 text-error-800 dark:bg-error-500/15 dark:text-error-300",
  info: "bg-accent-50 text-secondary-700 dark:bg-accent-300/15 dark:text-accent-200",
};

/** Tinte pálido con texto oscuro del mismo tono. Nunca se encoge. */
export function Distintivo({ tono, children }: { tono: TonoDistintivo; children: React.ReactNode }) {
  return (
    <span className={cx("inline-flex flex-none items-center whitespace-nowrap rounded-full px-2 py-0.5 text-theme-xs font-normal", DISTINTIVO[tono])}>
      {children}
    </span>
  );
}

const TONO_STOCK: Record<EstadoStock, TonoDistintivo> = { agotado: "error", bajo: "aviso", normal: "neutro", exceso: "info" };
export function DistintivoStock({ estado }: { estado: EstadoStock }) {
  return <Distintivo tono={TONO_STOCK[estado]}>{ETIQUETA_ESTADO_STOCK[estado]}</Distintivo>;
}

const TONO_OC: Record<EstadoOrdenCompra, TonoDistintivo> = { borrador: "neutro", enviada: "info", parcial: "aviso", recibida: "exito", cancelada: "neutro" };
export function DistintivoOrden({ estado }: { estado: EstadoOrdenCompra }) {
  return <Distintivo tono={TONO_OC[estado]}>{ETIQUETA_ESTADO_OC[estado]}</Distintivo>;
}

const TONO_CONTEO: Record<EstadoConteo, TonoDistintivo> = { en_progreso: "info", en_revision: "aviso", aplicado: "exito", anulado: "neutro" };
export function DistintivoConteo({ estado }: { estado: EstadoConteo }) {
  return <Distintivo tono={TONO_CONTEO[estado]}>{ETIQUETA_ESTADO_CONTEO[estado]}</Distintivo>;
}

/** Los cuatro tipos de movimiento con una descripción en lenguaje llano (menús y formulario). */
export const OPCIONES_MOVIMIENTO: { tipo: TipoMovimiento; etiqueta: string; descripcion: string }[] = [
  { tipo: "entrada", etiqueta: "Entrada", descripcion: "Llegó mercancía" },
  { tipo: "salida", etiqueta: "Salida", descripcion: "Sale mercancía de la bodega" },
  { tipo: "transferencia", etiqueta: "Transferencia", descripcion: "Mover entre ubicaciones" },
  { tipo: "ajuste", etiqueta: "Ajuste", descripcion: "Corregir una diferencia" },
];

/** El tipo de movimiento como texto, no como píldora: en una lista larga, veinte píldoras son ruido. */
export function TextoMovimiento({ tipo }: { tipo: TipoMovimiento }) {
  return <span className="text-gray-600 dark:text-gray-400">{ETIQUETA_TIPO_MOVIMIENTO[tipo]}</span>;
}

// ═══════════════════════════════════════════════════════════════════════════
// PESTAÑAS Y BARRA DE HERRAMIENTAS
// ═══════════════════════════════════════════════════════════════════════════

/** Pestañas agrupadas en píldoras con contador en badge suave, diseño unificado con Tablero y NECTO. */
export function Pestanas<T extends string>({
  opciones,
  valor,
  onCambio,
  className,
}: {
  opciones: { valor: T; etiqueta: string; cuenta?: number }[];
  valor: T;
  onCambio: (v: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cx(
        "flex w-fit max-w-full items-center gap-1.5 overflow-x-auto rounded-2xl border border-[#ECECEC] bg-[#ECECEC]/30 p-1.5 dark:border-white/10 dark:bg-white/[0.03] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-w-0 font-sans",
        className,
      )}
    >
      {opciones.map((o) => {
        const activa = o.valor === valor;
        return (
          <button
            key={o.valor}
            role="tab"
            aria-selected={activa}
            type="button"
            onClick={() => onCambio(o.valor)}
            className={cx(
              "flex items-center gap-2 rounded-xl px-3.5 py-2 text-[12px] sm:text-[14px] transition-all whitespace-nowrap shrink-0 cursor-pointer select-none",
              activa
                ? "bg-white text-[#212121] shadow-theme-xs dark:bg-white/10 dark:text-white font-bold"
                : "text-[#212121]/70 hover:text-[#212121] dark:text-[#ECECEC]/70 dark:hover:text-white font-normal",
            )}
          >
            <span className="whitespace-nowrap">{o.etiqueta}</span>
            {o.cuenta !== undefined && (
              <span
                className={cx(
                  "flex size-5.5 min-w-[22px] px-1.5 items-center justify-center rounded-full text-[12px] shrink-0 tabular-nums",
                  activa
                    ? "bg-[#97D6DF]/20 text-[#190088] dark:bg-[#97D6DF]/30 dark:text-[#97D6DF] font-bold"
                    : "bg-[#ECECEC] text-[#212121]/70 dark:bg-white/10 dark:text-white/80 font-normal",
                )}
              >
                {o.cuenta}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Búsqueda a la izquierda y filtros; `extremo` (el total, exportar) a la derecha. */
export function BarraHerramientas({ children, extremo }: { children: React.ReactNode; extremo?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">{children}</div>
      {extremo && <div className="flex items-center gap-3 text-theme-sm text-gray-600 dark:text-gray-400">{extremo}</div>}
    </div>
  );
}

export function Buscador({
  valor,
  onCambio,
  placeholder,
  className,
}: {
  valor: string;
  onCambio: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <label className={cx("relative block w-full sm:w-72", className)}>
      <span className="sr-only">{placeholder}</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
      <input
        type="search"
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        placeholder={placeholder}
        className={cx(CONTROL_FILTRO, "w-full pl-9 pr-3")}
      />
    </label>
  );
}

/** Select nativo de filtro, 36px. */
export function Filtro({
  valor,
  onCambio,
  opciones,
  etiqueta,
}: {
  valor: string;
  onCambio: (v: string) => void;
  opciones: { valor: string; etiqueta: string }[];
  etiqueta: string;
}) {
  return (
    <label className="relative block">
      <span className="sr-only">{etiqueta}</span>
      <select value={valor} onChange={(e) => onCambio(e.target.value)} className={cx(CONTROL_FILTRO, "w-full appearance-none pl-3 pr-9 sm:w-auto")}>
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.etiqueta}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
    </label>
  );
}

const CONTROL_FILTRO =
  "h-9 rounded-[10px] border border-gray-300 bg-white text-theme-sm text-ink-body placeholder:text-gray-500 " +
  "focus:border-ink-title focus:outline-none focus:ring-2 focus:ring-ink-title/10 " +
  "dark:border-white/15 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-white/40";

// ═══════════════════════════════════════════════════════════════════════════
// TABLAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Clases de tabla. La tabla va sobre la hoja, sin tarjeta alrededor. En móvil
 * (`< sm`) cada pantalla pinta su lista de dos líneas en lugar de la tabla.
 */
export const TABLA = {
  tabla: "w-full text-left text-theme-sm",
  th: "px-3 py-2.5 text-theme-xs font-normal text-gray-600 first:pl-0 last:pr-0 dark:text-gray-400",
  thNum: "px-3 py-2.5 text-right text-theme-xs font-normal text-gray-600 first:pl-0 last:pr-0 dark:text-gray-400",
  fila: "border-t border-gray-100 dark:border-white/5",
  filaClic:
    "cursor-pointer border-t border-gray-100 transition-colors hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none dark:border-white/5 dark:hover:bg-white/[0.03] dark:focus-visible:bg-white/[0.03]",
  td: "px-3 py-3 align-middle first:pl-0 last:pr-0",
  tdNum: "px-3 py-3 text-right align-middle tabular-nums first:pl-0 last:pr-0",
} as const;

/** Nombre del artículo con una línea gris debajo (SKU, proveedor…). */
export function CeldaDoble({ principal, secundaria }: { principal: React.ReactNode; secundaria?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-bold text-ink-body dark:text-white">{principal}</p>
      {secundaria && <p className="mt-0.5 truncate text-theme-xs text-gray-600 dark:text-gray-400">{secundaria}</p>}
    </div>
  );
}

/** Fila de lista para móvil: identidad y cifra clave arriba, campos secundarios en gris debajo. */
export function FilaMovil({
  titulo,
  cifra,
  detalle,
  onClick,
}: {
  titulo: React.ReactNode;
  cifra?: React.ReactNode;
  detalle?: React.ReactNode;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className="flex w-full items-start justify-between gap-3 border-t border-gray-100 py-3 text-left first:border-t-0 dark:border-white/5"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate font-bold text-ink-body dark:text-white">{titulo}</div>
        {detalle && <div className="mt-0.5 text-theme-xs text-gray-600 dark:text-gray-400">{detalle}</div>}
      </div>
      {cifra !== undefined && <div className="shrink-0 text-right tabular-nums">{cifra}</div>}
    </Tag>
  );
}

/** Bloque vacío: conserva el marco, una frase y, si hay, la acción para llenarlo. */
export function Vacio({ children, accion }: { children: React.ReactNode; accion?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-gray-300 px-4 py-4 text-theme-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between dark:border-white/15 dark:text-gray-400">
      <p>{children}</p>
      {accion}
    </div>
  );
}

/** Un guion gris para lo que falta; un cero se imprime como cero. */
export function Falta() {
  return <span className="text-gray-400 dark:text-gray-600">—</span>;
}

// ═══════════════════════════════════════════════════════════════════════════
// BOTONES Y MENÚS
// ═══════════════════════════════════════════════════════════════════════════

type VarianteBoton = "principal" | "secundario" | "texto" | "peligro";

const BOTON: Record<VarianteBoton, string> = {
  principal: "bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-500 dark:disabled:bg-white/10 dark:disabled:text-gray-500",
  secundario:
    "border border-gray-300 bg-white text-ink-body hover:bg-gray-50 active:bg-gray-100 disabled:text-gray-400 dark:border-white/15 dark:bg-transparent dark:text-white dark:hover:bg-white/5",
  texto: "text-ink-title hover:bg-gray-100 active:bg-gray-200 disabled:text-gray-400 dark:text-white dark:hover:bg-white/5",
  peligro: "border border-error-200 bg-white text-error-700 hover:bg-error-50 dark:border-error-500/30 dark:bg-transparent dark:text-error-400 dark:hover:bg-error-500/10",
};

/**
 * Botón del módulo: 36px, radio de 10px. Una sola variante `principal` por
 * pantalla; lo demás es secundario o texto.
 */
export function Boton({
  variante = "secundario",
  icono,
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: VarianteBoton; icono?: React.ReactNode }) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        // Al presionar baja a 0.97: confirma el toque sin llamar la atención.
        "presion-suave inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] px-3.5 text-theme-sm font-bold",
        "transition-[color,background-color,border-color,transform] duration-150 ease-out enabled:active:scale-[0.97]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed",
        BOTON[variante],
        className,
      )}
    >
      {icono}
      {children}
    </button>
  );
}

export interface OpcionMenu {
  etiqueta: string;
  descripcion?: string;
  onSelect: () => void;
}

/** Botón con menú desplegable. Cierra con Escape, con clic fuera y al elegir. */
export function MenuBoton({
  etiqueta,
  opciones,
  variante = "principal",
  icono,
  alinear = "derecha",
}: {
  etiqueta: string;
  opciones: OpcionMenu[];
  variante?: VarianteBoton;
  icono?: React.ReactNode;
  alinear?: "derecha" | "izquierda";
}) {
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);
  return (
    <div ref={raiz} className="relative">
      <Boton variante={variante} icono={icono} aria-haspopup="menu" aria-expanded={abierto} onClick={() => setAbierto((v) => !v)}>
        {etiqueta}
        <ChevronDown className="h-4 w-4" />
      </Boton>
      {abierto && (
        <div
          role="menu"
          className={cx(
            "absolute z-50 mt-1.5 w-72 animate-entrada-menu overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-theme-lg dark:border-white/10 dark:bg-gray-900",
            alinear === "derecha" ? "right-0 origin-top-right" : "left-0 origin-top-left",
          )}
        >
          {opciones.map((o) => (
            <button
              key={o.etiqueta}
              role="menuitem"
              type="button"
              onClick={() => {
                setAbierto(false);
                o.onSelect();
              }}
              className="block w-full px-4 py-2.5 text-left hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none dark:hover:bg-white/5"
            >
              <span className="block text-theme-sm font-bold text-ink-body dark:text-white">{o.etiqueta}</span>
              {o.descripcion && <span className="mt-0.5 block text-theme-xs text-gray-600 dark:text-gray-400">{o.descripcion}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PANEL LATERAL Y DIÁLOGO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mantiene montado un elemento mientras corre su animación de salida.
 * `montado` dice si se pinta; `saliendo`, si debe usar la clase de salida.
 */
export function useSalida(visible: boolean, ms: number) {
  const [montado, setMontado] = useState(visible);
  useEffect(() => {
    if (visible) {
      setMontado(true);
      return;
    }
    const t = setTimeout(() => setMontado(false), ms);
    return () => clearTimeout(t);
  }, [visible, ms]);
  return { montado: visible || montado, saliendo: !visible && montado };
}

/**
 * El último valor no vacío. Un panel de detalle lo usa para seguir mostrando su
 * contenido mientras sale, cuando la página ya dejó de pasarle el objeto.
 */
export function useUltimo<T>(valor: T | null | undefined): { valor: T | null; abierto: boolean } {
  const [ultimo, setUltimo] = useState<T | null>(valor ?? null);
  useEffect(() => {
    if (valor) setUltimo(valor);
  }, [valor]);
  return { valor: valor ?? ultimo, abierto: Boolean(valor) };
}

function useBloqueoScroll(activo: boolean, onCerrar: () => void) {
  useEffect(() => {
    if (!activo) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    document.addEventListener("keydown", tecla);
    return () => {
      document.body.style.overflow = previo;
      document.removeEventListener("keydown", tecla);
    };
  }, [activo, onCerrar]);
}

/**
 * Panel que entra por la derecha: detalle de un objeto o un formulario. La lista
 * queda visible detrás, así el usuario no pierde dónde estaba. En móvil ocupa
 * toda la pantalla.
 */
export function PanelLateral({
  abierto,
  onCerrar,
  titulo,
  subtitulo,
  pie,
  ancho = "sm:max-w-xl",
  children,
}: {
  abierto: boolean;
  onCerrar: () => void;
  titulo: React.ReactNode;
  subtitulo?: React.ReactNode;
  pie?: React.ReactNode;
  ancho?: string;
  children: React.ReactNode;
}) {
  const id = useId();
  useBloqueoScroll(abierto, onCerrar);
  const { montado, saliendo } = useSalida(abierto, 200);
  if (!montado) return null;
  return createPortal(
    <div className={cx("fixed inset-0 z-[99999] flex justify-end font-sans", saliendo && "pointer-events-none")}>
      <div
        className={cx("absolute inset-0 bg-gray-950/30", saliendo ? "animate-salida-aparecer" : "animate-aparecer")}
        onClick={onCerrar}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className={cx(
          "relative flex h-full w-full flex-col bg-white shadow-theme-xl dark:bg-gray-900",
          saliendo ? "animate-salida-cajon" : "animate-entrada-cajon",
          ancho,
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5 dark:border-white/10">
          <div className="min-w-0">
            <h2 id={id} className="text-theme-2xl font-bold tracking-tight text-ink-title dark:text-white">{titulo}</h2>
            {subtitulo && <div className="mt-1 text-theme-sm text-gray-600 dark:text-gray-400">{subtitulo}</div>}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="-mr-2 rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-ink-body dark:hover:bg-white/5 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5 text-theme-sm text-ink-body dark:text-gray-300">{children}</div>
        {pie && (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 px-6 py-4 dark:border-white/10">{pie}</footer>
        )}
      </aside>
    </div>,
    document.body,
  );
}

/** Confirmación corta que nombra el objeto y la consecuencia. */
export function Confirmar({
  abierto,
  titulo,
  children,
  textoConfirmar,
  peligro = false,
  onConfirmar,
  onCancelar,
}: {
  abierto: boolean;
  titulo: string;
  children?: React.ReactNode;
  textoConfirmar: string;
  peligro?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  const id = useId();
  useBloqueoScroll(abierto, onCancelar);
  if (!abierto) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 font-sans">
      <div className="absolute inset-0 animate-aparecer bg-gray-950/40" onClick={onCancelar} aria-hidden />
      <div role="alertdialog" aria-modal="true" aria-labelledby={id} className="relative w-full max-w-md animate-entrada-panel rounded-2xl bg-white p-6 shadow-theme-xl dark:bg-gray-900">
        <h2 id={id} className="text-theme-md font-bold text-ink-title dark:text-white">{titulo}</h2>
        {children && <div className="mt-2 text-theme-sm text-gray-600 dark:text-gray-400">{children}</div>}
        <div className="mt-6 flex justify-end gap-2">
          <Boton variante="texto" onClick={onCancelar}>
            Cancelar
          </Boton>
          <Boton variante={peligro ? "peligro" : "principal"} onClick={onConfirmar} autoFocus>
            {textoConfirmar}
          </Boton>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FORMULARIOS
// ═══════════════════════════════════════════════════════════════════════════

/** Clase común de `<input>`, `<select>` y `<textarea>` de formulario: 40px, radio 10. */
export const CONTROL =
  "h-10 w-full rounded-[10px] border border-gray-200 bg-white px-3 text-theme-sm text-ink-body " +
  "placeholder:text-gray-500 focus:border-ink-title focus:outline-none focus:ring-2 focus:ring-ink-title/10 " +
  "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 " +
  "dark:border-white/15 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-white/40";

export function Campo({
  etiqueta,
  ayuda,
  error,
  className,
  children,
}: {
  etiqueta: string;
  ayuda?: React.ReactNode;
  error?: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-2 block text-theme-sm font-bold text-ink-body dark:text-gray-200">{etiqueta}</span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-theme-xs text-error-700 dark:text-error-400">{error}</span>
      ) : (
        ayuda && <span className="mt-1.5 block text-theme-xs text-gray-600 dark:text-gray-400">{ayuda}</span>
      )}
    </label>
  );
}

export function MensajeError({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-xl bg-error-50 px-3.5 py-2.5 text-theme-sm text-error-800 dark:bg-error-500/15 dark:text-error-300">
      {children}
    </p>
  );
}

/**
 * Interruptor accesible. Encendido en tinta de título (no en naranja: el
 * naranja queda para la acción principal de la pantalla).
 */
export function Interruptor({
  activo,
  onCambio,
  etiqueta,
  disabled,
}: {
  activo: boolean;
  onCambio: (v: boolean) => void;
  etiqueta: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={etiqueta}
      disabled={disabled}
      onClick={() => onCambio(!activo)}
      className={cx(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
        activo ? "bg-ink-title dark:bg-accent-300" : "bg-gray-300 dark:bg-white/20",
      )}
    >
      <span className={cx("inline-block h-4 w-4 rounded-full bg-white transition-transform", activo ? "translate-x-[18px]" : "translate-x-0.5")} />
    </button>
  );
}

/**
 * Elección entre pocas opciones con descripción (tipo de movimiento, método de
 * valoración). Más clara que un select cuando cada opción necesita explicarse.
 */
export function OpcionesTarjeta<T extends string>({
  valor,
  opciones,
  onCambio,
  columnas = 2,
}: {
  valor: T;
  opciones: { valor: T; etiqueta: string; descripcion?: string }[];
  onCambio: (v: T) => void;
  columnas?: 2 | 3 | 4;
}) {
  return (
    <div role="radiogroup" className={cx("grid gap-2", columnas === 4 ? "grid-cols-2 sm:grid-cols-4" : columnas === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
      {opciones.map((o) => {
        const activa = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={activa}
            onClick={() => onCambio(o.valor)}
            className={cx(
              "rounded-xl border px-3.5 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
              activa
                ? "border-ink-title bg-ink-title/[0.03] ring-1 ring-ink-title dark:border-white dark:bg-white/5 dark:ring-white"
                : "border-gray-200 hover:border-gray-300 dark:border-white/10 dark:hover:border-white/20",
            )}
          >
            <span className="block text-theme-sm font-bold text-ink-body dark:text-white">{o.etiqueta}</span>
            {o.descripcion && <span className="mt-0.5 block text-theme-xs text-gray-600 dark:text-gray-400">{o.descripcion}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Lista de pares etiqueta / valor para un panel de detalle. */
export function ListaDatos({ items }: { items: { etiqueta: string; valor: React.ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
      {items.map((it) => (
        <div key={it.etiqueta} className="min-w-0">
          <dt className="text-theme-xs text-gray-600 dark:text-gray-400">{it.etiqueta}</dt>
          <dd className="mt-0.5 truncate text-ink-body dark:text-white">{it.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Cómo comunicarse con un proveedor: tres acciones directas (llamar, WhatsApp,
 * correo) en lugar de datos sueltos que hay que copiar. Solo aparecen las que
 * tienen dato.
 */
export function ContactoProveedor({
  proveedor,
  mensaje,
}: {
  proveedor: { nombre: string; contacto: string; telefono: string; email: string };
  /** Texto prellenado para WhatsApp y el asunto del correo («Sobre OC-0002»). */
  mensaje?: string;
}) {
  const p = proveedor;
  const digitos = p.telefono.replace(/\D/g, "");
  const acciones = [
    digitos && { etiqueta: "Llamar", href: `tel:+${digitos}`, Icono: Phone },
    digitos && {
      etiqueta: "WhatsApp",
      href: `https://wa.me/${digitos}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ""}`,
      Icono: MessageCircle,
    },
    p.email && {
      etiqueta: "Correo",
      href: `mailto:${p.email}${mensaje ? `?subject=${encodeURIComponent(mensaje)}` : ""}`,
      Icono: Mail,
    },
  ].filter(Boolean) as { etiqueta: string; href: string; Icono: React.FC<{ className?: string }> }[];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-transparent">
      <div className="min-w-0">
        <p className="truncate font-bold text-ink-body dark:text-white">{p.contacto || p.nombre}</p>
        <p className="text-theme-xs text-gray-600 dark:text-gray-400">
          {[p.contacto ? p.nombre : null, p.telefono, p.email].filter(Boolean).join(" · ")}
        </p>
      </div>
      {acciones.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {acciones.map(({ etiqueta, href, Icono }) => (
            <a
              key={etiqueta}
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel={href.startsWith("http") ? "noreferrer" : undefined}
              className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-gray-300 px-3 text-theme-sm font-bold text-ink-body transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:border-white/15 dark:text-white dark:hover:bg-white/5"
            >
              <Icono className="h-4 w-4" />
              {etiqueta}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/** Subtítulo de sección dentro de un panel lateral. */
export function Subtitulo({ children, accion }: { children: React.ReactNode; accion?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <h3 className="text-theme-md font-bold text-ink-title dark:text-white">{children}</h3>
      {accion}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// AVISOS
// ═══════════════════════════════════════════════════════════════════════════

/** Confirmación breve tras una acción. Se borra a los 4 s; una acción nueva reinicia el reloj. */
export function useAviso() {
  const [aviso, setAviso] = useState<string | null>(null);
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mostrar = useCallback((texto: string) => {
    setAviso(texto);
    if (reloj.current) clearTimeout(reloj.current);
    reloj.current = setTimeout(() => setAviso(null), 4000);
  }, []);
  useEffect(
    () => () => {
      if (reloj.current) clearTimeout(reloj.current);
    },
    [],
  );
  return { aviso, mostrar };
}

export function Aviso({ texto }: { texto: string | null }) {
  // El último texto se conserva para que el aviso salga con su contenido.
  const [ultimo, setUltimo] = useState(texto);
  useEffect(() => {
    if (texto) setUltimo(texto);
  }, [texto]);
  const { montado, saliendo } = useSalida(Boolean(texto), 200);
  if (!montado) return null;
  // El centrado va en un contenedor aparte: la animación usa `transform` y
  // pisaría el `-translate-x-1/2`.
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[100001] flex justify-center px-4">
      <div
        role="status"
        className={cx(
          "max-w-full rounded-xl bg-gray-900 px-4 py-3 font-sans text-theme-sm text-white shadow-theme-lg dark:bg-white dark:text-gray-900",
          saliendo ? "animate-salida-aviso" : "animate-entrada-aviso",
        )}
      >
        {texto ?? ultimo}
      </div>
    </div>,
    document.body,
  );
}

import { useId, useState, type ReactNode } from "react";

import { Card } from "@/elements/ui/card";
import { Label } from "@/elements/form/label";
import { ArrowRightIcon, CheckLineIcon, ChevronLeftIcon, MagnifyingGlassIcon as SearchIcon } from "@/icons";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { cn } from "@/utils";

// ═══════════════════════════════════════════════════════════════════════════
// LAYOUT UNIFICADO DE CONFIGURACIÓN — patrón TailAdmin
// ═══════════════════════════════════════════════════════════════════════════
//
// Las tres pantallas de configuración del proyecto (`/pedidos/config`,
// `/conversaciones/config`, `/asistente/config`) se construyen con las MISMAS
// piezas de aquí. Antes cada archivo redeclaraba su propio `Label2`,
// `CardHead`, `Segmentado` y su constante `filaBase`, y habían divergido: el
// mismo ajuste se veía distinto según la pantalla.
//
// REGLA: una primitiva de layout se declara AQUÍ una sola vez. Las páginas
// componen; no redefinen la fila etiqueta/control ni el encabezado de tarjeta.
//
// Cada componente delega el contenedor en `@/elements/*` (Card, Label, Switch,
// Button). Lo que se declara aquí son las COMPOSICIONES que el catálogo no
// expresa: la fila etiqueta+control, el control segmentado y la cabecera de
// página. No se inventan etiquetas HTML desnudas donde ya existe el elemento.

// ═══════════════════════════════════════════════════════════════════════════
// TOKENS DE CLASE COMPARTIDOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fila etiqueta-izquierda / control-derecha. Es el patrón de TODA tarjeta de
 * configuración: separador inferior salvo en la última fila, y sin margen
 * superior en la primera para que no se sume al del encabezado de la tarjeta.
 *
 * Móvil: apila (la etiqueta pierde el `pr-3` porque no hay control al lado).
 * Desde `sm`: fila con la etiqueta a la izquierda y el control a la derecha.
 */
export const claseFila = cn(
  "flex flex-col gap-3 border-b border-gray-100 py-3.5 last:border-b-0 last:pb-0 first:pt-0",
  "sm:flex-row sm:items-center sm:justify-between sm:gap-6",
  "dark:border-gray-800/80",
);

// ═══════════════════════════════════════════════════════════════════════════
// CABECERA DE PÁGINA
// ═══════════════════════════════════════════════════════════════════════════

export interface ConfigHeaderProps {
  /** Título de la pantalla. */
  titulo: string;
  /** Subtítulo descriptivo, una línea. */
  descripcion: string;
  /** Acciones alineadas a la derecha (badges de estado, botón de guardado…). */
  acciones?: ReactNode;
}

/**
 * Icono admitido por las cabeceras de tarjeta.
 *
 * Se declara como tipo propio en vez de `ReactNode` porque las páginas resuelven
 * su icono desde un `Record<Clave, React.FC<...>>` (ver `ICONO_SECCION` en
 * `/asistente/config`), y `ReactNode` aceptaría un `string`, que ahí no lo es.
 */
export type IconoConfig = React.FC<React.SVGProps<SVGSVGElement>>;

export interface ConfigCardProps {
  /** Icono representativo de la tarjeta. Es el ancla de escaneo. */
  icono: IconoConfig;
  /**
   * Título de la tarjeta. Debe leerse como la PREGUNTA que resuelve el bloque
   * («¿Cómo se llama tu negocio?»), no como un sustantivo administrativo
   * («Identidad»): quien entra por primera vez no sabe qué hay dentro de
   * «Identidad», y sí sabe qué responder a la primera.
   */
  titulo: string;
  /** Una línea que explica qué se decide aquí. Obligatoria: una tarjeta sin ella obliga a adivinar. */
  descripcion: string;
  /** Filas de la tarjeta. */
  children: ReactNode;
  /**
   * La tarjeta es la acción destacada de la sección: el cuadro del icono se
   * pinta con el naranja de marca.
   *
   * Se reserva para UNA tarjeta por pantalla como máximo — el patrón de la
   * referencia de diseño. Dos acentos en la misma vista no destacan nada.
   */
  acento?: boolean;
  /** Acciones de la tarjeta, alineadas a la derecha bajo las filas. */
  acciones?: ReactNode;
}

/**
 * ConfigCard — tarjeta de configuración con icono representativo.
 *
 * ── Qué problema resuelve ──────────────────────────────────────────────────
 *
 * Antes la cabecera de cada bloque era un `<CardHead>` de una línea
 * (`text-sm font-semibold`) seguido de un párrafo gris. Veinte bloques
 * idénticos sin ancla visual: el ojo no distingue dónde acaba uno y empieza el
 * siguiente, y volver a un bloque concreto obliga a leerlos todos.
 *
 * El cuadro del icono es esa ancla. Se reconoce el bloque ANTES de leerlo, que
 * es lo que hace una pantalla manejable para alguien que no la conoce.
 *
 * ── Por qué el icono va AQUÍ y no en cada fila ─────────────────────────────
 *
 * Un icono por fila convierte la tarjeta en un semáforo: seis iconos que no
 * significan nada distinto entre sí compiten con el texto en vez de guiarlo.
 * El icono marca el BLOQUE; dentro, la jerarquía la da el título de la fila.
 *
 * ── Lo que NO hace ─────────────────────────────────────────────────────────
 *
 * No anida tarjetas. El cuerpo es una lista de filas, no un contenedor con
 * borde propio: una tarjeta dentro de otra duplica el marco y lee como error de
 * maquetación, no como jerarquía.
 */
export function ConfigCard({
  icono: Icono,
  titulo,
  descripcion,
  children,
  acento,
  acciones,
}: ConfigCardProps) {
  return (
    <Card>
      <div className="flex items-start gap-3.5">
        {/* Cuadro del icono. Es la copia literal del que ya usan las tarjetas de
            `/equipo` (`SubIntegrationCard`), extraída a un solo sitio: si el
            tono cambia, cambia en las dos pantallas a la vez. */}
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            acento
              ? "bg-brand-500 text-white"
              : "bg-secondary-50 text-secondary-600 dark:bg-brand-500/10 dark:text-brand-400",
          )}
          aria-hidden="true"
        >
          <Icono className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-ink-title dark:text-white">{titulo}</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{descripcion}</p>
        </div>
      </div>

      <div className="mt-4">{children}</div>

      {acciones && <div className="mt-4">{acciones}</div>}
    </Card>
  );
}

/**
 * ConfigHeader — cabecera unificada de las pantallas de configuración.
 *
 * Título `text-xl font-bold` y subtítulo `text-xs`, el patrón de TailAdmin,
 * idéntico en las tres pantallas. El borde inferior separa la cabecera del
 * contenido sin meterla dentro de una tarjeta (no es una sección ajustable,
 * es el encabezado de la página).
 */
export function ConfigHeader({ titulo, descripcion, acciones }: ConfigHeaderProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-[#ECECEC] pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
      <div className="min-w-0">
        <h1 className="text-[24px] font-bold leading-8 tracking-tight text-[#190088] dark:text-white">{titulo}</h1>
        <p className="mt-1 max-w-2xl text-[14px] font-normal text-gray-600 dark:text-gray-400">{descripcion}</p>
      </div>

      {acciones && (
        <div className="flex w-full flex-wrap items-center gap-2.5 self-start sm:w-auto sm:self-auto">
          {acciones}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ENCABEZADO DE TARJETA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * CardHead — título del bloque dentro de una tarjeta.
 *
 * Se usa junto a un párrafo descriptivo de `text-xs text-gray-500`. La
 * separación título/descripción/controles la da el contenedor de la tarjeta,
 * no este componente.
 */
export function CardHead({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-[16px] font-bold text-[#190088] dark:text-white">{children}</h2>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ETIQUETA CON DESCRIPCIÓN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Label2 — etiqueta con descripción secundaria, a la izquierda de una fila.
 *
 * La descripción explica QUÉ es el valor o qué hace el control; no lo repite.
 * Se apoya en `<Label>` del catálogo para la tipografía (`text-sm font-medium`)
 * y desactiva su `mb-1.5` porque aquí el espaciado lo gobierna la fila.
 */
export function Label2({
  titulo,
  descripcion,
  htmlFor,
}: {
  titulo: string;
  descripcion?: string;
  htmlFor?: string;
}) {
  return (
    <div className="min-w-0">
      <Label htmlFor={htmlFor} className="mb-0 text-[14px] font-bold text-[#212121] dark:text-white">
        {titulo}
      </Label>
      {descripcion && (
        <p className="mt-0.5 max-w-md text-[12px] font-normal text-gray-500 dark:text-gray-400">
          {descripcion}
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FILA DE CONTROL (Switch / ajuste booleano)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ToggleRow — fila estándar nombre+explicación a la izquierda, control a la
 * derecha. Es el patrón de TailAdmin para opciones booleanas.
 *
 * No monta un `<Switch>` por sí misma: recibe el control ya construido, para
 * que la MISMA fila sirva a un `<Switch>`, un `<Badge>` o un `<Input>`
 * pequeño. Así el espaciado y los separadores no se duplican por control.
 */
export function ToggleRow({
  titulo,
  descripcion,
  control,
  htmlFor,
}: {
  titulo: string;
  descripcion?: string;
  control: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className={claseFila}>
      <Label2 titulo={titulo} descripcion={descripcion} htmlFor={htmlFor} />
      <div className="shrink-0">{control}</div>
    </div>
  );
}

/** Alias semántico: una fila genérica etiqueta/control es lo que usa el resto. */
export const FilaControl = ToggleRow;

// ═══════════════════════════════════════════════════════════════════════════
// CONTROL SEGMENTADO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Pista (track) del control segmentado: la pastilla gris que agrupa las
 * opciones. Se exporta porque el conmutador «Chat en vivo / Historial» de
 * `/conversaciones` monta el mismo control y antes redeclaraba esta cadena a
 * mano — con `dark:bg-gray-900`, que sobre el `.necto-panel` (tambien
 * `dark:bg-gray-900`) dejaba la pista INVISIBLE en modo oscuro.
 */
export const claseSegmentoTrack =
  "inline-flex rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800";

// ── La opcion ACTIVA va en el NARANJA de marca ────────────────────────────
//
// Estaba en blanco (`bg-white text-gray-900`). Sobre la pista gris el activo
// se leia como «un hueco», no como «el elegido». Y era incoherente con el
// resto del producto, que YA marca la seleccion en naranja:
//
//   · `elements/SegmentedControl` (`tone="accent"`, su valor por DEFECTO)
//     → `bg-brand-500 text-white`.
//   · las pildoras de filtro y la paginacion de `HistorialAtencionPage`
//     → `bg-brand-500 text-white`.
//
// Se adopta ese MISMO relleno, no una variante nueva: un estado activo se
// pinta igual en toda la app o deja de ser un lenguaje.
//
// Deuda anotada, no escondida: blanco sobre `brand-500` (`#ff3f1a`) mide
// 3,6:1, por debajo de AA (4,5:1) para una etiqueta de 12 px. Es el mismo par
// que ya usaban esos dos sitios, asi que unificar no empeora nada; si se
// quiere AA, el paso es `bg-brand-500` (5,9:1) en los TRES sitios a la vez.
export const claseSegmentoActivo = "bg-brand-500 text-white shadow-theme-xs";

/** Opcion no elegida: tinta secundaria, sin relleno. */
export const claseSegmentoInactivo =
  "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200";

export interface OpcionSegmentada<T extends string> {
  value: T;
  label: string;
}

/**
 * Segmentado — selección exclusiva entre opciones visibles.
 *
 * No es `Select` (el del catálogo es no controlado y esconde las opciones tras
 * un desplegable) ni `ButtonsGroup` (fija un `min-w-[393px]` que rompería el
 * ancho de la tarjeta). Se compone con el patrón de píldora del proyecto y
 * `aria-pressed` para que la selección sea anunciable.
 */
export function Segmentado<T extends string>({
  opciones,
  valor,
  onChange,
  disabled,
  ariaLabel,
  tamaño = "sm",
}: {
  opciones: OpcionSegmentada<T>[];
  valor: T;
  onChange: (v: T) => void;
  disabled?: boolean;
  ariaLabel: string;
  tamaño?: "sm" | "md";
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={claseSegmentoTrack}
    >
      {opciones.map((o) => {
        const activo = o.value === valor;
        return (
          <button
            key={o.value}
            type="button"
            disabled={disabled}
            aria-pressed={activo}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-md font-medium transition-colors",
              tamaño === "sm" ? "px-3 py-1.5 text-xs" : "px-3.5 py-1.5 text-sm",
              activo ? claseSegmentoActivo : claseSegmentoInactivo,
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * SegmentedRow — variante de fila para un control segmentado.
 *
 * En móvil el control baja a su propia línea alineado a la izquierda; desde
 * `sm` se alinea a la derecha con la etiqueta. Se distingue de `ToggleRow`
 * solo en la alineación del control, no en el estilo de la fila.
 */
export function SegmentedRow({
  titulo,
  descripcion,
  control,
}: {
  titulo: string;
  descripcion?: string;
  control: ReactNode;
}) {
  return (
    <div className={claseFila}>
      <Label2 titulo={titulo} descripcion={descripcion} />
      <div className="shrink-0 self-start sm:self-auto">{control}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// REJILLA DE OPCIONES CON ICONO
// ═══════════════════════════════════════════════════════════════════════════

export interface OpcionConIcono<T extends string> {
  value: T;
  label: string;
  icono: IconoConfig;
}

/**
 * RejillaOpciones — elegir UNA opción entre varias visibles, con icono.
 *
 * ── Por qué no es `Segmentado` ────────────────────────────────────────────
 *
 * `Segmentado` es una pista de píldoras en una sola línea. Sirve para dos o
 * tres etiquetas cortas («Retiro / Domicilio»). Con OCHO rubros de nombre largo
 * la píldora o se desborda o se corta, y el usuario acaba leyendo una fila de
 * texto sin poder comparar. Aquí cada opción es una ficha: icono arriba,
 * etiqueta debajo, y todas a la vista. La diferencia es de forma, no de
 * semántica — ambas son selección exclusiva y las dos marcan el activo igual.
 *
 * ── El color de la elegida: naranja de marca, NO verde (06/10) ────────────
 *
 * El borrador pidió el verde `#17b363` literal (era el de la referencia
 * visual). No se puede usar: en `theme.css` ese hex solo existe como
 * `--color-legal-500`, declarado para las páginas legales — no es un color de
 * la paleta de producto. La regla del proyecto es que el verde no aparece en
 * la app, y el arnés lo comprueba.
 *
 * El paso que se usa es `brand-500` (`#ff3f1a`), el MISMO con el que el resto
 * del producto marca «elegido»: el borde de la ficha, el fondo tenue y el
 * círculo. El check se conserva.
 *
 * ── Por qué el relleno del cuadro del icono NO va en naranja ──────────────
 *
 * La primera versión pintaba el cuadro del icono en naranja relleno con la
 * tinta en blanco. Se quitó por dos razones medibles:
 *
 *  1. **El naranja dejaba de significar «elegido».** Con el icono de las fichas
 *     inactivas ya en `brand-400` sobre `brand-500/10` en oscuro, TODAS las
 *     fichas tenían naranja y el color no distinguía ninguna. En claro no
 *     pasaba porque el inactivo iba en azul — o sea que la señal de selección
 *     dependía del tema, que es justo lo que no puede ser.
 *  2. **Blanco sobre `#ff3f1a` mide 3,6:1**, por debajo de 4,5:1. El check es
 *     la señal que no depende del color; el relleno solo añadía un texto por
 *     debajo del umbral. (Aquí se pinta el check en `brand-500` sobre blanco,
 *     no texto blanco sobre naranja: eso sí pasa.)
 */
export function RejillaOpciones<T extends string>({
  opciones,
  valor,
  onChange,
  disabled,
  ariaLabel,
  columnas = "sm:grid-cols-4",
}: {
  opciones: OpcionConIcono<T>[];
  valor: T;
  onChange: (v: T) => void;
  disabled?: boolean;
  ariaLabel: string;
  /** Clases de `grid-cols` desde `sm`. Por defecto 4 por fila. */
  columnas?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("grid grid-cols-2 gap-3 sm:gap-4", columnas)}
    >
      {opciones.map((o) => {
        const activo = o.value === valor;
        const Icono = o.icono;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={activo}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              "group relative flex cursor-pointer flex-col items-center justify-between min-h-[114px] sm:min-h-[128px] rounded-2xl p-4 sm:p-5 text-center transition-all duration-200 ease-out select-none",
              activo
                ? "border-2 border-brand-500 bg-brand-500/[0.04] shadow-theme-xs dark:border-brand-500 dark:bg-brand-500/10"
                : "border border-gray-200/90 bg-white hover:border-gray-300 hover:bg-gray-50/70 hover:-translate-y-0.5 hover:shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.02] dark:hover:border-gray-700 dark:hover:bg-white/[0.05]",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            {/* Contenedor central: icono o círculo con checkmark estilo TurboTax */}
            <div className="flex h-11 w-11 items-center justify-center mb-2.5">
              {activo ? (
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-brand-500 bg-white text-brand-500 shadow-theme-xs dark:border-brand-500 dark:bg-gray-900 transition-transform duration-200 scale-105"
                  aria-hidden="true"
                >
                  <CheckLineIcon className="h-5 w-5 stroke-[2.5]" />
                </span>
              ) : (
                <span
                  className="flex h-10 w-10 items-center justify-center text-gray-500 transition-all duration-200 group-hover:text-gray-800 group-hover:scale-110 dark:text-gray-400 dark:group-hover:text-gray-200"
                  aria-hidden="true"
                >
                  <Icono className="h-6 w-6 stroke-[1.75]" />
                </span>
              )}
            </div>

            <span
              className={cn(
                "text-xs sm:text-sm leading-snug transition-colors",
                activo
                  ? "font-semibold text-gray-900 dark:text-white"
                  : "font-medium text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200",
              )}
            >
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOQUE DE CONFIGURACIÓN — el título manda
// ═══════════════════════════════════════════════════════════════════════════

export interface BloqueConfigProps {
  /** Icono del bloque. Va sobre el título, no a su lado. */
  icono: IconoConfig;
  /**
   * La pregunta que resuelve el bloque. Es el elemento DOMINANTE: se lee
   * `text-theme-2xl` (24 px), no los 16 px de una etiqueta de campo.
   */
  pregunta: string;
  /** Una línea que explica qué se decide aquí. */
  descripcion: string;
  /** Contenido del bloque, a ancho completo. */
  children: ReactNode;
}

/**
 * BloqueConfig — la unidad de agrupación de una pantalla de configuración.
 * Tarjeta espaciosa con bordes suaves y jerarquía tipográfica limpia.
 */
export function BloqueConfig({
  icono: Icono,
  pregunta,
  descripcion,
  children,
}: BloqueConfigProps) {
  return (
    <Card className="rounded-3xl border border-[#ECECEC] bg-white p-6 sm:p-8 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start gap-4">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#97D6DF]/20 text-[#190088] border border-[#97D6DF]/30 dark:bg-[#97D6DF]/15 dark:text-[#97D6DF] dark:border-[#97D6DF]/20"
          aria-hidden="true"
        >
          <Icono className="h-6 w-6" />
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="text-[20px] sm:text-[24px] leading-tight font-bold text-[#190088] dark:text-white">
            {pregunta}
          </h2>
          <p className="mt-1.5 text-[14px] font-normal text-[#212121] dark:text-gray-400">{descripcion}</p>
        </div>
      </div>

      <div className="mt-7">{children}</div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CAMPO DE CONFIGURACIÓN — etiqueta encima, control debajo
// ═══════════════════════════════════════════════════════════════════════════

export interface CampoConfigProps {
  /** Etiqueta del campo. `text-sm font-semibold`: por debajo de la pregunta del bloque. */
  etiqueta: string;
  /**
   * Qué es el valor o qué efecto tiene cambiarlo. Se conserva aunque el bloque
   * ya tenga descripción: son cosas distintas — la del bloque dice PARA QUÉ es
   * el grupo, esta dice QUÉ HACE el control concreto.
   */
  ayuda?: string;
  /** `id` del control, para atar la etiqueta. */
  htmlFor?: string;
  /** El control, a ancho completo. */
  children: ReactNode;
  /** Ancho máximo del control. Por defecto `max-w-sm`. */
  ancho?: string;
}

/**
 * CampoConfig — un campo dentro de un `BloqueConfig`.
 *
 * ── Por qué la etiqueta va ENCIMA del control ─────────────────────────────
 *
 * `claseFila` (etiqueta-izquierda / control-derecha) es el patrón de una lista
 * de ajustes y funciona cuando TODAS las filas tienen control: el ojo baja por
 * una columna de controles alineados. En una pantalla donde la mitad del
 * contenido son rejillas de fichas a ancho completo, esa alternancia produce un
 * zigzag: fila estrecha, luego rejilla ancha, luego fila estrecha. La etiqueta
 * encima deja el control a ancho completo y el bloque se lee en una sola
 * dirección.
 *
 * No se han perdido las descripciones al hacerlo: siguen ahí, porque explican
 * efectos que no se adivinan (que cambiar el país propone la moneda). Lo que
 * cambia es dónde están, no que estén.
 */
export function CampoConfig({
  etiqueta,
  ayuda,
  htmlFor,
  children,
  ancho = "max-w-sm",
}: CampoConfigProps) {
  return (
    <div>
      <Label htmlFor={htmlFor} className="mb-0">
        {etiqueta}
      </Label>
      {ayuda && (
        <p className="mt-0.5 max-w-lg text-xs text-gray-500 dark:text-gray-400">{ayuda}</p>
      )}
      <div className={cn("mt-2", ancho)}>{children}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HUB DE CONFIGURACIÓN — la entrada de una pantalla de ajustes
// ═══════════════════════════════════════════════════════════════════════════

/** Una sección ofrecida en el hub. Es la misma forma que `SeccionNav`. */
export interface TarjetaHub {
  /** Clave de la sección. Es el valor que viaja en `?seccion=`. */
  key: string;
  /** Nombre de la sección, en negrita en la tarjeta. */
  label: string;
  /**
   * Una línea que explica qué se ajusta ahí. Solo se muestra si la sección no
   * declara `ajustes`; en ambos casos alimenta la búsqueda.
   */
  hint: string;
  /** Icono, ya resuelto por la página. */
  icono: IconoConfig;
  /** Badge o indicador distintivo opcional en la tarjeta. */
  badge?: string;
  /**
   * Los ajustes concretos que hay dentro, con el mismo nombre que llevan en la
   * sección («Prefijo de órdenes», «Conteo a ciegas»). Se leen de un vistazo y
   * son lo que el usuario busca, no una descripción general.
   */
  ajustes?: string[];
  /** Cómo está configurado hoy, en una frase corta («Costeo: promedio ponderado»). */
  estado?: string;
  /** `aviso` pinta el estado en naranja: algo que conviene revisar. */
  estadoTono?: "neutro" | "aviso";
  /** Términos extra para la búsqueda (sinónimos que no aparecen en el texto). */
  palabrasClave?: string[];
  /** Texto del enlace de esta tarjeta, si difiere del general («Ir a Ajustes»). */
  accion?: string;
  /** Función opcional para reiniciar el proceso (útil para pruebas de desarrollo) */
  onReset?: () => void;
  resetLabel?: string;
}

export interface ConfigHubProps {
  /** Tarjetas del hub, en orden de lectura. */
  tarjetas: TarjetaHub[];
  /** Se llama con la clave de la tarjeta pulsada. */
  onEntrar: (key: string) => void;
  /** Texto accesible de la acción de cada tarjeta. Por defecto «Configurar». */
  accion?: string;
}

/**
 * ConfigHub — la pantalla de entrada de una configuración, como cuadrícula de
 * tarjetas.
 *
 * ── Qué problema resuelve ────────────────────────────────────────────────
 *
 * Quien entra por primera vez no sabe qué hay dentro de «Operación y flujo».
 * Cada tarjeta lo dice ANTES de entrar: el nombre de la sección, los ajustes
 * concretos que contiene y cómo está configurada hoy. Así el usuario encuentra
 * el ajuste sin abrir las secciones una por una, y muchas veces ni siquiera
 * necesita entrar para saber si hay algo que cambiar.
 *
 * ── Por qué tarjetas compactas ───────────────────────────────────────────
 *
 * Todas las secciones deben verse a la vez, sin desplazarse, para poder
 * compararlas. Por eso la tarjeta no lleva un párrafo descriptivo ni un icono
 * en un cuadro de color: el icono va pequeño junto al título y el espacio se
 * dedica a los ajustes y al estado actual.
 *
 * ── Por qué NO es una lista de pestañas ni un acordeón ───────────────────
 *
 * Elegir una tarjeta navega a pantalla completa: la sección ocupa la pantalla y
 * hay un camino explícito de vuelta (`VolverAlHub`).
 */
export function ConfigHub({ tarjetas, onEntrar, accion = "Configurar" }: ConfigHubProps) {
  // Con 2 tarjetas, tres columnas dejarían una pista vacía: se quedan en dos.
  const columnas = tarjetas.length <= 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-3";

  return (
    <ul className={cn("grid grid-cols-1 gap-4", columnas)}>
      {tarjetas.map((t) => {
        const Icono = t.icono;
        return (
          <li key={t.key} className="flex">
            <div
              role="button"
              tabIndex={0}
              onClick={() => onEntrar(t.key)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onEntrar(t.key);
                }
              }}
              aria-label={`${t.accion ?? accion}: ${t.label}`}
              className={cn(
                "group relative flex h-full w-full cursor-pointer flex-col rounded-2xl border border-gray-200 bg-white p-5 text-left transition-colors",
                "hover:border-brand-500 hover:bg-gray-50",
                "focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30",
                "dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-brand-500 dark:hover:bg-white/[0.04]",
              )}
            >
              <span className="flex w-full items-start gap-3">
                <Icono className="mt-0.5 h-5 w-5 shrink-0 text-ink-title dark:text-accent-300" aria-hidden="true" />
                <span className="min-w-0 flex-1 text-[16px] font-bold leading-6 text-ink-title dark:text-white">
                  {t.label}
                </span>
                {t.badge && (
                  <span className="shrink-0 rounded-full bg-cream px-2 py-0.5 text-[12px] font-bold text-ink-body dark:bg-cream/15 dark:text-cream">
                    {t.badge}
                  </span>
                )}
                <ArrowRightIcon
                  className="mt-0.5 h-5 w-5 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500"
                  aria-hidden="true"
                />
              </span>

              <span className="mt-2 block pl-8 text-[14px] leading-5 text-gray-600 dark:text-gray-400">
                {t.ajustes && t.ajustes.length > 0 ? t.ajustes.join(" · ") : t.hint}
              </span>

              <div className="mt-auto flex items-center justify-between gap-3 pl-8 pt-4">
                {t.estado ? (
                  <span
                    className={cn(
                      "flex items-center gap-2 text-[12px] leading-[18px]",
                      t.estadoTono === "aviso"
                        ? "font-bold text-brand-700 dark:text-brand-400"
                        : "text-ink-body dark:text-gray-300",
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        t.estadoTono === "aviso" ? "bg-brand-500" : "bg-accent-300",
                      )}
                      aria-hidden="true"
                    />
                    {t.estado}
                  </span>
                ) : (
                  <span />
                )}

                {t.onReset && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      t.onReset?.();
                    }}
                    title="Reiniciar proceso de verificación (Pruebas de desarrollo)"
                    className="z-10 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[#FF3F1A]/50 bg-[#FF3F1A]/5 px-2.5 py-1 text-[12px] font-bold text-[#FF3F1A] transition-all hover:bg-[#FF3F1A] hover:text-white hover:border-transparent active:scale-95 shadow-2xs dark:bg-[#FF3F1A]/10 dark:text-[#FF3F1A]"
                  >
                    <ArrowPathIcon className="h-3.5 w-3.5" />
                    {t.resetLabel ?? "Reiniciar"}
                  </button>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** ¿La tarjeta responde a la búsqueda? Busca en nombre, ajustes, descripción y sinónimos. */
export function tarjetaCoincide(t: TarjetaHub, busqueda: string): boolean {
  const q = sinAcentos(busqueda.trim().toLowerCase());
  if (!q) return true;
  const textos = [t.label, t.hint, t.estado ?? "", ...(t.ajustes ?? []), ...(t.palabrasClave ?? [])];
  return textos.some((x) => sinAcentos(x.toLowerCase()).includes(q));
}

function sinAcentos(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export interface ConfigHubPaginaProps {
  titulo: string;
  descripcion: string;
  tarjetas: TarjetaHub[];
  onEntrar: (key: string) => void;
}

/**
 * ConfigHubPagina — cabecera, buscador y cuadrícula del hub en una sola pieza,
 * para que todas las configuraciones de módulo se vean y busquen igual.
 *
 * El buscador encuentra ajustes concretos («prefijo», «conteo ciego»): filtra
 * las tarjetas cuyo nombre, ajustes o sinónimos contienen el término.
 */
export function ConfigHubPagina({ titulo, descripcion, tarjetas, onEntrar }: ConfigHubPaginaProps) {
  const [busqueda, setBusqueda] = useState("");
  const visibles = tarjetas.filter((t) => tarjetaCoincide(t, busqueda));
  const idBuscador = useId();

  return (
    <div className="space-y-6 pb-12 font-sans">
      <ConfigHeader
        titulo={titulo}
        descripcion={descripcion}
        acciones={
          <div className="relative w-full sm:w-80">
            <label htmlFor={idBuscador} className="sr-only">
              Buscar un ajuste
            </label>
            <SearchIcon
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            />
            <input
              id={idBuscador}
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar un ajuste por nombre"
              className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-[14px] text-ink-body placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/10 dark:bg-white/[0.03] dark:text-white"
            />
          </div>
        }
      />

      {visibles.length > 0 ? (
        <ConfigHub tarjetas={visibles} onEntrar={onEntrar} />
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 px-5 py-10 text-center dark:border-white/15">
          <p className="text-[14px] text-ink-body dark:text-gray-300">
            Ningún ajuste coincide con «<span className="font-bold">{busqueda}</span>».
          </p>
          <button
            type="button"
            onClick={() => setBusqueda("")}
            className="mt-2 rounded-md text-[14px] font-bold text-ink-title hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:text-white"
          >
            Ver todas las secciones
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// VOLVER AL HUB
// ═══════════════════════════════════════════════════════════════════════════

export interface VolverAlHubProps {
  /** A dónde vuelve. Se llama sin argumentos: la página decide su ruta base. */
  onVolver: () => void;
  /** Rótulo. Por defecto «Volver a Configuración». */
  etiqueta?: string;
}

/**
 * VolverAlHub — el camino de vuelta desde una sección al menú de tarjetas.
 */
export function VolverAlHub({ onVolver, etiqueta = "Volver a Configuración" }: VolverAlHubProps) {
  return (
    <button
      type="button"
      onClick={onVolver}
      className={cn(
        "-ml-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5",
        "text-[14px] font-bold text-[#212121] transition-colors hover:bg-gray-100 hover:text-[#FF3F1A]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3F1A]/40",
        "dark:text-gray-300 dark:hover:bg-white/[0.06] dark:hover:text-[#FF3F1A]",
      )}
    >
      <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
      {etiqueta}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SHELL: NAVEGACIÓN VERTICAL POR SECCIONES
// ═══════════════════════════════════════════════════════════════════════════

/** Metadatos de un ítem de la navegación de secciones. */
export interface SeccionNav {
  /** Clave de la sección. */
  key: string;
  /** Etiqueta visible. */
  label: string;
  /** Consejo de una línea bajo el título del panel. */
  hint: string;
  /** Componente de icono ya resuelto por la página. */
  icono: React.FC<React.SVGProps<SVGSVGElement>>;
}

/** Grupo de secciones con su etiqueta de cabecera. */
export interface GrupoNav {
  grupo: string;
  label: string;
  secciones: SeccionNav[];
}

export interface ConfigSectionNavProps {
  grupos: GrupoNav[];
  /** Clave de la sección activa. */
  activa: string;
  onSeleccionar: (key: string) => void;
  /** Texto de `aria-label` del `<nav>`. */
  ariaLabel: string;
}

/**
 * ConfigSectionNav — navegación vertical de secciones en grupos.
 */
export function ConfigSectionNav({
  grupos,
  activa,
  onSeleccionar,
  ariaLabel,
}: ConfigSectionNavProps) {
  return (
    <nav aria-label={ariaLabel} className="shrink-0 lg:w-[240px]">
      <ul className="flex flex-col gap-6">
        {grupos.map(({ grupo, label, secciones }) => (
          <li key={grupo}>
            <p className="mb-2 px-3 text-[12px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {label}
            </p>
            <ul className="flex flex-row gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
              {secciones.map((s) => {
                const Icono = s.icono;
                const estaActiva = s.key === activa;
                return (
                  <li key={s.key}>
                    <button
                      type="button"
                      onClick={() => onSeleccionar(s.key)}
                      aria-current={estaActiva ? "page" : undefined}
                      className={cn(
                        "inline-flex w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-[14px] transition-colors cursor-pointer",
                        estaActiva
                          ? "bg-[#FF3F1A]/10 text-[#FF3F1A] font-bold dark:bg-[#FF3F1A]/20 dark:text-[#FF3F1A]"
                          : "text-[#212121] font-normal hover:bg-gray-100 hover:text-[#190088] dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200",
                      )}
                    >
                      <Icono className="h-5 w-5 shrink-0" />
                      {s.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export interface ConfigShellProps {
  /** Contenido del panel de la sección activa. */
  children: ReactNode;
  /** Clave usada como `key` del panel, para reiniciar la animación de entrada. */
  seccionKey: string;
  /** Título del panel (etiqueta de la sección). */
  titulo: string;
  /** Consejo de una línea bajo el título. */
  hint: string;
  /**
   * Control de vuelta al hub de tarjetas, sobre el título.
   */
  volver?: ReactNode;
  /** Pie de la tarjeta o barra de acciones, opcional. */
  footer?: ReactNode;
}

/**
 * ConfigShell — columna del panel de contenido de la sección activa.
 */
export function ConfigShell({
  children,
  seccionKey,
  titulo,
  hint,
  volver,
  footer,
}: ConfigShellProps) {
  return (
    <div
      key={seccionKey}
      // `entrada-lista` y no `aparecer`. Al cambiar de sección el panel se
      // remonta —eso es lo que hace el `key`— y un fundido puro no cuenta que la
      // sección anterior se fue y esta llegó: la pantalla parece quedarse quieta
      // y cambiar de contenido sola. El desplazamiento de 10px sí lo cuenta, y
      // sin escala, porque el panel no es una capa que se asienta sino el cuerpo
      // de la sección. Lo heredan las cinco pantallas de configuración.
      className="animate-entrada-lista flex min-w-0 flex-1 flex-col"
    >
      {volver && <div className="mb-3">{volver}</div>}

      <div className="mb-4">
        <h2 className="text-[20px] sm:text-[24px] font-bold text-[#190088] dark:text-white leading-tight">{titulo}</h2>
        <p className="mt-1 text-[14px] font-normal text-[#212121] dark:text-gray-400">{hint}</p>
      </div>

      <div className="flex-1 space-y-5">{children}</div>

      {footer}
    </div>
  );
}

/**
 * Barra de acciones del pie de una tarjeta o de la sección.
 */
export function ConfigAcciones({
  children,
  mensaje,
  fija,
}: {
  children: ReactNode;
  mensaje?: ReactNode;
  fija?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-end gap-3 border-t border-[#ECECEC] pt-4 dark:border-gray-800",
        fija && "sticky bottom-0 mt-6 bg-white dark:bg-gray-900",
      )}
    >
      {mensaje && <span className="mr-auto text-[12px]">{mensaje}</span>}
      {children}
    </div>
  );
}

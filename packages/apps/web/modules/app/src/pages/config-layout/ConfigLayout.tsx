import type { ReactNode } from "react";

import { Card } from "@/elements/ui/card";
import { Label } from "@/elements/form/label";
import { ArrowRightIcon, CheckLineIcon, ChevronLeftIcon } from "@/icons";
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
    <div className="flex flex-col gap-3 border-b border-gray-200 pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-ink-title dark:text-white">{titulo}</h1>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{descripcion}</p>
      </div>

      {acciones && (
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
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
    <h2 className="text-sm font-semibold text-ink-title dark:text-white">{children}</h2>
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
      <Label htmlFor={htmlFor} className="mb-0">
        {titulo}
      </Label>
      {descripcion && (
        <p className="mt-0.5 max-w-md text-xs text-gray-500 dark:text-gray-400">
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
                  className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-brand-500 bg-white text-brand-500 shadow-xs dark:border-brand-500 dark:bg-gray-900 transition-transform duration-200 scale-105"
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
    <Card className="rounded-3xl border border-gray-100 bg-white p-6 sm:p-8 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start gap-4">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary-50 text-secondary-600 dark:bg-brand-500/10 dark:text-brand-400"
          aria-hidden="true"
        >
          <Icono className="h-6 w-6" />
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="text-[20px] sm:text-[24px] leading-tight font-bold text-ink-title dark:text-white">
            {pregunta}
          </h2>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{descripcion}</p>
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
  /** Una línea que explica qué se ajusta ahí. */
  hint: string;
  /** Icono, ya resuelto por la página. */
  icono: IconoConfig;
}

export interface ConfigHubProps {
  /** Tarjetas del hub, en orden de lectura. */
  tarjetas: TarjetaHub[];
  /** Se llama con la clave de la tarjeta pulsada. */
  onEntrar: (key: string) => void;
  /** Texto del enlace de cada tarjeta. Por defecto «Entrar a configurar». */
  accion?: string;
}

/**
 * ConfigHub — la pantalla de entrada de una configuración, como cuadrícula de
 * tarjetas prominentes.
 *
 * ── Qué problema resuelve ────────────────────────────────────────────────
 *
 * La navegación lateral (`ConfigSectionNav`) funciona cuando el usuario YA sabe
 * qué sección busca: es una lista de etiquetas, y hay que leerlas todas para
 * encontrar la propia. Quien entra por primera vez no sabe qué hay dentro de
 * «Operación y flujo», y la única forma de averiguarlo es entrar una por una.
 *
 * Con tarjetas, cada sección trae su icono y su descripción ANTES de entrar: se
 * reconoce la sección sin leer el nombre, que es lo que hace una pantalla
 * manejable para alguien que no la conoce. Es la agrupación que pidió el usuario
 * (06/10), y por eso las cuatro pantallas de configuración la comparten.
 *
 * ── Por qué NO es una lista de pestañas ni un acordeón ───────────────────
 *
 * El requisito es que elegir una tarjeta **navegue a pantalla completa**, no que
 * despliegue el contenido debajo. Un acordeón dejaría las otras secciones a la
 * vista como distracción mientras se edita una, y en móvil obligaría a
 * desplazarse por lo ya resuelto. Aquí la sección ocupa la pantalla y hay un
 * camino explícito de vuelta.
 *
 * ── Sobre el color de realce ─────────────────────────────────────────────
 *
 * El realce del hover va en `brand-500`, el naranja de marca, **no** en el verde
 * `#17b363` que pedía el borrador inicial: ese verde se retiró de la paleta
 * (20/09) y no figura en el manual de NECTO. Un hex literal, además, no tendría
 * variante oscura y el hover desaparecería en tema oscuro.
 */
export function ConfigHub({ tarjetas, onEntrar, accion = "Entrar a configurar" }: ConfigHubProps) {
  // ── El número de columnas lo fija el número de TARJETAS ───────────────────
  //
  // No es un detalle estético: con 2 tarjetas a 4 columnas la fila queda medio
  // vacía, y con 3 a 4 columnas sobra una pista entera y las tarjetas se
  // estrechan de más. Cada caso tiene su ancho máximo para que las tarjetas
  // conserven un tamaño legible.
  //
  // Los grupos por número de columnas siguen siendo la unidad de comparación del
  // arnés (`verificar-config-hub.mjs`): todas las pantallas del MISMO tamaño
  // deben medir lo mismo, y la divergencia entre grupos es deliberada.
  const esDoble = tarjetas.length === 2;
  const esTriple = tarjetas.length === 3;

  return (
    <ul
      className={cn(
        "grid grid-cols-1 gap-6 sm:grid-cols-2",
        esDoble
          ? "max-w-2xl mx-auto"
          : esTriple
            ? "lg:grid-cols-3 max-w-5xl mx-auto"
            : "lg:grid-cols-3 xl:grid-cols-4 max-w-7xl mx-auto",
      )}
    >
      {tarjetas.map((t) => {
        const Icono = t.icono;
        return (
          <li key={t.key} className="flex">
            {/* Tarjeta con proporciones compactas según la referencia visual del usuario */}
            <button
              type="button"
              onClick={() => onEntrar(t.key)}
              className={cn(
                "group flex h-full w-full cursor-pointer flex-col justify-between rounded-3xl border-2 border-gray-100 bg-white p-6 sm:p-7 text-left transition-all min-h-[260px] sm:min-h-[280px]",
                "hover:-translate-y-1 hover:border-[#FF3F1A]/40 hover:shadow-theme-md",
                "focus-visible:border-[#FF3F1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3F1A]/30",
                "dark:border-gray-800 dark:bg-gray-900/60 dark:hover:border-[#FF3F1A]/50",
              )}
            >
              <div>
                {/* Icono en contenedor redondeado */}
                <span
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50/90 text-gray-700 transition-colors border border-gray-100",
                    "group-hover:bg-[#FF3F1A]/10 group-hover:text-[#FF3F1A]",
                    "dark:bg-white/[0.04] dark:border-gray-800 dark:text-gray-300 dark:group-hover:bg-[#FF3F1A]/15 dark:group-hover:text-[#FF3F1A]",
                  )}
                  aria-hidden="true"
                >
                  <Icono className="h-7 w-7 stroke-[1.75]" />
                </span>

                {/* Título en azul profundo NECTO (#190088) y descripción */}
                <div className="mt-5">
                  <span className="block text-lg sm:text-xl font-bold text-[#190088] dark:text-white">
                    {t.label}
                  </span>
                  <span className="mt-2 block text-sm text-gray-600 leading-relaxed dark:text-gray-400">
                    {t.hint}
                  </span>
                </div>
              </div>

              {/* Acción inferior: «Entrar a configurar →».
                  ── El naranja de marca no sirve como color de TEXTO ──────
                  Iba en `text-[#FF3F1A]`, un hex literal que mide **3,51:1**
                  sobre el blanco de la tarjeta. La etiqueta es `text-sm
                  font-semibold`: no llega al umbral de «texto grande», así que
                  le aplica el 4,5:1 de WCAG AA y no lo cumple.
                  Se corrige con el mismo par que `VolverAlHub`, medido:
                  `brand-700` en claro (5,40:1) y `brand-400` en oscuro
                  (5,98:1). El hex literal tenía además un segundo problema: no
                  tiene variante oscura, así que el enlace se quedaba en el
                  naranja de marca sobre `gray-900` y el hover era indistinguible
                  del reposo. Con el par de la rampa, el hover SÍ cambia de paso
                  de tema (`brand-800` / `brand-300`), que es lo que hace visible
                  que la tarjeta es pulsable. */}
              <div className="mt-6 pt-2">
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 transition-colors group-hover:text-brand-800 dark:text-brand-400 dark:group-hover:text-brand-300">
                  {accion}
                  <ArrowRightIcon
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </span>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
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
 *
 * ── Por qué es un control propio y no el «atrás» del navegador ───────────
 *
 * Cuando se entra con un enlace directo (`/pedidos/config?seccion=pagos`) no hay
 * historial que retroceder: el «atrás» del navegador sacaría al usuario de la
 * aplicación, o lo devolvería a la página anterior del sitio, que no es el menú.
 * Y sin este control, quien llegue por enlace directo se queda encerrado en la
 * sección sin forma de ver las demás.
 *
 * Es un `<button>` y no un enlace porque no cambia de documento: solo quita el
 * parámetro de la URL. Un `<a href>` sin `preventDefault` recargaría la página
 * entera para el mismo efecto.
 *
 * ── El naranja del hover, por paso de tema ────────────────────────────────
 *
 * El hover pone el texto en naranja. Con `brand-500` medía **3,19:1** sobre el
 * `gray-100` del propio hover y 3,51:1 sobre blanco — por debajo de 4,5:1. Es
 * el mismo defecto que tenía el enlace de las tarjetas y se corrige igual, con
 * el mismo par: `brand-700` en claro (5,40:1 sobre `gray-100`) y `brand-400` en
 * oscuro. El reposo (`gray-600`) ya pasaba con 7,56:1 y no se toca.
 */
export function VolverAlHub({ onVolver, etiqueta = "Volver a Configuración" }: VolverAlHubProps) {
  return (
    <button
      type="button"
      onClick={onVolver}
      className={cn(
        "-ml-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5",
        "text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 hover:text-brand-700",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40",
        "dark:text-gray-300 dark:hover:bg-white/[0.06] dark:hover:text-brand-400",
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
 *
 * Es navegación por pestañas reales (solo la sección activa está montada), no
 * scroll-spy. En móvil se convierte en una fila desplazable horizontalmente
 * para no empujar el contenido hacia abajo.
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
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
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
                        "inline-flex w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer",
                        // ── La sección activa va en el NARANJA de marca ────────
                        //
                        // Estaba en un gris neutro (`bg-gray-100 text-gray-900`).
                        // Un gris no dice «estás aquí»: dice «esto es una fila».
                        // Y era una regresión concreta: `/pedidos/config` montaba
                        // el `<Tab variant="underline">` del catálogo, que marca
                        // la activa con `bg-secondary-50 text-secondary-600` y una barra
                        // inferior `bg-brand-500`; al unificar el mueble de las
                        // cuatro pantallas se cambió el marcador de color por uno
                        // neutro y el naranja desapareció sin que nadie lo pidiera.
                        //
                        // Se restaura AQUÍ, en el componente compartido, y no en
                        // una pantalla: si cada configuración se pintara su propia
                        // activa, volverían a divergir — que es justo lo que este
                        // módulo existe para evitar. Las cuatro la heredan.
                        //
                        // Se usa LA MISMA cadena que el catalogo ya usa para una
                        // pestaña vertical activa (`elements/ui/tabs/Tab.tsx:261`),
                        // copiada literal: `bg-secondary-50 text-secondary-600` y, en
                        // oscuro, `dark:bg-brand-400/20 dark:text-brand-400`.
                        //
                        // La primera version de este arreglo puso
                        // `text-ink-title dark:text-brand-300` porque el 700 daba
                        // mas contraste sobre `brand-50`. Estaba mal por dos
                        // motivos: `brand-700` es `#be2a15`, un rojo ladrillo, no
                        // el naranja de marca `#ff3f1a`; y esos pasos no son los
                        // que el producto usa para un activo. El naranja de una
                        // superficie no se elige por contraste, se toma del
                        // sistema: si se cambia aqui, se cambia en `Tab` tambien.
                        estaActiva
                          ? "bg-secondary-50 text-secondary-600 dark:bg-brand-400/20 dark:text-brand-400"
                          : "text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200",
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
   *
   * Es opcional y no lo pinta la página por su cuenta porque su POSICIÓN —encima
   * del título, alineado con el panel— es parte del patrón: si cada pantalla lo
   * colocara a su manera, el mismo control aparecería en cuatro sitios distintos.
   * Se pide como `ReactNode` ya construido, normalmente `<VolverAlHub />`.
   */
  volver?: ReactNode;
  /** Pie de la tarjeta o barra de acciones, opcional. */
  footer?: ReactNode;
}

/**
 * ConfigShell — columna del panel de contenido de la sección activa.
 *
 * `key={seccionKey}` fuerza el remontaje: al cambiar de sección React
 * desmonta el panel y monta uno nuevo, que reproduce `animate-aparecer`. Sin
 * la key reutilizaría el nodo y la sección se sustituiría de golpe.
 *
 * El fundido es PURO, sin desplazamiento: el panel nuevo ocupa el sitio del
 * anterior, así que moverlo sugeriría que viene de algún lado.
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
      className="animate-aparecer flex min-w-0 flex-1 flex-col"
    >
      {volver && <div className="mb-3">{volver}</div>}

      <div className="mb-4">
        <h2 className="text-lg font-semibold text-ink-title dark:text-white/90">{titulo}</h2>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{hint}</p>
      </div>

      <div className="flex-1 space-y-5">{children}</div>

      {footer}
    </div>
  );
}

/**
 * Barra de acciones del pie de una tarjeta o de la sección.
 *
 * Alinea los botones a la derecha con `flex justify-end gap-3 pt-4`, el patrón
 * indicado. Los mensajes de confirmación van a la izquierda (`mr-auto`) para
 * que no empujen los botones fuera de su sitio al aparecer y desaparecer.
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
        "flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-800",
        fija && "sticky bottom-0 mt-6 bg-white dark:bg-gray-900",
      )}
    >
      {mensaje && <span className="mr-auto text-xs">{mensaje}</span>}
      {children}
    </div>
  );
}

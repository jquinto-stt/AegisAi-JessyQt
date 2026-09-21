import type { ReactNode } from "react";

import { Label } from "@/elements/form/label";
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
// Deuda anotada, no escondida: blanco sobre `brand-500` (`#ff3c10`) mide
// 3,6:1, por debajo de AA (4,5:1) para una etiqueta de 12 px. Es el mismo par
// que ya usaban esos dos sitios, asi que unificar no empeora nada; si se
// quiere AA, el paso es `bg-brand-700` (5,9:1) en los TRES sitios a la vez.
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
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
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
                        // la activa con `bg-brand-50 text-brand-500` y una barra
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
                        // copiada literal: `bg-brand-50 text-brand-500` y, en
                        // oscuro, `dark:bg-brand-400/20 dark:text-brand-400`.
                        //
                        // La primera version de este arreglo puso
                        // `text-brand-700 dark:text-brand-300` porque el 700 daba
                        // mas contraste sobre `brand-50`. Estaba mal por dos
                        // motivos: `brand-700` es `#bf2810`, un rojo ladrillo, no
                        // el naranja de marca `#ff3c10`; y esos pasos no son los
                        // que el producto usa para un activo. El naranja de una
                        // superficie no se elige por contraste, se toma del
                        // sistema: si se cambia aqui, se cambia en `Tab` tambien.
                        estaActiva
                          ? "bg-brand-50 text-brand-500 dark:bg-brand-400/20 dark:text-brand-400"
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
  footer,
}: ConfigShellProps) {
  return (
    <div
      key={seccionKey}
      className="animate-aparecer flex min-w-0 flex-1 flex-col"
    >
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

import type { ElementType, ReactNode } from "react";
import { Check } from "lucide-react";
import { Badge, Card, type BadgeColor } from "@/elements";
import { cn } from "@/utils";

/* ── Vocabulario de los ajustes de perfil ────────────────────────────────
 *
 * **Agrupado.** Una tarjeta, varios grupos dentro, y cada grupo separado del
 * anterior por una línea fina. Nada de cajas dentro de cajas: antes cada bloque
 * era un panel con su propio fondo y su propio borde, así que la pantalla tenía
 * tres niveles de contenedor y la vista se llenaba de marcos compitiendo.
 *
 * ⚠️ **Tipografía.** Es la regla que hace que esto no parezca otra pantalla:
 *
 *  - Título de grupo: `text-theme-sm` (14px), peso 600. **Nunca** 20px.
 *  - Rótulo de campo: `text-theme-xs` (12px), gris, **en minúscula normal**.
 *    Nada de `uppercase tracking-wider`: la versalita espaciada convierte un
 *    formulario en un muro de mayúsculas y era justo lo que sobraba.
 *  - Valor: `text-theme-sm` (14px), color de texto principal.
 *
 * Los rótulos van **encima** del control, no al lado: es lo que deja respirar
 * una rejilla de dos columnas y lo que hace legible un campo vacío.
 * ────────────────────────────────────────────────────────────────────── */

/**
 * La tarjeta única que agrupa todas las secciones de una pestaña.
 *
 * Es el `Card` del catálogo, no una copia: `Card` ya emite exactamente
 * `rounded-xl border border-gray-200 bg-white dark:border-gray-800
 * dark:bg-white/[0.03]`, así que aquí sólo se añade `overflow-hidden` —que la
 * banda de portada de la cabecera de identidad necesita para recortarse contra
 * las esquinas— y se anula su relleno por defecto (`p-5 sm:p-6`) porque cada
 * grupo pone el suyo. `cn()` es `tailwind-merge`, así que `p-0` gana a `p-5`.
 */
export const AccountCard: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <Card className={cn("overflow-hidden p-0 sm:p-0", className)}>{children}</Card>
);

/**
 * Un grupo dentro de la tarjeta: cabecera —título, ayuda y acciones a la
 * derecha— y cuerpo debajo. El separador va **entre** grupos, así que el primero
 * se declara con `first` y no arrastra línea encima.
 */
export const AccountGroup: React.FC<{
  title: string;
  description?: ReactNode;
  /** Acciones alineadas a la derecha del título (botones, píldoras de estado). */
  actions?: ReactNode;
  children: ReactNode;
  first?: boolean;
  bodyClassName?: string;
}> = ({ title, description, actions, children, first = false, bodyClassName }) => (
  <section className={cn(!first && "border-t border-gray-100 dark:border-gray-800")}>
    <header className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6">
      <div className="min-w-0">
        <h3 className="text-theme-sm font-semibold tracking-tight text-secondary-600 dark:text-white">
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-none items-center gap-2">{actions}</div>}
    </header>
    <div className={cn("px-5 pb-5 pt-4 sm:px-6", bodyClassName)}>{children}</div>
  </section>
);

/** Rejilla de campos. Dos columnas cuando el ancho lo permite, una si no. */
export const FieldGrid: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div className={cn("grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2", className)}>{children}</div>
);

/**
 * Campo editable: rótulo pequeño encima, control debajo y una ayuda opcional.
 * Es el patrón de la referencia ("First Name" → "Chowdhury").
 */
export const LabeledField: React.FC<{
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}> = ({ label, hint, children, className }) => (
  <div className={cn("min-w-0", className)}>
    <span className="mb-1.5 block text-theme-xs font-medium text-gray-500 dark:text-gray-400">
      {label}
    </span>
    {children}
    {hint && (
      <p className="mt-1.5 text-theme-xs leading-relaxed text-gray-400 dark:text-gray-500">{hint}</p>
    )}
  </div>
);

/**
 * Dato de sólo lectura: rótulo pequeño y valor. Para lo que la cuenta ya sabe de
 * sí misma y no se edita aquí.
 *
 * ⚠️ **Por qué no es el `InfoGrid` del catálogo.** El flujo devolvió `InfoGrid`
 * para este intento y para la rejilla de módulos, y es el candidato natural —
 * "pares rótulo/valor de sólo lectura" es literalmente su descripción. Pero no
 * encaja aquí, por tres motivos concretos:
 *
 *  1. `InfoGrid` **trae su propio marco** (`rounded-2xl border border-gray-200
 *     p-5 … lg:p-6`) y la guía del paquete pide explícitamente no añadirle
 *     bordes. Este par ya vive dentro de `AccountCard`, así que adoptarlo
 *     reintroduce la caja dentro de la caja que el vocabulario de arriba
 *     elimina — tres niveles de contenedor, que es justo el defecto que se
 *     corrigió.
 *  2. Su rejilla usa breakpoints de **viewport** (`lg:grid-cols-2`), y esta
 *     pantalla necesita que la rejilla responda al ancho del **panel**: el modal
 *     se abre a anchos distintos y `lg:` describiría la pantalla, no la columna.
 *  3. Su hueco horizontal a `2xl` es de 8rem (`gap-x-32`), desproporcionado
 *     dentro de un modal de `max-w-5xl`: separaría los dos campos hasta los
 *     extremos.
 *
 * La tipografía, en cambio, coincide con la de aquí (`text-theme-xs` el rótulo,
 * `text-theme-sm` el valor), lo que confirma que el diseño ya estaba alineado
 * con el catálogo aunque el contenedor no lo estuviera.
 */
export const ValueField: React.FC<{ label: string; value: ReactNode; className?: string }> = ({
  label,
  value,
  className,
}) => (
  <div className={cn("min-w-0", className)}>
    <span className="mb-1 block text-theme-xs font-medium text-gray-500 dark:text-gray-400">
      {label}
    </span>
    <span className="block truncate text-theme-sm text-secondary-600 dark:text-white/90">
      {value}
    </span>
  </div>
);

/**
 * Fila de ajuste: rótulo y ayuda a la izquierda, control a la derecha. Es el
 * patrón de las filas de "Security" y "Danger Zone" de la referencia, y el que
 * usa menos altura por ajuste que un campo con rótulo encima.
 */
export const ActionRow: React.FC<{
  title: string;
  description?: ReactNode;
  /** Distintivo junto al título (estado, "4 dígitos"…). */
  badge?: ReactNode;
  action?: ReactNode;
  /** Contenido que se despliega debajo de la fila. */
  children?: ReactNode;
  className?: string;
}> = ({ title, description, badge, action, children, className }) => (
  <div className={cn("py-4 first:pt-0 last:pb-0", className)}>
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-theme-sm font-medium text-secondary-600 dark:text-white">{title}</h4>
          {badge}
        </div>
        {description && (
          <p className="mt-1 max-w-xl text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex flex-none items-center gap-2">{action}</div>}
    </div>
    {children && <div className="mt-4">{children}</div>}
  </div>
);

/** Filas de ajuste consecutivas, separadas por línea fina. */
export const ActionRowList: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div className={cn("divide-y divide-gray-100 dark:divide-gray-800", className)}>{children}</div>
);

/**
 * Los cuatro tonos de `StatusPill` traducidos a los colores semánticos del
 * `Badge`. La traducción existe para no tocar los seis puntos de llamada: la
 * API de la casa sigue siendo `tone`, pero quien pinta es el catálogo.
 *
 * - `brand` → `primary` · `muted` → `light` · `success` → `success` · `warning` → `warning`
 */
export type StatusPillTone = "brand" | "muted" | "success" | "warning";

const STATUS_TONE_COLOR: Record<StatusPillTone, BadgeColor> = {
  brand: "primary",
  muted: "light",
  success: "success",
  warning: "warning",
};

/**
 * Píldora de estado. Sustituye las cinco variantes sueltas del mismo objeto
 * (rol, "Activado", "Esta sesión", "4 dígitos", "demo") que había repartidas por
 * los archivos, cada una con sus colores escritos a mano.
 *
 * **Es el `Badge` del catálogo, no una copia.** El flujo devolvió `Badge` para
 * este intento y el encaje es exacto: el tamaño `sm` ya emite
 * `text-theme-xs px-2 py-0.5`, que es la geometría que esta píldora tenía escrita
 * a mano. Sólo hay que recuperar el `px-2.5` original, el `gap-1.5` y el
 * `font-semibold` —`cn()` es `tailwind-merge`, así que `px-2.5` gana a `px-2`,
 * `gap-1.5` a `gap-1` y `font-semibold` a `font-medium`—. `whitespace-nowrap` se
 * mantiene porque el `Badge` no lo trae y aquí las píldoras viven en filas.
 *
 * ⚠️ El `Badge` local **no** es byte a byte el del catálogo (su MD5 difiere del
 * manifiesto del paquete), así que se usa el local tal cual: sobrescribirlo
 * perdería la personalización del proyecto.
 */
export const StatusPill: React.FC<{
  children: ReactNode;
  /** `brand` acento · `muted` informativo · `success` activo · `warning` pendiente. */
  tone?: StatusPillTone;
  className?: string;
}> = ({ children, tone = "muted", className }) => (
  <Badge
    color={STATUS_TONE_COLOR[tone]}
    size="sm"
    intent={`account.status.${tone}`}
    className={cn("gap-1.5 whitespace-nowrap px-2.5 font-semibold", className)}
  >
    {children}
  </Badge>
);

/**
 * Rejilla de opciones. Se adapta al ancho del **panel**, no al del viewport: el
 * modal se abre a anchos distintos y un `sm:` describiría la pantalla, no la
 * columna donde vive la rejilla.
 */
export const OptionCardGrid: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div className={cn("grid grid-cols-1 gap-2.5 sm:grid-cols-2", className)}>{children}</div>
);

/**
 * Opción seleccionable. Un solo componente para el tema, el canal de avisos y la
 * disponibilidad horaria: los tres son "elige una de estas tarjetas".
 *
 * La selección es un borde y un tinte suaves, no un bloque relleno: pintar toda
 * la tarjeta de acento la convertía en un botón y competía con el CTA de guardar.
 *
 * ⚠️ **Por qué no hay componente del catálogo para esto.** El flujo devolvió
 * `ButtonsGroup`/`Button`, `Card`, `Radio` y `Select`, y ninguno conserva lo que
 * esta tarjeta necesita **a la vez**: un `<button aria-pressed>` con icono,
 * título, descripción y marca de selección, repartido en rejilla. `ButtonsGroup`
 * es un segmentado horizontal (pierde la descripción y el icono), `Radio` no
 * existe en el catálogo, y `Card` no es interactivo. Adoptar cualquiera de ellos
 * cambiaría la **interacción**, no sólo la presentación — y el encargo es
 * preservar la lógica y tocar sólo la capa visual.
 */
export const OptionCard: React.FC<{
  label: string;
  description?: string;
  icon?: ElementType;
  selected: boolean;
  onSelect: () => void;
}> = ({ label, description, icon: Icon, selected, onSelect }) => (
  <button
    type="button"
    aria-pressed={selected}
    onClick={onSelect}
    className={cn(
      "flex w-full cursor-pointer items-center gap-3 rounded-xl border p-3.5 text-left transition-colors",
      selected
        ? "border-brand-500 bg-brand-50/60 dark:border-brand-500/60 dark:bg-brand-500/10"
        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02] dark:hover:border-gray-700 dark:hover:bg-white/[0.05]"
    )}
  >
    {Icon && (
      <span
        className={cn(
          "flex size-9 flex-none items-center justify-center rounded-[10.5px]",
          selected
            ? "bg-brand-500 text-white"
            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
        )}
      >
        <Icon className="size-4" />
      </span>
    )}

    <span className="min-w-0 flex-1">
      <span
        className={cn(
          "block text-theme-sm font-medium leading-tight",
          selected ? "text-secondary-600 dark:text-white" : "text-gray-700 dark:text-gray-300"
        )}
      >
        {label}
      </span>
      {description && (
        <span className="mt-0.5 block text-theme-xs leading-snug text-gray-500 dark:text-gray-400">
          {description}
        </span>
      )}
    </span>

    {selected && (
      <span className="flex size-5 flex-none items-center justify-center rounded-full bg-brand-500 text-white">
        <Check className="size-3 stroke-[3]" />
      </span>
    )}
  </button>
);

/**
 * Aviso en línea dentro de un grupo. No es una caja: es una línea de texto.
 *
 * ⚠️ **Por qué no es el `Alert` del catálogo.** El flujo devolvió `Alert`
 * (`InfoAlert`) para este intento, y su propia descripción lo descarta: es
 * "feedback en línea que **ocupa espacio con fondo y borde**". Este aviso es
 * deliberadamente una línea de texto —así se declaró en el requisito— porque el
 * grupo ya está dentro de `AccountCard`; meter una caja aquí sería el tercer
 * marco de la misma columna.
 */
export const InlineNotice: React.FC<{
  icon?: ElementType;
  children: ReactNode;
  tone?: "info" | "warning";
}> = ({ icon: Icon, children, tone = "info" }) => (
  <p
    className={cn(
      "flex items-start gap-2 text-theme-xs leading-relaxed",
      tone === "warning" ? "text-warning-600 dark:text-warning-400" : "text-gray-500 dark:text-gray-400"
    )}
  >
    {Icon && <Icon className="mt-0.5 size-3.5 flex-none" />}
    <span>{children}</span>
  </p>
);

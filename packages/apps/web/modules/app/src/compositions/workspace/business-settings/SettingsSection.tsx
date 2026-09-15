import type { ElementType, ReactNode } from "react";
import { cn } from "@/utils";

/* ── Ajustes de sede: primitivas de presentación ──────────────────────────
 *
 * El mismo bloque "icono + título + descripción + control" estaba copiado a
 * mano **24 veces** en seis archivos, con dos variantes que nadie eligió:
 * el tile de icono medía `rounded-xl` en General/Canales/Pagos/Operaciones y
 * `rounded-[10.5px]` en el asistente, y algunas filas arrastraban coletazos
 * `dark:border-success-800/40` / `dark:border-warning-800/40` que sólo se ven
 * en tema oscuro. Aquí vive **una** definición; las variantes desaparecen por
 * construcción, no por disciplina.
 *
 * ── Estructura: UNA tarjeta con grupos, no una tarjeta por bloque ─────────
 *
 * ⚠️ Antes cada bloque era su propio `Card` apilado con `space-y-6`: seis
 * tarjetas con seis bordes, seis sombras y seis encabezados del mismo peso, y
 * la sección no se leía como un formulario sino como una pila de cajas. Ahora
 * el tab monta **una** `SettingsCard` y dentro van los `SettingsSection`, que
 * son **grupos** separados por una línea (`divide-y`), no contenedores. Es el
 * patrón de la referencia: un panel, grupos separados por hairline.
 *
 * ⚠️ Por eso `SettingsSection` **ya no lleva borde ni fondo**: si lo llevara,
 * volveríamos a la pila de cajas con un borde dentro de otro.
 *
 * ── Tipografía: la regla acordada ────────────────────────────────────────
 *
 * La jerarquía es de tres escalones y sólo tres:
 *
 *   1. `SettingsHeading` — título de la sección activa (`text-theme-xl`).
 *   2. `SettingsSection` — título de grupo (`text-theme-sm font-semibold`).
 *   3. `SettingsLabel` / `SettingsHint` — rótulos de campo (`text-theme-sm`).
 *
 * ⚠️ **Nada de versalita espaciada.** El antetítulo iba en
 * `uppercase tracking-[0.2em]` y los rótulos del canal en
 * `uppercase tracking-wider`: la mayúscula espaciada convierte un rótulo en un
 * grito y compite con el título que debería estar jerarquizando. Es el mismo
 * defecto que el usuario señaló en Ajustes de perfil ("tipografía y rótulos"),
 * así que aquí se aplica la misma regla: minúscula normal, peso medio, gris.
 * ────────────────────────────────────────────────────────────────────── */

/**
 * El panel de un tab: **una** tarjeta que agrupa todas sus secciones.
 *
 * `divide-y` pone la línea **entre** grupos y nunca en los extremos, así que
 * no hace falta que cada grupo sepa si es el primero.
 */
export const SettingsCard: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div
    className={cn(
      "divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-white/[0.03]",
      className
    )}
  >
    {children}
  </div>
);

/** Encabezado de la sección activa. Una sola forma para las seis secciones. */
export const SettingsHeading: React.FC<{
  /** Antetítulo del dominio. Opcional: una sección sin él sigue siendo válida. */
  eyebrow?: string;
  title: string;
  description: string;
}> = ({ eyebrow, title, description }) => (
  <div className="space-y-1.5">
    {eyebrow && (
      <span className="block text-theme-xs font-medium text-gray-400 dark:text-gray-500">
        {eyebrow}
      </span>
    )}
    <h2 className="text-theme-xl font-bold leading-tight tracking-tight text-secondary-600 dark:text-white">
      {title}
    </h2>
    <p className="text-theme-sm text-gray-500 dark:text-gray-400">{description}</p>
  </div>
);

/**
 * Grupo de ajustes dentro de `SettingsCard`.
 *
 * `title`/`description` son opcionales — un grupo sin encabezado es válido
 * (vista previa, portada) y entonces el cuerpo manda.
 */
export const SettingsSection: React.FC<{
  title?: string;
  description?: ReactNode;
  /** Acciones alineadas a la derecha del encabezado (subir, quitar…). */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}> = ({ title, description, actions, children, className, bodyClassName }) => (
  <section className={cn("px-5 py-6 sm:px-6", className)}>
    {(title || actions) && (
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          {title && (
            <h3 className="text-theme-sm font-semibold tracking-tight text-secondary-600 dark:text-white">
              {title}
            </h3>
          )}
          {description && (
            <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-none items-center gap-2">{actions}</div>}
      </div>
    )}
    <div className={bodyClassName}>{children}</div>
  </section>
);

/**
 * Lista de filas dentro de un grupo. Las filas se separan con una línea, no
 * con márgenes: es lo que hace legible un bloque de ajustes de altura variable.
 */
export const SettingsRowGroup: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div
    className={cn(
      "divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800",
      className
    )}
  >
    {children}
  </div>
);

/**
 * Fila de ajuste: icono + título + descripción + control a la derecha, con un
 * cuerpo opcional que se despliega debajo (separado por una línea y alineado
 * con el texto, no con el icono).
 *
 * ⚠️ `icon` es **opcional** a propósito. El asistente tiene apartados que no son
 * una fuente de conocimiento sino un interruptor con su explicación ("Permitir
 * tomar pedidos fuera de horario", "Desplegar catálogo visual en tarjetas"): una
 * fila sin icono es la forma correcta de pintarlos, y sin esta opción habría que
 * inventarles un icono o volver a escribir el bloque a mano. Cuando no hay
 * icono tampoco hay sangría en el cuerpo desplegable: los 13 que alinean con el
 * texto son `10` del tile + `3.5` del hueco, y sin tile no existen.
 *
 * `data-settings-row` no es decorativo: identifica la fila como unidad. El
 * guardián del gating por módulo necesita leer **una** fila (la de pedidos) y no
 * la tarjeta entera, porque "Sin módulo" aparece también en la de inventarios y
 * el lector amplio daría verde por el motivo equivocado.
 */
export const SettingsRow: React.FC<{
  icon?: ElementType;
  title: ReactNode;
  description?: ReactNode;
  /** Distintivo junto al título (estado, contador, "Demostración"…). */
  badge?: ReactNode;
  /** Control de la derecha (un `Toggle`, botones…). */
  action?: ReactNode;
  /** Contenido desplegable bajo la fila. */
  children?: ReactNode;
  /** Clase extra para el cuerpo desplegable. */
  bodyClassName?: string;
}> = ({ icon: Icon, title, description, badge, action, children, bodyClassName }) => (
  <div data-settings-row="" className="space-y-4 p-5">
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3.5">
        {Icon && (
          <div className="mt-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-[10.5px] bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-theme-sm font-semibold text-secondary-600 dark:text-white">
              {title}
            </h4>
            {badge}
          </div>
          {description && (
            <p className="text-theme-sm leading-relaxed text-gray-500 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && <div className="flex flex-none items-center gap-2">{action}</div>}
    </div>

    {children && (
      <div
        className={cn(
          "space-y-4 border-t border-gray-100 pt-4 dark:border-gray-800",
          Icon && "sm:pl-13",
          bodyClassName
        )}
      >
        {children}
      </div>
    )}
  </div>
);

/**
 * Sub-panel dentro de un grupo: un bloque gris para agrupar datos relacionados
 * (estado de conexión, ajustes de un canal). Reemplaza el `rounded-xl bg-gray-50`
 * escrito a mano.
 *
 * ⚠️ Usa `flex flex-col gap-3`, no `space-y-3`. La separación por márgenes de
 * `space-y-*` se rompe en silencio cuando un consumidor cambia el panel a fila:
 * el `margin-top` del segundo hijo lo desplaza 12 px hacia abajo en vez de
 * separarlo a la derecha. Con `gap` el consumidor sólo tiene que pedir
 * `flex-row` y la dirección se resuelve por `tailwind-merge`.
 */
export const SettingsSubPanel: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div className={cn("flex flex-col gap-3 rounded-xl bg-gray-50 p-4 dark:bg-gray-800", className)}>
    {children}
  </div>
);

/**
 * Rejilla de campos.
 *
 * Dos columnas en escritorio, una en móvil — el patrón de la referencia
 * (rótulo arriba, control debajo). Existía escrito a mano como
 * `grid grid-cols-1 sm:grid-cols-2 gap-4` (y con `sm:grid-cols-3`) en cada
 * tab, con separaciones distintas entre sí.
 */
export const SettingsFieldGrid: React.FC<{
  children: ReactNode;
  cols?: 2 | 3;
  className?: string;
}> = ({ children, cols = 2, className }) => (
  <div
    className={cn(
      "grid grid-cols-1 gap-x-5 gap-y-4",
      cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2",
      className
    )}
  >
    {children}
  </div>
);

/**
 * Rótulo de campo.
 *
 * ⚠️ Mismo estilo que el rótulo que pinta `Field` del DS
 * (`text-sm font-medium text-gray-700`). No es casual: la mitad de los campos
 * de estos tabs son `Field` y la otra mitad son `<select>` nativos (el `Select`
 * del DS es **no controlado** y aquí hacen falta controlados), así que el
 * rótulo suelto tiene que verse **igual** que el del DS o el formulario se lee
 * con dos voces. Si algún día se cambia `Field`, hay que cambiar esto a la vez.
 */
export const SettingsLabel: React.FC<{ children: ReactNode; htmlFor?: string }> = ({
  children,
  htmlFor,
}) => (
  <label
    htmlFor={htmlFor}
    className="mb-1.5 block text-theme-sm font-medium text-gray-700 dark:text-gray-300"
  >
    {children}
  </label>
);

/** Nota al pie de un campo o grupo. */
export const SettingsHint: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <p className={cn("text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400", className)}>
    {children}
  </p>
);

/** Rótulo de un subgrupo dentro de una fila (una lista de capacidades, p. ej.). */
export const SettingsGroupLabel: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <p className={cn("text-theme-xs font-medium text-gray-500 dark:text-gray-400", className)}>
    {children}
  </p>
);

/** Etiqueta neutra junto a un nombre ("Nativa (Tool)"). */
export const SettingsTag: React.FC<{ children: ReactNode }> = ({ children }) => (
  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-theme-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
    {children}
  </span>
);

/** Contador de un origen ("3 / 5 capacidades activas"). */
export const SettingsCounter: React.FC<{ children: ReactNode }> = ({ children }) => (
  <span className="rounded-full border border-gray-200/60 bg-gray-100 px-2 py-0.5 text-theme-xs font-medium text-gray-500 dark:border-gray-700/60 dark:bg-gray-800/80 dark:text-gray-400">
    {children}
  </span>
);

/**
 * Distintivo de estado de un origen o de un módulo.
 *
 * Tres variantes convivían en el asistente: con punto, sin punto y con icono de
 * check; y dos de ellas repetían el mismo par de tonos `success`/neutro escrito
 * a mano seis veces. Aquí el tono se decide con un booleano y el adorno de la
 * izquierda es opcional — el punto se sustituye por el icono cuando lo hay, para
 * que el chip mida lo mismo en ambos casos.
 */
export const SettingsStatusPill: React.FC<{
  active: boolean;
  /** Icono a la izquierda. Sin él se dibuja el punto de estado. */
  icon?: ElementType;
  children: ReactNode;
}> = ({ active, icon: Icon, children }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-theme-xs font-medium",
      active
        ? "border-success-200 bg-success-50 text-success-700 dark:border-success-800 dark:bg-success-950/40 dark:text-success-300"
        : "border-gray-200 bg-gray-100 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
    )}
  >
    {Icon ? (
      <Icon className="h-3 w-3" />
    ) : (
      <span
        className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-success-500" : "bg-gray-400")}
      />
    )}
    {children}
  </span>
);

/**
 * Clase de un control nativo (`<select>`, `<input>` suelto).
 *
 * Estaba copiada literal en tres `<select>` del mismo archivo y en varios
 * `<input>` más: cualquier ajuste de altura o de anillo había que hacerlo en
 * todas las copias, y ya habían divergido. Una sola definición.
 */
export const settingsControlClass =
  "h-11 w-full rounded-xl border border-gray-300 bg-transparent px-3.5 py-2.5 text-theme-sm font-medium text-gray-900 shadow-theme-xs transition-all focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white";

/**
 * Variante compacta para controles dentro de un sub-panel gris o de un
 * formulario embebido, donde el campo no compite con el formulario principal y
 * `h-11` lo desbordaría.
 */
export const settingsControlClassCompact =
  "h-9 rounded-xl border border-gray-300 bg-white px-3 py-1 text-theme-sm font-medium text-gray-900 shadow-theme-xs transition-all focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white";

/**
 * Acción de archivo en estilo **contorno** (subir logo, portada, catálogo, FAQ,
 * políticas). Es un `<label>` nativo y no un `Button` del DS porque envuelve un
 * `<input type="file">` oculto y `Button` no soporta `asChild`.
 *
 * ⚠️ En contorno, no sólido. Eran `bg-brand-500`: con "Subir logo", "Subir
 * portada", "Subir catálogo" y el "Guardar cambios" del pie, la pantalla
 * mostraba cuatro botones naranjas sólidos a la vez y el acento dejaba de
 * señalar cuál es la acción principal. En un panel de ajustes el único sólido
 * es el de guardar; subir es una acción **de grupo**.
 */
export const settingsUploadAction =
  "inline-flex cursor-pointer items-center gap-2 rounded-full border border-gray-300 bg-white px-3.5 py-2 text-theme-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]";

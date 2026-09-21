import type { ReactNode } from 'react';

export interface SegmentOption<V extends string = string> {
  value: V;
  label: ReactNode;
  /** Icono opcional a la izquierda del label. */
  icon?: ReactNode;
  /** Badge/contador opcional a la derecha del label. */
  badge?: ReactNode;
}

export interface SegmentedControlProps<V extends string = string> {
  /** Opciones del control. */
  options: SegmentOption<V>[];
  /** Valor seleccionado. */
  value: V;
  /** Callback al seleccionar una opción. */
  onValueChange?: (value: V) => void;
  /**
   * Estilo visual del segmento activo:
   *  - 'contrast' (default): activo oscuro (gray-950 / dark:white).
   *  - 'accent': activo naranja de marca (#FF3C10).
   *  - 'panel': activo blanco sobre track gris (look de pestañas suaves).
   */
  tone?: 'contrast' | 'accent' | 'panel';
  /** Intent tag para trazabilidad. */
  intent?: string;
  className?: string;
}

const NODE_ID = 'necto.el.segmented';

/**
 * Element: SegmentedControl — grupo de opciones mutuamente excluyentes con
 * estado activo (tabs, pills de filtro, conmutadores de vista).
 *
 * Node ID base: necto.el.segmented. Intent por defecto: input.segmented.
 * Cada opción emite su propio data-node-id/data-intent (…segment.<value>) y
 * data-state="active|inactive", con role="tab".
 *
 * Es un componente genérico (no declarado con ui_dsl) para preservar el tipo
 * literal de `value`/`onValueChange`; mantiene la convención de la capa
 * emitiendo data-node-id y data-intent.
 */
export function SegmentedControl<V extends string = string>({
  options,
  value,
  onValueChange,
  tone = 'accent',
  intent = 'input.segmented',
  className = '',
}: SegmentedControlProps<V>) {
  const activeClass =
    tone === 'accent'
      ? 'bg-brand-500 text-white shadow-theme-xs'
      : tone === 'panel'
        ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-theme-xs'
        : 'bg-secondary-600 text-white shadow-theme-xs';

  const inactiveClass =
    'text-gray-900/70 dark:text-gray-100/70 hover:text-gray-900 dark:hover:text-white';

  return (
    <div
      data-node-id={NODE_ID}
      data-intent={intent}
      role="tablist"
      className={`inline-flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700 ${className}`}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            data-node-id={`${NODE_ID}.segment.${opt.value}`}
            data-intent={`${intent}.${opt.value}`}
            data-state={active ? 'active' : 'inactive'}
            onClick={() => onValueChange?.(opt.value)}
            className={[
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-theme-xs font-bold transition-all cursor-pointer whitespace-nowrap',
              active ? activeClass : inactiveClass,
            ].join(' ')}
          >
            {opt.icon}
            <span>{opt.label}</span>
            {opt.badge}
          </button>
        );
      })}
    </div>
  );
}

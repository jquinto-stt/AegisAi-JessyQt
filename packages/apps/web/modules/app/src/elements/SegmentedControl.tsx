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
   *  - 'contrast' (default): activo oscuro (zinc-950 / dark:white).
   *  - 'accent': activo naranja de marca (#FF3F1A).
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
  tone = 'contrast',
  intent = 'input.segmented',
  className = '',
}: SegmentedControlProps<V>) {
  const activeClass =
    tone === 'accent'
      ? 'bg-[#FF3F1A] text-white shadow-2xs'
      : tone === 'panel'
        ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-2xs'
        : 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-2xs';

  const inactiveClass =
    'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100';

  return (
    <div
      data-node-id={NODE_ID}
      data-intent={intent}
      role="tablist"
      className={`inline-flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 ${className}`}
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
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
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

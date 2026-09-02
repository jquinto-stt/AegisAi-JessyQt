import type { SelectHTMLAttributes, ReactNode } from 'react';
import { ui_dsl, type ElementBaseProps } from './dsl';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends ElementBaseProps,
    Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className' | 'children'> {
  /** Etiqueta visible; si se omite, se renderiza solo el control. */
  label?: string;
  /** Opciones del select. Alternativamente se pueden pasar children <option>. */
  options?: SelectOption[];
  /** Texto de ayuda bajo el control. */
  hint?: ReactNode;
  variant?: 'default';
}

/**
 * Element: Select — desplegable etiquetado.
 * Node ID base: necto.el.select. Intent por defecto: input.select.
 *
 * Cubre el patrón de <select> del catálogo (categoría, orden, tipo de
 * selección de modificadores), emitiendo data-node-id/data-intent.
 */
export const Select = ui_dsl<SelectProps>({
  nodeId: 'necto.el.select',
  intent: ['input.select'],
  base: 'flex flex-col gap-1.5',
  render: ({ nodeId, intent, className, props, children }) => {
    const { label, options, hint, id, ...selectProps } = props as SelectProps;
    const selectId = id ?? `${nodeId}.${String(props.name ?? label ?? 'field')}`;

    const control = (
      <select
        id={selectId}
        data-node-id={`${nodeId}.control`}
        data-intent={`${intent}.control`}
        className={[
          'w-full appearance-none rounded-xl border bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-xs font-bold text-zinc-900 dark:text-zinc-100 outline-none transition-colors cursor-pointer',
          'border-zinc-200 dark:border-zinc-700 focus:border-[#FF3F1A] dark:focus:border-[#FF3F1A]',
        ].join(' ')}
        {...(selectProps as SelectHTMLAttributes<HTMLSelectElement>)}
      >
        {options
          ? options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))
          : children}
      </select>
    );

    // Sin label: devolvemos solo el control (con su data-node-id en el <select>).
    if (!label) {
      return (
        <div data-node-id={nodeId} data-intent={intent} className={className}>
          {control}
        </div>
      );
    }

    return (
      <label
        data-node-id={nodeId}
        data-intent={intent}
        htmlFor={selectId}
        className={className}
      >
        <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
          {label}
        </span>
        {control}
        {hint && (
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
            {hint}
          </span>
        )}
      </label>
    );
  },
});

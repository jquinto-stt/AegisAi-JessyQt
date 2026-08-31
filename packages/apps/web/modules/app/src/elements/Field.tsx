import type { InputHTMLAttributes, ReactNode } from 'react';
import { ui_dsl, type ElementBaseProps } from './dsl';

export interface FieldProps
  extends ElementBaseProps,
    Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'children'> {
  /** Etiqueta visible del campo. */
  label: string;
  /** Mensaje de error (si existe, marca el campo como inválido). */
  error?: string;
  /** Texto de ayuda bajo el input. */
  hint?: ReactNode;
  /**
   * Estilo de la etiqueta:
   *  - 'mono' (default): mono uppercase tracking-widest (look "spec").
   *  - 'bold': negrita compacta (look de formularios de los módulos).
   */
  labelStyle?: 'mono' | 'bold';
  /** Usa tipografía monoespaciada en el input (útil para precios/números). */
  mono?: boolean;
  variant?: 'default';
}

/**
 * Element: Field — input etiquetado con validación.
 * Node ID base: necto.el.field. Intent por defecto: input.text.
 *
 * El `intent` se puede sobrescribir por instancia para declarar el propósito
 * del dato: <Field intent="catalog.product.price" />. Emite data-node-id y
 * data-intent para trazabilidad.
 */
export const Field = ui_dsl<FieldProps>({
  nodeId: 'necto.el.field',
  intent: ['input.text'],
  base: 'flex flex-col gap-1.5',
  render: ({ nodeId, intent, className, props, children }) => {
    const {
      label,
      error,
      hint,
      id,
      labelStyle = 'mono',
      mono = false,
      ...inputProps
    } = props as FieldProps;
    const inputId = id ?? `${nodeId}.${String(props.name ?? label)}`;
    const invalid = Boolean(error);

    const labelClass =
      labelStyle === 'bold'
        ? 'text-xs font-bold text-zinc-900 dark:text-zinc-100'
        : 'text-xs font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400';

    return (
      <label
        data-node-id={nodeId}
        data-intent={intent}
        htmlFor={inputId}
        className={className}
      >
        <span className={labelClass}>{label}</span>
        <input
          id={inputId}
          data-node-id={`${nodeId}.input`}
          data-intent={`${intent}.control`}
          aria-invalid={invalid}
          className={[
            'w-full rounded-xl border bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 outline-none transition-colors',
            mono ? 'font-mono font-bold' : 'font-bold',
            'placeholder:text-zinc-400 dark:placeholder:text-zinc-600',
            invalid
              ? 'border-red-400 dark:border-red-700 focus:border-red-500'
              : 'border-zinc-200 dark:border-zinc-700 focus:border-[#FF3F1A] dark:focus:border-[#FF3F1A]',
          ].join(' ')}
          {...(inputProps as InputHTMLAttributes<HTMLInputElement>)}
        />
        {invalid ? (
          <span
            data-node-id={`${nodeId}.error`}
            data-intent="validation.error"
            className="text-[11px] font-medium text-red-600 dark:text-red-400"
          >
            {error}
          </span>
        ) : hint ? (
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
            {hint}
          </span>
        ) : null}
        {children}
      </label>
    );
  },
});

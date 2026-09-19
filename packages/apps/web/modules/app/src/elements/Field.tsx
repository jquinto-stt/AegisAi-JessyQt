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
      labelStyle = 'bold',
      mono = false,
      ...inputProps
    } = props as FieldProps;
    const inputId = id ?? `${nodeId}.${String(props.name ?? label)}`;
    const invalid = Boolean(error);

    return (
      <label
        data-node-id={nodeId}
        data-intent={intent}
        htmlFor={inputId}
        className={className}
      >
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <input
          id={inputId}
          data-node-id={`${nodeId}.input`}
          data-intent={`${intent}.control`}
          aria-invalid={invalid}
          className={[
            'h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 transition-colors dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30',
            mono ? 'font-mono' : 'font-normal',
            invalid
              ? 'border-error-500 focus:border-error-300 focus:ring-error-500/20 dark:border-error-500'
              : 'border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 bg-transparent text-gray-800 dark:focus:border-brand-800',
          ].join(' ')}
          {...(inputProps as InputHTMLAttributes<HTMLInputElement>)}
        />
        {invalid ? (
          <span
            data-node-id={`${nodeId}.error`}
            data-intent="validation.error"
            className="text-xs font-medium text-error-500 dark:text-error-400 mt-0.5"
          >
            {error}
          </span>
        ) : hint ? (
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {hint}
          </span>
        ) : null}
        {children}
      </label>
    );
  },
});

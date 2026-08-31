import type { TextareaHTMLAttributes, ReactNode } from 'react';
import { ui_dsl, type ElementBaseProps } from './dsl';

export interface TextareaProps
  extends ElementBaseProps,
    Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className' | 'children'> {
  /** Etiqueta visible; si se omite, se renderiza solo el control. */
  label?: string;
  /** Texto de ayuda bajo el control. */
  hint?: ReactNode;
  variant?: 'default';
}

/**
 * Element: Textarea — área de texto etiquetada.
 * Node ID base: necto.el.textarea. Intent por defecto: input.multiline.
 *
 * Cubre el patrón de <textarea> del catálogo (descripción de plato,
 * instrucciones para cocina), emitiendo data-node-id/data-intent.
 */
export const Textarea = ui_dsl<TextareaProps>({
  nodeId: 'necto.el.textarea',
  intent: ['input.multiline'],
  base: 'flex flex-col gap-1.5',
  render: ({ nodeId, intent, className, props, children }) => {
    const { label, hint, id, ...textareaProps } = props as TextareaProps;
    const areaId = id ?? `${nodeId}.${String(props.name ?? label ?? 'field')}`;

    const control = (
      <textarea
        id={areaId}
        data-node-id={`${nodeId}.control`}
        data-intent={`${intent}.control`}
        className={[
          'w-full rounded-xl border bg-zinc-50 dark:bg-zinc-900 p-3 text-xs text-zinc-900 dark:text-zinc-100 outline-none transition-colors resize-none',
          'placeholder:text-zinc-400 dark:placeholder:text-zinc-600',
          'border-zinc-200 dark:border-zinc-800 focus:border-[#FF3F1A] dark:focus:border-[#FF3F1A]',
        ].join(' ')}
        {...(textareaProps as TextareaHTMLAttributes<HTMLTextAreaElement>)}
      />
    );

    if (!label) {
      return (
        <div data-node-id={nodeId} data-intent={intent} className={className}>
          {control}
          {children}
        </div>
      );
    }

    return (
      <label
        data-node-id={nodeId}
        data-intent={intent}
        htmlFor={areaId}
        className={className}
      >
        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
          {label}
        </span>
        {control}
        {hint && (
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
            {hint}
          </span>
        )}
        {children}
      </label>
    );
  },
});

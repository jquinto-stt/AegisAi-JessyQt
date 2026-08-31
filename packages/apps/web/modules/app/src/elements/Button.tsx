import type { ButtonHTMLAttributes } from 'react';
import { ui_dsl, type ElementBaseProps } from './dsl';

export interface ButtonProps
  extends ElementBaseProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> {
  variant?: 'primary' | 'accent' | 'outline' | 'ghost';
}

/**
 * Element: Button — acción atómica.
 * Node ID base: necto.el.button (+ sufijo de variante).
 * Intent por defecto: action.generic (sobreescribible por instancia).
 *
 * Variantes:
 *  - primary: oscuro (zinc-950) que vira a naranja en hover.
 *  - accent:  naranja sólido de marca (#FF3F1A) — CTA fuerte.
 *  - outline: contorno sutil.
 *  - ghost:   sin fondo, solo texto.
 */
export const Button = ui_dsl<ButtonProps>({
  nodeId: 'necto.el.button',
  intent: ['action.generic'],
  base: 'inline-flex items-center justify-center gap-1.5 rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 select-none active:scale-[0.98]',
  variants: {
    primary:
      'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-[#FF3F1A] dark:hover:bg-[#FF3F1A] dark:hover:text-white shadow-2xs',
    accent:
      'bg-[#FF3F1A] text-white hover:bg-[#e03413] shadow-xs',
    outline:
      'border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white',
    ghost:
      'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60',
  },
  render: ({ nodeId, intent, className, props, children }) => (
    <button
      type="button"
      data-node-id={nodeId}
      data-intent={intent}
      className={className}
      {...props}
    >
      {children}
    </button>
  ),
});

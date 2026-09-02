import type { ButtonHTMLAttributes } from 'react';
import { ui_dsl, type ElementBaseProps } from './dsl';

export interface ButtonProps
  extends ElementBaseProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> {
  variant?: 'primary' | 'accent' | 'outline' | 'ghost';
}

/**
 * Element: Button — acción atómica con la paleta oficial Necto.
 *
 * Variantes oficiales:
 *  - primary: Naranja dominante (#FF3F1A) — acción principal / CTA.
 *  - accent:  Azul terciario de contraste (#190088) — acción secundaria destacada.
 *  - outline: Contorno sutil sobre superficie de fondo (#ECECEC / #212121).
 *  - ghost:   Sin fondo, texto de fuente oficial (#212121 / #ECECEC).
 */
export const Button = ui_dsl<ButtonProps>({
  nodeId: 'necto.el.button',
  intent: ['action.generic'],
  base: 'inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 select-none active:scale-[0.98]',
  variants: {
    primary:
      'bg-[#FF3F1A] text-white hover:bg-[#e03716] shadow-xs active:bg-[#c92f12]',
    accent:
      'bg-[#190088] text-white hover:bg-[#14006e] shadow-xs active:bg-[#0f0054]',
    outline:
      'border border-zinc-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-800/80 text-[#212121] dark:text-[#ECECEC] hover:bg-[#ECECEC] dark:hover:bg-zinc-700',
    ghost:
      'text-[#212121]/80 dark:text-[#ECECEC]/80 hover:text-[#212121] dark:hover:text-white hover:bg-[#ECECEC]/70 dark:hover:bg-zinc-800/70',
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

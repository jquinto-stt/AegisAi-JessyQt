import type { HTMLAttributes } from 'react';
import { ui_dsl, type ElementBaseProps } from './dsl';

export interface CardProps
  extends ElementBaseProps,
    Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'children'> {
  variant?: 'default' | 'elevated' | 'dashed';
}

/**
 * Element: Card — contenedor de superficie.
 * Node ID base: necto.el.card. Intent por defecto: surface.container.
 */
export const Card = ui_dsl<CardProps>({
  nodeId: 'necto.el.card',
  intent: ['surface.container'],
  base: 'rounded-3xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100',
  variants: {
    default: 'border border-zinc-200/80 dark:border-zinc-800 shadow-2xs',
    elevated:
      'border border-zinc-200 dark:border-zinc-800 shadow-sm',
    dashed:
      'border border-dashed border-zinc-300 dark:border-zinc-700 bg-transparent',
  },
  render: ({ nodeId, intent, className, props, children }) => (
    <div
      data-node-id={nodeId}
      data-intent={intent}
      className={className}
      {...props}
    >
      {children}
    </div>
  ),
});

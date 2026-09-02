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
  base: 'rounded-3xl bg-white dark:bg-[#2C2D31] text-[#212121] dark:text-[#ECECEC]',
  variants: {
    default: 'border border-[#ECECEC] dark:border-zinc-700 shadow-2xs',
    elevated:
      'border border-[#ECECEC] dark:border-zinc-700 shadow-sm',
    dashed:
      'border border-dashed border-[#FF3F1A]/50 bg-transparent',
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

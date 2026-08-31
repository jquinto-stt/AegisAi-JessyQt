import type { HTMLAttributes } from 'react';
import { ui_dsl, type ElementBaseProps } from './dsl';

export interface BadgeProps
  extends ElementBaseProps,
    Omit<HTMLAttributes<HTMLSpanElement>, 'className' | 'children'> {
  variant?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
}

/**
 * Element: Badge — etiqueta de estado / metadato.
 * Node ID base: necto.el.badge. Intent por defecto: status.label.
 */
export const Badge = ui_dsl<BadgeProps>({
  nodeId: 'necto.el.badge',
  intent: ['status.label'],
  base: 'inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border',
  variants: {
    neutral:
      'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
    accent:
      'bg-[#FF3F1A]/10 text-[#FF3F1A] border-[#FF3F1A]/30',
    success:
      'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-900/60',
    warning:
      'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800/80',
    danger:
      'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200/60 dark:border-red-900/60',
  },
  render: ({ nodeId, intent, className, props, children }) => (
    <span
      data-node-id={nodeId}
      data-intent={intent}
      className={className}
      {...props}
    >
      {children}
    </span>
  ),
});

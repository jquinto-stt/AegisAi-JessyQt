import type { ReactNode } from 'react';
import { ui_dsl, type ElementBaseProps } from './dsl';

export interface ToggleProps extends ElementBaseProps {
  /** Estado del interruptor. */
  checked: boolean;
  /** Callback al alternar; recibe el nuevo valor. */
  onCheckedChange?: (next: boolean) => void;
  /** Etiqueta accesible (aria-label) cuando no hay texto visible. */
  ariaLabel?: string;
  /** Deshabilita el control. */
  disabled?: boolean;
  /** Tamaño del switch. */
  size?: 'sm' | 'md';
  /** Título nativo (tooltip). */
  title?: string;
  variant?: 'default';
}

/**
 * Element: Toggle — interruptor ON/OFF accesible.
 * Node ID base: necto.el.toggle. Intent por defecto: input.toggle.
 *
 * Reemplaza los switches manuales del proyecto (canales, pausa, sonido,
 * preferencias). Renderiza un <button role="switch"> con aria-checked, track
 * y thumb; el track vira a #FF3F1A cuando está activo. Emite data-node-id y
 * data-intent, y data-state="on|off" para trazabilidad/tests.
 */
export const Toggle = ui_dsl<ToggleProps>({
  nodeId: 'necto.el.toggle',
  intent: ['input.toggle'],
  base: 'relative rounded-full transition-colors cursor-pointer flex-none p-0.5 disabled:opacity-40 disabled:cursor-not-allowed',
  render: ({ nodeId, intent, className, props }) => {
    const {
      checked,
      onCheckedChange,
      ariaLabel,
      disabled,
      size = 'md',
      title,
    } = props as ToggleProps;

    const dims =
      size === 'sm'
        ? { track: 'w-9 h-5', thumb: 'w-4 h-4', on: 'translate-x-4', off: 'translate-x-0' }
        : { track: 'w-12 h-6', thumb: 'w-5 h-5', on: 'translate-x-6', off: 'translate-x-0' };

    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        title={title}
        disabled={disabled}
        data-node-id={nodeId}
        data-intent={intent}
        data-state={checked ? 'on' : 'off'}
        onClick={() => onCheckedChange?.(!checked)}
        className={[
          className,
          dims.track,
          checked ? 'bg-[#FF3F1A]' : 'bg-zinc-300 dark:bg-zinc-700',
        ].join(' ')}
      >
        <span
          className={[
            'block rounded-full bg-white shadow-2xs transition-transform',
            dims.thumb,
            checked ? dims.on : dims.off,
          ].join(' ')}
        />
      </button>
    );
  },
});

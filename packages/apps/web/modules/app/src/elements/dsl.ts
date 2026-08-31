/**
 * ui_dsl — Design DSL de la capa Elements (convención del proyecto Necto).
 *
 * IMPORTANTE (transparencia): esto NO es una API de WebiAI. WebiAI no expone
 * un SDK de "Elements". `ui_dsl` es una utilidad propia de este proyecto que
 * formaliza, sobre React + Tailwind, los conceptos del checklist:
 *
 *   - Element     → componente UI atómico declarado con ui_dsl()
 *   - Node ID     → identificador estable por nodo (data-node-id)
 *   - Intent Tag  → metadato de intención por nodo/acción (data-intent)
 *   - Variants    → variantes visuales tipadas (primary, outline, ...)
 *
 * Un Element declarado con ui_dsl() siempre emite `data-node-id` y
 * `data-intent` en su nodo raíz, lo que lo hace trazable para telemetría,
 * testing y razonamiento sobre el propósito de cada nodo.
 */
import type { ReactNode } from 'react';

/** Propiedades base que ui_dsl inyecta/gestiona en cada Element. */
export interface ElementBaseProps {
  /**
   * Sobrescribe (o extiende) el intent declarado del Element para una
   * instancia concreta. Ej: <Button intent="advisory.step.confirm" />
   */
  intent?: string | string[];
  /** Clases Tailwind adicionales, mezcladas después de la variante. */
  className?: string;
  /** Selección de variante declarada (ej: "primary" | "outline"). */
  variant?: string;
  children?: ReactNode;
}

/** Contexto resuelto que ui_dsl entrega a la función render de un Element. */
export interface RenderContext<P> {
  /** Node ID estable y resuelto (incluye sufijo de variante si aplica). */
  nodeId: string;
  /** Intent efectivo (string única, coma-separada si eran varios). */
  intent: string;
  /** Clases finales ya combinadas (base + variante + className). */
  className: string;
  /** Resto de props del consumidor, sin las gestionadas por el DSL. */
  props: Omit<P, keyof ElementBaseProps>;
  /** children explícito, por conveniencia. */
  children?: ReactNode;
}

export interface UiDslConfig<P extends ElementBaseProps> {
  /**
   * Node ID base y estable del Element. Convención:
   *   necto.el.<nombre>[.<subtipo>]
   * Ej: 'necto.el.button', 'necto.el.card', 'necto.el.field'
   */
  nodeId: string;
  /**
   * Intent tags por defecto del Element. Declaran su propósito.
   * Ej: ['action.generic'] para un botón genérico.
   */
  intent: string | string[];
  /** Clases base aplicadas siempre, antes de la variante. */
  base?: string;
  /**
   * Variantes visuales tipadas. La clave es el nombre de variante y el valor
   * son clases Tailwind. La primera clave declarada es la variante por defecto.
   */
  variants?: Record<string, string>;
  /** Función de render que recibe el contexto ya resuelto por el DSL. */
  render: (ctx: RenderContext<P>) => ReactNode;
}

/** Normaliza un intent (string | string[]) a una única cadena estable. */
function normalizeIntent(intent: string | string[]): string {
  return Array.isArray(intent) ? intent.join(',') : intent;
}

/** Combina clases ignorando falsy. Mantiene orden: base → variante → extra. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/**
 * Declara un Element. Devuelve un componente React tipado que:
 *   1. Resuelve el Node ID (base + sufijo de variante).
 *   2. Resuelve el Intent efectivo (declarado o sobrescrito por instancia).
 *   3. Combina las clases (base + variante seleccionada + className).
 *   4. Delega el render final a `render(ctx)`.
 *
 * @example
 * export const Button = ui_dsl<ButtonProps>({
 *   nodeId: 'necto.el.button',
 *   intent: ['action.generic'],
 *   base: 'inline-flex items-center rounded-xl font-bold',
 *   variants: { primary: 'bg-[#FF3F1A] text-white', outline: 'border' },
 *   render: ({ nodeId, intent, className, props, children }) => (
 *     <button data-node-id={nodeId} data-intent={intent} className={className} {...props}>
 *       {children}
 *     </button>
 *   ),
 * });
 */
export function ui_dsl<P extends ElementBaseProps = ElementBaseProps>(
  config: UiDslConfig<P>,
) {
  const variantKeys = config.variants ? Object.keys(config.variants) : [];
  const defaultVariant = variantKeys[0];

  function Element(props: P) {
    const {
      intent: intentOverride,
      className,
      variant,
      children,
      ...rest
    } = props as ElementBaseProps & Record<string, unknown>;

    const selectedVariant = variant ?? defaultVariant;
    const variantClasses =
      config.variants && selectedVariant
        ? config.variants[selectedVariant] ?? ''
        : '';

    // Node ID estable; si hay variante seleccionada la anexamos para
    // trazabilidad fina (ej: necto.el.button.primary).
    const nodeId = selectedVariant
      ? `${config.nodeId}.${selectedVariant}`
      : config.nodeId;

    const intent = normalizeIntent(intentOverride ?? config.intent);

    const finalClassName = cx(config.base, variantClasses, className as string);

    return config.render({
      nodeId,
      intent,
      className: finalClassName,
      props: rest as Omit<P, keyof ElementBaseProps>,
      children,
    }) as ReactNode;
  }

  // Nombre útil en React DevTools + metadatos accesibles para tests/telemetría.
  Element.displayName = `Element(${config.nodeId})`;
  Element.nodeId = config.nodeId;
  Element.intent = normalizeIntent(config.intent);
  Element.variants = variantKeys;

  return Element;
}

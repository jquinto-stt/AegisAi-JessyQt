import { ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Custom tailwind-merge configuration that recognizes theme-specific classes.
 * 
 * @context Why this is needed
 * 
 * The project uses custom CSS theme variables defined in index.css under @theme:
 * - `text-theme-xl` (20px/30px line-height)
 * - `text-theme-sm` (14px/20px line-height)  
 * - `text-theme-xs` (12px/18px line-height)
 * - `text-title-*` variants for headings
 * 
 * Standard tailwind-merge doesn't recognize these as fontSize classes, so when
 * you try to override `text-theme-xl` with `text-base`, both classes remain
 * instead of `text-base` replacing `text-theme-xl`.
 * 
 * This custom merge extends the fontSize classGroup to include our theme classes,
 * enabling proper class conflict resolution.
 * 
 * @example
 * ```tsx
 * // Without custom merge: "text-theme-xl text-base" (both remain - broken)
 * // With custom merge: "text-base" (text-theme-xl removed - correct)
 * cn("text-theme-xl", "text-base") // => "text-base"
 * ```
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        // Theme text sizes (from index.css @theme)
        'text-theme-xl',
        'text-theme-sm', 
        'text-theme-xs',
        // Title sizes
        'text-title-2xl',
        'text-title-xl',
        'text-title-lg',
        'text-title-md',
        'text-title-sm',
      ],
    },
  },
});

/**
 * Utility function to merge class names with Tailwind CSS conflict resolution.
 * 
 * Combines clsx (conditional classes) with tailwind-merge (conflict resolution).
 * Extended to recognize custom theme classes like `text-theme-xl`.
 * 
 * @example Basic usage
 * ```tsx
 * cn("px-4 py-2", "px-6") // => "py-2 px-6"
 * ```
 * 
 * @example With theme classes
 * ```tsx
 * cn("text-theme-xl", "text-base") // => "text-base"
 * cn("text-title-md", "text-lg") // => "text-lg"
 * ```
 * 
 * @example Conditional classes
 * ```tsx
 * cn("base-class", isActive && "active-class", className)
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(...inputs));
}

/**
 * Iniciales de 1 o 2 letras para el respaldo de un avatar.
 *
 *   "Camila Ortiz"    → "CO"
 *   "Camila"          → "CA"   (nombre de una sola palabra: dos letras, no una)
 *   "  "              → "?"    (nunca una cadena vacía: dejaría el avatar en blanco)
 *
 * Vive aquí, y no en cada pantalla, porque había **tres copias** de esta función
 * (conversaciones, equipo y el simulador de WhatsApp) y dos de ellas ni siquiera
 * coincidían: la de conversaciones devolvía una sola letra para un nombre de una
 * palabra. Una persona con el mismo nombre tiene que verse igual en toda la app.
 */
export function inicialesDe(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

/**
 * Formatea un importe en pesos colombianos con separador de miles y `$`.
 *
 *   45000  → "$45.000"
 *   1234.6 → "$1.235"   (redondea: no se muestran centavos)
 *
 * ## Por qué vive aquí
 *
 * Había **cuatro copias** del mismo formato repartidas por las pantallas de
 * pedidos y conversaciones (`money` en `PanelContexto`, `CrearPedidoPage`,
 * `InicioPage` y `AnaliticaPage`). Es el mismo caso que `inicialesDe`: un
 * formato que el usuario ve en varias pantallas no puede decidirse en cada una,
 * porque basta con que una cambie para que el mismo importe se lea distinto
 * según dónde se mire.
 *
 * ## Las cuatro copias NO son equivalentes (medido el 17/09)
 *
 * Solo `AnaliticaPage` coincide con esta función **para todo valor**:
 *
 *   AnaliticaPage   `$${Math.round(n).toLocaleString("es-CO")}`  ← idéntica
 *   PanelContexto   `$${n.toLocaleString("es-CO")}`              ← sin redondeo
 *   CrearPedidoPage `$${n.toLocaleString("es-CO")}`              ← sin redondeo
 *   InicioPage      `$${n.toLocaleString("es-CO")}`              ← sin redondeo
 *
 * Las tres sin `Math.round` coinciden con esta **solo sobre enteros**. Con un
 * valor fraccionario imprimen centavos (`$1.234,6`) donde esta redondea
 * (`$1.235`). Hoy no se nota: `precio` y `costoEnvio` son enteros y todos los
 * puntos de llamada suman o multiplican enteros, así que el resultado es
 * idéntico en las cuatro pantallas.
 *
 * La excepción teórica es `money(Number(pagaCon))` en `CrearPedidoPage`: ahí el
 * valor lo teclea el usuario y el input lleva `step="1000"`, pero `step` no
 * impide escribir un decimal. Redondear es lo correcto en COP (no hay centavos)
 * y es lo que ya hacen `AnaliticaPage` y el código nuevo — pero es un cambio
 * visible en ese caso, no un no-op.
 *
 * Por eso la migración sigue pendiente y es una decisión, no una limpieza:
 * unificar las tres sin `Math.round` exige aceptar ese redondeo. Además
 * `AnaliticaPage.tsx` tenía cambios **sin commitear de otra sesión** en vuelo
 * cuando se midió esto (mtime 13:27): no tocar ese archivo hasta que aterricen.
 */
export function formatoMoneda(valor: number): string {
  return `$${Math.round(valor).toLocaleString("es-CO")}`;
}

/**
 * Retardo de entrada para el elemento `indice` de una lista escalonada.
 *
 * Devuelve un valor listo para `animationDelay`:
 *
 * ```tsx
 * {filas.map((f, i) => (
 *   <tr
 *     key={f.id}
 *     className="animate-entrada-lista"
 *     style={{ animationDelay: retardoEscalonado(i) }}
 *   >
 * ))}
 * ```
 *
 * ## Por qué 40 ms
 *
 * Por debajo de ~30 ms los elementos entran tan juntos que el ojo los lee como
 * un bloque: se paga el coste de la animación sin ganar la sensación de
 * secuencia. Por encima de ~60 ms la lista se siente lenta en cuanto pasa de
 * seis o siete filas, que aquí es el caso normal.
 *
 * ## Por qué hay un tope
 *
 * Sin tope, el elemento 20 de una tabla entraría a los 800 ms: la lista se ve
 * vacía y luego se rellena sola, lo que se lee como un fallo de carga. Con el
 * tope, a partir del séptimo todos entran a la vez — el ritmo de los primeros se
 * conserva y la lista nunca parece rota.
 *
 * ## Interacción con `prefers-reduced-motion`
 *
 * No hace falta comprobarlo aquí. La guarda de `css/base.css` pone
 * `animation: none` sobre `.animate-entrada-lista`, y sin animación el retardo
 * no tiene nada que retrasar: el elemento se pinta de inmediato. Devolver `0`
 * daría el mismo resultado, pero solo si cada consumidor se acordara de pedirlo.
 *
 * Vive aquí, y no en cada lista, porque el ritmo y el tope son **una sola
 * decisión**: si cada pantalla eligiera su paso, el escalonado se sentiría
 * distinto en cada sitio y dejaría de leerse como un sistema.
 */
export function retardoEscalonado(indice: number, pasoMs = 40, tope = 6): string {
  return `${Math.min(Math.max(indice, 0), tope) * pasoMs}ms`;
}

/**
 * ¿El sistema pidió menos movimiento?
 *
 * El CSS ya neutraliza por su cuenta las animaciones declaradas en
 * `css/theme.css` (ver la guarda en `css/base.css`). Esta consulta existe para
 * los casos en que **no basta con el CSS**, porque lo que hay que decidir no es
 * qué se pinta sino **cuánto se espera** o si una librería externa debe animar:
 *
 * - `useMontajeAnimado` la usa para colapsar a cero la ventana de salida. Sin
 *   esto, el nodo se quedaría montado y visible durante el retardo aunque su
 *   animación estuviera neutralizada: un panel congelado 120 ms y luego
 *   desaparecido de golpe.
 * - `Chart` la usa para pasarle `animation.enabled: false` a ApexCharts, que
 *   anima por defecto y no entiende de Tailwind ni de media queries.
 *
 * **No es reactiva**: refleja la preferencia en el momento de la llamada. Si el
 * usuario la cambia con la app abierta, el CSS reacciona al instante pero lo que
 * se haya decidido con esta función no se recalcula hasta el siguiente montaje.
 * Es un desfase acotado a un caso de borde, y el precio de evitarlo (un
 * `matchMedia` con listener y estado en cada consumidor) no lo justifica.
 */
export function prefiereMenosMovimiento(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

import { useLayoutEffect, useRef } from "react";
import { CURVA_ASENTAR, prefiereMenosMovimiento } from "@/utils";

/**
 * Marca, en el JSX, los elementos que participan del FLIP:
 *
 * ```tsx
 * <div key={p.id} data-flip={p.id}>
 * ```
 *
 * El valor es la **clave estable** del elemento (el id del pedido), no un índice:
 * un índice cambia justo cuando el orden cambia, que es cuando hace falta que no
 * cambie.
 *
 * Se escribe como literal en los dos sitios —aquí y en el JSX— a propósito. Un
 * `ATRIBUTO_FLIP` exportado daría la ilusión de una fuente única mientras el JSX
 * sigue llevando el literal, que es la peor de las dos combinaciones: un
 * renombrado de la constante dejaría el marcado sin marcar y el FLIP apagado en
 * silencio. Un literal greppable se encuentra; una constante que no gobierna
 * nada, no.
 */
const ATRIBUTO_FLIP = "data-flip";

/**
 * Duración del desplazamiento, en ms.
 *
 * 260 ms se elige contra las otras dos duraciones que se ven en la misma
 * pantalla, no en abstracto:
 *
 * - **Por encima de los 200 ms de `aparecer`.** Aquello es una capa que se
 *   revela; esto recorre distancia real y necesita que el trayecto se lea.
 * - **Por debajo de los 380 ms de `aterrizaje`.** Este es el punto importante:
 *   las hermanas tienen que haber terminado de apartarse **antes** de que la
 *   tarjeta que llegó acabe de asentarse. Si el FLIP durara más, el tablero
 *   seguiría moviéndose después de que la tarjeta nueva ya estuviera quieta, y
 *   el ojo leería dos sucesos donde hay uno.
 */
export const DURACION_FLIP_MS = 260;

/**
 * Identificador de las animaciones que crea este hook.
 *
 * Sirve para poder **cancelar solo las nuestras**: `getAnimations()` devuelve
 * también las de CSS (`entrada-lista`, `aterrizaje`), y cancelarlas apagaría el
 * aterrizaje de la tarjeta que acaba de llegar.
 */
const ID_ANIMACION = "flip-tablero";

/** Lo único que el FLIP necesita saber de la posición de un nodo. */
export interface RectFlip {
  left: number;
  top: number;
}

/** Posición medida de un nodo en una pasada. */
export interface Foto<N> {
  nodo: N;
  rect: RectFlip;
}

/** Cuánto hay que desplazar un nodo para pintarlo donde estaba. */
export interface DesplazamientoFlip<N> {
  nodo: N;
  dx: number;
  dy: number;
}

/**
 * `desplazamientosFlip` — el núcleo del FLIP, sin DOM y sin React.
 *
 * Recibe las posiciones de la pasada anterior y las de ahora, y devuelve
 * **solo** los nodos que hay que animar, con el desplazamiento que los devuelve
 * a su sitio viejo. Todo lo demás es ruido que hay que descartar, y son tres
 * casos distintos:
 *
 * | Caso | Por qué se descarta |
 * |------|---------------------|
 * | **Sin foto previa** | Es la primera medición del elemento: el montaje inicial o la vuelta desde la vista de lista. No hay trayecto que recorrer, y de la entrada se encarga `animate-entrada-lista`. |
 * | **Misma clave, nodo distinto** | React desmontó y volvió a montar ese elemento: es una tarjeta que cambió de columna. No es una hermana que se desplaza, y ya tiene su propia animación de llegada (`animate-aterrizaje`). Si se incluyera, la tarjeta volaría desde la columna de origen **mientras** el aterrizaje la escala: dos movimientos sobre lo mismo. |
 * | **Desplazamiento cero** | Está donde estaba. Animarlo gastaría una animación para no mover nada. |
 *
 * Se separa del hook por dos razones. La primera es que estas tres reglas son
 * las que se pueden equivocar en silencio: un FLIP mal filtrado no falla, se ve
 * raro. La segunda es que sin DOM se pueden probar de verdad — ver
 * `useFlipLista.test.ts`.
 *
 * El signo importa: `dx`/`dy` son **pasado menos presente**, es decir, cuánto
 * hay que retroceder para pintar el nodo donde estaba. Un `translate` con ese
 * valor y una animación a cero es el «invert» del FLIP.
 */
export function desplazamientosFlip<N>(
  previos: Map<string, Foto<N>>,
  actuales: Map<string, Foto<N>>,
): DesplazamientoFlip<N>[] {
  const desplazamientos: DesplazamientoFlip<N>[] = [];

  for (const [clave, { nodo, rect }] of actuales) {
    const previo = previos.get(clave);
    if (!previo) continue;
    if (previo.nodo !== nodo) continue;

    const dx = previo.rect.left - rect.left;
    const dy = previo.rect.top - rect.top;
    if (dx === 0 && dy === 0) continue;

    desplazamientos.push({ nodo, dx, dy });
  }

  return desplazamientos;
}

/**
 * `useFlipLista` — hace que los elementos de una lista o rejilla **se muevan a su
 * nueva posición** en vez de aparecer en ella.
 *
 * ## Qué problema resuelve
 *
 * Mover un pedido de una columna a otra del tablero cambia la posición de tres
 * cosas: la tarjeta que se fue, la tarjeta que llegó y **todas las hermanas que
 * quedan entre medias**. React reordena el DOM de golpe, así que esas hermanas
 * **saltan** a su hueco nuevo. El salto es el problema: sin ver el trayecto, el
 * ojo no puede relacionar la tarjeta que desapareció de una columna con la que
 * apareció en la otra. La animación de aterrizaje de la tarjeta que llega
 * resuelve media historia — la otra mitad es que las demás se aparten.
 *
 * ## Por qué se mide `offsetTop`/`offsetLeft` y NO `getBoundingClientRect()`
 *
 * Este es el punto donde este hook se equivocó la primera vez, y está escrito
 * aquí porque el error es invisible: se midió con `getBoundingClientRect()` y el
 * FLIP animaba **tarjetas que no se habían movido**.
 *
 * `getBoundingClientRect()` devuelve la posición **pintada**, y eso incluye los
 * `transform` de cualquier animación en vuelo. Medido el 08/10 en el tablero: al
 * reordenar, 5 de las 7 tarjetas recibían una animación de `translate(0px, 6px)`
 * sin haberse movido. La causa era que la foto anterior se había tomado durante
 * el `entrada-lista` del montaje, que arranca con `translate3d(0, 6px, 0)`, así
 * que los 6 px de la entrada quedaron dentro de la medida y el FLIP los leyó
 * como un desplazamiento real.
 *
 * `offsetTop`/`offsetLeft` son la posición de **layout**: no llevan `transform`
 * encima ni se enteran del scroll. Un nodo que no se movió da delta cero aunque
 * encima tenga tres animaciones, que es exactamente lo que este hook necesita.
 *
 * Se comparan posiciones del **mismo nodo** en dos instantes, así que el
 * `offsetParent` no importa mientras no cambie — y no cambia, porque un nodo que
 * se queda montado se queda en la misma lista. Los movimientos entre columnas
 * son remontajes y ya se descartan antes de llegar aquí.
 *
 * La contrapartida es que se pierde el subpíxel: `offsetTop` es entero. En un
 * desplazamiento de 300 px, medio píxel no se ve.
 *
 * ## FLIP: First, Last, Invert, Play
 *
 * 1. **First** — antes de tocar el DOM se guarda el rectángulo de cada elemento
 *    (lo hizo la pasada anterior de este mismo efecto).
 * 2. **Last** — React ya ha reordenado el DOM, así que se mide otra vez.
 * 3. **Invert** — la diferencia entre las dos medidas es exactamente cuánto se
 *    movió; lo decide `desplazamientosFlip`. Se pinta el elemento en su posición
 *    **vieja** con un `translate` de ese tamaño.
 * 4. **Play** — se anima ese `translate` a cero. El elemento llega a donde ya
 *    estaba: no hay salto al terminar, porque el último fotograma es
 *    exactamente la posición natural.
 *
 * Se hace así, y no animando `top`/`left`, porque `transform` no provoca
 * *layout*: el navegador solo recompone. El resto de la lista se coloca en su
 * sitio definitivo desde el primer fotograma y lo que se ve moverse es una capa
 * aparte.
 *
 * ## Por qué con `useLayoutEffect` y no con `useEffect`
 *
 * `useEffect` corre después de pintar. Medir ahí significaría que el navegador
 * ya enseñó un fotograma con los elementos en su sitio nuevo —el salto— y el
 * FLIP vendría a corregirlo después: un parpadeo. `useLayoutEffect` corre entre
 * la mutación del DOM y el pintado, así que el primer fotograma que ve el
 * usuario ya es el de la posición invertida.
 *
 * ## La firma: cuándo se mide
 *
 * El efecto se dispara con `firma`, una cadena que describe **el orden actual**
 * (estado y pedidos de cada columna). Sin ella habría que medir en cada
 * re-render, y el tablero se re-renderiza cada segundo por el `tick` del store:
 * sería forzar un cálculo de layout por segundo para descubrir que nada se movió.
 * Con la firma, el efecto solo corre cuando el orden cambió de verdad.
 *
 * La contrapartida es que la firma es una **segunda fuente**: si el orden cambia
 * sin que la firma cambie, el FLIP no se dispara. Al construirla hay que incluir
 * todo lo que mueva elementos (orden y pertenencia a la columna), y nada más.
 *
 * ## Contrato de accesibilidad
 *
 * Con `prefers-reduced-motion` no se anima nada. Aquí no basta la guarda de
 * `css/base.css`, porque no hay clase de Tailwind que neutralizar: es movimiento
 * producido por JS, y por eso consulta `prefiereMenosMovimiento()`.
 *
 * Lo que **sí** se hace con `prefers-reduced-motion` es **seguir guardando la
 * foto** de las posiciones. Si no se guardara, al desactivar la preferencia la
 * siguiente reordenación mediría contra la posición de hace veinte movimientos y
 * las tarjetas saltarían en una dirección arbitraria.
 *
 * @param firma Cadena que cambia cuando cambia el orden de los elementos.
 * @returns La ref que hay que colgar del contenedor de los elementos marcados
 *          con `data-flip`.
 */
export function useFlipLista<T extends HTMLElement>(firma: string) {
  const contenedor = useRef<T | null>(null);
  /** Rectángulos de la pasada anterior, por clave. */
  const anteriores = useRef(new Map<string, Foto<Element>>());

  useLayoutEffect(() => {
    const raiz = contenedor.current;
    if (!raiz) return;

    const actuales = new Map<string, Foto<Element>>();
    for (const nodo of raiz.querySelectorAll<HTMLElement>(`[${ATRIBUTO_FLIP}]`)) {
      const clave = nodo.getAttribute(ATRIBUTO_FLIP);
      if (!clave) continue;
      // Posición de LAYOUT, no de pintado: ver el porqué en la cabecera.
      actuales.set(clave, { nodo, rect: { left: nodo.offsetLeft, top: nodo.offsetTop } });
    }

    const previos = anteriores.current;
    // La foto se guarda SIEMPRE, antes de cualquier salida temprana: es la
    // medida contra la que se comparará la próxima vez.
    anteriores.current = actuales;

    if (prefiereMenosMovimiento()) return;

    for (const { nodo, dx, dy } of desplazamientosFlip(previos, actuales)) {
      // Un FLIP en vuelo se cancela antes de empezar el siguiente. Sin esto, dos
      // reordenaciones seguidas —teclear en el buscador encadena una por
      // pulsación— dejan varias animaciones vivas sobre el mismo nodo, cada una
      // peleando por `transform`. La última gana, así que se ve más o menos
      // bien, pero se acumulan animaciones que nadie mira.
      //
      // Se cancela por identificador y no con `getAnimations().forEach(cancel)`
      // porque ahí también entran las animaciones de CSS: cancelarlas apagaría
      // el `aterrizaje` de la tarjeta que acaba de llegar.
      for (const viva of nodo.getAnimations()) {
        if (viva.id === ID_ANIMACION) viva.cancel();
      }

      nodo.animate(
        [
          { transform: `translate(${dx}px, ${dy}px)` },
          { transform: "translate(0px, 0px)" },
        ],
        {
          id: ID_ANIMACION,
          duration: DURACION_FLIP_MS,
          easing: CURVA_ASENTAR,
          // `fill: "none"` para no dejar un `transform` en línea pegado al
          // nodo: al terminar, el último fotograma coincide con la posición
          // natural, así que quitarlo no se ve. Dejarlo rompería el
          // `hover:-translate-y-0.5` de la tarjeta, que es una declaración CSS
          // normal y pierde contra un estilo en línea.
          fill: "none",
        },
      );
    }
  }, [firma]);

  return contenedor;
}

export default useFlipLista;

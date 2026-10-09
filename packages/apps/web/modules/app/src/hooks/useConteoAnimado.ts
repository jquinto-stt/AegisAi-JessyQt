import { useEffect, useRef, useState } from "react";
import { curvaConteo, prefiereMenosMovimiento } from "@/utils";

/**
 * Duración del conteo de un número, en ms.
 *
 * **No se lee junto a los `--animate-*` de `css/theme.css`, porque no comparte
 * su escala.** Aquellos van de 140 a 380 ms y miden lo que tarda una capa en
 * asentarse; esto mide lo que tarda un valor en **recorrer** su rango, que es
 * otra cosa. Un panel se coloca y ya está; un número tiene que dar tiempo a que
 * los dígitos se lean pasar.
 *
 * ## Por qué 700
 *
 * Por debajo de ~400 ms el conteo se percibe como un parpadeo del dígito, no
 * como un conteo: el ojo no llega a registrar los pasos intermedios y el
 * resultado es más confuso que el salto seco. Por encima de ~1 s empieza a
 * retrasar la lectura del dato, que es lo único que el usuario vino a buscar.
 *
 * 700 ms se comprueba con el caso real de esta pantalla: los seis contadores de
 * `EstadosOverview` valen entre 0 y 3, y con `curvaConteo` un 0→3 da sus tres
 * pasos en 61, 205 y 414 ms. Están separados, se ven los tres, y el número ya
 * está quieto mucho antes de que el usuario mire otra cosa.
 */
export const DURACION_CONTEO_MS = 700;

/**
 * `useConteoAnimado` — devuelve un número que se mueve hacia `valor` en vez de
 * saltar a él.
 *
 * ## Qué problema resuelve
 *
 * Un KPI pintado como `{totalPedidos.toLocaleString()}` cambia de golpe cuando
 * llega el dato. Si el salto es de 0 a 1.240, el ojo no registra que el número
 * *creció*: registra dos pantallas distintas. Contar hace visible **cuánto**
 * cambió, que es información que el salto se lleva por delante.
 *
 * ## Por qué no se puede hacer con CSS
 *
 * Un `@keyframes` interpola propiedades de un elemento; aquí lo que se interpola
 * es un **valor**. Ninguna propiedad CSS sirve para el contenido de un `<p>`
 * —`content` solo existe en pseudoelementos y no interpola números—, así que
 * este es uno de los casos en los que el sistema de movimiento necesita JS.
 * Es también el motivo de que use `curvaConteo` y no la curva del tema: ver la
 * explicación medida en `@/utils`.
 *
 * ## Contrato de accesibilidad
 *
 * Con `prefers-reduced-motion` devuelve `valor` **sin animar**. Aquí no basta la
 * guarda de `css/base.css`, porque no hay clase de Tailwind que neutralizar: es
 * movimiento producido por JS, y por eso consulta `prefiereMenosMovimiento()`.
 * Un contador no comunica estado —no es un `spinner`—, así que quitarle el
 * movimiento no borra información y se puede neutralizar entero.
 *
 * ## Devuelve un número crudo, no una cadena
 *
 * El formateo es del consumidor: `money(v)`, `` `${Math.round(v)}%` ``,
 * `v.toLocaleString()`. El hook no sabe si lo que cuenta son pesos, unidades o
 * un porcentaje, y aceptar un formateador lo ataría a un caso. Por lo mismo no
 * redondea: quien sabe si la magnitud es entera es la pantalla.
 *
 * El último fotograma cae **exactamente** en `valor` (`curvaConteo(1) === 1`),
 * así que nunca se queda a un dígito del objetivo.
 *
 * ## Interrumpir un conteo en curso
 *
 * Si `valor` cambia a mitad, el conteo nuevo arranca desde donde iba el
 * anterior, no desde 0: el número continúa desde lo que el usuario está viendo.
 * Reiniciar desde cero daría un salto hacia atrás visible.
 *
 * @param valor Número objetivo.
 * @param duracionMs Cuánto tarda el recorrido. Por defecto `DURACION_CONTEO_MS`.
 */
export function useConteoAnimado(
  valor: number,
  duracionMs: number = DURACION_CONTEO_MS,
): number {
  // Arranca en `valor` si el sistema pidió menos movimiento: así el primer
  // render ya muestra el dato bueno y no hay ni un fotograma en 0.
  const [mostrado, setMostrado] = useState(() => (prefiereMenosMovimiento() ? valor : 0));
  /** Último valor pintado: es el punto de partida del próximo conteo. */
  const desde = useRef(0);

  useEffect(() => {
    if (prefiereMenosMovimiento()) {
      desde.current = valor;
      setMostrado(valor);
      return;
    }

    const inicio = desde.current;
    const salto = valor - inicio;
    if (salto === 0) {
      setMostrado(valor);
      return;
    }

    let raf = 0;
    const t0 = performance.now();

    const paso = (ahora: number) => {
      const t = Math.min(1, (ahora - t0) / duracionMs);
      const v = inicio + salto * curvaConteo(t);
      desde.current = v;
      setMostrado(v);
      if (t < 1) raf = requestAnimationFrame(paso);
    };

    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [valor, duracionMs]);

  return mostrado;
}

export default useConteoAnimado;

import { afterEach, describe, expect, it } from "vitest";
import { comportamientoScroll, curvaConteo, prefiereMenosMovimiento, retardoEscalonado } from "@/utils";

describe("curvaConteo", () => {
  it("empieza en 0 y termina exactamente en 1", () => {
    // El 1 exacto no es un detalle: `useConteoAnimado` depende de que el último
    // fotograma caiga en el objetivo y no a un dígito de él.
    expect(curvaConteo(0)).toBe(0);
    expect(curvaConteo(1)).toBe(1);
  });

  it("recorta fuera de rango en vez de extrapolar", () => {
    expect(curvaConteo(-0.5)).toBe(0);
    expect(curvaConteo(1.5)).toBe(1);
  });

  it("reparte el recorrido: 44 % / 75 % / 94 % del valor", () => {
    expect(curvaConteo(0.25)).toBeCloseTo(0.4375, 10);
    expect(curvaConteo(0.5)).toBeCloseTo(0.75, 10);
    expect(curvaConteo(0.75)).toBeCloseTo(0.9375, 10);
  });

  it("NO es la curva del tema, y eso es deliberado", () => {
    // `cubic-bezier(0.22, 1, 0.36, 1)` —la de los `--animate-*`— deja el valor
    // en 0,961 a mitad de tiempo: un contador pasaría de 0 a su valor en los
    // primeros 200 ms de 700 y se quedaría quieto. Esta aserción existe para que
    // nadie «unifique» las dos curvas sin volver a leer el porqué.
    expect(curvaConteo(0.5)).toBeLessThan(0.8);
  });

  it("es monótona creciente", () => {
    let anterior = 0;
    for (let i = 1; i <= 100; i++) {
      const actual = curvaConteo(i / 100);
      expect(actual).toBeGreaterThan(anterior);
      anterior = actual;
    }
  });
});

describe("retardoEscalonado", () => {
  it("escala por índice con un paso de 40 ms", () => {
    expect(retardoEscalonado(0)).toBe("0ms");
    expect(retardoEscalonado(1)).toBe("40ms");
    expect(retardoEscalonado(3)).toBe("120ms");
  });

  it("se detiene en el tope: a partir del séptimo todos entran juntos", () => {
    expect(retardoEscalonado(6)).toBe("240ms");
    expect(retardoEscalonado(20)).toBe("240ms");
  });

  it("nunca devuelve un retardo negativo", () => {
    expect(retardoEscalonado(-4)).toBe("0ms");
  });
});

describe("comportamientoScroll", () => {
  // El entorno de vitest es `node`, así que `window` no existe: se instala uno
  // mínimo por prueba y se restaura después. `matchMedia` es lo único que
  // `prefiereMenosMovimiento` consulta.
  const originalWindow = (globalThis as { window?: unknown }).window;

  const conPreferencia = (reduce: boolean) => {
    (globalThis as { window?: unknown }).window = {
      matchMedia: () => ({ matches: reduce }),
    };
  };

  afterEach(() => {
    if (originalWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = originalWindow;
    }
  });

  it("se desplaza suave cuando el sistema no pide menos movimiento", () => {
    conPreferencia(false);
    expect(prefiereMenosMovimiento()).toBe(false);
    expect(comportamientoScroll()).toBe("smooth");
  });

  it("salta al destino cuando el sistema pide menos movimiento", () => {
    // Esta es la aserción que importa, y por eso vive aquí y no en el consumidor:
    // `scrollIntoView({ behavior: "smooth" })` es movimiento que el navegador NO
    // neutraliza con `prefers-reduced-motion` —a diferencia de las animaciones
    // CSS, que sí cubre la guarda de `css/base.css`—. Si esta función devolviera
    // "smooth" siempre, la preferencia no llegaría nunca al auto-scroll del chat
    // y el contrato de accesibilidad quedaría a medias sin que nada avisara.
    conPreferencia(true);
    expect(prefiereMenosMovimiento()).toBe(true);
    expect(comportamientoScroll()).toBe("auto");
  });

  it("sin `window` cae al caso normal en vez de lanzar", () => {
    delete (globalThis as { window?: unknown }).window;
    expect(comportamientoScroll()).toBe("smooth");
  });
});

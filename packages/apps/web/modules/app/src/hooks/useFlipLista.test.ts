import { describe, expect, it } from "vitest";
import { desplazamientosFlip, type Foto } from "@/hooks/useFlipLista";

/**
 * El FLIP se prueba sobre la función pura, no sobre el hook: lo que se puede
 * equivocar en silencio son las tres reglas de descarte (sin foto previa, nodo
 * remontado, desplazamiento cero), y esas no necesitan DOM para comprobarse.
 *
 * `nodo` es un string a propósito: el FLIP solo compara identidad, así que un
 * string prueba lo mismo que un `Element` sin montar nada.
 */
const foto = (nodo: string, left: number, top: number): Foto<string> => ({
  nodo,
  rect: { left, top },
});

describe("desplazamientosFlip", () => {
  it("devuelve el retroceso que pinta el nodo donde estaba", () => {
    // Se movió 40 px hacia abajo: para pintarlo arriba hay que subirlo 40.
    const previos = new Map([["a", foto("nodo-a", 10, 100)]]);
    const actuales = new Map([["a", foto("nodo-a", 10, 140)]]);

    expect(desplazamientosFlip(previos, actuales)).toEqual([
      { nodo: "nodo-a", dx: 0, dy: -40 },
    ]);
  });

  it("el signo es pasado menos presente, también en horizontal", () => {
    const previos = new Map([["a", foto("nodo-a", 100, 0)]]);
    const actuales = new Map([["a", foto("nodo-a", 260, 0)]]);

    expect(desplazamientosFlip(previos, actuales)).toEqual([
      { nodo: "nodo-a", dx: -160, dy: 0 },
    ]);
  });

  it("no anima el nodo que no se movió", () => {
    // Animarlo gastaría una animación para no mover nada.
    const previos = new Map([["a", foto("nodo-a", 10, 100)]]);
    const actuales = new Map([["a", foto("nodo-a", 10, 100)]]);

    expect(desplazamientosFlip(previos, actuales)).toEqual([]);
  });

  it("no anima el nodo sin foto previa", () => {
    // Primera medición: el montaje inicial o la vuelta desde la vista de lista.
    // De la entrada se encarga `animate-entrada-lista`.
    const previos = new Map([["a", foto("nodo-a", 10, 100)]]);
    const actuales = new Map([
      ["a", foto("nodo-a", 10, 100)],
      ["b", foto("nodo-b", 10, 200)],
    ]);

    expect(desplazamientosFlip(previos, actuales)).toEqual([]);
  });

  it("excluye el nodo remontado con la misma clave", () => {
    // Este es el caso que importa: una tarjeta que cambió de columna. React la
    // desmonta de una lista y la monta en otra, así que la clave se repite pero
    // el nodo es otro. NO es una hermana que se desplaza — ya tiene su
    // `animate-aterrizaje`, y animarla además la haría volar desde la columna de
    // origen mientras el aterrizaje la escala.
    const previos = new Map([["p-1", foto("nodo-viejo", 10, 100)]]);
    const actuales = new Map([["p-1", foto("nodo-nuevo", 400, 100)]]);

    expect(desplazamientosFlip(previos, actuales)).toEqual([]);
  });

  it("no se rompe si un nodo desapareció", () => {
    const previos = new Map([
      ["a", foto("nodo-a", 10, 100)],
      ["b", foto("nodo-b", 10, 200)],
    ]);
    const actuales = new Map([["b", foto("nodo-b", 10, 100)]]);

    // `b` subió al hueco de `a`: eso sí se anima.
    expect(desplazamientosFlip(previos, actuales)).toEqual([
      { nodo: "nodo-b", dx: 0, dy: 100 },
    ]);
  });

  it("escenario: sale la primera tarjeta y las demás suben", () => {
    // Es el caso real del tablero. `a` se fue a otra columna (allí es un nodo
    // nuevo, así que aquí simplemente no está) y b, c y d ocupan su hueco.
    const previos = new Map([
      ["a", foto("nodo-a", 0, 0)],
      ["b", foto("nodo-b", 0, 100)],
      ["c", foto("nodo-c", 0, 200)],
      ["d", foto("nodo-d", 0, 300)],
    ]);
    const actuales = new Map([
      ["b", foto("nodo-b", 0, 0)],
      ["c", foto("nodo-c", 0, 100)],
      ["d", foto("nodo-d", 0, 200)],
    ]);

    // Las tres parten de su posición vieja: cada una se pinta 100 px más abajo
    // de donde termina, y sube.
    expect(desplazamientosFlip(previos, actuales)).toEqual([
      { nodo: "nodo-b", dx: 0, dy: 100 },
      { nodo: "nodo-c", dx: 0, dy: 100 },
      { nodo: "nodo-d", dx: 0, dy: 100 },
    ]);
  });

  it("escenario: entra una tarjeta arriba y las demás bajan", () => {
    const previos = new Map([
      ["b", foto("nodo-b", 0, 0)],
      ["c", foto("nodo-c", 0, 100)],
    ]);
    const actuales = new Map([
      ["x", foto("nodo-x", 0, 0)],
      ["b", foto("nodo-b", 0, 100)],
      ["c", foto("nodo-c", 0, 200)],
    ]);

    // La que entra no se anima (nodo nuevo); las otras dos se pintan 100 px más
    // arriba de donde acaban y bajan.
    expect(desplazamientosFlip(previos, actuales)).toEqual([
      { nodo: "nodo-b", dx: 0, dy: -100 },
      { nodo: "nodo-c", dx: 0, dy: -100 },
    ]);
  });
});

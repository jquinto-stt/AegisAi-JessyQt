import { describe, expect, it } from "vitest";
import {
  construirAcciones,
  repartirAcciones,
  MAX_ACCIONES_VISIBLES,
  type AccionFila,
  type ManosFila,
  type PermisosFila,
} from "./acciones-fila";

/**
 * Contrato de la columna «Acciones» de la lista de pedidos.
 *
 * Estas pruebas existen porque la regla se rompió sin que nada avisara: la
 * celda llegó a pintar seis iconos seguidos, sin tarjeta, y el único modo de
 * notarlo era mirar una pantalla con sesión abierta.
 */

const MANOS: ManosFila = {
  avanzar: () => {},
  detalle: () => {},
  reprogramar: () => {},
  reintentar: () => {},
  quitarRepartidor: () => {},
  cancelar: () => {},
};

/** Los permisos que `accionesDePedido()` devuelve para cada estado. */
const BASE: PermisosFila = {
  puedeAvanzar: true,
  etiquetaAvanzar: "Avanzar a Confirmado",
  esActivarAhora: false,
  puedeReprogramar: false,
  puedeReintentar: false,
  puedeCancelar: true,
  puedeQuitarRepartidor: false,
};

const CASOS: Array<{ estado: string; permisos: PermisosFila; esperadas: number }> = [
  {
    estado: "programado",
    permisos: {
      ...BASE,
      etiquetaAvanzar: "Activar ahora",
      esActivarAhora: true,
      puedeReprogramar: true,
    },
    esperadas: 4, // activar · detalle · reprogramar · cancelar
  },
  { estado: "nuevo", permisos: { ...BASE, etiquetaAvanzar: "Confirmar" }, esperadas: 3 },
  { estado: "confirmado", permisos: BASE, esperadas: 3 },
  { estado: "en_preparacion", permisos: BASE, esperadas: 3 },
  {
    estado: "listo",
    permisos: { ...BASE, puedeReintentar: true, puedeQuitarRepartidor: true },
    esperadas: 5,
  },
  {
    estado: "en_camino",
    permisos: { ...BASE, puedeReintentar: true, puedeQuitarRepartidor: true },
    esperadas: 5,
  },
  {
    estado: "entregado",
    permisos: { ...BASE, puedeAvanzar: false, puedeCancelar: false },
    esperadas: 1, // solo detalle
  },
  {
    estado: "cancelado",
    permisos: { ...BASE, puedeAvanzar: false, puedeCancelar: false },
    esperadas: 1,
  },
];

describe("construirAcciones", () => {
  it.each(CASOS)("$estado arma $esperadas acciones", ({ permisos, esperadas }) => {
    expect(construirAcciones(permisos, MANOS)).toHaveLength(esperadas);
  });

  it.each(CASOS)("$estado no deja acciones repetidas", ({ permisos }) => {
    const acciones = construirAcciones(permisos, MANOS);
    expect(new Set(acciones.map((a) => a.clave)).size).toBe(acciones.length);
  });

  it.each(CASOS)("$estado manda todas las acciones a la tarjeta", ({ permisos }) => {
    const acciones = construirAcciones(permisos, MANOS);
    const { visibles, resto } = repartirAcciones(acciones);

    // La celda no pinta iconos sueltos: el «⋯» es el único control.
    expect(visibles).toHaveLength(MAX_ACCIONES_VISIBLES);
    expect(visibles).toHaveLength(0);
    expect(resto).toEqual(acciones);
  });

  it.each(CASOS)("$estado deja el destructivo al final", ({ permisos }) => {
    const acciones = construirAcciones(permisos, MANOS);
    const indice = acciones.findIndex((a) => a.destructivo);
    if (indice === -1) return;

    expect(indice).toBe(acciones.length - 1);
    expect(acciones[0].clave).not.toBe("cancelar");
  });

  it("un pedido cerrado solo conserva «Ver detalle»", () => {
    const cerrado = CASOS.find((c) => c.estado === "entregado")!;
    expect(construirAcciones(cerrado.permisos, MANOS).map((a) => a.clave)).toEqual(["detalle"]);
  });

  it("el botón de avance dice a dónde va", () => {
    const [avanzar] = construirAcciones(
      { ...BASE, etiquetaAvanzar: "Avanzar a Entregado" },
      MANOS,
    );
    expect(avanzar.titulo).toBe("Avanzar a Entregado");
    expect(avanzar.tono).toBe("marca");
  });

  it("«programado» avanza con el icono de activar, no con el de confirmar", () => {
    const programado = CASOS.find((c) => c.estado === "programado")!;
    const [avanzar] = construirAcciones(programado.permisos, MANOS);
    expect(avanzar.clave).toBe("avanzar");
    expect(avanzar.titulo).toBe("Activar ahora");
  });
});

describe("repartirAcciones", () => {
  const fabricar = (n: number): AccionFila[] =>
    Array.from({ length: n }, (_, i) => ({
      clave: `a${i}`,
      titulo: `Acción ${i}`,
      tono: "neutral" as const,
      icono: null,
      onClick: () => {},
    }));

  it("con la regla actual la tarjeta recibe todas y la celda ninguna", () => {
    for (const n of [0, 1, 3, 5, 6]) {
      const { visibles, resto } = repartirAcciones(fabricar(n));
      expect(visibles).toHaveLength(0);
      expect(resto).toHaveLength(n);
    }
  });

  it("conserva el orden al repartir", () => {
    const acciones = fabricar(6);
    const { resto } = repartirAcciones(acciones);
    expect(resto.map((a) => a.clave)).toEqual(["a0", "a1", "a2", "a3", "a4", "a5"]);
  });
});

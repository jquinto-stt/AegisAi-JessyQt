import { describe, expect, it } from "vitest";

import {
  OPCIONES_DENSIDAD_ASISTENTE,
  OPCIONES_DENSIDAD_BANDEJA,
  OPCIONES_TEMA,
  detalleDe,
  type OpcionApariencia,
} from "./apariencia.opciones";

// ═══════════════════════════════════════════════════════════════════════════
// Vocabulario de apariencia — dueño único: /configuracion → Apariencia
// ═══════════════════════════════════════════════════════════════════════════
//
// Las tres preferencias de apariencia se administraban desde cuatro sitios con
// tres vocabularios. Estos tests fijan el vocabulario único y, sobre todo, que
// cada opción EXPLIQUE su efecto: una opción sin detalle obliga a elegirla para
// averiguar qué hace.

const GRUPOS: [string, OpcionApariencia<string>[]][] = [
  ["tema", OPCIONES_TEMA],
  ["densidad de la bandeja", OPCIONES_DENSIDAD_BANDEJA],
  ["densidad del asistente", OPCIONES_DENSIDAD_ASISTENTE],
];

describe("Vocabulario de apariencia", () => {
  it("el tema ofrece exactamente claro, oscuro y sistema, en orden", () => {
    expect(OPCIONES_TEMA.map((o) => o.value)).toEqual(["light", "dark", "system"]);
  });

  it("las dos densidades ofrecen exactamente cómoda y compacta, en orden", () => {
    expect(OPCIONES_DENSIDAD_BANDEJA.map((o) => o.value)).toEqual(["comoda", "compacta"]);
    expect(OPCIONES_DENSIDAD_ASISTENTE.map((o) => o.value)).toEqual(["comoda", "compacta"]);
  });

  it("toda opción tiene rótulo y detalle no vacíos", () => {
    for (const [nombre, opciones] of GRUPOS) {
      for (const o of opciones) {
        expect(o.label.trim(), `${nombre}: "${o.value}" sin rótulo`).not.toBe("");
        expect(o.detalle.trim(), `${nombre}: "${o.value}" sin detalle`).not.toBe("");
      }
    }
  });

  it("el detalle no repite el rótulo", () => {
    // Un detalle que solo repite el rótulo ocupa sitio sin explicar nada.
    for (const [nombre, opciones] of GRUPOS) {
      for (const o of opciones) {
        expect(
          o.detalle.trim().toLowerCase(),
          `${nombre}: el detalle de "${o.value}" repite su rótulo`,
        ).not.toBe(o.label.trim().toLowerCase());
      }
    }
  });

  it("no hay rótulos repetidos dentro de un grupo", () => {
    for (const [nombre, opciones] of GRUPOS) {
      const etiquetas = opciones.map((o) => o.label);
      expect(new Set(etiquetas).size, `${nombre} tiene rótulos repetidos`).toBe(etiquetas.length);
    }
  });

  it("«Sistema» se explica como preferencia, no como un tercer tema", () => {
    // No impone un tema: sigue al sistema operativo. El detalle tiene que
    // decirlo, porque es la única forma de que el usuario sepa que elegirla
    // puede cambiarle la interfaz sin que él vuelva a tocar nada.
    const sistema = OPCIONES_TEMA.find((o) => o.value === "system");
    expect(sistema).toBeDefined();
    expect(sistema!.detalle.toLowerCase()).toContain("sistema operativo");
  });

  it("detalleDe devuelve el detalle de la opción elegida", () => {
    expect(detalleDe(OPCIONES_TEMA, "dark")).toBe(
      OPCIONES_TEMA.find((o) => o.value === "dark")!.detalle,
    );
  });

  it("detalleDe devuelve cadena vacía cuando la opción no existe", () => {
    // El respaldo es el mismo en las tres filas de la pestaña: sin él, una fila
    // mostraría «undefined» si el valor guardado no está en el vocabulario.
    expect(detalleDe(OPCIONES_TEMA, "inexistente" as never)).toBe("");
  });
});

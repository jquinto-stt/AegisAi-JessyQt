import { describe, expect, it } from "vitest";

import { OPCIONES_TEMA, TEMA_LABEL, tituloDeTema } from "./opciones-tema";

// ═══════════════════════════════════════════════════════════════════════════
// Vocabulario del tema — dueño único: el control de la cabecera
// ═══════════════════════════════════════════════════════════════════════════
//
// El tema se podía cambiar desde TRES sitios (la cabecera, la configuración del
// asistente y la del canal) con DOS vocabularios distintos, y «Sistema» solo
// existía en uno de ellos. Desde el 07/10 el dueño único es la cabecera.
//
// Estos tests fijan que el vocabulario siga completo y que el botón diga en qué
// estado está: un control que solo dice «cambiar tema» obliga a pulsarlo para
// averiguarlo.

const PREFERENCIAS = ["light", "dark", "system"] as const;

describe("Vocabulario del tema", () => {
  it("ofrece exactamente las tres preferencias, en orden", () => {
    expect(OPCIONES_TEMA.map((o) => o.value)).toEqual([...PREFERENCIAS]);
  });

  it("cada opción tiene rótulo y explicación", () => {
    for (const o of OPCIONES_TEMA) {
      expect(o.label.trim(), `la opción "${o.value}" no tiene rótulo`).not.toBe("");
      expect(o.descripcion.trim(), `la opción "${o.value}" no tiene explicación`).not.toBe("");
    }
  });

  it("no hay rótulos repetidos", () => {
    const etiquetas = OPCIONES_TEMA.map((o) => o.label);
    expect(new Set(etiquetas).size).toBe(etiquetas.length);
  });

  it("cada preferencia tiene rótulo corto y título de botón", () => {
    for (const v of PREFERENCIAS) {
      expect(TEMA_LABEL[v].trim(), `sin rótulo para "${v}"`).not.toBe("");
      // El título se DERIVA del rótulo, así que no pueden divergir: se compara
      // sin distinguir mayúsculas porque el título va en minúscula a propósito
      // («Tema: claro»).
      expect(tituloDeTema(v).toLowerCase(), `sin título para "${v}"`).toContain(
        TEMA_LABEL[v].toLowerCase(),
      );
    }
  });

  it("el título del botón dice el ESTADO y que es un control", () => {
    for (const v of PREFERENCIAS) {
      expect(tituloDeTema(v)).toContain("Tema:");
      expect(tituloDeTema(v)).toMatch(/elegir tema/i);
    }
  });

  it("«Sistema» se explica como preferencia, no como un tercer tema", () => {
    // No impone un tema: sigue al sistema operativo. La explicación tiene que
    // decirlo, porque es la única forma de que el usuario sepa que elegirla
    // puede cambiarle la interfaz sin que él vuelva a tocar nada.
    const sistema = OPCIONES_TEMA.find((o) => o.value === "system");
    expect(sistema).toBeDefined();
    expect(sistema!.descripcion.toLowerCase()).toContain("sistema");
  });
});

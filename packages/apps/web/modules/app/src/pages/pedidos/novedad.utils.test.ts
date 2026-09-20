import { describe, it, expect } from "vitest";

import {
  MOTIVOS_NOVEDAD,
  DESENLACE_NOTA,
  anexarNota,
  horaCorta,
  motivoInicial,
  motivoPorId,
  novedadTexto,
  puedeConfirmarNovedad,
  type DesenlaceNovedad,
} from "./novedad.utils";

// ═══════════════════════════════════════════════════════════════════════════
// Tests de `novedad.utils` — catálogo, formateo de nota y validación
// ═══════════════════════════════════════════════════════════════════════════
//
// Este módulo es PURO (sin React, sin stores), así que entra en el `environment:
// 'node'` de la suite sin arnés de navegador. Lo que NO se puede probar aquí es
// el modal ni el botón de la tarjeta: eso vive en un `.tsx` y va por arnés CDP.
//
// El foco de estos tests es la única parte con consecuencias reales: el TEXTO
// que se anexa a `pedido.notas`. Una nota mal formada no rompe nada, pero miente
// sobre lo que pasó en la calle.
//
// ── Qué se dejó fuera, y por qué ─────────────────────────────────────────
//
// Esta suite llegó a tener 24 casos. Se recortaron los que afirmaban sobre
// LITERALES del catálogo —«hay cinco motivos», «los ids son únicos», «todo
// motivo trae label»— porque no pueden fallar por un cambio de comportamiento:
// si alguien añade un sexto motivo, el test se pone rojo sin que nada esté mal,
// y lo único que enseña es que el array cambió. Eso lo dice el compilador y lo
// ve quien lee el archivo.
//
// Lo que se conserva es lo que describe un CONTRATO o una REGRESIÓN: que «otro»
// sea el único que exige texto (si otro pasa a exigirlo, el modal cambia de
// comportamiento), que no se dupliquen ni falten puntos, que exista la regla
// anti-emoji, y que anexar no pise.
// ═══════════════════════════════════════════════════════════════════════════

/** Fecha fija para que las aserciones no dependan del reloj. */
const aLas = (h: number, m: number) => new Date(2026, 8, 20, h, m, 0);

describe("catálogo de motivos de novedad", () => {
  it("solo «otro» exige texto: es el contrato del modal", () => {
    // Si un motivo del catálogo pasa a exigir texto, el botón de confirmar
    // cambia de habilitado y el texto de ayuda cambia. Es comportamiento, no
    // forma del array.
    const exigen = MOTIVOS_NOVEDAD.filter((m) => m.requiereTexto).map((m) => m.id);
    expect(exigen).toEqual(["otro"]);
  });

  it("las etiquetas y las frases no llevan emojis", () => {
    // El proyecto no usa emojis en UI: los motivos llevan icono del catálogo.
    // Se comprueba con el rango de pictogramas, no con una lista de emojis.
    const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;
    for (const m of MOTIVOS_NOVEDAD) {
      expect(emoji.test(m.label), `emoji en label de ${m.id}`).toBe(false);
      expect(emoji.test(m.texto), `emoji en texto de ${m.id}`).toBe(false);
    }
  });
});

describe("selección inicial y validación", () => {
  it("no hay motivo preseleccionado", () => {
    // Preseleccionar el primero escribiría en la nota del cliente un hecho que
    // nadie declaró: el primero de la lista es «cliente no responde».
    expect(motivoInicial()).toBeUndefined();
  });

  it("la validación es fail-closed y solo «otro» mira la observación", () => {
    expect(puedeConfirmarNovedad(undefined, "lo que sea")).toBe(false);
    expect(puedeConfirmarNovedad(motivoPorId("no_responde"), "")).toBe(true);
    expect(puedeConfirmarNovedad(motivoPorId("otro"), "   ")).toBe(false);
    expect(puedeConfirmarNovedad(motivoPorId("otro"), "portería cerrada")).toBe(true);
  });
});

describe("horaCorta", () => {
  it("rellena con cero a la izquierda", () => {
    expect(horaCorta(aLas(9, 5))).toBe("09:05");
    expect(horaCorta(aLas(0, 0))).toBe("00:00");
    expect(horaCorta(aLas(23, 59))).toBe("23:59");
  });
});

describe("novedadTexto", () => {
  const motivo = motivoPorId("no_responde")!;

  it("lleva el prefijo, la frase del motivo y el desenlace", () => {
    const t = novedadTexto(motivo, "", "cancelar", aLas(15, 30));
    expect(t.startsWith("[Novedad Logística 15:30] ")).toBe(true);
    expect(t).toContain("Cliente no responde en el domicilio. Intento fallido.");
    expect(t).toContain(DESENLACE_NOTA.cancelar);
  });

  it("el mismo motivo con desenlaces distintos produce notas distintas", () => {
    // Es la razón de ser de `DESENLACE_NOTA`: «cliente no responde» puede
    // terminar en reintento o en cancelación, y la nota debe decir cuál fue.
    const a = novedadTexto(motivo, "", "cancelar", aLas(15, 30));
    const b = novedadTexto(motivo, "", "reintentar", aLas(15, 30));
    expect(a).not.toBe(b);
    expect(b).toContain(DESENLACE_NOTA.reintentar);
  });

  it("añade el detalle libre sin dejar huecos ni puntos dobles", () => {
    expect(novedadTexto(motivo, "Torre B, apto 302", "cancelar", aLas(15, 30))).toContain(
      "Torre B, apto 302",
    );
    const sinDetalle = novedadTexto(motivo, "   ", "cancelar", aLas(15, 30));
    expect(sinDetalle).not.toContain("  ");
    expect(sinDetalle).not.toContain("..");
  });

  it("cae a la etiqueta cuando el motivo «otro» no trae frase redactada", () => {
    // «otro» tiene `texto: ""` en el catálogo; su única frase posible es la
    // observación del repartidor.
    const t = novedadTexto(motivoPorId("otro")!, "Portería cerrada", "cancelar", aLas(8, 7));
    expect(t).toContain("Otro motivo.");
    expect(t).toContain("Portería cerrada");
  });

  it("normaliza el punto final en los dos sentidos", () => {
    // La puntuación se normaliza dentro de `novedadTexto`; si se delegara al
    // catálogo, un motivo nuevo sin punto produciría «...fallido Vuelve a...».
    const sinPunto = { ...motivo, texto: "Cliente no responde" };
    expect(novedadTexto(sinPunto, "", "cancelar", aLas(15, 30))).toContain(
      "Cliente no responde. ",
    );

    const conPunto = { ...motivo, texto: "Cliente no responde." };
    const t = novedadTexto(conPunto, "", "cancelar", aLas(15, 30));
    expect(t).toContain("Cliente no responde. ");
    expect(t).not.toContain("..");
  });

  it("para los cinco motivos y ambos desenlaces, el prefijo y el desenlace están", () => {
    const desenlaces: DesenlaceNovedad[] = ["cancelar", "reintentar"];
    for (const m of MOTIVOS_NOVEDAD) {
      for (const d of desenlaces) {
        const t = novedadTexto(m, "detalle de prueba", d, aLas(12, 0));
        expect(t.startsWith("[Novedad Logística 12:00]"), `${m.id}/${d}`).toBe(true);
        expect(t, `${m.id}/${d}`).toContain(DESENLACE_NOTA[d]);
      }
    }
  });
});

describe("anexarNota — no sobrescribe lo que pidió el cliente", () => {
  it("anexa a las notas existentes con salto de línea", () => {
    expect(anexarNota("Sin cebolla en uno.", "NUEVO")).toBe("Sin cebolla en uno.\nNUEVO");
  });

  it("conserva el texto previo íntegro", () => {
    // La regresión que motiva la función: el patrón del Tablero hacía
    // `pedido.notas = \`Cancelado: ${motivo}\`` y borraba lo del cliente.
    const previo = "Revisar costuras antes de despachar.";
    const resultado = anexarNota(previo, "[Novedad Logística 10:00] Algo.");
    expect(resultado).toContain(previo);
    expect(resultado).not.toBe("[Novedad Logística 10:00] Algo.");
  });

  it("soportar dos novedades seguidas acumula los bloques en orden", () => {
    const uno = anexarNota(undefined, "[Novedad Logística 10:00] Primera.");
    const dos = anexarNota(uno, "[Novedad Logística 11:00] Segunda.");
    expect(dos.split("\n")).toHaveLength(2);
    expect(dos.indexOf("Primera.")).toBeLessThan(dos.indexOf("Segunda."));
  });
});

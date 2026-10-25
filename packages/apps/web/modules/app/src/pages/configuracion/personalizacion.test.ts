import { describe, expect, it } from "vitest";

import { enlaceDeRed, estadoHorario, resumenDias, textoSobre, usuarioDeRed } from "./personalizacion";

// Fechas fijas: 2026-10-26 es lunes.
const lunes = (h: number, m = 0) => new Date(2026, 9, 26, h, m);
const sabado = (h: number) => new Date(2026, 9, 31, h, 0);

const LUN_A_SAB = { dias: [1, 2, 3, 4, 5, 6], abre: "08:00", cierra: "18:00" };

describe("estadoHorario", () => {
  it("abierto dentro del horario", () => {
    expect(estadoHorario(LUN_A_SAB, lunes(10))).toEqual({
      abierto: true,
      texto: "Abierto ahora · cierra a las 18:00",
    });
  });

  it("antes de abrir dice que abre hoy", () => {
    expect(estadoHorario(LUN_A_SAB, lunes(7))?.texto).toBe("Cerrado · abre hoy a las 8:00");
  });

  it("después de cerrar dice que abre mañana", () => {
    expect(estadoHorario(LUN_A_SAB, lunes(19))?.texto).toBe("Cerrado · abre mañana a las 8:00");
  });

  it("salta los días cerrados", () => {
    expect(estadoHorario(LUN_A_SAB, sabado(19))?.texto).toBe("Cerrado · abre el lunes a las 8:00");
  });

  it("la madrugada de un horario nocturno pertenece al día anterior", () => {
    const nocturno = { dias: [1], abre: "18:00", cierra: "02:00" };
    // Martes 1:00 → sigue el turno del lunes.
    expect(estadoHorario(nocturno, new Date(2026, 9, 27, 1, 0))?.abierto).toBe(true);
    expect(estadoHorario(nocturno, lunes(23))?.abierto).toBe(true);
  });

  it("sin días no hay estado", () => {
    expect(estadoHorario({ dias: [], abre: "08:00", cierra: "18:00" }, lunes(10))).toBeNull();
  });
});

describe("resumenDias", () => {
  it("resume rangos seguidos y sueltos", () => {
    expect(resumenDias([1, 2, 3, 4, 5, 6])).toBe("Lun a Sáb");
    expect(resumenDias([0, 1, 2, 3, 4, 5, 6])).toBe("Todos los días");
    expect(resumenDias([1, 3, 5])).toBe("Lun, Mié, Vie");
  });
});

describe("redes", () => {
  it("acepta @usuario, usuario o la URL del perfil", () => {
    expect(usuarioDeRed("@tienda")).toBe("tienda");
    expect(usuarioDeRed("https://instagram.com/tienda/")).toBe("tienda");
    expect(enlaceDeRed("tiktok", "@tienda")).toBe("https://tiktok.com/@tienda");
  });

  it("WhatsApp usa solo los dígitos", () => {
    expect(enlaceDeRed("whatsapp", "+57 300 123 4567")).toBe("https://wa.me/573001234567");
    expect(enlaceDeRed("whatsapp", "123")).toBeNull();
  });
});

describe("textoSobre", () => {
  it("elige el texto legible sobre el color de marca", () => {
    expect(textoSobre("#FF3F1A")).toBe("#FFFFFF");
    expect(textoSobre("#97D6DF")).toBe("#212121");
    expect(textoSobre("#190088")).toBe("#FFFFFF");
  });
});

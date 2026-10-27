import { describe, it, expect } from "vitest";

import { TRANSPORTADORAS } from "./transportadoras.catalogo";
import {
  conFavorita,
  conHabilitacion,
  estaHabilitada,
  transportadorasDisponibles,
  transportadoraFavorita,
} from "./transportadoras.seleccion";

// ── Lo que se prueba, y por qué ────────────────────────────────────────────
//
// Estas cinco funciones deciden qué se ofrece al cotizar un envío. Un fallo aquí
// no rompe una pantalla: deja una transportadora apagada reapareciendo en el
// formulario de pedidos, o una favorita que ya no existe. Los casos límite que
// importan son los tres estados vacíos —sin configuración, con la favorita
// apagada y con todo apagado—, porque son los que ocurren de verdad: la
// configuración arranca vacía y el usuario apaga cosas.

describe("estaHabilitada", () => {
  it("considera habilitada una transportadora que no está en el mapa", () => {
    expect(estaHabilitada({}, "envia")).toBe(true);
    expect(estaHabilitada({ habilitadas: {} }, "envia")).toBe(true);
  });

  it("solo la apaga el valor false explícito", () => {
    expect(estaHabilitada({ habilitadas: { envia: false } }, "envia")).toBe(false);
    expect(estaHabilitada({ habilitadas: { envia: true } }, "envia")).toBe(true);
  });

  it("no confunde transportadoras distintas", () => {
    const prefs = { habilitadas: { envia: false } };
    expect(estaHabilitada(prefs, "envia")).toBe(false);
    expect(estaHabilitada(prefs, "tcc")).toBe(true);
  });
});

describe("transportadorasDisponibles", () => {
  it("sin configuración devuelve el catálogo entero, en su orden", () => {
    expect(transportadorasDisponibles({})).toEqual(TRANSPORTADORAS);
  });

  it("excluye las apagadas y conserva el orden del catálogo", () => {
    const disponibles = transportadorasDisponibles({
      habilitadas: { envia: false, tcc: false },
    });
    expect(disponibles.map((t) => t.id)).toEqual(
      TRANSPORTADORAS.filter((t) => t.id !== "envia" && t.id !== "tcc").map((t) => t.id),
    );
  });

  it("devuelve una lista vacía si el negocio apagó todas", () => {
    const habilitadas = Object.fromEntries(TRANSPORTADORAS.map((t) => [t.id, false]));
    expect(transportadorasDisponibles({ habilitadas })).toEqual([]);
  });

  it("ignora ids que no están en el catálogo", () => {
    const disponibles = transportadorasDisponibles({
      habilitadas: { inexistente: false },
    });
    expect(disponibles).toHaveLength(TRANSPORTADORAS.length);
  });
});

describe("transportadoraFavorita", () => {
  it("devuelve la favorita cuando está disponible", () => {
    expect(transportadoraFavorita({ favorita: "servientrega" })?.id).toBe("servientrega");
  });

  it("devuelve undefined si no hay favorita", () => {
    expect(transportadoraFavorita({})).toBeUndefined();
    expect(transportadoraFavorita({ favorita: null })).toBeUndefined();
  });

  it("no devuelve una favorita que el negocio apagó", () => {
    expect(
      transportadoraFavorita({ favorita: "envia", habilitadas: { envia: false } }),
    ).toBeUndefined();
  });

  it("devuelve undefined si el id guardado ya no existe en el catálogo", () => {
    expect(transportadoraFavorita({ favorita: "transportadora-retirada" })).toBeUndefined();
  });
});

describe("conHabilitacion", () => {
  it("enciende y apaga sin tocar el resto del mapa", () => {
    const prefs = conHabilitacion({ habilitadas: { tcc: false } }, "envia", false);
    expect(prefs.habilitadas).toEqual({ tcc: false, envia: false });
  });

  it("no muta las preferencias recibidas", () => {
    const original = { habilitadas: { tcc: false }, favorita: "tcc" as string | null };
    conHabilitacion(original, "envia", false);
    expect(original.habilitadas).toEqual({ tcc: false });
  });

  it("quita la favorita al apagar la favorita", () => {
    const prefs = conHabilitacion({ favorita: "envia" }, "envia", false);
    expect(prefs.favorita).toBeNull();
    expect(estaHabilitada(prefs, "envia")).toBe(false);
  });

  it("conserva la favorita al apagar otra transportadora", () => {
    const prefs = conHabilitacion({ favorita: "envia" }, "tcc", false);
    expect(prefs.favorita).toBe("envia");
  });

  it("conserva la favorita al volver a encender la que se apagó", () => {
    const apagada = conHabilitacion({ favorita: "envia" }, "envia", false);
    const encendida = conHabilitacion(apagada, "envia", true);
    expect(estaHabilitada(encendida, "envia")).toBe(true);
    // La preferencia se perdió al apagarla, y es lo correcto: no se resucita sola.
    expect(encendida.favorita).toBeNull();
  });
});

describe("conFavorita", () => {
  it("marca una favorita", () => {
    expect(conFavorita({}, "coordinadora").favorita).toBe("coordinadora");
  });

  it("reemplaza la favorita anterior: solo puede haber una", () => {
    const prefs = conFavorita({ favorita: "envia" }, "tcc");
    expect(prefs.favorita).toBe("tcc");
  });

  it("quita la favorita con null", () => {
    expect(conFavorita({ favorita: "envia" }, null).favorita).toBeNull();
  });

  it("ignora marcar como favorita una transportadora apagada", () => {
    const prefs = { habilitadas: { envia: false }, favorita: null };
    expect(conFavorita(prefs, "envia")).toEqual(prefs);
  });

  it("no muta las preferencias recibidas", () => {
    const original = { habilitadas: { tcc: false }, favorita: "tcc" as string | null };
    conFavorita(original, "envia");
    expect(original.favorita).toBe("tcc");
  });
});

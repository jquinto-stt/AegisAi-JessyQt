import { describe, it, expect } from "vitest";
import {
  PlataformaStore,
  CATALOGO_MODULOS,
  DETALLE_CONECTORES,
  IDS_CONECTORES,
  type IdModuloNegocio,
} from "./plataforma.store";

// ═══════════════════════════════════════════════════════════════════════════
// NIVEL 1 — PLATAFORMA
// ═══════════════════════════════════════════════════════════════════════════
//
// Este archivo probaba el ESTADO de la organización disfrazado de catálogo:
// «arranca con pedidos activo», «persiste y restaura en localStorage», «permite
// reiniciar al estado de fábrica». Nada de eso es nivel 1, y por eso se mudó a
// `organizacion.store.test.ts`.
//
// Lo que queda aquí son dos cosas:
//   1. Que el catálogo responda bien (disponibilidad, conectores).
//   2. Que el catálogo **siga sin tener estado**. Ese segundo bloque es el que
//      impide que el defecto vuelva: si alguien reintroduce un `setModuloActivo`
//      en el nivel 1, el test lo delata por nombre.
//
// ═══════════════════════════════════════════════════════════════════════════

describe("PlataformaStore — catálogo (nivel 1)", () => {
  const store = new PlataformaStore();

  it("expone el catálogo completo, en orden de declaración", () => {
    expect(store.catalogoModulos.map((m) => m.id)).toEqual(["pedidos", "inventario"]);
    expect(store.catalogoModulos).toHaveLength(Object.keys(CATALOGO_MODULOS).length);
  });

  it("esModuloDisponible responde por el catálogo, no por lo que tenga la organización", () => {
    // Que la plataforma OFREZCA un módulo no dice nada de si la organización lo
    // tiene. Ambas preguntas son ciertas a la vez y viven en stores distintos.
    expect(store.esModuloDisponible("pedidos")).toBe(true);
    expect(store.esModuloDisponible("inventario")).toBe(true);
  });

  it("conectoresDe devuelve los conectores del módulo en orden canónico", () => {
    expect(store.conectoresDe("pedidos")).toEqual(IDS_CONECTORES);
    expect(store.conectoresDe("inventario")).toEqual(IDS_CONECTORES);
  });

  it("el catálogo es exhaustivo: todo id del tipo tiene módulo y conectores declarados", () => {
    const ids = Object.keys(CATALOGO_MODULOS) as IdModuloNegocio[];
    for (const id of ids) {
      expect(CATALOGO_MODULOS[id].id).toBe(id);
      expect(DETALLE_CONECTORES[id]).toBeDefined();
      for (const conector of IDS_CONECTORES) {
        expect(DETALLE_CONECTORES[id][conector]).toBeDefined();
      }
    }
  });

  it("no expone mutadores de estado: el nivel 1 no decide qué está activo", () => {
    // Guarda contra la regresión concreta que motivó este refactor. Estos métodos
    // vivían aquí y significaban «esta organización lo tiene», no «la plataforma
    // lo ofrece». Si alguno reaparece, el nivel 1 volvió a mezclarse con el 2.
    const superficie = store as unknown as Record<string, unknown>;
    for (const nombre of [
      "setModuloActivo",
      "toggleModulo",
      "instalarModulo",
      "desinstalarModulo",
      "setConectorActivo",
      "toggleConector",
      "esModuloActivo",
      "esModuloInstalado",
      "estaActivo",
      "tieneConectorActivo",
      "esConectorActivo",
      "reiniciar",
      "cargarDesdeStorage",
      "guardarEnStorage",
    ]) {
      expect(superficie[nombre], `PlataformaStore no debería exponer ${nombre}`).toBeUndefined();
    }
  });

  it("no tiene estado propio: dos instancias responden lo mismo sin tocar localStorage", () => {
    const otra = new PlataformaStore();
    expect(otra.catalogoModulos.map((m) => m.id)).toEqual(store.catalogoModulos.map((m) => m.id));
    expect(otra.conectoresDe("pedidos")).toEqual(store.conectoresDe("pedidos"));
  });
});

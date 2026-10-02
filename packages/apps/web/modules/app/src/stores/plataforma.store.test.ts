import { describe, it, expect } from "vitest";
import {
  PlataformaStore,
  CATALOGO_MODULOS,
  DETALLE_CONECTORES,
  IDS_CONECTORES,
  type IdModuloNegocio,
} from "./plataforma.store";
import { ORDEN_MODULOS_INTEGRABLES } from "./integraciones.store";

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
    expect(store.catalogoModulos.map((m) => m.id)).toEqual(["pedidos", "inventarios"]);
    expect(store.catalogoModulos).toHaveLength(Object.keys(CATALOGO_MODULOS).length);
  });

  it("esModuloDisponible responde por el catálogo, no por lo que tenga la organización", () => {
    expect(store.esModuloDisponible("pedidos")).toBe(true);
  });

  it("lo declarado y lo disponible son cosas distintas, y el catálogo lo dice", () => {
    expect(store.catalogoModulos.map((m) => m.id)).toContain("pedidos");
    expect(store.catalogoModulos.filter((m) => m.disponible).map((m) => m.id)).toEqual([
      "pedidos",
      "inventarios",
    ]);
  });

  it("coincide con MODULOS_INTEGRABLES: los dos catálogos no pueden contradecirse", () => {
    // La comprobación va en una dirección: `MODULOS_INTEGRABLES` es un
    // subconjunto deliberado (solo los módulos que aportan herramientas al
    // asistente). Inventarios no está ahí porque no tiene conectores, y eso no
    // es una discrepancia — es la decisión. Lo que sí sería un error es que un
    // módulo integrable no exista en el catálogo de la plataforma.
    for (const id of ORDEN_MODULOS_INTEGRABLES) {
      expect(
        CATALOGO_MODULOS[id],
        `MODULOS_INTEGRABLES ofrece ${id} y CATALOGO_MODULOS no lo declara`,
      ).toBeDefined();
    }
  });

  it("conectoresDe devuelve los conectores del módulo en orden canónico", () => {
    expect(store.conectoresDe("pedidos")).toEqual(IDS_CONECTORES);
    expect(store.conectoresDe("inventarios")).toEqual(IDS_CONECTORES);
  });

  it("Inventarios declara sus dos conectores SIN beneficios: no promete lo que no hace", () => {
    // Un conector con beneficios escritos es una promesa de producto. El módulo
    // de conteos no tiene ninguno, y la UI lee esta lista para pintar la
    // tarjeta. Si alguien rellenara estos arrays, la configuración empezaría a
    // ofrecer encender algo que no existe.
    for (const conector of IDS_CONECTORES) {
      expect(DETALLE_CONECTORES.inventarios[conector].beneficios).toEqual([]);
    }
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

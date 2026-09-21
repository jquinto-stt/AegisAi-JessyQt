import { describe, it, expect } from "vitest";
import {
  PlataformaStore,
  CATALOGO_MODULOS,
  DETALLE_CONECTORES,
  IDS_CONECTORES,
  type IdModuloNegocio,
} from "./plataforma.store";
import { MODULOS_INTEGRABLES } from "./integraciones.store";

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
    // `inventario` pasó a `true` el 21/09, con el módulo construido y sus rutas
    // en pie. Esta aserción decía `false` y era la mitad de una contradicción
    // histórica: `integraciones.store.test.ts` exigía `false` para el mismo
    // módulo en el otro catálogo, y los dos tests estaban protegiendo la
    // incoherencia en vez de detectarla. Hoy los dos dicen `true` y el test de
    // abajo fija que no puedan volver a discrepar.
    expect(store.esModuloDisponible("inventario")).toBe(true);
  });

  it("lo declarado y lo disponible son cosas distintas, y el catálogo lo dice", () => {
    // La lista del catálogo es «lo que la plataforma NOMBRA»; `disponible` es
    // «lo que hoy se puede usar». Confundirlas es lo que hacía que
    // `/configuracion` ofreciera instalar un módulo inexistente.
    //
    // El catálogo sigue nombrando los dos módulos y hoy los dos son usables, así
    // que la distinción no se ve por diferencia de longitud: se ve en que las dos
    // listas son el MISMO conjunto, que es lo que la hace honesta.
    expect(store.catalogoModulos.map((m) => m.id)).toContain("inventario");
    expect(store.catalogoModulos.filter((m) => m.disponible).map((m) => m.id)).toEqual([
      "pedidos",
      "inventario",
    ]);
  });

  it("coincide con MODULOS_INTEGRABLES: los dos catálogos no pueden contradecirse", () => {
    // Son dos catálogos distintos (módulos de negocio / módulos integrables en la
    // IA) y el mismo módulo aparece en ambos. Si uno dice `true` y el otro `false`,
    // la app afirma dos cosas opuestas del mismo módulo según por dónde se mire.
    // Estuvo así: `inventario` era `true` aquí y `false` allí.
    for (const id of Object.keys(CATALOGO_MODULOS) as IdModuloNegocio[]) {
      expect(
        MODULOS_INTEGRABLES[id].disponible,
        `CATALOGO_MODULOS y MODULOS_INTEGRABLES discrepan sobre ${id}`,
      ).toBe(CATALOGO_MODULOS[id].disponible);
    }
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

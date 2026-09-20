import { describe, expect, it } from "vitest";

import { CAPACIDADES, CAPACIDAD_LABEL, ROLES_SEED, type Capacidad } from "@/stores/roles.store";
import {
  CAPACIDADES_POR_VISTA,
  ORDEN_VISTAS,
  VISTA_META,
  esVistaInicio,
  hayMasDeUnaVista,
  puedeVerVista,
  vistasDisponibles,
  vistaPorDefecto,
  type VistaInicio,
} from "./inicio.vistas";

// ═══════════════════════════════════════════════════════════════════════════
// VISTAS DEL INICIO — pruebas de la derivación
// ═══════════════════════════════════════════════════════════════════════════
//
// Este archivo existe porque `inicio.vistas.ts` es **la única decisión** de la
// pantalla de inicio que se puede probar sin navegador. El resto (que la vista
// correcta se pinte de verdad) lo mide el arnés de CDP, porque la suite corre
// con `environment: 'node'` y no hay DOM.
//
// Lo que se protege aquí, y por qué cada cosa:
//
//   1. **Legibilidad**: cada rol del catálogo tiene que poder entrar al inicio.
//      Un rol que no ve NINGUNA vista es una pantalla en blanco.
//   2. **Cierre (lock-in) del contrato**: la invariante C4 prohíbe que una
//      capacidad nombre una pantalla. Se comprueba contra el catálogo real, no
//      contra una copia — si alguien renombra una capacidad a `inicio.read`, esta
//      prueba cae.
//   3. **Partición**: las capacidades que habilitan cada vista no pueden ser
//      todas iguales, o el conmutador ofrecería siempre las mismas cuatro.
//   4. **El cebo de la URL**: `esVistaInicio` se alimenta de un parámetro que
//      escribe el usuario.
//
// ═══════════════════════════════════════════════════════════════════════════

/** Capacidades de un rol del catálogo real, por id. */
const capsDe = (rolId: string): Capacidad[] =>
  ROLES_SEED.find((r) => r.id === rolId)?.capacidades ?? [];

/** Sesión de administrador: el rol de sistema con el catálogo completo. */
const ADMIN = capsDe("admin_tienda");

// ── 1. Todo rol entra al inicio ────────────────────────────────────────────

describe("inicio · vistas · ningún rol se queda sin pantalla", () => {
  it("cada rol del catálogo tiene al menos una vista disponible", () => {
    for (const rol of ROLES_SEED) {
      const vistas = vistasDisponibles(rol.capacidades);
      expect(vistas.length, `el rol «${rol.id}» no ve ninguna vista`).toBeGreaterThan(0);
    }
  });

  it("un rol SIN capacidades (el catálogo permite crearlos) recibe la vista ejecutiva", () => {
    // `personalizado` nace con `[]` en `ROLES_SEED`. Es el caso real, no un
    // hipotético: sin la degradación, esta sesión vería una pantalla vacía.
    expect(vistasDisponibles([])).toEqual(["ejecutiva"]);
    expect(vistaPorDefecto([])).toBe("ejecutiva");
  });

  it("el rol «personalizado» del catálogo, que nace vacío, entra igual", () => {
    const caps = capsDe("personalizado");
    expect(caps).toEqual([]);
    expect(vistasDisponibles(caps)).toEqual(["ejecutiva"]);
  });
});

// ── 2. Cierre del contrato de acceso ───────────────────────────────────────

describe("inicio · vistas · el contrato de acceso se respeta", () => {
  it("TODAS las capacidades que habilitan vistas existen en el catálogo", () => {
    for (const vista of ORDEN_VISTAS) {
      for (const cap of CAPACIDADES_POR_VISTA[vista]) {
        expect(CAPACIDADES, `la vista «${vista}» usa una capacidad inexistente: ${cap}`).toContain(
          cap,
        );
      }
    }
  });

  it("ninguna capacidad usada nombra una pantalla ni una ruta (invariante C4)", () => {
    // La prueba de olor del contrato (§1.4): `orders.page` está mal nombrada,
    // `orders.read` está bien. Se exige la forma `<dominio>.<accion>` y que la
    // acción NO sea una pantalla.
    const PANTALLAS_PROHIBIDAS = [
      "page",
      "screen",
      "inicio",
      "config",
      "home",
      "dashboard",
      "inicio.read",
    ];
    const todas = ORDEN_VISTAS.flatMap((v) => CAPACIDADES_POR_VISTA[v]);
    expect(todas.length).toBeGreaterThan(0);
    for (const cap of todas) {
      const [dominio, accion] = cap.split(".");
      expect(dominio, `«${cap}» no tiene forma <dominio>.<accion>`).toBeTruthy();
      expect(accion, `«${cap}» no tiene forma <dominio>.<accion>`).toBeTruthy();
      expect(
        PANTALLAS_PROHIBIDAS.includes(accion),
        `«${cap}» nombra una pantalla, no una acción (invariante C4)`,
      ).toBe(false);
    }
  });

  it("una capacidad con forma válida pero ausente del catálogo NO habilita nada", () => {
    // Fail-closed: si alguien borra `channels.respond` del catálogo, la vista de
    // ventas deja de ofrecerse sola. Es el comportamiento deseado — prometer una
    // pantalla que el rol ya no puede operar es peor que no ofrecerla.
    const inventada = ["orders.teleport" as Capacidad];
    expect(vistasDisponibles(inventada)).toEqual(["ejecutiva"]);
  });

  it("cada capacidad usada tiene etiqueta legible (o el motivo diría «undefined»)", () => {
    for (const vista of ORDEN_VISTAS) {
      for (const cap of CAPACIDADES_POR_VISTA[vista]) {
        expect(CAPACIDAD_LABEL[cap], `sin etiqueta para «${cap}»`).toBeTruthy();
      }
    }
  });
});

// ── 3. Las vistas se distinguen entre sí ───────────────────────────────────

describe("inicio · vistas · las vistas son distintas", () => {
  it("hay exactamente 4 vistas y cada una tiene metadatos", () => {
    expect(ORDEN_VISTAS).toHaveLength(4);
    for (const v of ORDEN_VISTAS) {
      expect(VISTA_META[v].label).toBeTruthy();
      expect(VISTA_META[v].titulo).toBeTruthy();
      expect(VISTA_META[v].hint).toBeTruthy();
    }
  });

  it("no hay dos vistas con los MISMOS metadatos (no son la misma con otro nombre)", () => {
    const labels = ORDEN_VISTAS.map((v) => VISTA_META[v].label);
    expect(new Set(labels).size).toBe(labels.length);
    const titulos = ORDEN_VISTAS.map((v) => VISTA_META[v].titulo);
    expect(new Set(titulos).size).toBe(titulos.length);
  });

  it("las capacidades de preparación y logística coinciden a propósito (documentado)", () => {
    // No es un defecto: no existe un dominio `logistics.*` en el catálogo, y la
    // vista de reparto la gobiernan las mismas transiciones que la preparación
    // (`listo → en_camino → entregado`, todas `preparation.manage`). Si algún día
    // se añade un dominio propio, esta prueba debe cambiar con él.
    expect(CAPACIDADES_POR_VISTA.logistica).toEqual(CAPACIDADES_POR_VISTA.preparacion);
  });

  it("la vista ejecutiva y la de ventas NO son la misma compuerta", () => {
    // Si lo fueran, el conmutador ofrecería dos entradas con un solo criterio.
    expect(CAPACIDADES_POR_VISTA.ejecutiva).not.toEqual(CAPACIDADES_POR_VISTA.ventas);
  });
});

// ── 4. Derivación por conjunto de capacidades ──────────────────────────────

describe("inicio · vistas · qué ve cada tipo de sesión", () => {
  it("el administrador (las 18) ve las CUATRO vistas", () => {
    expect(ADMIN.length).toBe(CAPACIDADES.length);
    expect(vistasDisponibles(ADMIN)).toEqual(ORDEN_VISTAS);
    expect(hayMasDeUnaVista(ADMIN)).toBe(true);
  });

  it("quien solo puede leer órdenes ve SOLO la ejecutiva", () => {
    const vistas = vistasDisponibles(["orders.read"]);
    expect(vistas).toEqual(["ejecutiva"]);
    expect(hayMasDeUnaVista(["orders.read"])).toBe(false);
  });

  it("«Operador» (vendedor) ve ejecutiva y ventas, y por defecto entra a ventas", () => {
    const caps = capsDe("vendedor");
    expect(vistasDisponibles(caps)).toEqual(["ejecutiva", "ventas"]);
    // Es el punto de la regla «de atrás hacia delante»: entra a lo suyo.
    expect(vistaPorDefecto(caps)).toBe("ventas");
  });

  it("«Preparación» ve ejecutiva y logística, y entra a logística", () => {
    const caps = capsDe("preparacion");
    expect(caps).toEqual([
      "orders.read",
      "preparation.read",
      "preparation.manage",
      "scheduled.read",
    ]);
    expect(vistasDisponibles(caps)).toEqual(["ejecutiva", "preparacion", "logistica"]);
    expect(vistaPorDefecto(caps)).toBe("logistica");
  });

  it("quien puede responder canales pero no preparar NO ve preparación", () => {
    const vistas = vistasDisponibles(["orders.read", "channels.read", "channels.respond"]);
    expect(vistas).toEqual(["ejecutiva", "ventas"]);
    expect(vistas).not.toContain("preparacion");
  });

  it("`channels.read` SIN `channels.respond` no habilita la vista de atención", () => {
    // Leer los canales es suficiente para ver un pedido; no para un panel cuyo
    // trabajo es responder.
    expect(puedeVerVista("ventas", ["channels.read"])).toBe(false);
    expect(puedeVerVista("ventas", ["channels.respond"])).toBe(true);
  });

  it("`preparation.read` SIN `preparation.manage` no habilita preparación ni logística", () => {
    const caps: Capacidad[] = ["orders.read", "preparation.read"];
    expect(vistasDisponibles(caps)).toEqual(["ejecutiva"]);
    expect(puedeVerVista("preparacion", caps)).toBe(false);
    expect(puedeVerVista("logistica", caps)).toBe(false);
  });

  it("el supervisor ve las cuatro (tiene las capacidades de las cuatro)", () => {
    expect(vistasDisponibles(capsDe("supervisor_pedidos"))).toEqual(ORDEN_VISTAS);
  });
});

// ── 5. El orden canónico y el cebo de la URL ───────────────────────────────

describe("inicio · vistas · orden y entrada por URL", () => {
  it("el orden canónico determina el de la lista devuelta", () => {
    const vistas = vistasDisponibles(ADMIN);
    const indices = vistas.map((v) => ORDEN_VISTAS.indexOf(v));
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
  });

  it("la vista por defecto es la ÚLTIMA disponible (lo más concreto)", () => {
    for (const rol of ROLES_SEED) {
      const vistas = vistasDisponibles(rol.capacidades);
      expect(vistaPorDefecto(rol.capacidades)).toBe(vistas[vistas.length - 1]);
    }
  });

  it("`esVistaInicio` rechaza lo que no es una vista, incluido `null` y el vacío", () => {
    expect(esVistaInicio("ejecutiva")).toBe(true);
    expect(esVistaInicio("preparacion")).toBe(true);
    expect(esVistaInicio(null)).toBe(false);
    expect(esVistaInicio("")).toBe(false);
    expect(esVistaInicio("admin")).toBe(false);
    expect(esVistaInicio("no-existe")).toBe(false);
    // Nada de coerción rara: un valor que casi coincide no pasa.
    expect(esVistaInicio("Ejecutiva")).toBe(false);
    expect(esVistaInicio(" ejecutiva ")).toBe(false);
  });

  it("toda vista ofrecida es reconocible por `esVistaInicio` (ida y vuelta)", () => {
    // Cierra el lazo: lo que `vistasDisponibles` ofrece tiene que poder viajar
    // por la URL y volver. Si no, el enlace a una vista no restauraría nada.
    for (const rol of ROLES_SEED) {
      for (const v of vistasDisponibles(rol.capacidades)) {
        expect(esVistaInicio(v)).toBe(true);
      }
    }
  });
});

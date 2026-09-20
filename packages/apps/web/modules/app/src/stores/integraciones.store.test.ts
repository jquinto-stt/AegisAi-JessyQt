import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// ═══════════════════════════════════════════════════════════════════════════
// MÓDULOS INTEGRADOS — guardas del estado de conexión del asistente
// ═══════════════════════════════════════════════════════════════════════════
//
// Esta suite protege la afirmación central de la funcionalidad: **conectar o
// desconectar un módulo cambia de verdad lo que el asistente puede hacer.** Un
// interruptor que se pinta pero no altera nada es el defecto más grave posible
// en la pantalla de configuración, y es justo lo que estos tests impiden.
//
// Se cubren cuatro frentes:
//
//   1. VOCABULARIO COMPARTIDO. Los ids del catálogo son los de `ModuloDestino` y
//      sus etiquetas coinciden con `MODULO_DESTINO_LABEL`, para que «Pedidos» sea
//      la misma palabra en la bandeja, en el badge de un mensaje y en una
//      pestaña de contexto del chat.
//
//   2. COHERENCIA DE DISPONIBILIDAD. Un módulo solo puede estar `disponible` si
//      tiene módulo de sesión y capacidad; y `MODULOS_CONOCIDOS` (el catálogo de
//      la página de configuración) solo puede contener módulos disponibles.
//
//   3. FAIL-CLOSED. No se puede conectar lo que no existe, y una conexión
//      persistida que hoy no esté disponible NO se restaura.
//
//   4. EFECTO REAL. `buildAccessContext()` interseca la sesión con las
//      conexiones, así que desconectar Pedidos deja al asistente sin ninguna
//      herramienta del registry.
//
// `vite.config.ts` fija `environment: 'node'`: no hay `localStorage`. Se instala
// un stub ANTES de importar y se importa DESPUÉS de `vi.resetModules()` para
// obtener los singletons frescos (patrón del resto de la suite).

function instalarLocalStorageStub() {
  const store = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    key: (i: number) => [...store.keys()][i] ?? null,
    removeItem: (k: string) => {
      store.delete(k);
    },
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
  };
  vi.stubGlobal("localStorage", storage);
  return storage;
}

/** Clave real del módulo en `localStorage`. */
const CLAVE = "necto.integraciones";

beforeEach(() => {
  vi.resetModules();
  instalarLocalStorageStub();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ═══════════════════════════════════════════════════════════════════════════
// 1. CATÁLOGO — un solo vocabulario para los módulos
// ═══════════════════════════════════════════════════════════════════════════

describe("catálogo de módulos integrables", () => {
  it("el orden canónico cubre exactamente las claves del catálogo", async () => {
    const { MODULOS_INTEGRABLES, ORDEN_MODULOS_INTEGRABLES } = await import(
      "@/stores/integraciones.store"
    );

    expect([...ORDEN_MODULOS_INTEGRABLES].sort()).toEqual(
      Object.keys(MODULOS_INTEGRABLES).sort(),
    );
    expect(new Set(ORDEN_MODULOS_INTEGRABLES).size).toBe(
      ORDEN_MODULOS_INTEGRABLES.length,
    );
  });

  it("toda entrada tiene etiqueta, descripción y al menos un ejemplo", async () => {
    const { MODULOS_INTEGRABLES } = await import("@/stores/integraciones.store");

    for (const [id, entrada] of Object.entries(MODULOS_INTEGRABLES)) {
      expect(entrada.label.trim().length, `"${id}" sin etiqueta`).toBeGreaterThan(0);
      expect(entrada.descripcion.trim().length, `"${id}" sin descripción`).toBeGreaterThan(0);
      expect(entrada.ejemplos.length, `"${id}" sin ejemplos`).toBeGreaterThan(0);
      for (const ejemplo of entrada.ejemplos) {
        expect(ejemplo.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("las etiquetas son las MISMAS que las del dominio de Conversaciones", async () => {
    const { MODULOS_INTEGRABLES } = await import("@/stores/integraciones.store");
    const { MODULO_DESTINO_LABEL } = await import("@/stores/conversaciones.store");

    // «Pedidos» no puede llamarse de dos maneras según la pantalla. Si alguien
    // renombra el dominio en la bandeja, este test obliga a renombrarlo aquí.
    for (const [id, entrada] of Object.entries(MODULOS_INTEGRABLES)) {
      const dominio = MODULO_DESTINO_LABEL[id as keyof typeof MODULO_DESTINO_LABEL];
      expect(dominio, `"${id}" no existe en MODULO_DESTINO_LABEL`).toBeTruthy();
      expect(entrada.label).toBe(dominio.etiqueta);
    }
  });

  it("disponible ⟹ tiene módulo y capacidad; no disponible ⟹ ninguno de los dos", async () => {
    const { MODULOS_INTEGRABLES } = await import("@/stores/integraciones.store");

    for (const [id, entrada] of Object.entries(MODULOS_INTEGRABLES)) {
      if (entrada.disponible) {
        expect(entrada.modulo, `"${id}" disponible sin módulo`).not.toBeNull();
        expect(entrada.capacidad, `"${id}" disponible sin capacidad`).not.toBeNull();
      } else {
        // Un módulo sin proveedor no puede declarar capacidad: no existe la
        // capacidad de un módulo que no está implementado.
        expect(entrada.modulo, `"${id}" no disponible con módulo`).toBeNull();
        expect(entrada.capacidad, `"${id}" no disponible con capacidad`).toBeNull();
      }
    }
  });

  it("MODULOS_CONOCIDOS coincide con los módulos marcados disponibles", async () => {
    const { MODULOS_INTEGRABLES, ORDEN_MODULOS_INTEGRABLES } = await import(
      "@/stores/integraciones.store"
    );
    const { MODULOS_CONOCIDOS } = await import(
      "@/pages/asistente/configuracion.secciones"
    );

    const disponibles = ORDEN_MODULOS_INTEGRABLES.map(
      (id) => MODULOS_INTEGRABLES[id],
    )
      .filter((e) => e.disponible)
      .map((e) => e.modulo);

    expect([...MODULOS_CONOCIDOS]).toEqual(disponibles);
  });

  it("inventario está declarado y NO disponible (no se promete lo que no existe)", async () => {
    const { MODULOS_INTEGRABLES } = await import("@/stores/integraciones.store");

    expect(MODULOS_INTEGRABLES.inventario.disponible).toBe(false);
    expect(MODULOS_INTEGRABLES.inventario.modulo).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. ESTADO DE CONEXIÓN
// ═══════════════════════════════════════════════════════════════════════════

describe("estado de conexión", () => {
  it("arranca con Pedidos conectado y sin módulos declarados conectados", async () => {
    const { integracionesStore } = await import("@/stores/integraciones.store");

    expect(integracionesStore.estaConectado("pedidos")).toBe(true);
    expect(integracionesStore.estaConectado("inventario")).toBe(false);
    expect(integracionesStore.modulosHabilitados).toEqual(["pedidos"]);
  });

  it("NO se puede conectar un módulo que no está disponible", async () => {
    const { integracionesStore } = await import("@/stores/integraciones.store");

    // Guarda de profundidad: aunque un llamador olvidara mirar `disponible`, el
    // store rechaza la conexión sin mutar estado.
    expect(integracionesStore.conectar("inventario")).toBe(false);
    expect(integracionesStore.estaConectado("inventario")).toBe(false);
    expect(integracionesStore.modulosHabilitados).toEqual(["pedidos"]);
  });

  it("alternar enciende y apaga, y desconectar deja al asistente sin módulos", async () => {
    const { integracionesStore } = await import("@/stores/integraciones.store");

    integracionesStore.alternar("pedidos");
    expect(integracionesStore.estaConectado("pedidos")).toBe(false);
    expect(integracionesStore.modulosHabilitados).toEqual([]);

    integracionesStore.alternar("pedidos");
    expect(integracionesStore.estaConectado("pedidos")).toBe(true);
    expect(integracionesStore.modulosHabilitados).toEqual(["pedidos"]);
  });

  it("conectar dos veces es idempotente y no duplica el módulo", async () => {
    const { integracionesStore } = await import("@/stores/integraciones.store");

    integracionesStore.conectar("pedidos");
    integracionesStore.conectar("pedidos");
    expect(integracionesStore.modulosHabilitados).toEqual(["pedidos"]);
  });

  it("desconectar algo que no estaba conectado es no-op", async () => {
    const { integracionesStore } = await import("@/stores/integraciones.store");

    integracionesStore.desconectar("inventario");
    expect(integracionesStore.modulosHabilitados).toEqual(["pedidos"]);
  });

  it("entradas y modulosConContexto salen en orden canónico", async () => {
    const { integracionesStore, ORDEN_MODULOS_INTEGRABLES } = await import(
      "@/stores/integraciones.store"
    );

    expect(integracionesStore.entradas.map((e) => e.id)).toEqual([
      ...ORDEN_MODULOS_INTEGRABLES,
    ]);
    // `modulosConContexto` es el insumo de las pestañas del chat: solo módulos
    // conectados Y disponibles, con su etiqueta y su capacidad.
    expect(integracionesStore.modulosConContexto).toEqual([
      { id: "pedidos", label: "Pedidos", capacidad: "orders.read" },
    ]);
  });

  it("modulosConContexto se vacía al desconectar el módulo (la pestaña desaparece)", async () => {
    const { integracionesStore } = await import("@/stores/integraciones.store");

    integracionesStore.desconectar("pedidos");
    expect(integracionesStore.modulosConContexto).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. PERSISTENCIA (fail-closed sobre lo guardado)
// ═══════════════════════════════════════════════════════════════════════════

describe("persistencia", () => {
  it("guarda la desconexión en localStorage", async () => {
    const { integracionesStore } = await import("@/stores/integraciones.store");
    const storage = localStorage as Storage;

    integracionesStore.desconectar("pedidos");
    expect(storage.getItem(CLAVE)).toBe(JSON.stringify([]));

    integracionesStore.conectar("pedidos");
    expect(storage.getItem(CLAVE)).toBe(JSON.stringify(["pedidos"]));
  });

  it("rehidrata las conexiones guardadas", async () => {
    localStorage.setItem(CLAVE, JSON.stringify([]));
    vi.resetModules();
    const { integracionesStore } = await import("@/stores/integraciones.store");

    expect(integracionesStore.estaConectado("pedidos")).toBe(false);
    expect(integracionesStore.modulosHabilitados).toEqual([]);
  });

  it("una desconexión deliberada SOBREVIVE a la recarga", async () => {
    // Regresión: si «ningún módulo conectado» se tratara como «nada guardado»,
    // el interruptor se desharía solo al recargar y Pedidos volvería a estar
    // conectado sin que nadie lo hubiera pedido.
    const { integracionesStore } = await import("@/stores/integraciones.store");
    integracionesStore.desconectar("pedidos");
    expect(localStorage.getItem(CLAVE)).toBe(JSON.stringify([]));

    vi.resetModules();
    const { integracionesStore: recargado } = await import(
      "@/stores/integraciones.store"
    );
    expect(recargado.estaConectado("pedidos")).toBe(false);
    expect(recargado.modulosHabilitados).toEqual([]);
  });

  it("descarta un id que no está en el catálogo", async () => {
    // `turnos` es vocabulario de una versión anterior del producto: se retiró de
    // `ModuloDestino` y de `MODULO_DESTINO_LABEL`. El test se queda con él a
    // propósito, porque es el valor que de verdad puede haber guardado en el
    // `localStorage` de alguien — y la propiedad que hay que blindar es que un
    // estado viejo **no** pueda resucitar vocabulario retirado.
    localStorage.setItem(CLAVE, JSON.stringify(["turnos", "pedidos"]));
    vi.resetModules();
    const { integracionesStore } = await import("@/stores/integraciones.store");

    expect(integracionesStore.conectados).toEqual(["pedidos"]);
  });

  it("NO restaura un módulo declarado que hoy no está disponible", async () => {
    // Una versión anterior pudo guardar `inventario`. Restaurarlo dejaría el
    // estado afirmando una conexión que el catálogo no respalda: ante la duda,
    // se desconecta (el asistente es fail-closed en todo su recorrido).
    localStorage.setItem(CLAVE, JSON.stringify(["inventario"]));
    vi.resetModules();
    const { integracionesStore } = await import("@/stores/integraciones.store");

    expect(integracionesStore.estaConectado("inventario")).toBe(false);
    expect(integracionesStore.modulosHabilitados).toEqual([]);
  });

  it("con JSON corrupto o forma inesperada vuelve a las conexiones de fábrica", async () => {
    for (const basura of ["{no json", JSON.stringify({ a: 1 }), JSON.stringify("pedidos")]) {
      localStorage.setItem(CLAVE, basura);
      vi.resetModules();
      const { integracionesStore } = await import("@/stores/integraciones.store");
      expect(integracionesStore.modulosHabilitados, `con "${basura}"`).toEqual([
        "pedidos",
      ]);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. EFECTO REAL — la conexión cambia lo que el asistente puede ejecutar
// ═══════════════════════════════════════════════════════════════════════════
//
// Es la prueba que da sentido a todo lo demás. Si estos dos casos pasaran sin
// tocar el asistente, la pantalla estaría llenando una tarjeta con un control
// decorativo.

describe("la conexión cambia de verdad el alcance del asistente", () => {
  /** Prepara sesión de administrador con Pedidos y el asistente cableado. */
  async function preparar() {
    const { sessionStore } = await import("@/stores/session.store");
    sessionStore.configurar(["pedidos"], "administrador");

    const { integracionesStore } = await import("@/stores/integraciones.store");
    const { toolRegistry } = await import("@/assistant/registry/tool-registry");
    const { bootstrapAssistant, buildAccessContext } = await import(
      "@/assistant/bootstrap"
    );
    bootstrapAssistant();

    return { integracionesStore, toolRegistry, buildAccessContext };
  }

  it("con Pedidos conectado, el registry expone sus herramientas", async () => {
    const { toolRegistry, buildAccessContext } = await preparar();

    expect(buildAccessContext().enabledModules).toEqual(["pedidos"]);
    const tools = toolRegistry.getAvailableTools({ access: buildAccessContext() });
    expect(tools.length).toBeGreaterThan(0);
    expect(tools.every((t) => t.module === "pedidos")).toBe(true);
  });

  it("al desconectar Pedidos, el asistente se queda sin ninguna herramienta", async () => {
    const { integracionesStore, toolRegistry, buildAccessContext } = await preparar();

    integracionesStore.desconectar("pedidos");

    // El módulo sigue en la SESIÓN; lo que cambia es la conexión del asistente.
    expect(buildAccessContext().enabledModules).toEqual([]);
    expect(toolRegistry.getAvailableTools({ access: buildAccessContext() })).toEqual([]);
  });

  it("la conexión solo puede QUITAR alcance: reconectar no añade capacidades", async () => {
    const { integracionesStore, toolRegistry, buildAccessContext } = await preparar();

    integracionesStore.desconectar("pedidos");
    integracionesStore.conectar("pedidos");

    // Vuelve al mismo punto que al principio, sin haber ganado nada nuevo: el
    // filtro de capacidades del registry sigue aplicándose por encima.
    const tools = toolRegistry.getAvailableTools({ access: buildAccessContext() });
    expect(tools.length).toBeGreaterThan(0);
    expect(
      toolRegistry.resolve("pedidos.getResumenHoy", { access: buildAccessContext() }),
    ).not.toBeNull();
  });

  it("sin sesión autenticada el contexto sigue siendo fail-closed", async () => {
    const { buildAccessContext } = await import("@/assistant/bootstrap");

    // Sin `configurar()`, `sessionStore` no está autenticado.
    const access = buildAccessContext();
    expect(access.enabledModules).toEqual([]);
    expect(access.hasCapability("orders.read")).toBe(false);
  });
});

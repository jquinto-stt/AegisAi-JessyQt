import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// ═══════════════════════════════════════════════════════════════════════════
// Guarda de consistencia — la página de NECTO AI no puede divergir del store
// ═══════════════════════════════════════════════════════════════════════════
//
// La página `/asistente/config` DESCRIBE el sistema, así que su contenido tiene
// que salir del sistema. Los tres riesgos que estos tests congelan:
//
//   1. VERDAD PARTIDA EN EL RECUENTO. La sección «Herramientas» muestra
//      "N de M herramientas". Si la página contara por su cuenta (reimplementando
//      el filtro módulos ∩ capacidades) podría mostrar un número que no coincide
//      con el que el motor usará realmente al responder. La única fuente válida
//      es `toolRegistry.getAvailableTools`.
//
//   2. MOTOR INVENTADO. La sección «Motor» muestra el motor activo. Si la página
//      escribiera "local-rule" como literal, mentiría el día que se inyecte otro
//      motor. Debe leer `assistantStore.motor`, que a su vez lee
//      `AssistantEngine.kind`.
//
//   3. INVENTARIO DE MÓDULOS FALSO. `MODULOS_CONOCIDOS` declara qué módulos
//      conoce el asistente. Si declarara un módulo sin provider registrado, la
//      página prometería un alcance inexistente. Debe coincidir con los
//      providers REALMENTE registrados por el bootstrap.
//
// `vite.config.ts` fija `environment: 'node'`: no hay `localStorage`. El store
// del asistente persiste, así que se instala un stub ANTES de importar. Se
// resetean módulos e importa DESPUÉS del reset para obtener los singletons
// frescos (patrón del resto de la suite).

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

beforeEach(() => {
  vi.resetModules();
  instalarLocalStorageStub();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Herramientas — el recuento sale del registry, no de la página", () => {
  it("con la capacidad concedida, disponibles === tools reales del registry", async () => {
    const { toolRegistry } = await import("@/assistant/registry/tool-registry");
    const { PedidosToolProvider } = await import(
      "@/modules-tools/pedidos/pedidos.tool-provider"
    );

    toolRegistry.register(new PedidosToolProvider());

    // Contexto permisivo: como lo construye la página para calcular el TOTAL.
    const permisivo = {
      enabledModules: ["pedidos"] as const,
      hasCapability: () => true,
    };

    const totales = toolRegistry.getAvailableTools({
      access: { enabledModules: [...permisivo.enabledModules], hasCapability: permisivo.hasCapability },
    }).length;

    // El total del registry coincide con el catálogo del provider: si el
    // provider creciera, el "M" de la página crece con él sin tocarla.
    const delProvider = new PedidosToolProvider().getTools().length;
    expect(totales).toBe(delProvider);
    expect(totales).toBeGreaterThan(0);
  });

  it("sin capacidades, disponibles es 0 y totales sigue siendo el catálogo completo", async () => {
    const { toolRegistry } = await import("@/assistant/registry/tool-registry");
    const { PedidosToolProvider } = await import(
      "@/modules-tools/pedidos/pedidos.tool-provider"
    );

    toolRegistry.register(new PedidosToolProvider());

    const sinNada = toolRegistry.getAvailableTools({
      access: { enabledModules: ["pedidos"], hasCapability: () => false },
    });
    expect(sinNada).toHaveLength(0);

    const permisivo = toolRegistry.getAvailableTools({
      access: { enabledModules: ["pedidos"], hasCapability: () => true },
    });
    // Fail-closed solo recorta lo disponible; el denominador no se recorta.
    expect(permisivo.length).toBeGreaterThan(0);
  });

  it("disponibles nunca supera totales (N ≤ M) para cualquier capacidad", async () => {
    const { toolRegistry } = await import("@/assistant/registry/tool-registry");
    const { PedidosToolProvider } = await import(
      "@/modules-tools/pedidos/pedidos.tool-provider"
    );

    toolRegistry.register(new PedidosToolProvider());

    const totales = toolRegistry.getAvailableTools({
      access: { enabledModules: ["pedidos"], hasCapability: () => true },
    }).length;

    for (const tieneOrdersRead of [true, false]) {
      const disponibles = toolRegistry.getAvailableTools({
        access: {
          enabledModules: ["pedidos"],
          hasCapability: (cap) => (cap === "orders.read" ? tieneOrdersRead : true),
        },
      }).length;
      expect(disponibles).toBeLessThanOrEqual(totales);
    }
  });
});

describe("Alcance — los módulos declarados son los que tienen provider registrado", () => {
  it("MODULOS_CONOCIDOS coincide con los módulos del bootstrap real", async () => {
    const { MODULOS_CONOCIDOS } = await import(
      "@/pages/asistente/configuracion.secciones"
    );
    const { PedidosToolProvider } = await import(
      "@/modules-tools/pedidos/pedidos.tool-provider"
    );

    // El bootstrap registra exactamente este provider. Si se añadiera otro
    // módulo, esta aserción obliga a actualizar MODULOS_CONOCIDOS a la vez.
    expect([...MODULOS_CONOCIDOS]).toEqual([new PedidosToolProvider().module]);
  });

  it("cada módulo declarado tiene al menos una tool que lo respalda", async () => {
    const { MODULOS_CONOCIDOS } = await import(
      "@/pages/asistente/configuracion.secciones"
    );
    const { PedidosToolProvider } = await import(
      "@/modules-tools/pedidos/pedidos.tool-provider"
    );

    const provider = new PedidosToolProvider();
    for (const modulo of MODULOS_CONOCIDOS) {
      expect(modulo).toBe(provider.module);
      expect(provider.getTools().length, `"${modulo}" sin tools`).toBeGreaterThan(0);
    }
  });
});

describe("Motor — la página no puede inventar el motor activo", () => {
  it("assistantStore.motor devuelve el kind del motor inyectado", async () => {
    const { AssistantStore } = await import("@/stores/assistant.store");
    const { LocalRuleEngine } = await import("@/assistant/engine/local-rule-engine");

    const store = new AssistantStore(new LocalRuleEngine());
    expect(store.motor).toBe("local-rule");
  });

  it("el catálogo de motores cubre local-rule y remote-llm, y solo esos", async () => {
    const { MOTOR_LABEL, MOTOR_DESCRIPCION, MOTOR_BADGE, MOTOR_BADGE_LABEL } =
      await import("@/pages/asistente/configuracion.secciones");

    for (const registro of [MOTOR_LABEL, MOTOR_DESCRIPCION, MOTOR_BADGE, MOTOR_BADGE_LABEL]) {
      const claves = Object.keys(registro).sort();
      expect(claves).toEqual(["local-rule", "remote-llm"]);
    }
  });

  it("el motor que corre de verdad es local-rule y el remoto es un stub declarado", async () => {
    const { LocalRuleEngine } = await import("@/assistant/engine/local-rule-engine");
    const { RemoteLLMEngine } = await import("@/assistant/engine/remote-llm-engine");

    expect(new LocalRuleEngine().kind).toBe("local-rule");
    expect(new RemoteLLMEngine().kind).toBe("remote-llm");

    // El remoto NO está implementado: su `ask` lanza. La página lo dice, así que
    // este test fija que la afirmación siga siendo cierta.
    await expect(
      new RemoteLLMEngine().ask("hola", {
        access: { enabledModules: [], hasCapability: () => false },
      }),
    ).rejects.toThrow();
  });

  it("el motor por defecto del store es el local (no se cambia en silencio)", async () => {
    const { assistantStore } = await import("@/stores/assistant.store");
    const { LocalRuleEngine } = await import("@/assistant/engine/local-rule-engine");

    expect(assistantStore.motor).toBe(new LocalRuleEngine().kind);
  });
});

describe("Página y store — los valores mostrados derivan del store vivo", () => {
  it("los hilos que mostraría la página son los del store, y arranca con uno vacío", async () => {
    const { assistantStore } = await import("@/stores/assistant.store");

    // Mismas derivaciones que hace ConfigPage: no hay una copia paralela.
    const hilos = assistantStore.conversaciones.length;
    const mensajesTotales = assistantStore.conversaciones.reduce(
      (n, c) => n + c.mensajes.length,
      0,
    );

    // El store es un chat VIVO: nace con una conversación y sin mensajes. La
    // página debe poder mostrar 0 mensajes sin tratarlo como estado de error.
    expect(hilos).toBe(1);
    expect(mensajesTotales).toBe(0);
    expect(assistantStore.conversaciones[0].mensajes).toEqual([]);
  });

  it("los conteos reaccionan a una conversación nueva (no está congelado)", async () => {
    const { assistantStore } = await import("@/stores/assistant.store");

    const antes = assistantStore.conversaciones.length;
    assistantStore.nuevaConversacion();
    expect(assistantStore.conversaciones.length).toBe(antes + 1);
  });

  it("limpiar() vacía la conversación activa sin borrar las demás", async () => {
    const { assistantStore } = await import("@/stores/assistant.store");

    assistantStore.nuevaConversacion();
    const total = assistantStore.conversaciones.length;
    assistantStore.limpiar();

    expect(assistantStore.conversaciones.length).toBe(total);
    const activa = assistantStore.conversaciones.find(
      (c) => c.id === assistantStore.conversacionActivaId,
    );
    expect(activa?.mensajes ?? []).toHaveLength(0);
  });
});

describe("Capacidad — la página se protege con la misma capacidad que el asistente", () => {
  it("assistant.use existe en el catálogo y tiene etiqueta y grupo", async () => {
    const { CAPACIDADES, CAPACIDAD_LABEL, CAPACIDAD_GRUPOS } = await import(
      "@/stores/roles.store"
    );

    expect(CAPACIDADES).toContain("assistant.use");
    expect(CAPACIDAD_LABEL["assistant.use"]).toBeTruthy();

    const grupo = CAPACIDAD_GRUPOS.find((g) => g.capacidades.includes("assistant.use"));
    expect(grupo, "assistant.use sin grupo en CAPACIDAD_GRUPOS").toBeTruthy();
    expect(grupo?.id).toBe("asistente");
  });

  it("el rol de administración posee assistant.use", async () => {
    const { ROL_ADMIN, ROLES_SEED } = await import("@/stores/roles.store");

    const admin = ROLES_SEED.find((r) => r.id === ROL_ADMIN);
    expect(admin, `no existe el rol "${ROL_ADMIN}"`).toBeTruthy();
    expect(admin?.capacidades).toContain("assistant.use");
  });

  it("un rol con orders.read pero SIN assistant.use no entra a la página", async () => {
    const { ROLES_SEED } = await import("@/stores/roles.store");

    // Escenario real del seed: `supervisor_pedidos` puede leer pedidos (así que
    // ve datos que el asistente podría consultar) pero NO tiene `assistant.use`.
    // Es justo la fuga de alcance que la guarda de la ruta debe impedir: sin la
    // capacidad no se monta la página, aunque el rol sea "potente" en Pedidos.
    const supervisor = ROLES_SEED.find((r) => r.id === "supervisor_pedidos");
    expect(supervisor, "no existe el rol supervisor_pedidos").toBeTruthy();
    expect(supervisor?.capacidades).toContain("orders.read");
    expect(supervisor?.capacidades).not.toContain("assistant.use");
  });
});

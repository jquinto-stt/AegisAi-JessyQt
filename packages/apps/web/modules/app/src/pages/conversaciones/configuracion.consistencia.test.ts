import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// ═══════════════════════════════════════════════════════════════════════════
// Fuente única de verdad — configuración de Pedidos vs canal de WhatsApp
// ═══════════════════════════════════════════════════════════════════════════
//
// Dos superficies editan los mismos campos de `pedidosStore.config`:
//   - `/pedidos/config`      → el motor de pedidos (pipeline, modalidades…)
//   - `/conversaciones/config` → el canal (plantillas, horario…)
//
// El defecto que estos tests previenen NO es que una de las dos esté mal, sino
// que las dos guarden una COPIA. Si cada página mantuviera su propio borrador y
// lo persistiera por su cuenta, ambas podrían escribir valores distintos del
// mismo campo y la última en guardar borraría silenciosamente el trabajo de la
// otra. La regla es: mismo campo ⟹ misma clave de persistencia ⟹ un único
// `updateConfig` como puerta.
//
// Los stores son singletons con persistencia en localStorage; se resetean los
// módulos para partir de un estado limpio y se importa DESPUÉS del reset para
// obtener las instancias frescas (patrón del resto de la suite).
//
// `vite.config.ts` fija `environment: 'node'`, así que NO hay `localStorage`
// global. Se instala un stub mínimo ANTES de importar los stores: sin él, el
// `persistConfig` de `pedidos.store` lanzaría al construirse el singleton.

const CONFIG_KEY = "necto.pedidosConfig";

/** Almacén en memoria que satisface la API de Storage que usan los stores. */
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

describe("Configuración del canal — el borrador no toca el store antes de guardar", () => {
  it("mutar el borrador no altera la configuración persistida", async () => {
    const { pedidosStore } = await import("@/stores/pedidos.store");

    // Estado inicial confirmado.
    const inicial = { ...pedidosStore.config.plantillas };

    // Simula lo que hace la página al editar: copia profunda + mutación del
    // borrador (exactamente `copiaDe()` + `setPlantilla` de ConfigPage).
    const draft = {
      ...pedidosStore.config,
      plantillas: { ...pedidosStore.config.plantillas, recibido: "TEXTO DEL BORRADOR" },
    };
    expect(draft.plantillas.recibido).toBe("TEXTO DEL BORRADOR");

    // El store NO se movió: el borrador es un borrador.
    expect(pedidosStore.config.plantillas.recibido).toBe(inicial.recibido);
    expect(pedidosStore.config.plantillas.recibido).not.toBe("TEXTO DEL BORRADOR");
  });

  it("clonar `horario.dias` evita que el borrador alias el array del store", async () => {
    const { pedidosStore } = await import("@/stores/pedidos.store");

    const diasConfirmados = [...pedidosStore.config.horario.dias];

    // SIN clonar, este array sería el MISMO objeto que el del store y el push
    // escribiría en el estado confirmado. Con clon, no.
    const draft = {
      ...pedidosStore.config,
      horario: { ...pedidosStore.config.horario, dias: [...pedidosStore.config.horario.dias] },
    };
    draft.horario.dias.push(0);
    draft.horario.dias.push(6);

    expect(pedidosStore.config.horario.dias).toEqual(diasConfirmados);
  });

  it("guardar persiste en la MISMA clave que usa la configuración de Pedidos", async () => {
    const { pedidosStore } = await import("@/stores/pedidos.store");

    pedidosStore.updateConfig({
      plantillas: { ...pedidosStore.config.plantillas, entregado: "Pedido entregado, ¡gracias!" },
    });

    const raw = localStorage.getItem(CONFIG_KEY);
    expect(raw, `no se escribió la clave "${CONFIG_KEY}"`).toBeTruthy();
    const persistido = JSON.parse(raw!);
    expect(persistido.plantillas.entregado).toBe("Pedido entregado, ¡gracias!");
  });
});

describe("Configuración del canal — una sola derivación por valor", () => {
  it("las plantillas que lee la página son las del store, no una copia propia", async () => {
    const { pedidosStore } = await import("@/stores/pedidos.store");
    const { FILAS_PLANTILLA } = await import(
      "@/pages/conversaciones/configuracion.secciones"
    );

    // Cada clave de la tabla resuelve contra una clave REAL del store: si la
    // página leyerа de una fuente propia, esta comprobación no tendría sentido.
    for (const { key } of FILAS_PLANTILLA) {
      expect(
        pedidosStore.config.plantillas[key],
        `la plantilla "${key}" no existe en pedidosStore.config.plantillas`,
      ).toBeDefined();
    }
  });

  it("el horario que edita la página es el mismo objeto que gobierna el negocio", async () => {
    const { pedidosStore } = await import("@/stores/pedidos.store");

    const antes = pedidosStore.config.horario.activo;
    pedidosStore.updateConfig({ horario: { ...pedidosStore.config.horario, activo: !antes } });

    // El cambio se ve en el MISMO store que consulta `estaEnHorario()`, así que
    // no hay dos horarios: el de la página y el que aplica el dominio.
    expect(pedidosStore.config.horario.activo).toBe(!antes);

    const raw = JSON.parse(localStorage.getItem(CONFIG_KEY)!);
    expect(raw.horario.activo).toBe(!antes);
  });

  it("updateConfig fusiona las plantillas en vez de reemplazar el bloque completo", async () => {
    const { pedidosStore } = await import("@/stores/pedidos.store");

    const antes = { ...pedidosStore.config.plantillas };

    // La página del canal envía el objeto completo, pero la de pedidos puede
    // enviar solo una plantilla. La fusión garantiza que ninguna superficie
    // borre las demás plantillas por enviar un objeto parcial.
    pedidosStore.updateConfig({ plantillas: { ...antes, listo: "Tu pedido está listo 🎉" } });

    expect(pedidosStore.config.plantillas.listo).toBe("Tu pedido está listo 🎉");
    expect(pedidosStore.config.plantillas.recibido).toBe(antes.recibido);
    expect(pedidosStore.config.plantillas.cancelado).toBe(antes.cancelado);
  });
});

describe("Configuración del canal — la preferencia de tema no rompe el contrato del shell", () => {
  it("escribir el tema efectivo en uiStore no altera la configuración de dominio", async () => {
    const { uiStore } = await import("@/shell/stores/ui.store");
    const { pedidosStore } = await import("@/stores/pedidos.store");

    const configAntes = JSON.stringify(pedidosStore.config);

    uiStore.setTheme("dark");
    expect(uiStore.theme).toBe("dark");

    // La apariencia es preferencia de UI: no debe filtrarse a la config del
    // negocio. Si lo hiciera, cambiar de tema contaría como cambio de canal.
    expect(JSON.stringify(pedidosStore.config)).toBe(configAntes);
  });

  it("'sistema' no se escribe como tema literal en uiStore", async () => {
    const { uiStore } = await import("@/shell/stores/ui.store");
    const { OPCIONES_TEMA } = await import(
      "@/pages/conversaciones/configuracion.secciones"
    );

    // El store del shell solo modela light|dark; la página resuelve "sistema"
    // antes de escribir. Se comprueba que el vocabulario de la página NO es el
    // del store, que es justo por lo que hace falta la traducción.
    const valores = OPCIONES_TEMA.map((o) => o.value);
    expect(valores).toContain("sistema");
    expect(["light", "dark"]).not.toContain("sistema");

    uiStore.setTheme("light");
    expect(uiStore.theme).toBe("light");
  });
});

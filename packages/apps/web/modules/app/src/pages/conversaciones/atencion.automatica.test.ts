import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// ═══════════════════════════════════════════════════════════════════════════
// Puente de atención automática — el aviso fuera de horario se envía DE VERDAD
// ═══════════════════════════════════════════════════════════════════════════
//
// El ajuste «Aviso fuera de horario» de la configuración del canal solo vale si
// alguien lo envía. Este test fija las reglas del puente que lo hace:
//
//   · fuera de horario y con el aviso encendido → responde el AVISO, no el bot;
//   · el aviso no se repite mientras nadie haya contestado;
//   · dentro de horario no se envía;
//   · en un hilo que lleva un asesor no se envía (no se contesta por encima);
//   · con las respuestas automáticas apagadas no se envía (el aviso ES una
//     respuesta automática);
//   · con el mensaje vacío no se envía nada.
//
// `vite.config.ts` fija `environment: 'node'`, así que no hay `localStorage`
// global. Se instala un stub mínimo ANTES de importar los stores: sin él, el
// `persistConfig` de `pedidos.store` lanzaría al construirse el singleton.

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

const MENSAJE_AVISO = "Estamos cerrados; te escribimos en cuanto abramos.";

/**
 * Id del hilo de prueba.
 *
 * NO puede coincidir con ninguno del seed: `conversacionesStore` es un singleton
 * que arranca con `CONVERSACIONES_SEED` y sus mensajes viven en un índice
 * privado por `conversacionId`. Asignar `conversaciones` sustituye las
 * cabeceras, pero NO ese índice — con un id del seed, la línea de tiempo
 * arrastraría los mensajes de ejemplo y los conteos medirían otra cosa.
 */
const ID_PRUEBA = "conv-prueba-aviso";

/**
 * Día de la semana que NO es hoy.
 *
 * `estaAbierto()` comprueba primero el día, así que con `dias` sin el día de hoy
 * el negocio está cerrado sea cual sea la hora a la que corra el test. Depender
 * de la hora haría que la suite pasara o fallara según cuándo se ejecutara.
 */
function diaQueNoEsHoy(): number {
  return (new Date().getDay() + 1) % 7;
}

interface Escenario {
  /** ¿El horario está configurado? Si no, el negocio se considera abierto. */
  horarioCerrado: boolean;
  avisoActivo: boolean;
  mensaje?: string;
  atencion?: "bot" | "humano";
  respuestasAutomaticas?: boolean;
}

/** Monta los dos stores con un hilo y una configuración conocidos. */
async function montar(esc: Escenario) {
  const { pedidosStore } = await import("@/stores/pedidos.store");
  const { conversacionesStore } = await import("@/stores/conversaciones.store");

  conversacionesStore.conversaciones = [
    {
      id: ID_PRUEBA,
      canal: "whatsapp",
      contacto: { telefono: "+573001112233", nombre: "Ana", origen: "whatsapp" },
      estado: "abierta",
      atencion: esc.atencion ?? "bot",
      operadorAsignadoId: null,
      noLeidos: 0,
      ultimaActividad: new Date().toISOString(),
    },
  ];

  pedidosStore.updateConfig({
    horario: esc.horarioCerrado
      ? { activo: true, dias: [diaQueNoEsHoy()], apertura: "00:00", cierre: "23:59" }
      : { activo: false, dias: [0, 1, 2, 3, 4, 5, 6], apertura: "00:00", cierre: "23:59" },
    avisoFueraHorario: {
      activo: esc.avisoActivo,
      mensaje: esc.mensaje ?? MENSAJE_AVISO,
    },
  });

  conversacionesStore.setRespuestasAutomaticas(esc.respuestasAutomaticas ?? true);

  const { clienteEscribe } = await import("@/pages/conversaciones/atencion.automatica");
  return { pedidosStore, conversacionesStore, clienteEscribe };
}

/** Cuántos mensajes del hilo llevan exactamente el texto del aviso. */
function vecesAvisado(conversacionesStore: { lineaDeTiempo: (id: string) => unknown[] }): number {
  return conversacionesStore
    .lineaDeTiempo(ID_PRUEBA)
    .filter(
      (i) =>
        (i as { clase: string; data: { contenido?: { texto: string } } }).clase === "mensaje" &&
        (i as { data: { contenido?: { texto: string } } }).data.contenido?.texto === MENSAJE_AVISO,
    ).length;
}

describe("Aviso fuera de horario — se envía cuando toca", () => {
  it("fuera de horario responde el AVISO, y lo firma el bot", async () => {
    const { conversacionesStore, clienteEscribe } = await montar({
      horarioCerrado: true,
      avisoActivo: true,
    });

    const resultado = clienteEscribe(ID_PRUEBA, "¿hola?");

    expect(resultado).toBe("aviso_fuera_horario");
    const items = conversacionesStore.lineaDeTiempo(ID_PRUEBA);
    expect(items).toHaveLength(2); // el mensaje del cliente + el aviso
    const ultimo = items[items.length - 1];
    expect(ultimo.clase).toBe("mensaje");
    if (ultimo.clase === "mensaje") {
      expect(ultimo.data.autor).toBe("bot");
      expect(ultimo.data.contenido.texto).toBe(MENSAJE_AVISO);
    }
  });

  it("el aviso SUSTITUYE a la respuesta del bot: no llegan las dos", async () => {
    // Con `responderConBot: false`, el mensaje del cliente no dispara la
    // respuesta automática. Si se disparara, el hilo tendría tres mensajes: el
    // del cliente, el del bot y el aviso — dos respuestas a un solo mensaje.
    const { conversacionesStore, clienteEscribe } = await montar({
      horarioCerrado: true,
      avisoActivo: true,
    });

    clienteEscribe(ID_PRUEBA, "¿hola?");
    await new Promise((r) => setTimeout(r, 0)); // deja asentar cualquier efecto diferido

    expect(conversacionesStore.lineaDeTiempo(ID_PRUEBA)).toHaveLength(2);
  });

  it("no repite el aviso si el cliente vuelve a escribir sin respuesta", async () => {
    const { conversacionesStore, clienteEscribe } = await montar({
      horarioCerrado: true,
      avisoActivo: true,
    });

    clienteEscribe(ID_PRUEBA, "primero");
    clienteEscribe(ID_PRUEBA, "¿sigues ahí?");

    // Tres mensajes: cliente, aviso, cliente. El aviso, UNA vez.
    expect(conversacionesStore.lineaDeTiempo(ID_PRUEBA)).toHaveLength(3);
    expect(vecesAvisado(conversacionesStore)).toBe(1);
  });
});

describe("Aviso fuera de horario — NO se envía cuando no toca", () => {
  it("dentro de horario no se envía (el negocio está abierto)", async () => {
    const { conversacionesStore, clienteEscribe } = await montar({
      horarioCerrado: false,
      avisoActivo: true,
      atencion: "bot",
    });

    expect(clienteEscribe(ID_PRUEBA, "hola")).toBe("enviado");
    expect(vecesAvisado(conversacionesStore)).toBe(0);
    await new Promise((r) => setTimeout(r, 0));
  });

  it("con el aviso apagado no se envía", async () => {
    const { conversacionesStore, clienteEscribe } = await montar({
      horarioCerrado: true,
      avisoActivo: false,
      atencion: "humano",
    });

    expect(clienteEscribe(ID_PRUEBA, "hola")).toBe("enviado");
    expect(vecesAvisado(conversacionesStore)).toBe(0);
  });

  it("con el mensaje vacío no se envía nada", async () => {
    const { conversacionesStore, clienteEscribe } = await montar({
      horarioCerrado: true,
      avisoActivo: true,
      mensaje: "   ",
      atencion: "humano",
    });

    expect(clienteEscribe(ID_PRUEBA, "hola")).toBe("enviado");
    // Nada de «un aviso en blanco»: el hilo solo tiene el mensaje del cliente.
    expect(conversacionesStore.lineaDeTiempo(ID_PRUEBA)).toHaveLength(1);
  });

  it("en un hilo que lleva un asesor no se contesta por encima", async () => {
    const { conversacionesStore, clienteEscribe } = await montar({
      horarioCerrado: true,
      avisoActivo: true,
      atencion: "humano",
    });

    expect(clienteEscribe(ID_PRUEBA, "hola")).toBe("enviado");
    expect(vecesAvisado(conversacionesStore)).toBe(0);
  });

  it("con las respuestas automáticas apagadas tampoco: el aviso ES automático", async () => {
    const { conversacionesStore, clienteEscribe } = await montar({
      horarioCerrado: true,
      avisoActivo: true,
      atencion: "bot",
      respuestasAutomaticas: false,
    });

    expect(clienteEscribe(ID_PRUEBA, "hola")).toBe("enviado");
    expect(vecesAvisado(conversacionesStore)).toBe(0);
    // Y el bot tampoco: el interruptor apaga las dos cosas.
    await new Promise((r) => setTimeout(r, 0));
    expect(conversacionesStore.lineaDeTiempo(ID_PRUEBA)).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// El interruptor del canal, en el store
// ═══════════════════════════════════════════════════════════════════════════

describe("Interruptor de respuestas automáticas del canal", () => {
  it("arranca encendido y se persiste al apagarlo", async () => {
    const { conversacionesStore } = await montar({ horarioCerrado: true, avisoActivo: false });
    expect(conversacionesStore.respuestasAutomaticas).toBe(true);

    conversacionesStore.setRespuestasAutomaticas(false);

    const guardado = JSON.parse(localStorage.getItem("necto.conversaciones_v3") ?? "{}");
    expect(guardado.respuestasAutomaticas).toBe(false);
  });

  it("una sesión guardada ANTES del ajuste se lee como encendida, no como apagada", async () => {
    // Sin esta regla, desplegar el ajuste apagaría el bot a todo el mundo: el
    // fichero no trae la clave y «no está» no puede significar «apagado».
    localStorage.setItem(
      "necto.conversaciones_v3",
      JSON.stringify({ conversaciones: [], mensajesPorConv: {}, eventosPorConv: {} }),
    );
    vi.resetModules();

    const { conversacionesStore } = await import("@/stores/conversaciones.store");
    expect(conversacionesStore.respuestasAutomaticas).toBe(true);
  });

  it("apagado, el bot no responde aunque el hilo lo lleve el bot", async () => {
    const { conversacionesStore } = await montar({
      horarioCerrado: false,
      avisoActivo: false,
      atencion: "bot",
      respuestasAutomaticas: false,
    });

    conversacionesStore.enviarComoCliente(ID_PRUEBA, "¿me ayudas?");
    await new Promise((r) => setTimeout(r, 0));

    // Solo el mensaje del cliente: el bot no contestó.
    expect(conversacionesStore.lineaDeTiempo(ID_PRUEBA)).toHaveLength(1);
  });
});

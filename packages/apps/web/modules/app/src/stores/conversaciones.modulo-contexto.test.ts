import { describe, it, expect, beforeEach, vi } from "vitest";

import type { ItemLineaTiempo } from "@/stores/conversaciones.types";

// ═══════════════════════════════════════════════════════════════════════════
// conversaciones.modulo-contexto.test.ts — Criterio de aceptación de H3
// ═══════════════════════════════════════════════════════════════════════════
//
// Antes de cerrar el hueco, la clasificación por módulo funcionaba SOLO sobre el
// seed: `simularRespuestaBot` llamaba a `agregarMensajeBot(convId, texto, payload)`
// sin el 4.º argumento, así que un mensaje del bot escrito EN RUNTIME nacía sin
// `moduloContexto` y el hilo se degradaba a "general" al primer uso real.
//
// Este test es el criterio de aceptación de la fase 0 y va por la cadena
// COMPLETA, sin dobles:
//
//   sesión real → buildAccessContext → LocalRuleEngine → ToolRegistry
//     → PedidosToolProvider.run → ToolResult.sources[0].module
//     → extraerModulo → RespuestaBot.modulo → Mensaje.moduloContexto
//
// Nota de arranque: el `toolRegistry` singleton se puebla en `bootstrapAssistant()`,
// que `App.tsx` invoca al cargar el módulo. En un test nadie importa `App.tsx`,
// así que hay que llamarlo explícitamente — sin él el registry está vacío y el
// engine responde "no tengo herramientas disponibles", que es el fail-closed
// correcto pero no lo que este test quiere ejercitar.
//
// ═══════════════════════════════════════════════════════════════════════════

/** Ítems de la línea de tiempo que son mensajes, con el tipo ya estrechado. */
type ItemMensaje = Extract<ItemLineaTiempo, { clase: "mensaje" }>;

const soloMensajes = (items: ItemLineaTiempo[]): ItemMensaje[] =>
  items.filter((it): it is ItemMensaje => it.clase === "mensaje");

describe("ConversacionesStore — el dominio llega al mensaje en RUNTIME", () => {
  beforeEach(() => {
    // Entorno `node` sin localStorage: los stores arrancan con su seed y la
    // sesión se configura explícitamente (sin sesión el acceso es fail-closed).
    vi.resetModules();
  });

  it("un mensaje de bot escrito en runtime queda etiquetado con el módulo de la tool que respondió", async () => {
    const { sessionStore } = await import("@/stores/session.store");
    sessionStore.configurar(["pedidos"], "administrador");

    // Cableado del asistente, igual que hace `App.tsx` en el arranque real.
    const { bootstrapAssistant } = await import("@/assistant/bootstrap");
    bootstrapAssistant();

    const { conversacionesStore } = await import(
      "@/stores/conversaciones.store"
    );

    // conv-1 es `abierta`/`bot`: el bot responde sin que nadie lo tome.
    // "hoy" enruta a `pedidos.getResumenHoy`, una tool del provider de Pedidos.
    const TEXTO_CLIENTE = "¿cuántos pedidos hoy?";
    conversacionesStore.enviarComoCliente("conv-1", TEXTO_CLIENTE);

    // `enviarComoCliente` dispara la respuesta del bot en fire-and-forget; se
    // espera una segunda ejecución explícita para que la aserción sea
    // determinista (el efecto es idempotente en cuanto a la etiqueta).
    await conversacionesStore.simularRespuestaBot("conv-1");

    const mensajes = soloMensajes(conversacionesStore.lineaDeTiempo("conv-1"));
    const idxCliente = mensajes.findIndex(
      (m) => m.data.contenido.texto === TEXTO_CLIENTE,
    );
    expect(idxCliente).toBeGreaterThanOrEqual(0);

    const respuestasBot = mensajes
      .slice(idxCliente + 1)
      .filter((m) => m.data.autor === "bot");

    expect(respuestasBot.length).toBeGreaterThan(0);

    // El punto del test: la etiqueta ya no depende del seed. Toda respuesta del
    // bot a un mensaje escrito en runtime lleva el dominio de su tool.
    for (const r of respuestasBot) {
      expect(r.data.moduloContexto).toBe("pedidos");
    }
  });

  it("sin sesión (acceso fail-closed) el mensaje del bot NO se etiqueta", async () => {
    // El registry SÍ está poblado (provider registrado), pero sin `configurar(...)`
    // `buildAccessContext()` devuelve un contexto vacío, así que el filtro
    // módulos ∩ capacidades no expone ninguna tool y el engine no produce
    // evidencia. Resultado honesto: mensaje sin dominio, nunca uno inventado.
    const { bootstrapAssistant } = await import("@/assistant/bootstrap");
    bootstrapAssistant();

    const { conversacionesStore } = await import(
      "@/stores/conversaciones.store"
    );

    conversacionesStore.enviarComoCliente("conv-1", "¿cuántos pedidos hoy?");
    await conversacionesStore.simularRespuestaBot("conv-1");

    const bot = soloMensajes(conversacionesStore.lineaDeTiempo("conv-1")).filter(
      (m) => m.data.autor === "bot",
    );

    // El seed ya trae dos mensajes de bot etiquetados; ninguno de los NUEVOS
    // debe tener dominio, porque no hubo ninguna fuente que lo declarara.
    const nuevos = bot.slice(2);
    expect(nuevos.length).toBeGreaterThan(0);
    for (const b of nuevos) {
      expect(b.data.moduloContexto).toBeUndefined();
    }
  });

  it("`enviarComoNegocio` acepta el módulo opcional sin obligar a la UI a usarlo", async () => {
    const { conversacionesStore } = await import(
      "@/stores/conversaciones.store"
    );

    // conv-5 está `en_espera`/`humano`: el operador puede escribir.
    //
    // El envío es asíncrono desde el 22/09 (sale por HTTP hacia el servicio que
    // habla con WhatsApp), así que hay que esperarlo. En este entorno no hay
    // servidor, así que el envío fallará y el store NO pintará la burbuja —que
    // es justo la garantía nueva: un mensaje que no salió no se muestra.
    //
    // Por eso aquí se comprueba lo que este test puede comprobar sin red: que la
    // firma sigue admitiendo los TRES argumentos. La llamada de 3 argumentos se
    // hace de verdad; si el tercer parámetro hubiera desaparecido, TypeScript no
    // compilaría. La comprobación de `.length` NO sirve: los parámetros con
    // valor por defecto (`moduloContexto?`) no cuentan en `fn.length`.
    await conversacionesStore.enviarComoNegocio("conv-5", "Ya reviso tu cambio.");
    await conversacionesStore.enviarComoNegocio(
      "conv-5",
      "Listo, quedó actualizado.",
      "pedidos",
    );

    // Sin servicio al que enviar, el fallo se publica en vez de tragarse: es la
    // garantía de que el composer no miente. Antes esta llamada «funcionaba» y
    // pintaba la burbuja sin que saliera nada.
    expect(conversacionesStore.ultimoErrorEnvio).not.toBeNull();
  });
});

import { describe, it, expect } from "vitest";

import {
  ToolRegistry,
  type AssistantAccessContext,
  type AssistantEngine,
  type AssistantMessage,
  type ToolResult,
} from "@/assistant";
import { LocalRuleEngine } from "@/assistant/engine/local-rule-engine";
import { PedidosToolProvider } from "@/modules-tools/pedidos/pedidos.tool-provider";
import {
  crearConversacionesBotAdapter,
  MENSAJE_FALLBACK,
  type RespuestaBot,
} from "./conversaciones-bot.adapter";

// ═══════════════════════════════════════════════════════════════════════════
// conversaciones-bot.adapter.test.ts — Cierre de H3/H4
// ═══════════════════════════════════════════════════════════════════════════
//
// El defecto que estos tests blindan: el adaptador devolvía `{ texto, payload }`
// y TIRABA el dominio que la tool ya había declarado en
// `ToolResult.sources[].module`. Consecuencia: `Mensaje.moduloContexto` solo
// existía en el seed y se degradaba en cuanto alguien escribía — una
// clasificación que moría al primer uso real.
//
// `extraerModulo` es la simétrica de `extraerPayload`: si existe el getter de
// payload, el de módulo también debe existir.
//
// ═══════════════════════════════════════════════════════════════════════════

/** Contexto de acceso controlado (el de la sesión real es fail-closed en tests). */
function makeAccess(
  enabledModules: AssistantAccessContext["enabledModules"],
  capabilities: string[],
): AssistantAccessContext {
  const caps = new Set(capabilities);
  return { enabledModules, hasCapability: (cap) => caps.has(cap) };
}

/**
 * Motor que IGNORA el contexto que le pasa el adaptador y usa uno controlado con
 * la capacidad `orders.read`. Es la única forma de ejercitar el provider REAL
 * desde el adaptador en un entorno sin sesión: `buildAccessContext()` es
 * fail-closed y sin sesión no expondría ninguna tool.
 */
function motorConAccesoControlado(): AssistantEngine {
  const registry = new ToolRegistry();
  registry.register(new PedidosToolProvider());
  const real = new LocalRuleEngine(registry);
  const access = makeAccess(["pedidos"], ["orders.read"]);

  return {
    kind: "test-controlado",
    ask: (question, ctx) => real.ask(question, { ...ctx, access }),
  };
}

/** Motor que devuelve un mensaje fijo, con la evidencia que se le indique. */
function motorFijo(texto: string, evidence?: ToolResult): AssistantEngine {
  return {
    kind: "test-fijo",
    ask: async (): Promise<AssistantMessage> => ({
      id: "m1",
      role: "assistant",
      text: texto,
      ...(evidence !== undefined ? { evidence } : {}),
      createdAt: new Date().toISOString(),
    }),
  };
}

/** Motor que rechaza, para ejercitar el camino de fallback. */
function motorQueFalla(): AssistantEngine {
  return {
    kind: "test-falla",
    ask: async () => {
      throw new Error("motor caído");
    },
  };
}

describe("ConversacionesBotAdapter — propagación del DOMINIO (H3/H4)", () => {
  it("devuelve el módulo que declaró la tool que respondió, leído del provider REAL", async () => {
    const adapter = crearConversacionesBotAdapter(motorConAccesoControlado());

    // "hoy" enruta a `pedidos.getResumenHoy` (tool de nivel query).
    const res: RespuestaBot = await adapter.responder({
      textoCliente: "¿cuántos pedidos hoy?",
    });

    // El dominio NO se infiere del texto: se copia de `sources[0].module`.
    expect(res.modulo).toBe("pedidos");
    expect(res.texto.length).toBeGreaterThan(0);
  });

  it("el módulo llega junto al payload, no en su lugar", async () => {
    const adapter = crearConversacionesBotAdapter(motorConAccesoControlado());
    const res = await adapter.responder({
      textoCliente: "¿cuántos pedidos hoy?",
    });

    // Son campos INDEPENDIENTES: el payload transporta referencias de dominio
    // (ids) y el módulo la etiqueta del dominio. Uno no sustituye al otro.
    expect("modulo" in res).toBe(true);
    expect(res.modulo).toBe("pedidos");
  });

  describe("fail-closed — sin evidencia no hay etiqueta, nunca una inventada", () => {
    it("sin `evidence` devuelve `modulo: undefined`", async () => {
      const adapter = crearConversacionesBotAdapter(
        motorFijo("Aquí tienes la información."),
      );
      const res = await adapter.responder({ textoCliente: "hola" });

      expect(res.texto).toBe("Aquí tienes la información.");
      expect(res.modulo).toBeUndefined();
    });

    it("con `sources` vacío devuelve `modulo: undefined`", async () => {
      const adapter = crearConversacionesBotAdapter(
        motorFijo("Sin fuentes.", { facts: [], sources: [] }),
      );
      const res = await adapter.responder({ textoCliente: "hola" });

      expect(res.modulo).toBeUndefined();
    });

    it("con un módulo SIN destino conocido devuelve `modulo: undefined`", async () => {
      const adapter = crearConversacionesBotAdapter(
        motorFijo("Módulo del futuro.", {
          facts: [],
          sources: [
            {
              toolId: "futuro.algo",
              // Simula un módulo que el mapa de traducción aún no contempla:
              // debe degradar a "sin etiqueta", no a una etiqueta cualquiera.
              module: "desconocido" as never,
              detail: "x",
            },
          ],
        }),
      );
      const res = await adapter.responder({ textoCliente: "hola" });

      expect(res.modulo).toBeUndefined();
    });
  });

  describe("caminos de fallo — el fallback NO se etiqueta con ningún dominio", () => {
    it("si el engine lanza, devuelve el fallback sin módulo", async () => {
      const adapter = crearConversacionesBotAdapter(motorQueFalla());
      const res = await adapter.responder({ textoCliente: "hola" });

      expect(res.texto).toBe(MENSAJE_FALLBACK);
      expect(res.modulo).toBeUndefined();
    });

    it("una respuesta vacía no se etiqueta (el store no agregará mensaje)", async () => {
      const adapter = crearConversacionesBotAdapter(motorFijo("   "));
      const res = await adapter.responder({ textoCliente: "hola" });

      expect(res.texto).toBe("");
      expect(res.modulo).toBeUndefined();
    });
  });
});

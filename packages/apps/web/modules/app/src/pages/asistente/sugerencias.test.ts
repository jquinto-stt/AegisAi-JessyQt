import { describe, it, expect } from "vitest";

import { ToolRegistry, type AssistantAccessContext } from "@/assistant";
import type { EngineContext } from "@/assistant";
import { LocalRuleEngine } from "@/assistant/engine/local-rule-engine";
import { PedidosToolProvider } from "@/modules-tools/pedidos/pedidos.tool-provider";

import { SUGERENCIAS } from "./sugerencias";

// ═══════════════════════════════════════════════════════════════════════════
// pages/asistente/sugerencias.test.ts
//
// Las tarjetas del estado vacío prometen, cada una, que al pulsarla se llega a
// una respuesta real. Este test comprueba esa promesa de la única forma que
// vale: recorriendo el mismo camino que recorre el clic.
//
// `AsistentePage` hace `assistantStore.enviar(s.pregunta)` → `engine.ask(...)`.
// Aquí se construye el engine REAL (`LocalRuleEngine` + `PedidosToolProvider`
// reales) y se ejecuta `ask` con la pregunta de cada tarjeta, exigiendo que la
// evidencia devuelta venga de la tool que la tarjeta declara.
//
// No basta con comprobar que el `toolId` esté registrado: el fallo original no
// era un id inexistente en un array, era que la FRASE de la tarjeta resolvía a
// una tool DISTINTA de la que la tarjeta anunciaba. Por eso se verifica el par
// completo (pregunta → toolId), que es lo que el usuario percibe al pulsar.
// ═══════════════════════════════════════════════════════════════════════════

/** Contexto de acceso con el módulo pedidos y la capacidad de lectura. */
function makeAccess(): AssistantAccessContext {
  return {
    enabledModules: ["pedidos"],
    hasCapability: (cap) => cap === "orders.read",
  };
}

/** Engine real: LocalRuleEngine sobre el PedidosToolProvider real. */
function makeRealEngine(): LocalRuleEngine {
  const registry = new ToolRegistry();
  registry.register(new PedidosToolProvider());
  return new LocalRuleEngine(registry);
}

describe("SUGERENCIAS — forma de las tarjetas", () => {
  it("hay tres tarjetas, cada una con sus cuatro campos no vacíos", () => {
    expect(SUGERENCIAS).toHaveLength(3);
    for (const s of SUGERENCIAS) {
      expect(s.titulo.trim().length).toBeGreaterThan(0);
      expect(s.descripcion.trim().length).toBeGreaterThan(0);
      expect(s.pregunta.trim().length).toBeGreaterThan(0);
      expect(s.toolId.trim().length).toBeGreaterThan(0);
    }
  });

  it("títulos y preguntas son distintos entre sí", () => {
    const titulos = SUGERENCIAS.map((s) => s.titulo);
    const preguntas = SUGERENCIAS.map((s) => s.pregunta);
    expect(new Set(titulos).size).toBe(titulos.length);
    expect(new Set(preguntas).size).toBe(preguntas.length);
  });

  it("la descripción no repite la pregunta (la tarjeta ya muestra la pregunta al pulsar)", () => {
    for (const s of SUGERENCIAS) {
      expect(s.descripcion).not.toBe(s.pregunta);
    }
  });

  it("todas las preguntas están en español", () => {
    for (const s of SUGERENCIAS) {
      expect(/[áéíóúñ¿¡]/i.test(s.pregunta)).toBe(true);
    }
  });
});

describe("SUGERENCIAS — cada tarjeta llega de verdad a su herramienta", () => {
  it("la pregunta de cada tarjeta produce evidencia de la tool que declara", async () => {
    const engine = makeRealEngine();
    const ctx: EngineContext = { access: makeAccess() };

    for (const s of SUGERENCIAS) {
      const msg = await engine.ask(s.pregunta, ctx);

      // Una respuesta real trae evidencia; sin ella el clic habría sido un
      // no-op (o un "no tengo herramientas"), que es el defecto a prevenir.
      expect(msg.evidence, `"${s.titulo}" no produjo evidencia`).toBeDefined();

      const toolIds = (msg.evidence?.sources ?? []).map((src) => src.toolId);
      expect(
        toolIds,
        `"${s.titulo}" declaró ${s.toolId} pero resolvió a ${toolIds.join(", ") || "(ninguna)"}`,
      ).toContain(s.toolId);
    }
  });

  it("ninguna tarjeta apunta a pedidos.getTopProductos (tool huérfana)", async () => {
    // Regresión explícita: `pedidos.getTopProductos` está declarada en el
    // provider pero no figura en QUERY_TOOLS/ANALYZE_TOOLS, así que el registry
    // nunca la resuelve. Era exactamente la primera tarjeta del estado vacío.
    expect(SUGERENCIAS.map((s) => s.toolId)).not.toContain("pedidos.getTopProductos");
  });

  it("la tarjeta retirada prometía un ranking de productos y devolvía otra cosa", async () => {
    // Prueba del defecto real, que NO era un callejón sin salida (la primera
    // hipótesis era esa, y era falsa — por eso está escrito aquí).
    //
    // `REGLAS_INTENCION` no tiene NINGUNA regla que apunte a
    // `pedidos.getTopProductos`: las keywords "hoja de calculo", "excel",
    // "tabla", "spreadsheet" y "top" se enrutan a propósito a
    // `pedidos.getVentasPeriodo`, que sí está registrada. O sea que la tool
    // huérfana es inalcanzable por diseño, y eso está bien.
    //
    // El problema era la tarjeta: decía "Top 10 Productos — Generar una hoja de
    // cálculo con los productos de mayor rotación" y al pulsarla el usuario
    // recibía el total de ventas del periodo. Respondía, sí, pero a otra
    // pregunta. Prometía un ranking de productos que ningún tool registrado
    // puede producir.
    //
    // Este test fija el comportamiento observado: la frase va a
    // `getVentasPeriodo`, no a un ranking. Si alguien registra algún día
    // `getTopProductos` y le añade regla, este test fallará y habrá que decidir
    // si la tarjeta debe volver.
    const engine = makeRealEngine();
    const ctx: EngineContext = { access: makeAccess() };
    const msg = await engine.ask("Genera una hoja de cálculo con el top 10 de productos", ctx);

    expect(msg.role).toBe("assistant");
    const toolIds = (msg.evidence?.sources ?? []).map((src) => src.toolId);
    expect(toolIds).toContain("pedidos.getVentasPeriodo");
    expect(toolIds).not.toContain("pedidos.getTopProductos");
  });

  it("las tarjetas cubren consulta y análisis, no solo consulta", async () => {
    const engine = makeRealEngine();
    const ctx: EngineContext = { access: makeAccess() };

    const niveles = new Set<string>();
    for (const s of SUGERENCIAS) {
      const msg = await engine.ask(s.pregunta, ctx);
      const toolId = msg.evidence?.sources?.[0]?.toolId;
      if (toolId?.includes("diagnostico")) niveles.add("analyze");
      else if (toolId) niveles.add("query");
    }

    expect(niveles.has("query")).toBe(true);
    expect(niveles.has("analyze")).toBe(true);
  });
});

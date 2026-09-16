import { describe, it, expect, vi } from "vitest";

import { ToolRegistry, type AssistantAccessContext } from "@/assistant";
import type {
  AssistantEngine,
  AssistantMessage,
  EngineContext,
  Fact,
  Inference,
  ToolResult,
} from "@/assistant";
import { LocalRuleEngine } from "@/assistant/engine/local-rule-engine";
import { PedidosToolProvider } from "@/modules-tools/pedidos/pedidos.tool-provider";
import { AssistantStore } from "@/stores/assistant.store";

// ═══════════════════════════════════════════════════════════════════════════
// pages/asistente/asistente.integration.test.ts — Tarea 10.4
// Test de integración del flujo del chat del asistente
// Requirements: 1.6, 3.8
// ═══════════════════════════════════════════════════════════════════════════
//
// ── Nota de diseño (por qué integración a nivel LÓGICO y no render de React) ──
//
// El proyecto NO tiene configurado un entorno de DOM para tests: `vite.config.ts`
// usa `test.environment: 'node'` y las devDependencies NO incluyen
// `@testing-library/react` ni `jsdom`/`happy-dom`. Tampoco existe ningún
// `*.test.tsx` de componentes en el repo. Montar todo ese andamiaje (jsdom +
// testing-library + setup) sería desproporcionado para un test opcional.
//
// Por eso este test cubre el MISMO flujo de integración pero a nivel de
// store + engine + provider REALES (sin `render` de React):
//
//   1) Se construye un `ToolRegistry` real, se registra el `PedidosToolProvider`
//      real, se crea un `LocalRuleEngine` real con ese registry y se ejercita
//      `engine.ask(...)` con un `AssistantAccessContext` CONTROLADO (con la
//      capacidad `orders.read`). Así el flujo engine+provider produce un mensaje
//      `assistant` cuya `evidence` tiene `facts` (y, para las tools `analyze`,
//      opcionalmente `inferences` con `confidence`). Esto valida el requisito
//      3.8 a nivel de datos: el `FactsPanel` recibiría hechos e inferencias
//      separables, cada inferencia con su etiqueta de confianza.
//
//   2) Se verifica el `AssistantStore` real con un engine que devuelve una
//      `evidence` real: el hilo termina con un mensaje `user` (el texto con
//      trim) seguido de un mensaje `assistant` con esa evidencia. Esto valida el
//      requisito 1.6 a nivel de datos: `ChatThread` renderizaría un `user`
//      visualmente distinto del `assistant`, y `AsistentePage` seleccionaría la
//      última evidencia para el `FactsPanel`.
//
// El AssistantStore real llama a `buildAccessContext()` (lee `sessionStore`); en
// el entorno de test no hay sesión autenticada, por lo que ese adaptador es
// fail-closed y devuelve un contexto vacío. Para que el flujo sea DETERMINISTA y
// VERDE, la parte de integración engine+provider usa un engine con un
// `AssistantAccessContext` controlado invocado directamente, y la parte del
// store usa un engine fake que ignora el `ctx`.
//
// ═══════════════════════════════════════════════════════════════════════════

/** Construye un `AssistantAccessContext` a partir de módulos y capacidades. */
function makeAccess(
  enabledModules: AssistantAccessContext["enabledModules"],
  capabilities: string[],
): AssistantAccessContext {
  const caps = new Set(capabilities);
  return {
    enabledModules,
    hasCapability: (cap) => caps.has(cap),
  };
}

/** Motor de integración real (LocalRuleEngine + PedidosToolProvider real). */
function makeRealEngine(): LocalRuleEngine {
  const registry = new ToolRegistry();
  registry.register(new PedidosToolProvider());
  return new LocalRuleEngine(registry);
}

/**
 * Réplica de la lógica de separación del `FactsPanel` a nivel de datos: dado un
 * `ToolResult`, devuelve las secciones que la UI renderizaría por separado.
 * `FactsPanel` muestra `facts` en una sección de "Hechos" e `inferences` en una
 * sección aparte de "Observaciones (inferencias)" con su badge de confianza.
 */
function separarPanel(evidence?: ToolResult): {
  hechos: Fact[];
  inferencias: Inference[];
} {
  return {
    hechos: evidence?.facts ?? [],
    inferencias: evidence?.inferences ?? [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Parte 1 — Integración engine + provider REALES (flujo de datos, Req 3.8)
// ═══════════════════════════════════════════════════════════════════════════

describe("Integración asistente — engine + PedidosToolProvider reales", () => {
  it("responde una consulta (query) con evidence que trae facts, separables por el FactsPanel (Req 3.8)", async () => {
    const engine = makeRealEngine();
    const ctx: EngineContext = {
      access: makeAccess(["pedidos"], ["orders.read"]),
    };

    // "¿cuántos pedidos hoy?" → keyword "hoy" → pedidos.getResumenHoy (query).
    const msg = await engine.ask("¿cuántos pedidos hoy?", ctx);

    // El motor devuelve un mensaje del asistente con evidencia adjunta.
    expect(msg.role).toBe("assistant");
    expect(msg.evidence).toBeDefined();

    // La evidencia trae HECHOS (getResumenHoy expone KPIs del día).
    const { hechos, inferencias } = separarPanel(msg.evidence);
    expect(hechos.length).toBeGreaterThan(0);
    // Cada hecho tiene un label no vacío y un value (contrato Fact).
    for (const f of hechos) {
      expect(f.label.length).toBeGreaterThan(0);
      expect(f.value).toBeDefined();
    }
    // getResumenHoy no emite inferencias.
    expect(inferencias).toHaveLength(0);

    // El texto separa la sección de Hechos y no usa términos causales (Req 3.7,
    // que refuerza la separación que muestra el FactsPanel).
    expect(msg.text).toContain("Hechos:");
    const lower = msg.text.toLowerCase();
    for (const causal of ["causa", "provoca", "porque", "debido a"]) {
      expect(lower).not.toContain(causal);
    }
  });

  it("responde un análisis (analyze) cuya evidence separa Hechos de Inferencias con confidence válida (Req 3.8)", async () => {
    const engine = makeRealEngine();
    const ctx: EngineContext = {
      access: makeAccess(["pedidos"], ["orders.read"]),
    };

    // "diagnóstico" / "desempeño" → pedidos.diagnosticoDesempeno (analyze).
    const msg = await engine.ask("dame un diagnóstico de desempeño", ctx);

    expect(msg.role).toBe("assistant");
    expect(msg.evidence).toBeDefined();

    const { hechos, inferencias } = separarPanel(msg.evidence);

    // Siempre hay hechos (volumen 7d, ciclo, urgentes).
    expect(hechos.length).toBeGreaterThan(0);

    // Si hay inferencias, cada una está bien formada y es trazable (Req 3.4/3.5):
    //  - confidence en {baja, media, alta}
    //  - basedOn no vacío y referenciando labels de hechos presentes
    //  - kind no causal (Req 3.2)
    const CONFIANZAS = new Set(["baja", "media", "alta"]);
    const KINDS = new Set(["correlation", "pattern", "hypothesis"]);
    const labels = new Set(hechos.map((f) => f.label));
    for (const inf of inferencias) {
      expect(CONFIANZAS.has(inf.confidence)).toBe(true);
      expect(KINDS.has(inf.kind)).toBe(true);
      expect(inf.basedOn.length).toBeGreaterThan(0);
      for (const ref of inf.basedOn) {
        expect(labels.has(ref)).toBe(true);
      }
    }
  });

  it("sin la capacidad orders.read el motor responde sin evidencia (fail-closed)", async () => {
    const engine = makeRealEngine();
    // Módulo habilitado pero SIN orders.read → getAvailableTools = [].
    const ctx: EngineContext = { access: makeAccess(["pedidos"], []) };

    const msg = await engine.ask("¿cuántos pedidos hoy?", ctx);

    expect(msg.role).toBe("assistant");
    expect(msg.evidence).toBeUndefined();
    expect(msg.text.toLowerCase()).toMatch(/permisos|no tengo herramientas/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Parte 2 — Flujo del hilo en el AssistantStore real (Req 1.6)
// ═══════════════════════════════════════════════════════════════════════════

describe("Integración asistente — AssistantStore produce el hilo user/assistant", () => {
  it("enviar produce un mensaje user y luego un assistant con evidencia (Req 1.6, 3.8)", async () => {
    // ToolResult real con hechos e inferencias, tal como lo produciría una tool
    // analyze; el engine fake lo adjunta como evidence para no depender de
    // sessionStore dentro del store.
    const evidencia: ToolResult = {
      facts: [
        { label: "Volumen últimos 7 días", value: 140, period: "7d" },
        { label: "Tiempo promedio de ciclo", value: 35, unit: "min" },
      ],
      inferences: [
        {
          statement:
            "El tiempo de ciclo elevado coincide con pedidos urgentes pendientes",
          kind: "correlation",
          confidence: "media",
          basedOn: ["Tiempo promedio de ciclo"],
        },
      ],
      sources: [
        {
          toolId: "pedidos.diagnosticoDesempeno",
          module: "pedidos",
          detail: "volumenPorDia, tiempoPromedioCicloMin, urgentes",
        },
      ],
    };

    const respuesta: AssistantMessage = {
      id: "assistant-1",
      role: "assistant",
      text: "Hechos:\n- Volumen últimos 7 días: 140 (7d)",
      evidence: evidencia,
      createdAt: new Date().toISOString(),
    };

    const engine: AssistantEngine = {
      kind: "fake",
      ask: vi.fn(async (_q: string, _ctx: EngineContext) => respuesta),
    };
    const store = new AssistantStore(engine);

    await store.enviar("  ¿cuántos pedidos hoy?  ");

    // El hilo tiene exactamente [user, assistant], en orden (Req 1.6).
    expect(store.mensajes).toHaveLength(2);
    const [primero, segundo] = store.mensajes;

    // Mensaje del usuario: role user y texto con trim aplicado.
    expect(primero.role).toBe("user");
    expect(primero.text).toBe("¿cuántos pedidos hoy?");

    // Respuesta del asistente: role assistant, distinto del user, con evidencia.
    // (El AssistantStore usa MobX y envuelve el mensaje en un proxy observable,
    // por lo que se compara por contenido, no por identidad de referencia.)
    expect(segundo.role).toBe("assistant");
    expect(segundo.evidence).toStrictEqual(evidencia);
    expect(store.pensando).toBe(false);
    expect(store.error).toBeNull();

    // AsistentePage toma la ÚLTIMA evidencia del asistente para el FactsPanel.
    const ultimaEvidencia = [...store.mensajes]
      .reverse()
      .find((m) => m.role === "assistant" && m.evidence)?.evidence;
    expect(ultimaEvidencia).toStrictEqual(evidencia);

    // El FactsPanel separaría Hechos de Inferencias, cada inferencia con su
    // etiqueta de confianza válida (Req 3.8).
    const { hechos, inferencias } = separarPanel(ultimaEvidencia);
    expect(hechos.length).toBeGreaterThan(0);
    expect(inferencias.length).toBeGreaterThan(0);
    expect(["baja", "media", "alta"]).toContain(inferencias[0].confidence);
  });
});

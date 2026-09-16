import { describe, it, expect, vi } from "vitest";
import { LocalRuleEngine } from "./local-rule-engine";
import { ToolRegistry, type AssistantAccessContext } from "../registry/tool-registry";
import type {
  AssistantTool,
  ToolCapabilityLevel,
  ToolResult,
} from "../contracts/tool.contract";
import type { AssistantToolProvider } from "../contracts/provider.contract";
import type { EngineContext } from "../contracts/engine.contract";
import type { Modulo } from "@/stores/session.store";
import type { Capacidad } from "@/stores/roles.store";

// ═══════════════════════════════════════════════════════════════════════════
// Tarea 7.2 — Tests unitarios del LocalRuleEngine
// Requirements: 3.7, 12.1, 12.2, 13.1, 13.3, 13.4, 17.5, 18.3
// ═══════════════════════════════════════════════════════════════════════════
//
// Los tests construyen un `ToolRegistry` propio con un provider de prueba y lo
// inyectan al `LocalRuleEngine` (constructor inyectable). Las tools de prueba
// usan los MISMOS ids namespaced que la tabla interna `REGLAS_INTENCION` del
// engine (p. ej. "pedidos.getResumenHoy") para que el match de intención por
// keyword funcione de forma determinista.
//
// ═══════════════════════════════════════════════════════════════════════════

const RESULT_VACIO: ToolResult = { facts: [], sources: [] };

/** Construye una AssistantTool de prueba con un run() controlable. */
function makeTool(
  id: string,
  {
    module = "pedidos" as Modulo,
    requiredCapabilities = [] as Capacidad[],
    level = "query" as ToolCapabilityLevel,
    result = RESULT_VACIO,
    run,
  }: {
    module?: Modulo;
    requiredCapabilities?: Capacidad[];
    level?: ToolCapabilityLevel;
    result?: ToolResult;
    run?: (input: Record<string, unknown>) => Promise<ToolResult>;
  } = {},
): AssistantTool {
  return {
    id,
    module,
    name: id,
    description: `tool ${id}`,
    level,
    requiredCapabilities,
    params: [],
    run: run ?? (async () => result),
  };
}

/** Provider de prueba que expone un conjunto fijo de tools. */
function makeProvider(module: Modulo, tools: AssistantTool[]): AssistantToolProvider {
  return { module, getTools: () => tools };
}

/** Construye un AssistantAccessContext a partir de módulos y capacidades. */
function makeAccess(
  enabledModules: Modulo[],
  capabilities: Capacidad[],
): AssistantAccessContext {
  const caps = new Set<Capacidad>(capabilities);
  return {
    enabledModules,
    hasCapability: (cap) => caps.has(cap),
  };
}

/** Construye un EngineContext a partir de un AssistantAccessContext. */
function makeCtx(access: AssistantAccessContext): EngineContext {
  return { access };
}

/** Registry con el provider de pedidos dado, listo para inyectar al engine. */
function makeEngine(tools: AssistantTool[]): { engine: LocalRuleEngine; registry: ToolRegistry } {
  const registry = new ToolRegistry();
  registry.register(makeProvider("pedidos", tools));
  return { engine: new LocalRuleEngine(registry), registry };
}

// ═══════════════════════════════════════════════════════════════════════════
// Caso 1 — Sin tools disponibles → mensaje de permisos, sin evidencia
// Requirements: 12.1, 12.2, 18.3
// ═══════════════════════════════════════════════════════════════════════════

describe("LocalRuleEngine.ask — sin tools disponibles", () => {
  it("responde con mensaje de permisos y sin evidencia cuando falta la capacidad", async () => {
    const { engine } = makeEngine([
      makeTool("pedidos.getResumenHoy", { requiredCapabilities: ["orders.read"] }),
    ]);
    // Módulo habilitado pero SIN la capacidad → getAvailableTools = [].
    const ctx = makeCtx(makeAccess(["pedidos"], []));

    const msg = await engine.ask("dame el resumen de hoy", ctx);

    expect(msg.role).toBe("assistant");
    expect(msg.evidence).toBeUndefined();
    expect(msg.text.toLowerCase()).toMatch(/permisos|no tengo herramientas/);
  });

  it("responde con mensaje de permisos cuando enabledModules está vacío", async () => {
    const { engine } = makeEngine([
      makeTool("pedidos.getResumenHoy", { requiredCapabilities: ["orders.read"] }),
    ]);
    // Sin módulos habilitados (fail-closed) → getAvailableTools = [].
    const ctx = makeCtx(makeAccess([], ["orders.read"]));

    const msg = await engine.ask("dame el resumen de hoy", ctx);

    expect(msg.role).toBe("assistant");
    expect(msg.evidence).toBeUndefined();
    expect(msg.text.toLowerCase()).toMatch(/permisos|no tengo herramientas/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Caso 2 — Intención no reconocida → ayuda listando tools, sin evidencia
// Requirements: 13.1, 13.2
// ═══════════════════════════════════════════════════════════════════════════

describe("LocalRuleEngine.ask — intención no reconocida", () => {
  it("devuelve ayuda con los nombres de las tools disponibles y sin evidencia", async () => {
    const { engine } = makeEngine([
      makeTool("pedidos.getResumenHoy", { requiredCapabilities: ["orders.read"] }),
      makeTool("pedidos.getCancelados", { requiredCapabilities: ["orders.read"] }),
    ]);
    const ctx = makeCtx(makeAccess(["pedidos"], ["orders.read"]));

    // "hola qué tal" no matchea ninguna keyword de REGLAS_INTENCION.
    const msg = await engine.ask("hola qué tal", ctx);

    expect(msg.role).toBe("assistant");
    expect(msg.evidence).toBeUndefined();
    // El texto de ayuda enumera las tools disponibles por su name.
    expect(msg.text).toContain("pedidos.getResumenHoy");
    expect(msg.text).toContain("pedidos.getCancelados");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Caso 3 — Intención reconocida → ejecuta la tool y adjunta evidence
// Requirements: 13.3
// ═══════════════════════════════════════════════════════════════════════════

describe("LocalRuleEngine.ask — intención reconocida", () => {
  it("ejecuta la tool que matchea y adjunta el ToolResult como evidence", async () => {
    const resultado: ToolResult = {
      facts: [{ label: "Pedidos nuevos hoy", value: 12 }],
      sources: [{ toolId: "pedidos.getResumenHoy", module: "pedidos", detail: "getters de pedidos" }],
    };
    const { engine } = makeEngine([
      makeTool("pedidos.getResumenHoy", {
        requiredCapabilities: ["orders.read"],
        result: resultado,
      }),
    ]);
    const ctx = makeCtx(makeAccess(["pedidos"], ["orders.read"]));

    // "resumen"/"hoy" → pedidos.getResumenHoy.
    const msg = await engine.ask("dame el resumen de hoy", ctx);

    expect(msg.role).toBe("assistant");
    expect(msg.evidence).toBe(resultado);
    expect(msg.text).toContain("Pedidos nuevos hoy");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Caso 4 — Texto separa Hechos e Inferencias, sin términos causales
// Requirements: 3.7
// ═══════════════════════════════════════════════════════════════════════════

describe("LocalRuleEngine.ask — redacción sin causalidad", () => {
  it("separa Hechos de Observaciones/Inferencias y no usa términos causales", async () => {
    const resultado: ToolResult = {
      facts: [
        { label: "Volumen 7 días", value: 140, unit: "pedidos" },
        { label: "Tiempo de ciclo", value: 35, unit: "min" },
      ],
      inferences: [
        {
          statement: "El tiempo de ciclo coincide con un volumen alto",
          kind: "correlation",
          confidence: "media",
          basedOn: ["Volumen 7 días", "Tiempo de ciclo"],
        },
      ],
      sources: [{ toolId: "pedidos.diagnosticoDesempeno", module: "pedidos", detail: "diagnóstico" }],
    };
    const { engine } = makeEngine([
      makeTool("pedidos.diagnosticoDesempeno", {
        requiredCapabilities: ["orders.read"],
        level: "analyze",
        result: resultado,
      }),
    ]);
    const ctx = makeCtx(makeAccess(["pedidos"], ["orders.read"]));

    // "diagnostico"/"desempeno" → pedidos.diagnosticoDesempeno.
    const msg = await engine.ask("dame un diagnóstico de desempeño", ctx);

    // Sección de hechos e inferencias identificadas.
    expect(msg.text).toContain("Hechos:");
    expect(msg.text.toLowerCase()).toMatch(/observaciones|inferencias/);
    expect(msg.text).toContain("Volumen 7 días");

    // No debe contener términos causales.
    const lower = msg.text.toLowerCase();
    for (const termino of ["causa", "provoca", "porque", "debido a"]) {
      expect(lower).not.toContain(termino);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Caso 5 — Rechazo de nivel no soportado (execute/recommend)
// Requirements: 17.5
// ═══════════════════════════════════════════════════════════════════════════

describe("LocalRuleEngine.ask — nivel no soportado", () => {
  it("NO ejecuta una tool con level 'execute' y responde que no está soportada", async () => {
    const run = vi.fn(async () => RESULT_VACIO);
    const { engine } = makeEngine([
      makeTool("pedidos.getResumenHoy", {
        requiredCapabilities: ["orders.read"],
        level: "execute",
        run,
      }),
    ]);
    const ctx = makeCtx(makeAccess(["pedidos"], ["orders.read"]));

    const msg = await engine.ask("dame el resumen de hoy", ctx);

    expect(run).not.toHaveBeenCalled();
    expect(msg.evidence).toBeUndefined();
    expect(msg.role).toBe("assistant");
    expect(msg.text.toLowerCase()).toContain("no está soportada");
  });

  it("NO ejecuta una tool con level 'recommend'", async () => {
    const run = vi.fn(async () => RESULT_VACIO);
    const { engine } = makeEngine([
      makeTool("pedidos.getResumenHoy", {
        requiredCapabilities: ["orders.read"],
        level: "recommend",
        run,
      }),
    ]);
    const ctx = makeCtx(makeAccess(["pedidos"], ["orders.read"]));

    const msg = await engine.ask("dame el resumen de hoy", ctx);

    expect(run).not.toHaveBeenCalled();
    expect(msg.evidence).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Caso 6 — Múltiples coincidencias → prioridad determinista
// Requirements: 13.4
// ═══════════════════════════════════════════════════════════════════════════

describe("LocalRuleEngine.ask — prioridad determinista", () => {
  it("ante dos matches posibles ejecuta la de mayor prioridad según el orden de reglas", async () => {
    const runComparar = vi.fn(async (): Promise<ToolResult> => ({
      facts: [{ label: "Entregados día A", value: 5 }],
      sources: [{ toolId: "pedidos.compararDias", module: "pedidos", detail: "comparar" }],
    }));
    const runResumen = vi.fn(async () => RESULT_VACIO);

    const { engine } = makeEngine([
      makeTool("pedidos.compararDias", {
        requiredCapabilities: ["orders.read"],
        level: "analyze",
        run: runComparar,
      }),
      makeTool("pedidos.getResumenHoy", {
        requiredCapabilities: ["orders.read"],
        run: runResumen,
      }),
    ]);
    const ctx = makeCtx(makeAccess(["pedidos"], ["orders.read"]));

    // "compara" (compararDias, prioridad más alta) y "resumen" (getResumenHoy,
    // más baja) ambos matchean; el orden de REGLAS_INTENCION prioriza compararDias.
    const msg = await engine.ask("compara el resumen de hoy con ayer", ctx);

    expect(runComparar).toHaveBeenCalledTimes(1);
    expect(runResumen).not.toHaveBeenCalled();
    expect(msg.text).toContain("Entregados día A");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Caso 7 — Intenciones nuevas y extracción de parámetros de fecha
// ═══════════════════════════════════════════════════════════════════════════

/** "YYYY-MM-DD" de hoy en hora local (mismo criterio que el engine). */
function ymdHoyLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "YYYY-MM-DD" del primer día del mes actual en hora local. */
function ymdPrimerDiaMesLocal(): string {
  const d = new Date();
  d.setDate(1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

describe("LocalRuleEngine.ask — intenciones nuevas y parámetros de fecha", () => {
  it("'ventas del mes' → getVentasPeriodo con rango del mes actual (día 1 → hoy)", async () => {
    let recibido: Record<string, unknown> | null = null;
    const { engine } = makeEngine([
      makeTool("pedidos.getVentasPeriodo", {
        requiredCapabilities: ["orders.read"],
        run: async (input) => {
          recibido = input;
          return RESULT_VACIO;
        },
      }),
    ]);
    const ctx = makeCtx(makeAccess(["pedidos"], ["orders.read"]));

    await engine.ask("dame las ventas del mes", ctx);

    expect(recibido).not.toBeNull();
    expect(recibido!.desde).toBe(ymdPrimerDiaMesLocal());
    expect(recibido!.hasta).toBe(ymdHoyLocal());
  });

  it("'pedidos pendientes' → ejecuta pedidos.getPendientes", async () => {
    const run = vi.fn(async () => RESULT_VACIO);
    const { engine } = makeEngine([
      makeTool("pedidos.getPendientes", {
        requiredCapabilities: ["orders.read"],
        run,
      }),
    ]);
    const ctx = makeCtx(makeAccess(["pedidos"], ["orders.read"]));

    const msg = await engine.ask("muéstrame los pedidos pendientes", ctx);

    expect(run).toHaveBeenCalledTimes(1);
    expect(msg.role).toBe("assistant");
  });

  it("'ventas esta semana frente a la semana pasada' → ejecuta pedidos.compararSemanas", async () => {
    const runSemanas = vi.fn(async () => RESULT_VACIO);
    const runVentas = vi.fn(async () => RESULT_VACIO);
    const { engine } = makeEngine([
      makeTool("pedidos.compararSemanas", {
        requiredCapabilities: ["orders.read"],
        level: "analyze",
        run: runSemanas,
      }),
      makeTool("pedidos.getVentasPeriodo", {
        requiredCapabilities: ["orders.read"],
        run: runVentas,
      }),
    ]);
    const ctx = makeCtx(makeAccess(["pedidos"], ["orders.read"]));

    await engine.ask(
      "¿cómo van las ventas esta semana frente a la semana pasada?",
      ctx,
    );

    // Aunque el texto contiene "venta", compararSemanas tiene mayor prioridad
    // porque incluye la palabra "semana".
    expect(runSemanas).toHaveBeenCalledTimes(1);
    expect(runVentas).not.toHaveBeenCalled();
  });
});

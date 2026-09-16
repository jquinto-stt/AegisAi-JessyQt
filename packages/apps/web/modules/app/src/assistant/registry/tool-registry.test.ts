import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { ToolRegistry, type AssistantAccessContext } from "./tool-registry";
import type {
  AssistantTool,
  ToolCapabilityLevel,
  ToolResult,
} from "../contracts/tool.contract";
import type { AssistantToolProvider } from "../contracts/provider.contract";
import type { Modulo } from "@/stores/session.store";
import type { Capacidad } from "@/stores/roles.store";

// ═══════════════════════════════════════════════════════════════════════════
// Helpers de prueba
// ═══════════════════════════════════════════════════════════════════════════

const EMPTY_RESULT: ToolResult = { facts: [], sources: [] };

/** Construye una AssistantTool de prueba con un run() mínimo. */
function makeTool(
  id: string,
  module: Modulo,
  requiredCapabilities: Capacidad[] = [],
  level: ToolCapabilityLevel = "query",
): AssistantTool {
  return {
    id,
    module,
    name: id,
    description: `tool ${id}`,
    level,
    requiredCapabilities,
    params: [],
    async run(): Promise<ToolResult> {
      return EMPTY_RESULT;
    },
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

// ═══════════════════════════════════════════════════════════════════════════
// Tarea 2.2 — Tests unitarios del ToolRegistry
// ═══════════════════════════════════════════════════════════════════════════

describe("ToolRegistry.getAvailableTools", () => {
  it("excluye la tool cuando su módulo no está habilitado", () => {
    const reg = new ToolRegistry();
    reg.register(makeProvider("pedidos", [makeTool("pedidos.a", "pedidos", ["orders.read"])]));

    // Módulo no habilitado → tool excluida.
    const tools = reg.getAvailableTools({ access: makeAccess([], ["orders.read"]) });
    expect(tools).toEqual([]);
  });

  it("excluye la tool cuando falta una capacidad requerida", () => {
    const reg = new ToolRegistry();
    reg.register(makeProvider("pedidos", [makeTool("pedidos.a", "pedidos", ["orders.read"])]));

    // Módulo habilitado pero sin la capacidad → tool excluida.
    const tools = reg.getAvailableTools({ access: makeAccess(["pedidos"], []) });
    expect(tools).toEqual([]);
  });

  it("devuelve [] cuando enabledModules está vacío (fail-closed)", () => {
    const reg = new ToolRegistry();
    reg.register(makeProvider("pedidos", [makeTool("pedidos.a", "pedidos", ["orders.read"])]));

    const tools = reg.getAvailableTools({ access: makeAccess([], ["orders.read"]) });
    expect(tools).toHaveLength(0);
  });

  it("devuelve [] cuando el usuario no tiene capacidades (fail-closed)", () => {
    const reg = new ToolRegistry();
    reg.register(makeProvider("pedidos", [makeTool("pedidos.a", "pedidos", ["orders.read"])]));

    const tools = reg.getAvailableTools({ access: makeAccess(["pedidos"], []) });
    expect(tools).toHaveLength(0);
  });

  it("incluye la tool cuando requiredCapabilities está vacío", () => {
    const reg = new ToolRegistry();
    reg.register(makeProvider("pedidos", [makeTool("pedidos.publica", "pedidos", [])]));

    // Módulo habilitado y sin capacidades requeridas → pasa el filtro de capacidades.
    const tools = reg.getAvailableTools({ access: makeAccess(["pedidos"], []) });
    expect(tools.map((t) => t.id)).toEqual(["pedidos.publica"]);
  });

  it("incluye la tool solo cuando el usuario tiene TODAS las capacidades", () => {
    const reg = new ToolRegistry();
    reg.register(
      makeProvider("pedidos", [
        makeTool("pedidos.multi", "pedidos", ["orders.read", "orders.create"]),
      ]),
    );

    const conUna = reg.getAvailableTools({ access: makeAccess(["pedidos"], ["orders.read"]) });
    expect(conUna).toEqual([]);

    const conTodas = reg.getAvailableTools({
      access: makeAccess(["pedidos"], ["orders.read", "orders.create"]),
    });
    expect(conTodas.map((t) => t.id)).toEqual(["pedidos.multi"]);
  });

  it("no devuelve duplicados por id de tool", () => {
    const reg = new ToolRegistry();
    // Un mismo provider expone la misma tool dos veces (mismo id).
    const dup = makeTool("pedidos.dup", "pedidos", ["orders.read"]);
    reg.register(makeProvider("pedidos", [dup, dup, makeTool("pedidos.dup", "pedidos", ["orders.read"])]));

    const tools = reg.getAvailableTools({ access: makeAccess(["pedidos"], ["orders.read"]) });
    expect(tools).toHaveLength(1);
    expect(tools[0]!.id).toBe("pedidos.dup");
  });
});

describe("ToolRegistry.register (idempotente por módulo)", () => {
  it("re-registrar un provider del mismo módulo reemplaza al previo", () => {
    const reg = new ToolRegistry();
    reg.register(makeProvider("pedidos", [makeTool("pedidos.vieja", "pedidos", ["orders.read"])]));
    // Segundo registro del MISMO módulo → reemplaza.
    reg.register(makeProvider("pedidos", [makeTool("pedidos.nueva", "pedidos", ["orders.read"])]));

    const tools = reg.getAvailableTools({ access: makeAccess(["pedidos"], ["orders.read"]) });
    expect(tools.map((t) => t.id)).toEqual(["pedidos.nueva"]);
  });
});

describe("ToolRegistry.resolve (fail-closed)", () => {
  it("devuelve la tool cuando aparece en getAvailableTools", () => {
    const reg = new ToolRegistry();
    reg.register(makeProvider("pedidos", [makeTool("pedidos.a", "pedidos", ["orders.read"])]));

    const ctx = { access: makeAccess(["pedidos"], ["orders.read"]) };
    const tool = reg.resolve("pedidos.a", ctx);
    expect(tool).not.toBeNull();
    expect(tool!.id).toBe("pedidos.a");
  });

  it("devuelve null cuando la tool existe pero el filtro la excluye", () => {
    const reg = new ToolRegistry();
    reg.register(makeProvider("pedidos", [makeTool("pedidos.a", "pedidos", ["orders.read"])]));

    // Sin la capacidad → resolve no puede eludir el filtro.
    expect(reg.resolve("pedidos.a", { access: makeAccess(["pedidos"], []) })).toBeNull();
  });

  it("devuelve null para id inexistente sin lanzar", () => {
    const reg = new ToolRegistry();
    reg.register(makeProvider("pedidos", [makeTool("pedidos.a", "pedidos", [])]));
    const ctx = { access: makeAccess(["pedidos"], []) };
    expect(() => reg.resolve("pedidos.noexiste", ctx)).not.toThrow();
    expect(reg.resolve("pedidos.noexiste", ctx)).toBeNull();
  });

  it("devuelve null para id vacío sin lanzar", () => {
    const reg = new ToolRegistry();
    reg.register(makeProvider("pedidos", [makeTool("pedidos.a", "pedidos", [])]));
    const ctx = { access: makeAccess(["pedidos"], []) };
    expect(() => reg.resolve("", ctx)).not.toThrow();
    expect(reg.resolve("", ctx)).toBeNull();
  });

  it("devuelve null para id null/undefined sin lanzar", () => {
    const reg = new ToolRegistry();
    reg.register(makeProvider("pedidos", [makeTool("pedidos.a", "pedidos", [])]));
    const ctx = { access: makeAccess(["pedidos"], []) };
    // Fuerza null/undefined como haría un caller no tipado en runtime.
    expect(() => reg.resolve(null as unknown as string, ctx)).not.toThrow();
    expect(reg.resolve(null as unknown as string, ctx)).toBeNull();
    expect(reg.resolve(undefined as unknown as string, ctx)).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Arbitraries compartidos para property tests
// ═══════════════════════════════════════════════════════════════════════════

const MODULOS: Modulo[] = ["pedidos"];
const CAPS: Capacidad[] = ["orders.read", "orders.create", "assistant.use", "team.read"];

const arbModulo = fc.constantFrom(...MODULOS);
const arbCap = fc.constantFrom(...CAPS);

/** Un arbitrary de AssistantTool con id único-ish, módulo y capacidades. */
const arbTool = fc.record({
  idSuffix: fc.string({ minLength: 1, maxLength: 6 }),
  module: arbModulo,
  requiredCapabilities: fc.uniqueArray(arbCap, { maxLength: CAPS.length }),
});

/** Arbitrary del AssistantAccessContext (módulos habilitados + capacidades). */
const arbAccess = fc.record({
  enabledModules: fc.uniqueArray(arbModulo, { maxLength: MODULOS.length }),
  capabilities: fc.uniqueArray(arbCap, { maxLength: CAPS.length }),
});

function buildRegistryFromToolSpecs(
  specs: { idSuffix: string; module: Modulo; requiredCapabilities: Capacidad[] }[],
): { reg: ToolRegistry; tools: AssistantTool[] } {
  // Agrupa por módulo para respetar la indexación por módulo del registry.
  const byModule = new Map<Modulo, AssistantTool[]>();
  const tools: AssistantTool[] = [];
  specs.forEach((spec, i) => {
    const tool = makeTool(`${spec.module}.t${i}_${spec.idSuffix}`, spec.module, spec.requiredCapabilities);
    tools.push(tool);
    const arr = byModule.get(spec.module) ?? [];
    arr.push(tool);
    byModule.set(spec.module, arr);
  });
  const reg = new ToolRegistry();
  for (const [module, moduleTools] of byModule) {
    reg.register(makeProvider(module, moduleTools));
  }
  return { reg, tools };
}

// ═══════════════════════════════════════════════════════════════════════════
// Tarea 2.3 — Property 1: Autorización fail-closed
// Validates: Requirements 2.1, 2.2, 2.3
// ═══════════════════════════════════════════════════════════════════════════

describe("Property 1: Autorización fail-closed", () => {
  it("toda tool devuelta cumple módulo ∈ enabledModules y todas sus capacidades", () => {
    fc.assert(
      fc.property(fc.array(arbTool, { maxLength: 10 }), arbAccess, (specs, accessSpec) => {
        const { reg } = buildRegistryFromToolSpecs(specs);
        const access = makeAccess(accessSpec.enabledModules, accessSpec.capabilities);
        const capsSet = new Set<Capacidad>(accessSpec.capabilities);
        const modsSet = new Set<Modulo>(accessSpec.enabledModules);

        const available = reg.getAvailableTools({ access });

        for (const tool of available) {
          // (a) módulo habilitado
          expect(modsSet.has(tool.module)).toBe(true);
          // (b) todas las capacidades requeridas presentes
          for (const cap of tool.requiredCapabilities) {
            expect(capsSet.has(cap)).toBe(true);
          }
        }
      }),
    );
  });

  it("sin módulos ni capacidades la lista es vacía", () => {
    fc.assert(
      fc.property(fc.array(arbTool, { maxLength: 10 }), (specs) => {
        const { reg } = buildRegistryFromToolSpecs(specs);
        const access = makeAccess([], []);
        expect(reg.getAvailableTools({ access })).toHaveLength(0);
      }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tarea 2.4 — Property 2: resolve respeta el filtro
// Validates: Requirements 2.4, 2.5
// ═══════════════════════════════════════════════════════════════════════════

describe("Property 2: resolve respeta el filtro", () => {
  it("resolve(id,ctx) ≠ null ⟺ existe una tool con ese id en getAvailableTools(ctx)", () => {
    fc.assert(
      fc.property(
        fc.array(arbTool, { maxLength: 10 }),
        arbAccess,
        // ids candidatos: mezcla de ids potencialmente válidos y basura.
        fc.string({ maxLength: 12 }),
        (specs, accessSpec, rawId) => {
          const { reg, tools } = buildRegistryFromToolSpecs(specs);
          const access = makeAccess(accessSpec.enabledModules, accessSpec.capabilities);
          const ctx = { access };

          const available = reg.getAvailableTools(ctx);
          const availableIds = new Set(available.map((t) => t.id));

          // Prueba con un id existente (si hay tools) y con un id arbitrario.
          const candidateIds = [rawId, ...(tools.length ? [tools[0]!.id] : [])];

          for (const id of candidateIds) {
            const resolved = reg.resolve(id, ctx);
            if (resolved !== null) {
              // Si resolvió, el id debe estar entre los disponibles.
              expect(availableIds.has(id)).toBe(true);
              expect(resolved.id).toBe(id);
            } else {
              // Si devolvió null, el id NO debe estar entre los disponibles.
              expect(availableIds.has(id)).toBe(false);
            }
          }
        },
      ),
    );
  });
});

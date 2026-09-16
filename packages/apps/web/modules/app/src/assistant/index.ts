// ═══════════════════════════════════════════════════════════════════════════
// assistant/index.ts — Barrel del núcleo del asistente ("Necto Intelligence")
// ═══════════════════════════════════════════════════════════════════════════
//
// Punto de entrada público del núcleo agnóstico de dominio. Reexporta los
// contratos (tools, engine, provider), el `ToolRegistry` con su singleton
// `toolRegistry` y el tipo `AssistantAccessContext`, de modo que la UI, el store
// y los providers de módulo importen desde un único lugar sin acoplarse a rutas
// internas del núcleo.
//
// ═══════════════════════════════════════════════════════════════════════════

// Contratos de tools.
export type {
  ToolCapabilityLevel,
  Fact,
  Inference,
  ToolSource,
  ToolResult,
  ToolParamSpec,
  AssistantTool,
  MetricsBlock,
  TableBlock,
  ComparisonBlock,
  ListBlock,
  ResponseBlock,
} from "./contracts/tool.contract";

// Contratos del motor.
export type {
  AssistantMessage,
  EngineContext,
  AssistantEngine,
} from "./contracts/engine.contract";

// Contrato de proveedor de tools.
export type { AssistantToolProvider } from "./contracts/provider.contract";

// Registry y contexto de acceso.
export type { AssistantAccessContext } from "./registry/tool-registry";
export { ToolRegistry, toolRegistry } from "./registry/tool-registry";

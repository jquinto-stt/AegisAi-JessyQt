import type { Modulo } from "@/stores/session.store";
import type { Capacidad } from "@/stores/roles.store";
import type { AssistantTool } from "../contracts/tool.contract";
import type { AssistantToolProvider } from "../contracts/provider.contract";

// ═══════════════════════════════════════════════════════════════════════════
// REGISTRY DEL NÚCLEO — TOOL REGISTRY + ACCESS CONTEXT
// ═══════════════════════════════════════════════════════════════════════════
//
// El `ToolRegistry` orquesta los `AssistantToolProvider` de cada módulo y aplica
// el filtro de autorización del asistente. Es parte del núcleo agnóstico de
// dominio (`src/assistant/**`, invariante A4): NO importa ningún store de
// dominio ni `SessionStore` como valor. `Modulo` y `Capacidad` entran SOLO como
// **tipos** (`import type`), sin crear dependencia de ejecución.
//
// El filtro central es la INTERSECCIÓN módulos ∩ capacidades:
//
//   una tool es visible  ⟺  (tool.module ∈ enabledModules)
//                            ∧ (∀ cap ∈ tool.requiredCapabilities:
//                                 access.hasCapability(cap) = true)
//
// El diseño es deliberadamente **fail-closed**: en ausencia de módulos
// habilitados o de capacidades, el registry no expone ninguna tool. La
// resolución por `id` reutiliza exactamente este mismo filtro, de modo que
// `resolve` nunca puede eludir la autorización.
//
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Snapshot de autorización que el núcleo entiende.
 *
 * Se construye desde `sessionStore.accessContext` en un adaptador delgado
 * externo al núcleo; el núcleo NO importa `SessionStore` (invariante A1). Expone
 * únicamente los módulos habilitados de la sesión y una verificación de
 * capacidades que devuelve un booleano.
 */
export interface AssistantAccessContext {
  /** Módulos habilitados en la sesión actual. */
  enabledModules: Modulo[];
  /** Devuelve `true` si el usuario posee la capacidad indicada. */
  hasCapability(cap: Capacidad): boolean;
}

/**
 * Registro y filtro de tools del asistente.
 *
 * Almacena los providers **indexados por módulo**: registrar un provider cuyo
 * `module` ya existía REEMPLAZA al anterior (idempotente por módulo), de modo
 * que solo el último provider de cada módulo permanece activo.
 *
 * Toda consulta de tools (`getAvailableTools`, `resolve`) aplica el filtro
 * módulos ∩ capacidades y es fail-closed: sin módulos habilitados o sin las
 * capacidades requeridas, no se expone ninguna tool.
 */
export class ToolRegistry {
  /** Providers indexados por módulo (idempotente por módulo). */
  private readonly providers = new Map<Modulo, AssistantToolProvider>();

  /**
   * Registra (o reemplaza) el provider de un módulo.
   *
   * Idempotente por `module`: si ya había un provider para ese módulo, el nuevo
   * lo reemplaza; solo el último registrado para cada módulo queda activo.
   */
  register(provider: AssistantToolProvider): void {
    this.providers.set(provider.module, provider);
  }

  /**
   * Calcula las tools visibles para un contexto de acceso.
   *
   * Recorre los providers y aplica el filtro módulos ∩ capacidades: incluye una
   * tool si y solo si (a) `tool.module` está en `ctx.access.enabledModules`, y
   * (b) el usuario posee TODAS sus `requiredCapabilities` (si el arreglo está
   * vacío, la condición de capacidades se satisface trivialmente).
   *
   * Fail-closed: si `enabledModules` está vacío o el usuario carece de las
   * capacidades, devuelve `[]`. Nunca devuelve entradas duplicadas por `id` de
   * tool: ante ids repetidos, conserva la primera aparición.
   */
  getAvailableTools(ctx: { access: AssistantAccessContext }): AssistantTool[] {
    const { access } = ctx;
    const enabled = new Set<Modulo>(access.enabledModules);
    const result: AssistantTool[] = [];
    const seenIds = new Set<string>();

    for (const provider of this.providers.values()) {
      // Filtro de módulo: solo módulos habilitados en la sesión.
      if (!enabled.has(provider.module)) continue;

      for (const tool of provider.getTools()) {
        // Filtro de capacidades: el usuario debe tener TODAS las requeridas.
        const permitida = tool.requiredCapabilities.every((cap) =>
          access.hasCapability(cap),
        );
        if (!permitida) continue;

        // Sin duplicados por id.
        if (seenIds.has(tool.id)) continue;
        seenIds.add(tool.id);
        result.push(tool);
      }
    }

    return result;
  }

  /**
   * Resuelve una tool por su `id` respetando el filtro de autorización.
   *
   * Devuelve la tool SOLO si aparece en `getAvailableTools(ctx)` con ese `id`
   * (misma verificación de módulo + capacidades); en caso contrario `null`. Para
   * un `toolId` nulo, vacío o inexistente devuelve `null` sin lanzar excepción.
   * Así, `resolve` nunca elude el filtro fail-closed de `getAvailableTools`.
   */
  resolve(
    toolId: string,
    ctx: { access: AssistantAccessContext },
  ): AssistantTool | null {
    if (!toolId) return null;
    const available = this.getAvailableTools(ctx);
    return available.find((tool) => tool.id === toolId) ?? null;
  }
}

/**
 * Instancia singleton del registry del asistente.
 *
 * El `bootstrap.ts` registra en ella el `PedidosToolProvider` al arrancar el
 * módulo, y el `LocalRuleEngine` la consulta al procesar cada pregunta.
 */
export const toolRegistry = new ToolRegistry();

import type { Modulo } from "@/stores/session.store";
import type { AssistantTool } from "./tool.contract";

/**
 * Un proveedor de tools del asistente.
 *
 * Cada módulo del producto (empezando por Pedidos) implementa su propio
 * `AssistantToolProvider` y es dueño de su lógica y de sus datos. Este es el
 * ÚNICO lugar que puede importar el store del módulo correspondiente: el núcleo
 * del asistente (`src/assistant/**`) es agnóstico de dominio y no importa
 * ningún store de negocio.
 *
 * El registry consulta `getTools()` para obtener las tools que el módulo aporta
 * y luego las filtra por módulos habilitados y capacidades del contexto de
 * acceso.
 */
export interface AssistantToolProvider {
  /** Módulo al que pertenece este proveedor. */
  module: Modulo;
  /** Devuelve las tools que este módulo aporta al asistente. */
  getTools(): AssistantTool[];
}

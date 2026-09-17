// ═══════════════════════════════════════════════════════════════════════════
// assistant/bootstrap.ts — Punto de WIRING del asistente ("Necto Intelligence")
// ═══════════════════════════════════════════════════════════════════════════
//
// Este archivo es el ÚNICO punto de integración ("cableado") entre el asistente
// y el resto de la app: aquí se conecta el núcleo agnóstico con la sesión del
// usuario (`sessionStore`) y con los providers de tools de cada módulo
// (`PedidosToolProvider`).
//
// ── Decisión de arquitectura (invariante A1) ──────────────────────────────
// El núcleo lógico (`contracts`, `registry`, `engine`) NO puede importar
// `SessionStore` ni ningún store de dominio como VALOR: debe permanecer puro y
// agnóstico de dominio. El adaptador que traduce la sesión al contrato del
// núcleo (`buildAccessContext`) necesita conocer `sessionStore`, por lo que vive
// AQUÍ, en `bootstrap.ts`, y NO dentro del núcleo.
//
// Por convención del proyecto, el bootstrap es el archivo de arranque/wiring y
// SÍ tiene permitido importar stores (`sessionStore`) y providers de módulo
// (`PedidosToolProvider`), precisamente porque no es el núcleo lógico sino el
// cable que lo enchufa a la aplicación. El resto de `src/assistant/**` (contracts,
// registry, engine) se mantiene puro.
//
// ═══════════════════════════════════════════════════════════════════════════

import { integracionesStore, sessionStore } from "@/stores";
import { PedidosToolProvider } from "@/modules-tools/pedidos/pedidos.tool-provider";
import { toolRegistry } from "./registry/tool-registry";
import type { AssistantAccessContext } from "./registry/tool-registry";

/**
 * Construye el `AssistantAccessContext` del núcleo a partir de la sesión actual.
 *
 * Adaptador delgado que traduce `sessionStore.accessContext` al contrato que el
 * núcleo entiende: expone los módulos habilitados y una verificación de
 * capacidades que delega en `sessionStore.hasPermission`.
 *
 * ── Los dos filtros de módulo, y por qué son dos ──────────────────────────
 * Un módulo llega al asistente solo si pasa DOS puertas independientes:
 *
 *   1. **La sesión lo tiene** (`accessContext.modulos`): es la puerta del
 *      producto — el usuario trabaja en Pedidos o no.
 *   2. **El asistente está conectado a él** (`integracionesStore`): es la puerta
 *      del asistente, la que el administrador abre y cierra desde
 *      «Módulos integrados» en `/asistente/config`.
 *
 * Se INTERSECAN, nunca se unen. Este adaptador es el único sitio donde eso
 * ocurre, y por eso desconectar un módulo en la configuración retira de verdad
 * sus herramientas del registry: el interruptor no es decorativo.
 *
 * La intersección solo puede QUITAR alcance. Ninguna de las dos puertas concede
 * por sí sola: las capacidades siguen filtrando por encima.
 *
 * Robustez / fail-closed (requisito 15.7): si no hay sesión utilizable —es
 * decir, `sessionStore.accessContext` no está disponible o `autenticado` es
 * falso— devuelve un contexto SIN módulos habilitados cuya `hasCapability`
 * retorna `false` para toda capacidad. Así el registry no expone ninguna tool
 * cuando no hay una sesión válida.
 *
 * @returns el snapshot de autorización que consumen el registry y el engine.
 */
export function buildAccessContext(): AssistantAccessContext {
  // Fail-closed: sin sesión autenticada, contexto vacío que no otorga nada.
  if (!sessionStore.accessContext?.autenticado) {
    return {
      enabledModules: [],
      hasCapability: () => false,
    };
  }

  // Intersección sesión ∩ módulos conectados al asistente (ver arriba).
  const conectados = new Set(integracionesStore.modulosHabilitados);

  return {
    enabledModules: sessionStore.accessContext.modulos.filter((m) =>
      conectados.has(m),
    ),
    hasCapability: (cap) => sessionStore.hasPermission(cap),
  };
}

/**
 * Bandera módulo-local para hacer idempotente el registro de providers.
 *
 * Aunque `toolRegistry.register` ya es idempotente por módulo (re-registrar
 * reemplaza al provider previo), esta bandera evita instanciar y re-registrar el
 * provider en cada llamada a `bootstrapAssistant` (requisito 18.1).
 */
let inicializado = false;

/**
 * Cablea el asistente registrando los providers de tools de cada módulo.
 *
 * Debe invocarse en el arranque de la app, antes de la primera pregunta al
 * asistente. Registra el `PedidosToolProvider` en el `toolRegistry` singleton.
 *
 * Es idempotente: llamadas repetidas no vuelven a registrar el provider.
 */
export function bootstrapAssistant(): void {
  if (inicializado) return;
  toolRegistry.register(new PedidosToolProvider());
  inicializado = true;
}

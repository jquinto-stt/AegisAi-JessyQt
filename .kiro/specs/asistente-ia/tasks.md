# Implementation Plan: Asistente IA (Necto Intelligence)

## Overview

Plan incremental para implementar el módulo Asistente ("Necto Intelligence") en el proyecto React + MobX (frontend-only). El código vive en `packages/apps/web/modules/app/src` con alias `@/`. El lenguaje de implementación es **TypeScript** (el diseño ya usa TypeScript en todos sus ejemplos).

Cada tarea construye sobre las anteriores, respetando las invariantes de arquitectura (A1–A6): el núcleo `src/assistant/**` es agnóstico de dominio, `PedidosToolProvider` es el único que importa `pedidosStore`, la UI/store dependen solo de la interfaz `AssistantEngine`, y toda tool pasa por el filtro módulos ∩ capacidades del `ToolRegistry`. El orden va de contratos → registry → dominio → engine → store → UI → navegación → verificación, sin código huérfano.

## Tasks

- [ ] 1. Definir los contratos del núcleo (tipos base, sin dependencias de dominio)
  - [x] 1.1 Crear `src/assistant/contracts/tool.contract.ts`
    - Definir `ToolCapabilityLevel` (`"query" | "analyze" | "recommend" | "execute"`), `Fact`, `Inference` (con `kind` restringido a `correlation | pattern | hypothesis` y `confidence` a `baja | media | alta`), `ToolSource`, `ToolResult`, `ToolParamSpec` y `AssistantTool` (id namespaced, `module`, `level`, `requiredCapabilities`, `params`, `run`)
    - Importar `Modulo` de `@/stores/session.store` y `Capacidad` de `@/stores/roles.store` solo como tipos
    - _Requirements: 3.1, 3.2, 3.4, 16.4, 17.4_

  - [x] 1.2 Crear `src/assistant/contracts/engine.contract.ts`
    - Definir `AssistantMessage` (`id`, `role`, `text`, `evidence?`, `createdAt`), `EngineContext` (`access`, `history?`) y la interfaz `AssistantEngine` (`kind`, `ask(question, ctx)`)
    - _Requirements: 1.4, 1.5, 17.1, 17.2_

  - [x] 1.3 Crear `src/assistant/contracts/provider.contract.ts`
    - Definir la interfaz `AssistantToolProvider` (`module`, `getTools()`)
    - _Requirements: 16.2, 18.1_

- [x] 2. Implementar el ToolRegistry y el AssistantAccessContext
  - [x] 2.1 Crear `src/assistant/registry/tool-registry.ts`
    - Definir `AssistantAccessContext` (`enabledModules`, `hasCapability(cap)`)
    - Implementar `ToolRegistry` con `register(provider)` (idempotente por módulo: re-registrar reemplaza al provider previo), `getAvailableTools(ctx)` (filtro módulo habilitado ∩ todas las `requiredCapabilities`, sin duplicados por `id`, fail-closed) y `resolve(toolId, ctx)` (devuelve la tool solo si aparece en `getAvailableTools`; `null` para id nulo/vacío/inexistente, sin lanzar)
    - Exportar una instancia singleton `toolRegistry`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 16.3, 16.5_

  - [x]* 2.2 Escribir tests unitarios del ToolRegistry
    - Módulo deshabilitado y capacidad faltante excluyen la tool; `enabledModules` vacío → lista vacía; sin capacidades → lista vacía; re-registro reemplaza provider; `resolve` fail-closed devuelve `null` para id inexistente/nulo/vacío; sin duplicados por `id`
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 2.7, 2.8, 2.9, 16.5_

  - [x]* 2.3 Escribir property test de autorización fail-closed
    - **Property 1: Autorización fail-closed** (fast-check): para cualquier `AssistantAccessContext` generado, toda tool devuelta cumple `module ∈ enabledModules` y posee todas sus `requiredCapabilities`; sin capacidades → lista vacía
    - **Validates: Requirements 2.1, 2.2, 2.3**

  - [x]* 2.4 Escribir property test de resolve respetando el filtro
    - **Property 2: resolve respeta el filtro** (fast-check): si `resolve(id, ctx) ≠ null` entonces existe una tool con ese `id` en `getAvailableTools(ctx)`; en caso contrario `null`
    - **Validates: Requirements 2.4, 2.5**

- [x] 3. Crear el barrel del núcleo y el stub del motor remoto
  - [x] 3.1 Crear `src/assistant/index.ts`
    - Reexportar contratos, `ToolRegistry`, `toolRegistry`, `AssistantAccessContext` y tipos públicos del núcleo
    - _Requirements: 16.1, 17.1_

  - [x]* 3.2 Crear stub `src/assistant/engine/remote-llm-engine.ts`
    - Clase `RemoteLLMEngine implements AssistantEngine` documentada, `kind = "remote-llm"`, `ask` no implementado (lanza o `throw new Error("not implemented")`), sin lógica real
    - _Requirements: 17.1, 17.2, 17.3_

- [x] 4. Añadir la capacidad `assistant.use` al modelo de roles
  - [x] 4.1 Extender `src/stores/roles.store.ts`
    - Añadir `assistant.use` al tipo `Capacidad`, a `CAPACIDADES` y a `CAPACIDAD_LABEL` (etiqueta legible); crear grupo `"Asistente"` en `CAPACIDAD_GRUPOS` con esa capacidad; incluir `assistant.use` en las capacidades del rol `admin_tienda`
    - _Requirements: 15.1, 15.2_

  - [x]* 4.2 Escribir/actualizar tests unitarios de roles.store
    - Verificar que `assistant.use` existe con etiqueta, está en el grupo "Asistente" y pertenece a `admin_tienda`
    - _Requirements: 15.1, 15.2_

- [x] 5. Registrar la sección `/asistente` en operadores.store
  - [x] 5.1 Añadir sección en `SECCIONES` de `src/stores/operadores.store.ts`
    - Definir la sección para la ruta `/asistente` asociada a la capacidad `assistant.use`
    - _Requirements: 15.3_

- [x] 6. Implementar el PedidosToolProvider (único import de pedidosStore)
  - [x] 6.1 Crear `src/modules-tools/pedidos/pedidos.tool-provider.ts` con las tools query
    - Único archivo que importa `pedidosStore` (invariante A2). Implementar `PedidosToolProvider implements AssistantToolProvider` (`module = "pedidos"`) y las tools query: `getResumenHoy` (conteos nuevos/en curso/entregados hoy/programados; 0 si no hay), `getVentasPeriodo` (volumen y monto en rango inclusivo, `period` con desde/hasta, error si desde > hasta, 0/0 si vacío), `getCanalTop` (canal con mayor conteo; todos los empatados; "no hay canal líder" si vacío), `getTiempoCiclo` (promedio en minutos enteros redondeados; "no disponible" si no hay entregados), `getCancelados` (conteo, 0 si no hay), `getHoraPico` (franja 00–23 con mayor conteo; más temprana en empate; "no hay hora pico" si no hay)
    - Todas requieren `orders.read` y adjuntan `ToolSource` del módulo `pedidos` describiendo los getters consultados; error de capacidad insuficiente cuando falte `orders.read`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4, 9.5, 16.2, 16.4_

  - [x] 6.2 Implementar las tools analyze `compararDias` y `diagnosticoDesempeno`
    - `compararDias`: Facts de entregados y volumen de cada día; Inference `kind="pattern"` con `confidence` válida y `basedOn` referenciando los labels de volumen cuando la variación ≠ 0; sin Inference y volumen 0 si algún día no tiene pedidos
    - `diagnosticoDesempeno`: Facts de volumen 7 días, tiempo de ciclo (min) y urgentes actuales; Inference `kind="correlation"` (nunca causal) con `basedOn` no vacío cuando urgentes > 0 y ciclo > umbral configurado; sin Inference en caso contrario
    - Validar que todo `ToolResult` con inferencias tenga `kind` en {correlation, pattern, hypothesis} y `basedOn` no vacío que referencie labels de Facts presentes; rechazar con error si no
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 10.1, 10.2, 10.3, 10.4, 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x]* 6.3 Escribir tests unitarios del PedidosToolProvider
    - Cada tool devuelve los Facts esperados y sus `sources`; casos límite (sin pedidos, empates, rango inválido, sin `orders.read`); las tools analyze marcan inferencias con `kind` no causal
    - _Requirements: 4.1, 4.4, 4.5, 5.1, 5.4, 5.5, 6.1, 6.4, 6.5, 7.1, 7.4, 8.1, 8.4, 9.1, 9.4, 9.5, 10.1, 10.4, 11.1, 11.5_

  - [x]* 6.4 Escribir property test de no causalidad
    - **Property 3: No causalidad** (fast-check): para todo `ToolResult` con inferencias, `inf.kind ∈ {correlation, pattern, hypothesis}`
    - **Validates: Requirements 3.2, 11.2**

  - [x]* 6.5 Escribir property test de inferencias bien formadas y trazables
    - **Property 4: Inferencias bien formadas y trazables** (fast-check): `inf.confidence ∈ {baja, media, alta}`, `basedOn ≠ ∅` y todo elemento de `basedOn` coincide con el `label` de un `Fact` del mismo `ToolResult`
    - **Validates: Requirements 3.3, 3.4, 3.5, 3.6, 11.3**

- [x] 7. Implementar el LocalRuleEngine
  - [x] 7.1 Crear `src/assistant/engine/local-rule-engine.ts`
    - `LocalRuleEngine implements AssistantEngine` (`kind = "local-rule"`). `ask` obtiene tools con `getAvailableTools(ctx)`; si vacío responde mensaje de permisos sin evidencia; normaliza el texto y matchea intención a `toolId`; si no reconoce responde ayuda listando hasta 20 tools disponibles sin evidencia; si coincide ejecuta la tool de mayor prioridad (orden determinista), extrae parámetros, resuelve por `resolve` y adjunta el `ToolResult` como `evidence`
    - Redactar la respuesta separando HECHOS de INFERENCIAS en secciones identificadas, sin términos causales ("causa", "provoca", "debido a", "porque"); rechazar ejecución de tools con `level` distinto de `query`/`analyze`
    - _Requirements: 3.7, 12.1, 12.2, 13.1, 13.2, 13.3, 13.4, 17.4, 17.5, 18.2, 18.3_

  - [x]* 7.2 Escribir tests unitarios del LocalRuleEngine
    - Intención reconocida ejecuta la tool y adjunta `evidence`; no reconocida devuelve ayuda sin evidencia; sin tools devuelve mensaje de permisos; múltiples coincidencias eligen la de mayor prioridad; texto sin términos causales; rechazo de niveles no soportados
    - _Requirements: 3.7, 12.1, 12.2, 13.1, 13.3, 13.4, 17.5, 18.3_

- [x] 8. Crear el adaptador de sesión y el bootstrap
  - [x] 8.1 Implementar `buildAccessContext` y `src/assistant/bootstrap.ts`
    - Adaptador delgado `buildAccessContext()` que deriva el `AssistantAccessContext` desde `sessionStore.accessContext` (módulos habilitados + `hasCapability` que retorna booleano); si `accessContext` no está disponible o no otorga capacidades, construir contexto sin módulos y `hasCapability` que retorna falso
    - `bootstrap.ts` registra `new PedidosToolProvider()` en `toolRegistry` antes de la primera pregunta (el núcleo no importa `SessionStore`; el adaptador vive fuera de `src/assistant/**` o solo importa el tipo)
    - _Requirements: 15.6, 15.7, 18.1, 18.2_

- [x] 9. Implementar el AssistantStore (MobX)
  - [x] 9.1 Crear `src/stores/assistant.store.ts`
    - `AssistantStore` con `mensajes: AssistantMessage[]`, `pensando`, `error`, getter `puedeEnviar`, `enviar(texto)` y `limpiar()`. Depende solo de la interfaz `AssistantEngine` (inyectada). `enviar`: hace `trim`; si queda entre 1 y 4000 chars agrega mensaje `user`, limpia error previo, `pensando=true`, llama `engine.ask` con `EngineContext` que incluye el access context de la sesión, agrega respuesta `assistant`, `pensando=false`; si el texto queda vacío no muta ni llama al engine; si `pensando` ya es true rechaza el envío; ante fallo del engine/tool setea `error`, conserva el historial y descarta evidencia parcial
    - Reexportar desde `src/stores/index.ts`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 1.8, 1.9, 12.3, 14.1, 14.2, 14.3, 14.4, 17.1, 17.2_

  - [x]* 9.2 Escribir tests unitarios del AssistantStore
    - Transición de `pensando`; no muta ante texto vacío o solo espacios; guard mientras `pensando=true`; manejo de error conservando el hilo y limpiando error en el siguiente envío; agrega mensajes user/assistant en orden; `limpiar` vacía el historial
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7, 1.8, 1.9, 12.3, 14.1, 14.2, 14.3, 14.4_

- [x] 10. Construir la UI del asistente
  - [x] 10.1 Crear `src/pages/asistente/views/MessageBubble.tsx` y `ChatThread.tsx`
    - `MessageBubble`: burbuja con alineación/estilo según `role` (usuario a la derecha, asistente a la izquierda), reutilizando el patrón de `pages/simulador/SimuladorWhatsApp.tsx`. `ChatThread`: renderiza la lista de mensajes del store, cada uno en su burbuja, con `user` visualmente distinto de `assistant`
    - _Requirements: 1.6_

  - [x] 10.2 Crear `src/pages/asistente/views/Composer.tsx` y `FactsPanel.tsx`
    - `Composer`: input HABILITADO + botón enviar que invoca `store.enviar`, deshabilitado mientras `pensando`. `FactsPanel`: muestra las fuentes consultadas separando visualmente Hechos de Inferencias y mostrando junto a cada Inferencia su `confidence` ({baja, media, alta})
    - _Requirements: 1.1, 1.3, 3.8_

  - [x] 10.3 Crear `src/pages/asistente/AsistentePage.tsx` e `index.ts`
    - Layout que compone `ChatThread` + `Composer` + `FactsPanel`, observando el `AssistantStore`; barrel `index.ts` de la página
    - _Requirements: 1.6, 3.8_

  - [x]* 10.4 Escribir test de integración de UI
    - Escribir en `Composer` → aparece mensaje del usuario y respuesta del asistente en `ChatThread`; `FactsPanel` separa Hechos de Inferencias con etiqueta de confianza
    - _Requirements: 1.6, 3.8_

- [x] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Integrar navegación y guards
  - [x] 12.1 Registrar la ruta `/asistente` en `src/app/App.tsx`
    - Añadir la ruta dentro de `<RequireSession><AppShell/></RequireSession>`, envuelta en `<CapabilityGuard capacidad="assistant.use">`, renderizando `AsistentePage`; invocar el bootstrap del asistente en el arranque de la app
    - _Requirements: 15.4, 18.1_

  - [x] 12.2 Añadir el ítem de menú del Asistente en `src/app/AppSidebar.tsx`
    - Mostrar el ítem condicionado a la capacidad `assistant.use` (ej. `sessionStore.puedeVerSeccion(...)`); ocultarlo cuando el usuario no la tenga
    - _Requirements: 15.5_

- [ ] 13. Verificación de independencia de dominio e intercambiabilidad del engine
  - [ ]* 13.1 Escribir test de independencia de dominio del núcleo
    - **Property 5: Independencia de dominio** (análisis de imports): ningún módulo de `src/assistant/**` importa un store de dominio ni `SessionStore`; `pedidosStore` solo se importa desde `PedidosToolProvider`
    - **Validates: Requirements 16.1, 16.2, 16.3**

  - [ ]* 13.2 Escribir test de intercambiabilidad del engine
    - **Property 6: Intercambiabilidad de engine**: sustituir la implementación de `AssistantEngine` inyectada en `AssistantStore` (p. ej. un doble de test) no cambia la firma pública del store ni requiere tocar la UI
    - **Validates: Requirements 17.1, 17.2, 17.3**

- [ ] 14. Final checkpoint - build, typecheck y tests
  - Ejecutar el typecheck/build del proyecto y la suite de tests; corregir errores. Ensure all tests pass, ask the user if questions arise.

## Notes

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP funcional más rápido (tests unitarios/property-based y el stub `RemoteLLMEngine`); las tareas de implementación central nunca son opcionales.
- Cada tarea referencia los requisitos específicos que implementa para trazabilidad.
- Los property tests usan **fast-check** y validan las Correctness Properties del diseño: P1/P2 en el registry, P3/P4 en el provider, P5 (independencia de imports) y P6 (intercambiabilidad del engine).
- Los checkpoints aseguran validación incremental.
- Invariantes de arquitectura respetadas: `src/assistant/**` no importa stores de dominio ni `SessionStore`; `PedidosToolProvider` es el único que importa `pedidosStore`; UI y store dependen solo de la interfaz `AssistantEngine`.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "4.1", "5.1"] },
    { "id": 1, "tasks": ["2.1", "3.1", "3.2", "4.2"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "6.1"] },
    { "id": 3, "tasks": ["6.2"] },
    { "id": 4, "tasks": ["6.3", "6.4", "6.5", "7.1"] },
    { "id": 5, "tasks": ["7.2", "8.1"] },
    { "id": 6, "tasks": ["9.1"] },
    { "id": 7, "tasks": ["9.2", "10.1", "10.2"] },
    { "id": 8, "tasks": ["10.3", "12.2"] },
    { "id": 9, "tasks": ["10.4", "12.1"] },
    { "id": 10, "tasks": ["13.1", "13.2"] }
  ]
}
```

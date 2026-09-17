// ═══════════════════════════════════════════════════════════════════════════
// CATÁLOGO DE PRESENTACIÓN — Configuración de NECTO AI
// ═══════════════════════════════════════════════════════════════════════════
//
// Este módulo es la ÚNICA fuente de verdad del VOCABULARIO de la página de
// configuración de NECTO AI: qué secciones existen, cómo se llaman, en qué grupo
// van, en qué orden, y con qué icono. La página importa estas tablas; ninguna
// superficie escribe una etiqueta de sección como literal.
//
// POR QUÉ EXISTE (y por qué no vive dentro del componente):
//   Una etiqueta escrita a mano dentro de un JSX es invisible para los tests y
//   para cualquier otra superficie. Al extraerla a una tabla tipada, el
//   compilador puede comprobar que el catálogo es EXHAUSTIVO sobre la unión de
//   claves (`SeccionAsistente`), y un test puede recorrerlo entero. Es el mismo
//   patrón que `ESTADO_CONVERSACION_LABEL` y `META_SECCION` del canal.
//
// ═══════════════════════════════════════════════════════════════════════════
// PROPÓSITO DE NECTO AI — léelo antes de tocar esta página
// ═══════════════════════════════════════════════════════════════════════════
//
// NECTO AI **NO** es el bot de WhatsApp. Son dos asistentes distintos que
// conviven en la app y conviene no confundirlos:
//
//   ┌──────────────────────┬─────────────────────────┬──────────────────────────┐
//   │                      │ Bot de WhatsApp         │ NECTO AI                 │
//   ├──────────────────────┼─────────────────────────┼──────────────────────────┤
//   │ A quién sirve        │ el CLIENTE final        │ el EQUIPO del negocio    │
//   │ Canal                │ WhatsApp (hilo público) │ pantalla interna         │
//   │ Qué hace             │ atiende pedidos         │ consulta y analiza datos │
//   │ Cómo razona          │ motor de reglas         │ motor de reglas          │
//   │                      │ (respuestas al cliente) │ LocalRuleEngine          │
//   │ Autoría del contenido│ habla COMO el negocio   │ habla AL operador        │
//   │ Capacidad que lo rige│ `channels.*`            │ `assistant.use`          │
//   │ Dónde se configura   │ /conversaciones/config  │ /asistente/config        │
//   └──────────────────────┴─────────────────────────┴──────────────────────────┘
//
// El modelo de NECTO AI, en una frase: **un motor de reglas local que responde
// preguntas sobre los pedidos leyendo de los stores, sin inventar nada, y
// separando siempre HECHOS de INFERENCIAS.**
//
// Arquitectura real (importa para saber qué se puede configurar de verdad):
//
//   pregunta ─▶ LocalRuleEngine
//                 ├─ 1. getAvailableTools(ctx)  ← filtra módulos ∩ capacidades
//                 ├─ 2. matchea intención por palabras clave
//                 ├─ 3. resuelve la tool (fail-closed)
//                 ├─ 4. ejecuta la tool   →  ToolResult { facts, inferences, blocks }
//                 └─ 5. redacta separando "Hechos:" de "Observaciones"
//
// De ahí salen los TRES hechos que esta página debe reflejar y que la hacen
// distinta de cualquier otra pantalla de ajustes:
//
//   1. **La autorización es el filtro.** Una tool solo existe para el operador si
//      su módulo está habilitado Y tiene todas sus `requiredCapabilities`. O sea:
//      lo que NECTO AI *puede* responder depende del ROL. Por eso "Herramientas"
//      es una sección de solo lectura y no una lista de interruptores.
//   2. **Hay un catálogo finito y contable de tools.** No es un modelo abierto:
//      son 11 tools con id, nivel (`query`/`analyze`) y capacidades. Eso se puede
//      enumerar, contar y auditar — y es información honesta y verificable.
//   3. **El motor es intercambiable pero el activo es local.** `AssistantEngine`
//      es una interfaz; `LocalRuleEngine` es lo que corre. `RemoteLLMEngine`
//      existe como stub que LANZA. Mostrar un selector de modelos sería mentir.
//
// ALCANCE (lo que esta página NO es):
//   La app es un mock 100 % frontend sin backend. NO existen —y por tanto NO se
//   muestran— claves de API, modelos, temperatura, tokens, memoria del asistente,
//   conectores, facturación, créditos ni control de datos. Cada sección de abajo
//   se apoya en un valor REAL del núcleo (`toolRegistry`, `assistantStore`,
//   `sessionStore`) o se declara explícitamente como preferencia local de
//   interfaz. Inventar una perilla de LLM para llenar una tarjeta sería un
//   defecto, no una funcionalidad.
//
// ═══════════════════════════════════════════════════════════════════════════

import type { BadgeColor } from "@/elements/ui/badge";
import type { SwitchColor } from "@/elements/form/switch";

// ═══════════════════════════════════════════════════════════════════════════
// SECCIONES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Claves de las secciones de la página. La unión es la fuente de exhaustividad:
 * `META_SECCION` es `Record` sobre ella y `seccionesPorGrupo()` la recorre, así
 * que añadir una sección sin darle grupo o metadatos es un error de compilación.
 */
export type SeccionAsistente =
  | "perfil"
  | "motor"
  | "herramientas"
  | "historial"
  | "alcance"
  | "apariencia";

/** Grupos de la navegación vertical, en orden de aparición. */
export type GrupoSeccionAsistente = "asistente" | "capacidades" | "preferencias";

/** Etiqueta del grupo tal como se pinta en la cabecera pequeña en mayúsculas. */
export const GRUPO_SECCION_LABEL: Record<GrupoSeccionAsistente, string> = {
  asistente: "ASISTENTE",
  capacidades: "CAPACIDADES",
  preferencias: "PREFERENCIAS",
};

/**
 * Orden canónico de los grupos. Declarado aparte de `Object.keys` para que el
 * orden de la navegación no dependa del orden de inserción de un objeto.
 */
export const ORDEN_GRUPOS: GrupoSeccionAsistente[] = [
  "asistente",
  "capacidades",
  "preferencias",
];

/** Grupo al que pertenece cada sección. */
export const GRUPO_DE_SECCION: Record<SeccionAsistente, GrupoSeccionAsistente> = {
  perfil: "asistente",
  motor: "asistente",
  herramientas: "capacidades",
  historial: "capacidades",
  alcance: "capacidades",
  apariencia: "preferencias",
};

/** Iconos disponibles para las secciones (nombres del catálogo `@/icons`). */
export type IconoSeccion =
  | "AiIcon"
  | "BoltIcon"
  | "PlugInIcon"
  | "TimeIcon"
  | "LockIcon"
  | "EyeIcon";

/** Metadatos de presentación de una sección. */
export interface MetaSeccion {
  /** Etiqueta de la entrada de navegación y encabezado del panel. */
  label: string;
  /** Frase corta bajo el encabezado del panel. */
  hint: string;
  /** Icono del catálogo. */
  icono: IconoSeccion;
}

/**
 * Metadatos de las 6 secciones. `Record` sobre la unión ⇒ exhaustivo por
 * construcción: no se puede añadir una sección sin etiquetarla.
 */
export const META_SECCION: Record<SeccionAsistente, MetaSeccion> = {
  perfil: {
    label: "Perfil del asistente",
    hint: "Qué es NECTO AI, en qué motor corre y con qué estado está ahora mismo.",
    icono: "AiIcon",
  },
  motor: {
    label: "Motor de razonamiento",
    hint: "Cómo interpreta las preguntas y de dónde saca lo que responde.",
    icono: "BoltIcon",
  },
  herramientas: {
    label: "Herramientas",
    hint: "Las consultas que el asistente puede ejecutar, y las que tu rol no alcanza.",
    icono: "PlugInIcon",
  },
  historial: {
    label: "Conversaciones",
    hint: "Los hilos guardados en este navegador y su retención local.",
    icono: "TimeIcon",
  },
  alcance: {
    label: "Alcance y límites",
    hint: "Qué NO hace el asistente. Es la parte más importante de esta pantalla.",
    icono: "LockIcon",
  },
  apariencia: {
    label: "Apariencia",
    hint: "Preferencias locales de la interfaz del asistente.",
    icono: "EyeIcon",
  },
};

/** Orden canónico de las secciones dentro de su grupo. */
export const ORDEN_SECCIONES: SeccionAsistente[] = [
  "perfil",
  "motor",
  "herramientas",
  "historial",
  "alcance",
  "apariencia",
];

/**
 * Agrupa las secciones por grupo, conservando el orden de `ORDEN_GRUPOS` y el de
 * `ORDEN_SECCIONES`. Es la función que consume la navegación vertical.
 */
export function seccionesPorGrupo(): {
  grupo: GrupoSeccionAsistente;
  secciones: SeccionAsistente[];
}[] {
  return ORDEN_GRUPOS.map((grupo) => ({
    grupo,
    secciones: ORDEN_SECCIONES.filter((s) => GRUPO_DE_SECCION[s] === grupo),
  })).filter((g) => g.secciones.length > 0);
}

// ═══════════════════════════════════════════════════════════════════════════
// VOCABULARIO DEL NÚCLEO DEL ASISTENTE
// ═══════════════════════════════════════════════════════════════════════════
//
// Estos catálogos traducen constantes del núcleo (`src/assistant/**`) a texto
// presentable. Están indexados por `Record` sobre la unión real, así que si el
// núcleo añade un valor y aquí falta, es un error de compilación — que es
// exactamente lo que debe pasar.
//
// ═══════════════════════════════════════════════════════════════════════════

/** Identificador del motor activo, tal como lo expone `AssistantEngine.kind`. */
export type TipoMotor = "local-rule" | "remote-llm";

/** Etiqueta legible del motor. */
export const MOTOR_LABEL: Record<TipoMotor, string> = {
  "local-rule": "Motor de reglas local",
  "remote-llm": "Motor remoto (LLM)",
};

/**
 * Descripción del motor. La del motor local dice la verdad sobre cómo funciona:
 * reglas de palabras clave sobre el texto normalizado, sin modelo de lenguaje.
 */
export const MOTOR_DESCRIPCION: Record<TipoMotor, string> = {
  "local-rule":
    "Interpreta la pregunta con reglas de palabras clave y ejecuta una consulta de solo lectura. No hay modelo de lenguaje ni servicio externo: corre entero en tu navegador.",
  "remote-llm":
    "Delegaría el razonamiento en un modelo de lenguaje a través de un servidor. No está implementado en esta versión.",
};

/** Badge por motor: el local está operativo; el remoto no existe todavía. */
export const MOTOR_BADGE: Record<TipoMotor, BadgeColor> = {
  "local-rule": "success",
  "remote-llm": "warning",
};

/** Etiqueta del badge por motor. */
export const MOTOR_BADGE_LABEL: Record<TipoMotor, string> = {
  "local-rule": "Activo",
  "remote-llm": "No disponible",
};

// ── Niveles de capacidad de una tool ──────────────────────────────────────
//
// `ToolCapabilityLevel` en el contrato es `"query" | "analyze" | "recommend" |
// "execute"`, pero el MVP solo implementa y solo acepta los dos primeros: el
// motor rechaza explícitamente cualquier tool que no sea `query` o `analyze`.

/** Nivel de una tool. */
export type NivelTool = "query" | "analyze" | "recommend" | "execute";

/** Etiqueta legible del nivel. */
export const NIVEL_LABEL: Record<NivelTool, string> = {
  query: "Consulta",
  analyze: "Análisis",
  recommend: "Recomendación",
  execute: "Ejecución",
};

/** Qué implica cada nivel, para que el operador entienda la diferencia. */
export const NIVEL_DESCRIPCION: Record<NivelTool, string> = {
  query: "Lee y cuenta datos. Solo lectura.",
  analyze: "Compara periodos y señala patrones. Solo lectura.",
  recommend: "Propondría acciones al operador. Reservado, no implementado.",
  execute: "Ejecutaría cambios por sí mismo. Reservado, no implementado.",
};

/**
 * Niveles que el MVP acepta. Espejo de `NIVELES_MVP` en `local-rule-engine.ts`:
 * el motor descarta cualquier tool fuera de este conjunto. Se declara aquí para
 * que la página pueda decir con honestidad qué niveles están vivos.
 */
export const NIVELES_OPERATIVOS: NivelTool[] = ["query", "analyze"];

/** Badge por nivel: verde si está operativo, ámbar si está reservado. */
export const NIVEL_BADGE: Record<NivelTool, BadgeColor> = {
  query: "success",
  analyze: "success",
  recommend: "warning",
  execute: "warning",
};

/** ¿Está este nivel operativo en el MVP? */
export function nivelOperativo(nivel: NivelTool): boolean {
  return NIVELES_OPERATIVOS.includes(nivel);
}

// ═══════════════════════════════════════════════════════════════════════════
// HECHO vs INFERENCIA
// ═══════════════════════════════════════════════════════════════════════════
//
// La distinción es la piedra angular del asistente y merece su propia sección de
// explicación en la página. Las etiquetas están aquí para que el texto que ve el
// operador y el que produce el motor no puedan divergir.

/** Tipos de inferencia que el contrato permite. Nótese: NO existe "causa". */
export type TipoInferencia = "correlation" | "pattern" | "hypothesis";

/** Etiqueta del tipo de inferencia. */
export const INFERENCIA_TIPO_LABEL: Record<TipoInferencia, string> = {
  correlation: "Correlación",
  pattern: "Patrón",
  hypothesis: "Hipótesis",
};

/** Niveles de confianza que el contrato permite. */
export type ConfianzaInferencia = "baja" | "media" | "alta";

/** Etiqueta de la confianza. */
export const CONFIANZA_LABEL: Record<ConfianzaInferencia, string> = {
  baja: "Confianza baja",
  media: "Confianza media",
  alta: "Confianza alta",
};

/** Badge por confianza. */
export const CONFIANZA_BADGE: Record<ConfianzaInferencia, BadgeColor> = {
  baja: "warning",
  media: "info",
  alta: "success",
};

/**
 * Términos que el motor NEUTRALIZA en sus respuestas: el contrato prohíbe
 * afirmar causalidad, y `sanearCausalidad()` sustituye estos términos por
 * "coincide con" como red de seguridad. Se listan para poder explicarlo.
 */
export const TERMINOS_CAUSALES_PROHIBIDOS: string[] = [
  "causa",
  "provoca",
  "porque",
  "debido a",
];

// ═══════════════════════════════════════════════════════════════════════════
// LÍMITES DEL ASISTENTE
// ═══════════════════════════════════════════════════════════════════════════
//
// Cada límite es una propiedad VERDADERA del sistema, no una advertencia
// genérica. La página los enumera porque un asistente sin límites declarados es
// un asistente en el que no se puede confiar.

/** Un límite del asistente, con su porqué. */
export interface LimiteAsistente {
  titulo: string;
  detalle: string;
}

export const LIMITES_ASISTENTE: LimiteAsistente[] = [
  {
    titulo: "Solo lee, nunca escribe",
    detalle:
      "El asistente ejecuta consultas de solo lectura. No puede crear, confirmar, cancelar ni modificar un pedido, y tampoco enviar mensajes a un cliente.",
  },
  {
    titulo: "No afirma causas",
    detalle:
      "Cuando señala una coincidencia entre dos datos la marca como inferencia con su nivel de confianza. Nunca dice que un dato provocó otro.",
  },
  {
    titulo: "No conoce más de lo que tu rol alcanza",
    detalle:
      "Las herramientas se filtran por módulo habilitado y por tus capacidades. Lo que no ves en la lista de Herramientas, el asistente tampoco puede consultarlo.",
  },
  {
    titulo: "No inventa datos ausentes",
    detalle:
      "Si una consulta no encuentra datos, lo dice. No rellena un hueco con una cifra aproximada ni con un valor por defecto.",
  },
  {
    titulo: "No sale de la aplicación",
    detalle:
      "No hay servidor, ni clave de API, ni modelo de lenguaje externo. Las preguntas y sus respuestas nunca salen de este navegador.",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// APARIENCIA (preferencias locales)
// ═══════════════════════════════════════════════════════════════════════════

/** Densidad del hilo de conversación del asistente. */
export type DensidadAsistente = "comoda" | "compacta";

export interface OpcionDensidad {
  value: DensidadAsistente;
  label: string;
  detalle: string;
}

export const OPCIONES_DENSIDAD: OpcionDensidad[] = [
  {
    value: "comoda",
    label: "Cómoda",
    detalle: "Más aire entre mensajes. Mejor para leer respuestas largas con tablas.",
  },
  {
    value: "compacta",
    label: "Compacta",
    detalle: "Más mensajes visibles sin desplazar. Mejor para repasar un hilo largo.",
  },
];

/** Cuánto texto de una respuesta se muestra antes de plegarlo. */
export type LongitudRespuesta = "completa" | "resumida";

export interface OpcionRespuesta {
  value: LongitudRespuesta;
  label: string;
  detalle: string;
}

export const OPCIONES_RESPUESTA: OpcionRespuesta[] = [
  {
    value: "completa",
    label: "Completa",
    detalle: "El asistente escribe todas las observaciones que haya encontrado.",
  },
  {
    value: "resumida",
    label: "Resumida",
    detalle: "El asistente escribe solo los hechos, sin las observaciones.",
  },
];

/** Color del `Switch` del catálogo, para no repetirlo en el JSX. */
export const SWITCH_COLOR: SwitchColor = "blue";

/**
 * Módulos que el asistente conoce hoy, para poder calcular el TOTAL de
 * herramientas sin filtrar por rol.
 *
 * Equivale a los providers realmente registrados en el `ToolRegistry` (el
 * bootstrap registra `PedidosToolProvider`, cuyo módulo es `"pedidos"`). Se usa
 * solo para responder a la pregunta "¿cuántas herramientas existen?", nunca para
 * conceder acceso: el filtro real lo sigue aplicando el registry.
 */
export const MODULOS_CONOCIDOS = ["pedidos"] as const;

// ═══════════════════════════════════════════════════════════════════════════
// PREGUNTAS DE EJEMPLO
// ═══════════════════════════════════════════════════════════════════════════
//
// Cada ejemplo está emparejado con el `toolId` que realmente dispara, según la
// tabla `REGLAS_INTENCION` de `local-rule-engine.ts`. No son frases decorativas:
// si una etiqueta deja de coincidir con una regla, el test lo detecta.

export interface EjemploPregunta {
  /** Texto exacto que se envía al asistente. */
  pregunta: string;
  /** `toolId` del catálogo de Pedidos al que `REGLAS_INTENCION` lo resuelve. */
  toolId: string;
}

export const EJEMPLOS_PREGUNTA: EjemploPregunta[] = [
  { pregunta: "¿Cuántos pedidos tuve hoy?", toolId: "pedidos.getResumenHoy" },
  { pregunta: "Dame un diagnóstico de desempeño", toolId: "pedidos.diagnosticoDesempeno" },
  { pregunta: "Compara las ventas de esta semana vs la semana pasada", toolId: "pedidos.compararSemanas" },
  { pregunta: "¿Cuáles son los pedidos pendientes?", toolId: "pedidos.getPendientes" },
  // OJO: `pedidos.getTopProductos` está DECLARADO en el provider pero NO figura
  // en `QUERY_TOOLS` ni en `ANALYZE_TOOLS`, así que el registry nunca lo
  // resuelve. Un ejemplo que apuntara a él prometería una herramienta
  // inexistente. Se usa una tool realmente registrada.
  { pregunta: "¿Cuánto vendí este mes?", toolId: "pedidos.getVentasPeriodo" },
  { pregunta: "¿Cuál es la hora pico?", toolId: "pedidos.getHoraPico" },
];

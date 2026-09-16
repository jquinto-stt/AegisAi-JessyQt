// ═══════════════════════════════════════════════════════════════════════════
// engine/local-rule-engine.ts
// ═══════════════════════════════════════════════════════════════════════════
//
// `LocalRuleEngine` — motor **rule-based local** del asistente ("Necto
// Intelligence") para el MVP. Es frontend-only: no hay backend, API key ni LLM
// real. Interpreta la intención del usuario con reglas de palabras clave sobre
// el texto normalizado, resuelve una tool del `ToolRegistry` (respetando el
// filtro de autorización fail-closed), la ejecuta y redacta una respuesta que
// separa de forma estricta HECHOS de INFERENCIAS, sin afirmar causalidad.
//
// Pertenece al núcleo agnóstico de dominio (`src/assistant/**`, invariante A1):
// NO importa ningún store de negocio ni `SessionStore`. La autorización entra
// por el `AssistantAccessContext` que viaja dentro del `EngineContext`.
//
// La UI y el `AssistantStore` dependen SOLO de la interfaz `AssistantEngine`
// (invariante A3); esta clase es intercambiable por `RemoteLLMEngine` sin tocar
// aguas arriba (invariante A5).
//
// ═══════════════════════════════════════════════════════════════════════════

import type {
  AssistantEngine,
  AssistantMessage,
  EngineContext,
} from "../contracts/engine.contract";
import type {
  AssistantTool,
  Fact,
  Inference,
  ToolResult,
} from "../contracts/tool.contract";
import { ToolRegistry, toolRegistry } from "../registry/tool-registry";

// ─────────────────────────────────────────────────────────────────────────
// Constantes de reglas
// ─────────────────────────────────────────────────────────────────────────

/**
 * Tabla de patrones → `toolId`, evaluada en orden determinista de arriba hacia
 * abajo. El PRIMER patrón cuya keyword aparezca en el texto normalizado gana;
 * ante coincidencias múltiples, la entrada más arriba tiene mayor prioridad
 * (requisito 13.4). Las keywords están normalizadas (minúsculas, sin acentos)
 * para comparar contra el texto ya normalizado de la pregunta.
 */
const REGLAS_INTENCION: ReadonlyArray<{
  keywords: readonly string[];
  toolId: string;
}> = [
  {
    keywords: ["diagnostic", "por que", "desempeno", "rendimiento"],
    toolId: "pedidos.diagnosticoDesempeno",
  },
  {
    // Comparación entre semanas. TODAS las keywords contienen "semana", de modo
    // que frases de días como "compara ... con ayer" (sin "semana") NO caen aquí
    // y siguen resolviéndose a `pedidos.compararDias`. Va ANTES de compararDias y
    // de getVentasPeriodo para que "ventas esta semana frente a la semana pasada"
    // gane sobre la keyword "venta".
    keywords: [
      "semana pasada",
      "esta semana",
      "semana anterior",
      "vs la semana",
      "frente a la semana",
      "comparado con la semana",
    ],
    toolId: "pedidos.compararSemanas",
  },
  {
    keywords: ["compar", "versus", " vs ", "ayer"],
    toolId: "pedidos.compararDias",
  },
  {
    keywords: [
      "pendiente",
      "pendientes",
      "en curso",
      "sin entregar",
      "por entregar",
      "en proceso",
    ],
    toolId: "pedidos.getPendientes",
  },
  { keywords: ["cancel"], toolId: "pedidos.getCancelados" },
  {
    keywords: ["hora pico", "pico", "mayor demanda", "hora"],
    toolId: "pedidos.getHoraPico",
  },
  {
    keywords: ["ciclo", "preparacion", "tiempo promedio", "tiempo"],
    toolId: "pedidos.getTiempoCiclo",
  },
  { keywords: ["canal", "origen", "whatsapp"], toolId: "pedidos.getCanalTop" },
  {
    keywords: ["venta", "vendimos", "monto", "ingreso"],
    toolId: "pedidos.getVentasPeriodo",
  },
  {
    keywords: ["resumen", "hoy", "cuantos pedidos", "como va"],
    toolId: "pedidos.getResumenHoy",
  },
];

/** Niveles de tool permitidos en el MVP (requisitos 17.4, 17.5). */
const NIVELES_MVP: ReadonlySet<AssistantTool["level"]> = new Set([
  "query",
  "analyze",
] as const);

/** Máximo de tools a enumerar en el mensaje de ayuda (requisito 13.1). */
const MAX_TOOLS_AYUDA = 20;

/** Términos causales prohibidos en el texto de respuesta (requisito 3.7). */
const TERMINOS_CAUSALES = ["causa", "provoca", "porque", "debido a"] as const;

// ─────────────────────────────────────────────────────────────────────────
// Helpers puros
// ─────────────────────────────────────────────────────────────────────────

/**
 * Genera un identificador único para un mensaje. Usa `crypto.randomUUID()` si
 * está disponible en el entorno; en caso contrario cae a un fallback basado en
 * marca de tiempo y aleatoriedad, suficiente para identificar mensajes en UI.
 */
const generarId = (): string => {
  const c: Crypto | undefined =
    typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  return `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

/**
 * Normaliza el texto de una pregunta para el match de intención: pasa a
 * minúsculas, elimina los acentos (descomposición NFD + borrado de marcas
 * diacríticas) y aplica `trim`.
 */
const normalizar = (texto: string): string =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

/** Formatea la fecha `d` como "YYYY-MM-DD" en hora local (no UTC). */
const aYmd = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Extrae todas las fechas "YYYY-MM-DD" presentes en el texto, en orden. */
const extraerFechas = (texto: string): string[] =>
  texto.match(/\d{4}-\d{2}-\d{2}/g) ?? [];

/** Devuelve el "YYYY-MM-DD" de hoy y de hace `dias` días, en hora local. */
const hoyMenos = (dias: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return aYmd(d);
};

/**
 * Devuelve el "YYYY-MM-DD" del primer día del mes actual, con componentes de
 * fecha locales (no UTC), consistente con `aYmd`.
 */
const primerDiaDelMes = (): string => {
  const d = new Date();
  d.setDate(1);
  return aYmd(d);
};

/**
 * Renderiza un `Fact` como línea legible: "- label: value unit (period)",
 * incluyendo `unit` y `period` solo si están presentes.
 */
const formatearFact = (f: Fact): string => {
  const unidad = f.unit ? ` ${f.unit}` : "";
  const periodo = f.period ? ` (${f.period})` : "";
  return `- ${f.label}: ${f.value}${unidad}${periodo}`;
};

/**
 * Renderiza una `Inference` como observación (nunca como causa):
 * "- statement [tipo: kind, confianza: confidence]".
 */
const formatearInferencia = (inf: Inference): string =>
  `- ${inf.statement} [tipo: ${inf.kind}, confianza: ${inf.confidence}]`;

// ─────────────────────────────────────────────────────────────────────────
// Motor
// ─────────────────────────────────────────────────────────────────────────

/**
 * Motor rule-based local del asistente para el MVP.
 *
 * Implementa `AssistantEngine`. Consulta las tools disponibles según el
 * contexto de acceso, matchea la intención por reglas de palabras clave en
 * orden determinista, extrae parámetros básicos del texto (fechas), ejecuta la
 * tool a través del registry (fail-closed) y redacta la respuesta separando
 * HECHOS de INFERENCIAS sin lenguaje causal.
 */
export class LocalRuleEngine implements AssistantEngine {
  /** Identificador del motor, para diagnóstico. */
  readonly kind = "local-rule";

  /**
   * @param registry Registry de tools a usar. Por defecto el singleton
   *   `toolRegistry` inicializado por el bootstrap (requisito 18.2); se permite
   *   inyectar otro para tests.
   */
  constructor(private readonly registry: ToolRegistry = toolRegistry) {}

  /**
   * Procesa una pregunta y devuelve un `AssistantMessage` con `role="assistant"`.
   *
   * Flujo:
   *  1. Obtiene las tools disponibles con `getAvailableTools(ctx)`.
   *  2. Si no hay ninguna, responde con un mensaje de permisos, sin evidencia
   *     (requisitos 12.1, 12.2, 18.3).
   *  3. Normaliza el texto y matchea la intención a un `toolId`.
   *  4. Si no hay match, o el toolId no está entre las disponibles, responde con
   *     un mensaje de ayuda listando hasta 20 tools, sin evidencia (13.1, 13.2).
   *  5. Rechaza tools cuyo `level` no sea `query`/`analyze` (17.4, 17.5).
   *  6. Extrae parámetros, resuelve la tool (fail-closed), la ejecuta y adjunta
   *     el `ToolResult` como `evidence` (13.3, 13.4).
   *  7. Redacta el texto separando HECHOS de INFERENCIAS sin causalidad (3.7).
   *
   * Nunca lanza por intención no reconocida: en ese caso responde con ayuda.
   *
   * @param question Pregunta del usuario.
   * @param ctx      Contexto del motor con el `AssistantAccessContext`.
   */
  async ask(question: string, ctx: EngineContext): Promise<AssistantMessage> {
    // 1. Tools disponibles según módulos habilitados ∩ capacidades.
    const disponibles = this.registry.getAvailableTools(ctx);

    // 2. Sin tools: mensaje de permisos, sin evidencia.
    if (disponibles.length === 0) {
      return this.mensajeAsistente(
        "No tengo herramientas disponibles con tus permisos actuales. " +
          "Es posible que no tengas acceso a los módulos necesarios o que el " +
          "asistente aún no haya terminado de inicializarse.",
      );
    }

    // 3. Normaliza y matchea la intención a un toolId.
    const q = normalizar(question);
    const toolId = this.matchIntencion(q);

    // 4. Sin match, o el toolId no está entre las disponibles: ayuda.
    const disponiblesPorId = new Map(disponibles.map((t) => [t.id, t]));
    if (toolId === null || !disponiblesPorId.has(toolId)) {
      return this.mensajeAsistente(this.textoAyuda(disponibles));
    }

    const tool = disponiblesPorId.get(toolId)!;

    // 5. MVP solo soporta niveles query/analyze (requisitos 17.4, 17.5).
    if (!NIVELES_MVP.has(tool.level)) {
      return this.mensajeAsistente(
        `La acción "${tool.name}" no está soportada en esta versión del ` +
          "asistente. Solo puedo responder consultas y análisis de solo lectura.",
      );
    }

    // 6. Extrae parámetros básicos, resuelve (fail-closed) y ejecuta.
    const input = this.extraerParametros(toolId, q);
    const resuelta = this.registry.resolve(toolId, ctx);
    if (resuelta === null) {
      // Fail-closed: la tool dejó de estar disponible entre el filtro y el
      // resolve. Se degrada a ayuda en lugar de lanzar.
      return this.mensajeAsistente(this.textoAyuda(disponibles));
    }

    const result = await resuelta.run(input);

    // 7. Redacta la respuesta y adjunta la evidencia.
    return this.mensajeAsistente(this.redactarRespuesta(result), result);
  }

  /**
   * Recorre `REGLAS_INTENCION` en orden y devuelve el `toolId` de la primera
   * regla cuya alguna keyword aparezca en el texto normalizado; `null` si
   * ninguna regla coincide. El orden de la tabla define la prioridad
   * determinista (requisito 13.4).
   */
  private matchIntencion(q: string): string | null {
    for (const regla of REGLAS_INTENCION) {
      if (regla.keywords.some((kw) => q.includes(kw))) {
        return regla.toolId;
      }
    }
    return null;
  }

  /**
   * Extrae parámetros básicos del texto normalizado para las tools que los
   * aceptan. Detecta fechas "YYYY-MM-DD" por regex y, en su ausencia, aplica
   * defaults razonables: para ventas usa los últimos 7 días; para comparar usa
   * hoy vs ayer; para hora pico deja que la tool use su default (hoy). Otras
   * tools no requieren parámetros.
   */
  private extraerParametros(
    toolId: string,
    q: string,
  ): Record<string, unknown> {
    const fechas = extraerFechas(q);

    switch (toolId) {
      case "pedidos.getVentasPeriodo": {
        // Dos fechas explícitas → rango tal cual.
        if (fechas.length >= 2) {
          return { desde: fechas[0], hasta: fechas[1] };
        }
        // Sin fechas explícitas: se infiere el rango por pistas de texto.
        // "mes" (p. ej. "ventas del mes", "este mes") → mes actual a la fecha:
        // desde el día 1 del mes actual hasta hoy (componentes locales).
        if (q.includes("mes")) {
          return { desde: primerDiaDelMes(), hasta: hoyMenos(0) };
        }
        // "semana" → últimos 7 días (fallback existente).
        // Sin pistas → también los últimos 7 días hasta hoy.
        return { desde: hoyMenos(7), hasta: hoyMenos(0) };
      }
      case "pedidos.compararDias": {
        // Dos fechas → días explícitos; si no, hoy vs ayer.
        if (fechas.length >= 2) {
          return { diaA: fechas[0], diaB: fechas[1] };
        }
        return { diaA: hoyMenos(1), diaB: hoyMenos(0) };
      }
      case "pedidos.getHoraPico": {
        // Una fecha explícita opcional; si no, la tool usa hoy por defecto.
        if (fechas.length >= 1) {
          return { ymd: fechas[0] };
        }
        return {};
      }
      default:
        return {};
    }
  }

  /**
   * Redacta el texto de respuesta a partir de un `ToolResult`, presentando los
   * HECHOS y las INFERENCIAS en secciones separadas e identificadas. Las
   * inferencias se presentan como "Observaciones", nunca como causas. El texto
   * resultante jamás contiene términos causales (requisito 3.7); se verifica de
   * forma defensiva y, ante una violación, se sanea el término.
   */
  private redactarRespuesta(result: ToolResult): string {
    const partes: string[] = [];

    // Sección de HECHOS (siempre presente, aunque puede estar vacía).
    partes.push("Hechos:");
    if (result.facts.length > 0) {
      partes.push(...result.facts.map(formatearFact));
    } else {
      partes.push("- Sin datos disponibles.");
    }

    // Sección de INFERENCIAS (solo si hay), presentadas como observaciones.
    const inferencias = result.inferences ?? [];
    if (inferencias.length > 0) {
      partes.push("");
      partes.push("Observaciones (inferencias):");
      partes.push(...inferencias.map(formatearInferencia));
    }

    return this.sanearCausalidad(partes.join("\n"));
  }

  /**
   * Red de seguridad para la ausencia de causalidad (requisito 3.7): si por
   * cualquier motivo el texto contuviera un término causal, lo neutraliza. En la
   * práctica los `statement` de las tools ya usan lenguaje de coincidencia, por
   * lo que esta función no debería alterar nada; existe como salvaguarda.
   */
  private sanearCausalidad(texto: string): string {
    let salida = texto;
    for (const termino of TERMINOS_CAUSALES) {
      const re = new RegExp(termino, "gi");
      salida = salida.replace(re, "coincide con");
    }
    return salida;
  }

  /**
   * Construye el texto de ayuda por intención no reconocida: enumera hasta
   * `MAX_TOOLS_AYUDA` (20) tools disponibles por su `name` y `description`
   * (requisito 13.1).
   */
  private textoAyuda(disponibles: AssistantTool[]): string {
    const lista = disponibles
      .slice(0, MAX_TOOLS_AYUDA)
      .map((t) => `- ${t.name}: ${t.description}`)
      .join("\n");
    return (
      "No entendí bien tu pregunta. Puedo ayudarte con estas consultas:\n" +
      lista +
      "\n\nReformula tu pregunta usando alguna de estas opciones."
    );
  }

  /**
   * Crea un `AssistantMessage` con `role="assistant"`, un `id` único y
   * `createdAt` ISO. Adjunta `evidence` solo si se provee un `ToolResult`.
   */
  private mensajeAsistente(
    text: string,
    evidence?: ToolResult,
  ): AssistantMessage {
    const message: AssistantMessage = {
      id: generarId(),
      role: "assistant",
      text,
      createdAt: new Date().toISOString(),
    };
    if (evidence) {
      message.evidence = evidence;
    }
    return message;
  }
}

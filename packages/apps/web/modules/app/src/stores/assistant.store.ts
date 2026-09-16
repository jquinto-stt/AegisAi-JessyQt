import { makeAutoObservable, runInAction } from "mobx";
import type {
  AssistantEngine,
  AssistantMessage,
  EngineContext,
} from "@/assistant";
import { LocalRuleEngine } from "@/assistant/engine/local-rule-engine";
import { buildAccessContext } from "@/assistant/bootstrap";

// ═══════════════════════════════════════════════════════════════════════════
// stores/assistant.store.ts — Estado del asistente ("Necto Intelligence")
// ═══════════════════════════════════════════════════════════════════════════
//
// `AssistantStore` es la fuente de verdad del asistente para la UI (MobX).
// Mantiene un HISTORIAL de conversaciones (multi-chat), el estado de "pensando"
// y el último error, y orquesta el envío de preguntas al motor.
//
// ── Compatibilidad ─────────────────────────────────────────────────────────
// La API pública original (`mensajes`, `pensando`, `error`, `puedeEnviar`,
// `enviar`, `limpiar`) se conserva EXACTAMENTE con su comportamiento observable.
// `mensajes` pasa de ser un campo a ser un getter que devuelve los mensajes de
// la conversación ACTIVA; para la UI y los tests (que solo leen `mensajes`) es
// indistinguible del array observable anterior.
//
// ── Invariante de arquitectura A3 ──────────────────────────────────────────
// Este store depende SOLO de la interfaz `AssistantEngine`, inyectada por
// constructor. Nunca conoce una implementación concreta salvo por el default
// (`LocalRuleEngine`), lo que permite sustituir el motor (p. ej. por
// `RemoteLLMEngine` o un doble de test) sin tocar la firma pública del store ni
// la UI (invariante A5). El contexto de autorización viaja al motor dentro del
// `EngineContext`, construido con `buildAccessContext()`.
//
// ═══════════════════════════════════════════════════════════════════════════

/** Límite superior de caracteres aceptados para una pregunta (requisito 1.1). */
const MAX_LONGITUD = 4000;

/** Título por defecto de una conversación recién creada, sin mensajes. */
const TITULO_DEFAULT = "Nueva conversación";

/** Longitud máxima del título derivado del primer mensaje del usuario. */
const MAX_TITULO = 40;

/** Clave de persistencia en localStorage (mock, como `necto.session`). */
const ASSISTANT_KEY = "necto.assistant";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Una conversación del asistente: un hilo de mensajes con metadatos para el
 * historial (título, fechas de creación y última actividad).
 */
export interface Conversacion {
  id: string;
  titulo: string;
  mensajes: AssistantMessage[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Grupo de conversaciones para el historial, etiquetado por antigüedad
 * ("Hoy" / "Ayer" / "Últimos 7 días" / "Anteriores").
 */
export interface GrupoConversaciones {
  label: string;
  items: Conversacion[];
}

/** Forma persistida en localStorage. */
interface AssistantSnapshot {
  conversaciones: Conversacion[];
  conversacionActivaId: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genera un identificador para un mensaje o conversación.
 *
 * Usa `crypto.randomUUID()` cuando está disponible y cae a un fallback simple
 * (timestamp + aleatorio) en entornos que no lo exponen.
 */
function nuevoId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // Sin crypto disponible: usamos el fallback.
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Crea una conversación vacía con el título por defecto. */
function crearConversacionVacia(): Conversacion {
  const ahora = new Date().toISOString();
  return {
    id: nuevoId(),
    titulo: TITULO_DEFAULT,
    mensajes: [],
    createdAt: ahora,
    updatedAt: ahora,
  };
}

/**
 * Deriva un título a partir del texto del primer mensaje del usuario: colapsa
 * espacios y saltos de línea, y recorta a ~40 caracteres con elipsis.
 */
function derivarTitulo(texto: string): string {
  const colapsado = texto.replace(/\s+/g, " ").trim();
  if (colapsado.length <= MAX_TITULO) return colapsado;
  return `${colapsado.slice(0, MAX_TITULO).trimEnd()}…`;
}

/** Inicio del día local (medianoche) para una fecha dada. */
function inicioDelDia(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Rehidrata el snapshot persistido de forma defensiva. Devuelve `null` si no
 * hay `window`/`localStorage`, si el JSON es inválido o si los datos no cumplen
 * la forma mínima esperada.
 */
function loadSnapshot(): AssistantSnapshot | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(ASSISTANT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AssistantSnapshot>;
    if (!parsed || !Array.isArray(parsed.conversaciones)) return null;

    // Validación defensiva de cada conversación; descartamos las malformadas.
    const conversaciones = parsed.conversaciones
      .filter(
        (c): c is Conversacion =>
          !!c &&
          typeof c.id === "string" &&
          typeof c.titulo === "string" &&
          Array.isArray(c.mensajes) &&
          typeof c.createdAt === "string" &&
          typeof c.updatedAt === "string",
      )
      .map((c) => ({
        id: c.id,
        titulo: c.titulo,
        mensajes: c.mensajes,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }));

    if (conversaciones.length === 0) return null;

    const idsValidos = new Set(conversaciones.map((c) => c.id));
    const activa =
      typeof parsed.conversacionActivaId === "string" &&
      idsValidos.has(parsed.conversacionActivaId)
        ? parsed.conversacionActivaId
        : conversaciones[0].id;

    return { conversaciones, conversacionActivaId: activa };
  } catch {
    // Sin localStorage, JSON inválido o datos corruptos: arranque limpio.
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ASSISTANT STORE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * AssistantStore — orquestador del chat del asistente con historial multi-chat.
 *
 * Mantiene una lista de conversaciones y cuál está activa, y delega el
 * razonamiento en la interfaz `AssistantEngine` inyectada.
 */
export class AssistantStore {
  /** Historial de conversaciones (la más nueva puede estar en cualquier posición). */
  conversaciones: Conversacion[] = [];

  /** Id de la conversación activa, o `null` si (transitoriamente) no hay ninguna. */
  conversacionActivaId: string | null = null;

  /** true mientras se está procesando una pregunta (guard de concurrencia). */
  pensando: boolean = false;

  /** Último error de procesamiento, o `null` si no hubo. */
  error: string | null = null;

  /**
   * @param engine implementación del motor a usar. Por defecto `LocalRuleEngine`
   *   (motor rule-based local del MVP). Inyectable para pruebas o para sustituir
   *   por un motor remoto sin cambiar la API pública (invariante A3/A5).
   */
  constructor(private engine: AssistantEngine = new LocalRuleEngine()) {
    // Arranque limpio: SIEMPRE una conversación vacía activa. Esto garantiza
    // que un store recién creado tenga `mensajes === []` (esperado por tests).
    const inicial = crearConversacionVacia();
    this.conversaciones = [inicial];
    this.conversacionActivaId = inicial.id;

    makeAutoObservable(this);

    // Rehidratación defensiva: solo en navegador con localStorage. En entorno
    // de test (node, sin localStorage) es no-op → se mantiene el arranque limpio.
    const snapshot = loadSnapshot();
    if (snapshot) {
      this.conversaciones = snapshot.conversaciones;
      this.conversacionActivaId = snapshot.conversacionActivaId;
    }
  }

  // ── Getters ───────────────────────────────────────────────────────────────

  /** La conversación activa según `conversacionActivaId`, o `null`. */
  get conversacionActiva(): Conversacion | null {
    return (
      this.conversaciones.find((c) => c.id === this.conversacionActivaId) ?? null
    );
  }

  /**
   * Hilo de mensajes de la conversación ACTIVA, en orden cronológico.
   *
   * Compatibilidad: antes era un campo; ahora es un getter. La UI y los tests
   * solo leen `store.mensajes`, así que devolver el array observable interno es
   * indistinguible del comportamiento anterior.
   */
  get mensajes(): AssistantMessage[] {
    return this.conversacionActiva?.mensajes ?? [];
  }

  /**
   * ¿Puede enviarse una nueva pregunta ahora mismo?
   *
   * Es `false` mientras hay un envío en curso, para evitar solapamientos
   * (requisito 1.9).
   */
  get puedeEnviar(): boolean {
    return !this.pensando;
  }

  /**
   * Conversaciones agrupadas por antigüedad para el historial:
   * "Hoy" / "Ayer" / "Últimos 7 días" / "Anteriores".
   *
   * Cada grupo se ordena por `updatedAt` descendente y los grupos vacíos se
   * omiten.
   */
  get conversacionesAgrupadas(): GrupoConversaciones[] {
    const hoy = inicioDelDia(new Date());
    const ayer = hoy - 24 * 60 * 60 * 1000;
    const hace7 = hoy - 7 * 24 * 60 * 60 * 1000;

    const buckets: Record<string, Conversacion[]> = {
      Hoy: [],
      Ayer: [],
      "Últimos 7 días": [],
      Anteriores: [],
    };

    for (const c of this.conversaciones) {
      const t = new Date(c.updatedAt).getTime();
      if (t >= hoy) buckets["Hoy"].push(c);
      else if (t >= ayer) buckets["Ayer"].push(c);
      else if (t >= hace7) buckets["Últimos 7 días"].push(c);
      else buckets["Anteriores"].push(c);
    }

    const orden = ["Hoy", "Ayer", "Últimos 7 días", "Anteriores"];
    return orden
      .map((label) => ({
        label,
        items: buckets[label].sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }

  // ── Persistencia ────────────────────────────────────────────────────────

  /** Guarda el estado actual en localStorage (mock, defensivo). */
  private persist(): void {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      const snapshot: AssistantSnapshot = {
        conversaciones: this.conversaciones,
        conversacionActivaId: this.conversacionActivaId,
      };
      window.localStorage.setItem(ASSISTANT_KEY, JSON.stringify(snapshot));
    } catch {
      // Sin localStorage o cuota excedida: no-op.
    }
  }

  // ── Multi-conversación ────────────────────────────────────────────────────

  /** Crea una conversación vacía, la agrega y la marca activa; limpia error. */
  nuevaConversacion(): void {
    const conv = crearConversacionVacia();
    this.conversaciones.push(conv);
    this.conversacionActivaId = conv.id;
    this.error = null;
    this.persist();
  }

  /** Cambia la conversación activa si el id existe; limpia error. */
  seleccionarConversacion(id: string): void {
    const existe = this.conversaciones.some((c) => c.id === id);
    if (!existe) return;
    this.conversacionActivaId = id;
    this.error = null;
    this.persist();
  }

  /**
   * Elimina una conversación. Si era la activa, activa la más reciente
   * restante (por `updatedAt`); si no queda ninguna, crea una nueva vacía.
   */
  eliminarConversacion(id: string): void {
    const eraActiva = this.conversacionActivaId === id;
    this.conversaciones = this.conversaciones.filter((c) => c.id !== id);

    if (eraActiva) {
      if (this.conversaciones.length === 0) {
        const conv = crearConversacionVacia();
        this.conversaciones.push(conv);
        this.conversacionActivaId = conv.id;
      } else {
        const masReciente = [...this.conversaciones].sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )[0];
        this.conversacionActivaId = masReciente.id;
      }
    }
    this.persist();
  }

  // ── Envío ─────────────────────────────────────────────────────────────────

  /**
   * Envía una pregunta al motor y agrega la respuesta a la conversación activa.
   *
   * Comportamiento (requisitos 1.1–1.5, 1.8, 1.9, 12.3, 14.x):
   *   - Si ya hay un envío en curso (`pensando`), se ignora (guard de
   *     concurrencia, requisito 1.9).
   *   - Se normaliza el texto con `trim`; si queda vacío o excede el límite de
   *     4000 caracteres, no se muta el estado ni se llama al motor
   *     (requisitos 1.1, 1.2).
   *   - Se limpia el error previo (requisito 14.3), se agrega el mensaje del
   *     usuario a la conversación activa y se marca `pensando`.
   *   - Al agregar el PRIMER mensaje user de una conversación con título default,
   *     se deriva el título a partir del texto.
   *   - Ante éxito, se agrega la respuesta del motor al hilo.
   *   - Ante fallo del motor/tool, se setea un `error` legible, se conserva el
   *     historial (el mensaje del usuario permanece) y NO se agrega ninguna
   *     respuesta con evidencia parcial (requisitos 14.1, 14.2, 14.4).
   */
  async enviar(texto: string): Promise<void> {
    // Guard de concurrencia: un envío a la vez (requisito 1.9).
    if (this.pensando) return;

    // Normalización y validación de longitud (requisitos 1.1, 1.2).
    const limpio = texto.trim();
    if (limpio.length === 0 || limpio.length > MAX_LONGITUD) return;

    const conv = this.conversacionActiva;
    if (!conv) return;

    // Limpia error previo antes de iniciar (requisito 14.3).
    this.error = null;

    // Deriva el título del primer mensaje user si aún tiene el default.
    if (conv.mensajes.length === 0 && conv.titulo === TITULO_DEFAULT) {
      conv.titulo = derivarTitulo(limpio);
    }

    // Agrega el mensaje del usuario al hilo de la conversación activa.
    conv.mensajes.push({
      id: nuevoId(),
      role: "user",
      text: limpio,
      createdAt: new Date().toISOString(),
    });
    conv.updatedAt = new Date().toISOString();

    this.pensando = true;
    this.persist();

    try {
      const ctx: EngineContext = {
        access: buildAccessContext(),
        history: conv.mensajes,
      };
      const respuesta = await this.engine.ask(limpio, ctx);
      runInAction(() => {
        conv.mensajes.push(respuesta);
        conv.updatedAt = new Date().toISOString();
      });
    } catch {
      // Fallo del motor/tool: error legible, sin agregar respuesta parcial ni
      // evidencia (requisitos 14.1, 14.2, 14.4). El historial se conserva.
      runInAction(() => {
        this.error = "No pude procesar la pregunta.";
      });
    } finally {
      runInAction(() => {
        this.pensando = false;
        this.persist();
      });
    }
  }

  /**
   * Vacía el hilo de la conversación ACTIVA y limpia el error (requisito 1.7).
   *
   * Mantiene la semántica observable original: tras `limpiar()`,
   * `store.mensajes` queda en `[]`.
   */
  limpiar(): void {
    const conv = this.conversacionActiva;
    if (conv) {
      conv.mensajes = [];
      conv.updatedAt = new Date().toISOString();
    }
    this.error = null;
    this.persist();
  }
}

export const assistantStore = new AssistantStore();

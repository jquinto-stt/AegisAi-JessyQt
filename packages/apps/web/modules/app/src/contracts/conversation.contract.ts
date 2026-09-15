/**
 * Necto — Contrato del **canal conversacional**
 * ============================================
 *
 * Una conversación es un **hecho del canal**, no de un módulo (§14). Por eso vive
 * en `contracts/` y no dentro de `compositions/conversations/`: el canal la posee,
 * y cualquier módulo futuro (Pedidos, Inventario, un asistente) podrá *leerla* por
 * aquí — suscribiéndose al bus o recibiendo el tipo — sin que el canal sepa que
 * existen.
 *
 * ── Qué NO es esto, a propósito ──────────────────────────────────────────────
 *
 *   · No es un CRM                        → no hay pipeline, leads ni scoring (§10)
 *   · No es Pedidos                       → no hay carrito, productos ni checkout (§9)
 *   · No es la integración con Meta       → no hay webhooks ni credenciales (§8)
 *
 * Lo que **sí** es: la forma mínima de un hilo de WhatsApp para poder pintarlo.
 *
 * ── Adaptación desde `wacrm-main` (referencia visual) ───────────────────────
 *
 * La experiencia se estudió en `wacrm-main` (`src/components/inbox/`) y se
 * reimplementó aquí. Del original se conserva **el patrón conversacional**, que es
 * lo único que se traslada:
 *
 *   · hilo = contacto + último mensaje + hora + no leídos + estado
 *   · burbuja = entrante a la izquierda / saliente a la derecha, con cola en la
 *     esquina del emisor (`rounded-bl-md` / `rounded-br-md`)
 *   · estado del mensaje en el pie de la burbuja (reloj → check → doble check)
 *   · separadores de día y agrupación por fecha
 *   · compositor con adjunto, textarea autorredimensionable y botón de envío
 *
 * Lo que **no** se traslada: su modelo de contactos con etiquetas y empresa, sus
 * pipelines, sus campañas, sus agentes asignados, su IA de respuestas, su
 * `supabase` como backend, ni su estructura de componentes (que está acoplada a
 * esa base de datos). Aquí la conversación no tiene dueño comercial: tiene **una
 * sede** (§6), y nada más.
 */

/**
 * De qué lado del hilo viene un mensaje.
 *
 * Son los dos únicos valores posibles: un mensaje o **entra** (lo escribió el
 * cliente) o **sale** (lo escribió la tienda). No hay "bot" ni "sistema" como
 * tipos separados —eso es información de quién dentro de la tienda lo escribió, y
 * para esta fase no cambia cómo se pinta—.
 */
export type MessageDirection = "incoming" | "outgoing";

/**
 * Estado de entrega de un mensaje **saliente**.
 *
 * ⚠️ Un mensaje entrante no tiene estado: el cliente ya lo escribió, no hay nada
 * que confirmar. Por eso el tipo vive en la burbuja saliente y el contrato lo
 * declara opcional en lugar de inventar un `"none"` que habría que ignorar en
 * cada sitio.
 *
 * La escala es la de WhatsApp y se conserva tal cual porque es lo que el operador
 * ya sabe leer: `sending` (reloj) → `sent` (un check) → `delivered` (dos checks) →
 * `read` (dos checks, marcados). `failed` es el único estado que además necesita
 * texto: un mensaje que no salió tiene que poder decir por qué.
 */
export type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed";

/** Quién lo escribió, en términos que la interfaz puede nombrar. */
export type MessageAuthor = "customer" | "store";

/**
 * Un mensaje dentro de un hilo.
 *
 * ── Por qué el contenido es una unión discriminada ───────────────────────────
 *
 * `wacrm-main` guardaba `content_type` + `content_text` + `media_url` como tres
 * campos sueltos, y cada consumidor tenía que recordar qué combinación era válida
 * en cada caso (¿un `text` con `media_url`? ¿un `document` sin él?). Aquí el tipo
 * lo hace imposible: un mensaje de texto **no tiene** `media`, y uno de imagen
 * **exige** un adjunto. El compilador es el que impide el estado inválido.
 *
 * Se conservan los cuatro tipos que un canal conversacional necesita para
 * representarse a sí mismo. **No** hay plantillas, botones interactivos,
 * ubicaciones ni reacciones: eso pertenece a la mensajería de Meta y a la
 * operación comercial de wacrm, no a la experiencia de chat (§8).
 *
 * `body` es opcional en los adjuntos a propósito: en WhatsApp una foto puede
 * llevar pie de foto y puede no llevarlo.
 */
export type ConversationMessageContent =
  | { kind: "text"; body: string }
  | { kind: "image"; fileName: string; caption?: string }
  | { kind: "document"; fileName: string; sizeLabel: string; caption?: string }
  | { kind: "audio"; durationLabel: string };

/**
 * ── Nota de alcance sobre los adjuntos ───────────────────────────────────────
 *
 * El contenido multimedia se describe por **nombre y tamaño**, nunca por una URL
 * ni por un `File`. Es deliberado: en esta fase no hay subida real (no hay backend
 * al que subir), así que un mensaje con `url` prometería un archivo que no existe.
 * Lo que se pinta es la **forma** del adjunto —que es lo que hace falta para
 * demostrar la experiencia—, y el día que exista el canal real sólo hay que añadir
 * la referencia del archivo a esta unión.
 */

/** Un mensaje. */
export interface ConversationMessage {
  id: string;
  /** Hilo al que pertenece. */
  conversationId: string;
  direction: MessageDirection;
  /** Quién lo escribió: el cliente o la tienda. Se deriva de `direction`, pero se guarda para que el consumidor no tenga que deducirlo. */
  author: MessageAuthor;
  content: ConversationMessageContent;
  /** ISO 8601. La hora del **mensaje**, no la del render. */
  sentAt: string;
  /** ⚠️ Sólo los salientes lo llevan: un entrante no tiene entrega que confirmar. */
  status?: MessageStatus;
}

/**
 * Interlocutor del hilo.
 *
 * ⚠️ **Esto no es un contacto de CRM.** No lleva etiquetas, empresa, propietario,
 * valor estimado ni histórico comercial: sólo lo mínimo para que el operador sepa
 * **con quién** está hablando y **por dónde** (§10). El nombre es el de la tienda
 * para esa persona —el que ya usa el canal—, no un campo editable de un CRM.
 */
export interface ConversationCounterpart {
  /** Nombre tal y como se muestra en el hilo. */
  name: string;
  /** Teléfono en formato legible (`+57 300 123 4567`). Es la identidad del canal. */
  phone: string;
  /**
   * Iniciales para el avatar. Se **guardan** en lugar de derivarse del nombre en
   * cada pintado porque el nombre puede ser un teléfono sin letras, y entonces no
   * hay iniciales que sacar; aquí ya viene resuelto.
   */
  initials: string;
}

/** Estado operativo de atención en la bandeja. */
export type AttentionStatus = "pending" | "in_progress" | "resolved";

/** Operador o persona encargada de atender la conversación en la sede. */
export interface AssignedOperator {
  id: string;
  name: string;
  avatar?: string;
}

/**
 * Un hilo de WhatsApp de **una** sede.
 *
 * ⚠️ `businessId` es lo que hace que dos sedes no compartan conversaciones (§6).
 * El filtro por sede vive en el hook que carga el hilo (§ `useConversations`), no
 * en quien consume: si cada pantalla filtrara, una que lo olvidara mostraría el
 * inbox de otra tienda.
 */
export interface Conversation {
  id: string;
  /** Sede propietaria del hilo. Es la frontera de aislamiento. */
  businessId: string;
  /** Canal del que viene. Hoy sólo `whatsapp`; el tipo es abierto a propósito. */
  channelType: "whatsapp";
  /** Con quién se habla. */
  counterpart: ConversationCounterpart;
  /** Vista previa del último mensaje, para la lista. Es un resumen, no el mensaje. */
  lastMessagePreview: string;
  /** ISO 8601 del último movimiento. **Es el criterio de orden de la lista.** */
  lastMessageAt: string;
  /** Mensajes entrantes sin leer. Cero es el caso normal, no una excepción. */
  unreadCount: number;
  /** Estado de atención operativa. */
  attentionStatus?: AttentionStatus;
  /** Persona responsable asignada para la atención. */
  assignedTo?: AssignedOperator | null;
  /** Notas operativas o contexto de atención. */
  notes?: string;
}

/** Una conversación con sus mensajes, ya cargada. Es lo que pinta la ventana. */
export interface ConversationThread {
  conversation: Conversation;
  messages: ConversationMessage[];
}

/**
 * Hecho del canal que se publica en el bus (§23).
 *
 * ⚠️ Igual que en Pedidos, se emite **un solo evento** y el nombre del hecho viaja
 * en el payload: un evento por cada paso obligaría a tocar el mapa del bus cada
 * vez que el canal gane uno, y a cada consumidor futuro declarar N suscripciones.
 *
 * ⚠️ Hoy puede no tener suscriptores —ningún módulo está implementado—. Se declara
 * porque es la **puerta** por la que un módulo consumirá el canal (§14): un Pedidos
 * futuro escuchará `message.received` y decidirá por su cuenta si aquello es una
 * orden. El canal **no** sabe que Pedidos existe, y por eso no lo llama.
 */
export interface ConversationEventPayload {
  name: "message.received" | "message.sent" | "conversation.opened";
  conversationId: string;
  /** La sede dueña del hilo, para que un consumidor pueda filtrar por la suya. */
  businessId: string;
  channelType: "whatsapp";
  at: string;
}

/**
 * ¿El hilo tiene algo sin leer?
 *
 * Existe para que la lista y la barra lateral no decidan "no leído" cada una por
 * su cuenta con un `unreadCount > 0` suelto que podría divergir.
 */
export function isUnread(conversation: Pick<Conversation, "unreadCount">): boolean {
  return conversation.unreadCount > 0;
}

/**
 * ¿El mensaje es saliente? Se usa para alinear la burbuja.
 *
 * ⚠️ Se pregunta por `direction` y **no** por `author`: son dos campos que podrían
 * divergir si alguien los escribiera a mano por separado, pero sólo uno es la
 * fuente (`direction` manda). Aquí está dicha la fuente única.
 */
export function isOutgoing(message: Pick<ConversationMessage, "direction">): boolean {
  return message.direction === "outgoing";
}

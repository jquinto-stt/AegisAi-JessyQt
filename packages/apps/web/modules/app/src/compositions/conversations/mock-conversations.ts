/**
 * Conversaciones — Semilla de demostración (§8)
 * ============================================
 *
 * ⚠️ **Esto no es una integración con WhatsApp.** No hay Meta, no hay webhooks, no
 * hay credenciales, no hay backend. Lo que hay es un puñado de hilos locales para
 * poder **ver y juzgar la experiencia** del canal conversacional mientras el canal
 * real no existe.
 *
 * ── Por qué se siembra por sede y no una lista fija ─────────────────────────
 *
 * El aislamiento por tienda (§6) no se puede demostrar con datos compartidos: si
 * las dos sedes vieran las mismas conversaciones, el aislamiento sería una
 * afirmación del código en lugar de algo comprobable en pantalla. Por eso la
 * semilla es **determinista a partir del `businessId`**: la sede A y la sede B
 * reciben interlocutores distintos, y cambiar de sede cambia el inbox de verdad.
 *
 * Se genera por índice de caracteres (no con `Math.random`) para que la misma sede
 * vea siempre lo mismo: un inbox que cambia en cada recarga no se puede revisar.
 *
 * ⚠️ **Los mensajes se fechan relativos a ahora**, no con fechas fijas. Un mock
 * con fechas de 2024 haría que todos los hilos dijeran "hace 2 años" y que el
 * separador de día sólo apareciera una vez, que es justo lo que hay que ver.
 */

import type {
  Conversation,
  ConversationMessage,
  MessageStatus,
} from "@/contracts/conversation.contract";

/* ── Catálogos de la semilla ───────────────────────────────────────────────── */

/** Interlocutores posibles. La sede escoge un tramo **distinto** de esta lista. */
const CANDIDATES: ConversationCounterpartSeed[] = [
  { name: "Andrea Gómez", phone: "+57 300 214 7788" },
  { name: "Carlos Restrepo", phone: "+57 311 908 3321" },
  { name: "María Fernanda Ruiz", phone: "+57 320 445 9012" },
  { name: "Julián Ospina", phone: "+57 301 776 2043" },
  { name: "Luisa Toro", phone: "+57 315 330 8890" },
  { name: "Andrés Mejía", phone: "+57 304 118 5567" },
];

interface ConversationCounterpartSeed {
  name: string;
  phone: string;
}

/**
 * Guiones de conversación. Se reutilizan entre sedes (una tienda de moda y una de
 * comidas pueden recibir la misma clase de pregunta), pero **el interlocutor no**:
 * eso es lo que hace visible que cada sede tiene su propio inbox.
 *
 * Se conservan como guiones cortos y realistas —sin carrito, sin productos, sin
 * checkout (§9)— porque de lo que se trata es de evaluar el chat, no un flujo de
 * compra.
 */
const SCRIPTS: SeedScript[] = [
  {
    preview: "Perfecto, muchas gracias",
    unread: 2,
    lines: [
      { from: "incoming", text: "Hola, buenas tardes 👋", minutesAgo: 1560 },
      { from: "incoming", text: "Quisiera saber si tienen disponibilidad esta semana", minutesAgo: 1558 },
      { from: "outgoing", text: "¡Hola Andrea! Con gusto. ¿Para qué día la necesitas?", minutesAgo: 1550 },
      { from: "incoming", text: "El jueves en la tarde, si se puede", minutesAgo: 1544 },
      { from: "outgoing", text: "Sí, el jueves tenemos espacio. Te reservo el turno.", minutesAgo: 1538 },
      { from: "incoming", text: "Perfecto, muchas gracias", minutesAgo: 40 },
      { from: "incoming", text: "¿Me confirmas por aquí cuando quede listo?", minutesAgo: 38 },
    ],
  },
  {
    preview: "¿Y el precio incluye envío?",
    unread: 0,
    lines: [
      { from: "incoming", text: "Buenas, vi el catálogo que me enviaron", minutesAgo: 2900 },
      { from: "outgoing", text: "¡Hola Carlos! Sí, ese es el catálogo vigente de este mes.", minutesAgo: 2880 },
      { from: "incoming", text: "Me interesa el segundo que aparece", minutesAgo: 2870 },
      { from: "incoming", text: "¿Y el precio incluye envío?", minutesAgo: 2865 },
      { from: "outgoing", text: "El envío va aparte según la zona, te lo confirmo con la dirección.", minutesAgo: 2820 },
    ],
  },
  {
    preview: "Listo, quedo atenta entonces",
    unread: 1,
    lines: [
      { from: "incoming", text: "Hola, ¿atienden los domingos?", minutesAgo: 4300 },
      { from: "outgoing", text: "¡Hola María Fernanda! Sí, abrimos de 9 a 2 los domingos.", minutesAgo: 4280 },
      { from: "incoming", text: "Genial. Y necesito saber si puedo recoger hoy mismo", minutesAgo: 4270 },
      { from: "outgoing", text: "Déjame verificar con la sede y te digo en un momento.", minutesAgo: 4260 },
      { from: "incoming", text: "Listo, quedo atenta entonces", minutesAgo: 120 },
    ],
  },
  {
    preview: "Ok, gracias por la info",
    unread: 0,
    lines: [
      { from: "incoming", text: "Buen día, ¿me pueden ayudar con una factura?", minutesAgo: 6200 },
      { from: "outgoing", text: "Claro Julián, ¿me compartes el número de la orden?", minutesAgo: 6180 },
      { from: "incoming", text: "Sí, es la 1042", minutesAgo: 6170 },
      { from: "outgoing", text: "Ya la ubiqué. Te la envío al correo que tenemos registrado.", minutesAgo: 6100 },
      { from: "incoming", text: "Ok, gracias por la info", minutesAgo: 6050 },
    ],
  },
  {
    preview: "¿Me lo pueden enviar en PDF?",
    unread: 0,
    lines: [
      { from: "incoming", text: "Hola, necesito la lista de precios actualizada", minutesAgo: 8600 },
      { from: "outgoing", text: "¡Hola Luisa! Te la comparto ahora mismo.", minutesAgo: 8580 },
      { from: "outgoing", kind: "document", fileName: "Lista-precios.pdf", sizeLabel: "284 KB", minutesAgo: 8570 },
      { from: "incoming", text: "¿Me lo pueden enviar en PDF?", minutesAgo: 8500 },
      { from: "outgoing", text: "Eso mismo te acabo de enviar, revisa el archivo de arriba 🙂", minutesAgo: 8490 },
    ],
  },
  {
    preview: "Perfecto, ahí estaremos",
    unread: 0,
    lines: [
      { from: "incoming", text: "Buenas, ¿cómo llego a la sede del centro?", minutesAgo: 12000 },
      { from: "outgoing", text: "Queda sobre la carrera 7 con calle 12, segundo piso.", minutesAgo: 11980 },
      { from: "incoming", kind: "text", text: "¿Tienen parqueadero?", minutesAgo: 11900 },
      { from: "outgoing", text: "Sí, hay convenio con el parqueadero de la esquina.", minutesAgo: 11880 },
      { from: "incoming", text: "Perfecto, ahí estaremos", minutesAgo: 11800 },
    ],
  },
];

interface SeedScript {
  preview: string;
  unread: number;
  lines: {
    from: "incoming" | "outgoing";
    kind?: "text" | "document";
    text?: string;
    fileName?: string;
    sizeLabel?: string;
    minutesAgo: number;
  }[];
}

/* ── Derivación de la semilla ──────────────────────────────────────────────── */

/**
 * Semilla numérica estable a partir del id de la sede.
 *
 * Es lo que hace que la sede A y la B reciban interlocutores distintos **y que
 * cada una siga viendo los suyos** en la siguiente recarga. Un `Math.random` daría
 * un inbox nuevo cada vez y no se podría revisar nada dos veces.
 */
function hashSeed(businessId: string): number {
  let hash = 0;
  for (let i = 0; i < businessId.length; i++) {
    hash = (hash * 31 + businessId.charCodeAt(i)) % 100000;
  }
  return hash;
}

/** Iniciales para el avatar. Si el nombre no trae letras se cae al teléfono. */
function initialsOf(name: string, phone: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  const digits = phone.replace(/\D/g, "");
  return digits.slice(-2) || "?";
}

/**
 * Construye los hilos de demostración de una sede.
 *
 * ⚠️ Cada mensaje saliente recibe un estado según **cuánto hace que se envió**: lo
 * reciente aún está en camino y lo antiguo ya se leyó. No es decoración — es lo
 * que permite ver los cuatro estados de la burbuja en una sola pantalla sin
 * inventar un panel de prueba.
 */
export function buildDemoConversations(businessId: string): Conversation[] {
  const seed = hashSeed(businessId);
  const now = Date.now();

  return SCRIPTS.map((script, index) => {
    const candidateIndex = (seed + index) % CANDIDATES.length;
    const candidate = CANDIDATES[candidateIndex];
    const lastMinutesAgo = Math.min(...script.lines.map(l => l.minutesAgo));

    return {
      id: `conv_${businessId}_${index}`,
      businessId,
      channelType: "whatsapp" as const,
      counterpart: {
        name: candidate.name,
        phone: candidate.phone,
        initials: initialsOf(candidate.name, candidate.phone),
      },
      lastMessagePreview: script.preview,
      lastMessageAt: new Date(now - lastMinutesAgo * 60_000).toISOString(),
      unreadCount: script.unread,
    };
  }).sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1));
}

/** Los mensajes de un hilo de demostración, en orden cronológico. */
export function buildDemoMessages(businessId: string, conversationIndex: number): ConversationMessage[] {
  const script = SCRIPTS[conversationIndex];
  if (!script) return [];

  const now = Date.now();
  const conversationId = `conv_${businessId}_${conversationIndex}`;

  return script.lines
    .slice()
    .sort((a, b) => b.minutesAgo - a.minutesAgo)
    .map((line, i) => {
      const content =
        line.kind === "document"
          ? {
              kind: "document" as const,
              fileName: line.fileName ?? "archivo.pdf",
              sizeLabel: line.sizeLabel ?? "—",
            }
          : { kind: "text" as const, body: line.text ?? "" };

      return {
        id: `msg_${conversationId}_${i}`,
        conversationId,
        direction: line.from,
        author: line.from === "outgoing" ? ("store" as const) : ("customer" as const),
        content,
        sentAt: new Date(now - line.minutesAgo * 60_000).toISOString(),
        // ⚠️ Sólo los salientes llevan estado (§ contrato): un entrante ya está
        // entregado por definición y pintarle un check sería mentir.
        status: line.from === "outgoing" ? statusFor(line.minutesAgo) : undefined,
      };
    });
}

/** El estado de entrega que le corresponde a un saliente según su antigüedad. */
function statusFor(minutesAgo: number): MessageStatus {
  if (minutesAgo < 45) return "sent";
  if (minutesAgo < 120) return "delivered";
  return "read";
}

/**
 * ¿Hay que sembrar la demostración en esta sede?
 *
 * Es un predicado y no un `length === 0` suelto para que la regla viva en un solo
 * sitio: la demostración se siembra **sólo** si la sede no tiene nada, y una vez
 * que hay conversaciones (aunque el operador las vacíe a mano desde el store) no
 * se vuelve a inyectar encima.
 */
export function shouldSeedDemoConversations(existing: Conversation[]): boolean {
  return existing.length === 0;
}

/** Índice del guion al que pertenece un id de hilo de demostración. */
export function demoScriptIndex(conversationId: string): number {
  const parts = conversationId.split("_");
  const index = Number(parts[parts.length - 1]);
  return Number.isFinite(index) ? index : -1;
}

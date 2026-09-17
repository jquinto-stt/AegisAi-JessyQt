// ═══════════════════════════════════════════════════════════════════════════
// CONVERSACIONES — SEED INICIAL (datos de demo)
// ═══════════════════════════════════════════════════════════════════════════
//
// Datos de arranque del módulo Conversaciones (Requirement 9.4): cuando el
// `conversacionesStore` se inicializa SIN estado persistido válido en
// `localStorage`, carga este seed para que la demo arranque con contenido.
//
// Alcance del MVP (ver requirements/design):
//   - Solo canal `whatsapp`.
//   - Solo contenido de tipo `texto`.
//   - Contactos ligeros con `{ telefono, nombre, origen: "whatsapp" }`.
//
// INVARIANTES estado/atención respetados por cada conversación (design §
// Property 2 y máquina de estados del handoff):
//   - estado = "atendida"  ⟹  atencion = "humano"  ∧  operadorAsignadoId ≠ null
//   - atencion = "bot"      ⟹  operadorAsignadoId = null
//   - `ultimaActividad` coincide con el `timestamp` del último ítem del hilo
//     (último mensaje o evento), en formato ISO 8601.
//
// FORMA que consume el store (tarea 3.2): un único objeto `CONVERSACIONES_SEED`
// con tres colecciones ya indexables por conversación:
//   - `conversaciones`: Conversacion[]  (cabeceras, baratas de observar)
//   - `mensajes`:       Mensaje[]        (todos los mensajes de todas las convs)
//   - `eventos`:        EventoSistema[]  (eventos de sistema del hilo)
// El store las agrupará por `conversacionId` en sus índices internos
// (`mensajesPorConv`, `eventosPorConv`). También se exportan por separado
// (`CONVERSACIONES`, `MENSAJES`, `EVENTOS`) por conveniencia.
//
// NOTA: este archivo NO importa `chats.mock.ts` (que queda deprecado). Los
// contactos/mensajes se inspiraron en él para que resulten realistas, pero no
// hay dependencia.

import type {
  Conversacion,
  Mensaje,
  EventoSistema,
} from "@/stores/conversaciones.types";

// ── Operadores reales del seed de operadores (operadores.store.ts) ────────────
// La conversación "atendida" se asigna a un operador de pedidos existente para
// que el panel/consola muestre un responsable real. `d1` = "Camila Ortiz"
// (supervisor_pedidos, activo) en el SEED de operadores.
const OPERADOR_ATENDIDA_ID = "d1";

// ── Estructura agregada que consume el store ──────────────────────────────────

/** Forma del seed que hidrata el `conversacionesStore` cuando no hay estado. */
export interface ConversacionesSeed {
  conversaciones: Conversacion[];
  mensajes: Mensaje[];
  eventos: EventoSistema[];
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVERSACIONES (cabeceras)
// ═══════════════════════════════════════════════════════════════════════════

const CONVERSACIONES: Conversacion[] = [
  // ── 1. ABIERTA + BOT — el bot está atendiendo, sin intervención humana ──────
  {
    id: "conv-1",
    canal: "whatsapp",
    contacto: { telefono: "+57 300 555 1122", nombre: "Juan Carlos", origen: "whatsapp" },
    estado: "abierta",
    atencion: "bot",
    operadorAsignadoId: null,
    noLeidos: 2,
    ultimaActividad: "2024-06-03T12:33:10.000Z",
    pedidoActivoId: undefined,
  },

  // ── 2. EN_ESPERA — el cliente pidió un asesor; requiere atención humana ─────
  //     Coherencia: al solicitar humano, atencion pasa a "humano" pero aún no
  //     hay operador asignado (nadie la ha "tomado"), por eso operadorAsignadoId
  //     es null y el estado es "en_espera".
  {
    id: "conv-2",
    canal: "whatsapp",
    contacto: { telefono: "+57 301 222 3344", nombre: "Carlos Mendoza", origen: "whatsapp" },
    estado: "en_espera",
    atencion: "humano",
    operadorAsignadoId: null,
    noLeidos: 3,
    ultimaActividad: "2024-06-03T10:08:30.000Z",
  },

  // ── 3. ATENDIDA + HUMANO — un operador la tomó y está respondiendo ──────────
  //     Invariante: estado "atendida" ⟹ atencion "humano" ∧ operador ≠ null.
  {
    id: "conv-3",
    canal: "whatsapp",
    contacto: { telefono: "+57 300 111 2233", nombre: "Ana Silva", origen: "whatsapp" },
    estado: "atendida",
    atencion: "humano",
    operadorAsignadoId: OPERADOR_ATENDIDA_ID,
    noLeidos: 0,
    ultimaActividad: "2024-06-03T09:20:00.000Z",
  },

  // ── 4. CERRADA — conversación finalizada; el bot la atendió de principio a fin ─
  //     estado "cerrada" con atencion "bot": operadorAsignadoId null (nunca la
  //     tomó un humano). noLeidos 0 porque ya se revisó/cerró.
  {
    id: "conv-4",
    canal: "whatsapp",
    contacto: { telefono: "+57 301 777 3344", nombre: "María Fernanda", origen: "whatsapp" },
    estado: "cerrada",
    atencion: "bot",
    operadorAsignadoId: null,
    noLeidos: 0,
    ultimaActividad: "2024-06-02T15:12:40.000Z",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// MENSAJES (todos los hilos)
// ═══════════════════════════════════════════════════════════════════════════

const texto = (t: string): Mensaje["contenido"] => ({ tipo: "texto", texto: t });

const MENSAJES: Mensaje[] = [
  // ── Hilo conv-1 (abierta + bot): cliente arma un pedido y el bot responde ───
  {
    id: "msg-1-1",
    conversacionId: "conv-1",
    autor: "cliente",
    contenido: texto("Hola, quiero hacer un pedido para domicilio"),
    timestamp: "2024-06-03T12:30:00.000Z",
    moduloContexto: "pedidos",
  },
  {
    id: "msg-1-2",
    conversacionId: "conv-1",
    autor: "bot",
    contenido: texto("¡Hola! 👋 Con gusto. Cuéntame qué te gustaría pedir."),
    timestamp: "2024-06-03T12:30:20.000Z",
    moduloContexto: "pedidos",
  },
  {
    id: "msg-1-3",
    conversacionId: "conv-1",
    autor: "cliente",
    contenido: texto("2 combos clásicos y 2 bebidas por favor"),
    timestamp: "2024-06-03T12:31:00.000Z",
    moduloContexto: "pedidos",
  },
  {
    id: "msg-1-4",
    conversacionId: "conv-1",
    autor: "bot",
    contenido: texto(
      "Anotado 📝\n\n• 2× Combo clásico\n• 2× Bebida 350ml\n• Modalidad: Domicilio\n\n¿A qué dirección lo enviamos?"
    ),
    timestamp: "2024-06-03T12:33:10.000Z",
    moduloContexto: "pedidos",
    payload: {
      items: [
        { nombre: "Combo clásico", cantidad: 2, precio: 25000 },
        { nombre: "Bebida 350ml", cantidad: 2, precio: 4000 },
      ],
    },
  },

  // ── Hilo conv-2 (en_espera): el cliente pide un asesor humano ───────────────
  {
    id: "msg-2-1",
    conversacionId: "conv-2",
    autor: "cliente",
    contenido: texto("Hola buenas"),
    timestamp: "2024-06-03T10:05:00.000Z",
  },
  {
    id: "msg-2-2",
    conversacionId: "conv-2",
    autor: "bot",
    contenido: texto(
      "¡Hola! 👋 Bienvenido. ¿Qué deseas hacer?\n\n1️⃣ Sacar un turno\n2️⃣ Consultar mi turno\n3️⃣ Hablar con un asesor"
    ),
    timestamp: "2024-06-03T10:05:20.000Z",
    moduloContexto: "turnos",
  },
  {
    id: "msg-2-3",
    conversacionId: "conv-2",
    autor: "cliente",
    contenido: texto(
      "Soy mayor y no me manejo bien con esto, ¿me pueden ayudar? Prefiero hablar con una persona"
    ),
    timestamp: "2024-06-03T10:06:00.000Z",
  },
  {
    id: "msg-2-4",
    conversacionId: "conv-2",
    autor: "bot",
    contenido: texto(
      "Claro que sí 🙏 Voy a pasar tu conversación a un asesor para que te ayude personalmente. Dame un momento."
    ),
    timestamp: "2024-06-03T10:06:30.000Z",
  },
  {
    id: "msg-2-5",
    conversacionId: "conv-2",
    autor: "cliente",
    contenido: texto("Muchas gracias, aquí espero"),
    timestamp: "2024-06-03T10:08:30.000Z",
  },

  // ── Hilo conv-3 (atendida + humano): el bot arranca, luego un operador toma ──
  {
    id: "msg-3-1",
    conversacionId: "conv-3",
    autor: "cliente",
    contenido: texto("Buenos días, tengo una duda sobre mi pedido"),
    timestamp: "2024-06-03T09:00:00.000Z",
    moduloContexto: "pedidos",
  },
  {
    id: "msg-3-2",
    conversacionId: "conv-3",
    autor: "bot",
    contenido: texto("¡Buenos días, Ana! 👋 Con gusto. ¿Cuál es tu duda?"),
    timestamp: "2024-06-03T09:00:20.000Z",
    moduloContexto: "pedidos",
  },
  {
    id: "msg-3-3",
    conversacionId: "conv-3",
    autor: "cliente",
    contenido: texto("Quería cambiar la dirección de entrega, ¿me pueden ayudar?"),
    timestamp: "2024-06-03T09:01:00.000Z",
    moduloContexto: "pedidos",
  },
  {
    id: "msg-3-4",
    conversacionId: "conv-3",
    autor: "cliente",
    contenido: texto("¿Hay alguien ahí?"),
    timestamp: "2024-06-03T09:09:00.000Z",
  },
  {
    id: "msg-3-5",
    conversacionId: "conv-3",
    autor: "negocio",
    contenido: texto("Hola Ana, soy Camila del equipo. Con gusto te ayudo a cambiar la dirección 🙂"),
    timestamp: "2024-06-03T09:20:00.000Z",
    moduloContexto: "pedidos",
  },

  // ── Hilo conv-4 (cerrada): pedido de retiro atendido por el bot ─────────────
  {
    id: "msg-4-1",
    conversacionId: "conv-4",
    autor: "cliente",
    contenido: texto("Buenas, quiero encargar un postre para pasarlo a recoger"),
    timestamp: "2024-06-02T15:10:00.000Z",
    moduloContexto: "pedidos",
  },
  {
    id: "msg-4-2",
    conversacionId: "conv-4",
    autor: "bot",
    contenido: texto("¡Buenas! 🍰 Claro que sí. ¿Cuál postre y cuántos?"),
    timestamp: "2024-06-02T15:10:20.000Z",
    moduloContexto: "pedidos",
  },
  {
    id: "msg-4-3",
    conversacionId: "conv-4",
    autor: "cliente",
    contenido: texto("Un postre del día"),
    timestamp: "2024-06-02T15:11:00.000Z",
    moduloContexto: "pedidos",
  },
  {
    id: "msg-4-4",
    conversacionId: "conv-4",
    autor: "bot",
    contenido: texto(
      "Perfecto, lo dejamos para *retiro en tienda*.\n\n• 1× Postre del día\n\n✅ Pedido registrado. Te avisamos cuando esté listo. 🛍️"
    ),
    timestamp: "2024-06-02T15:12:00.000Z",
    moduloContexto: "pedidos",
    payload: {
      items: [{ nombre: "Postre del día", cantidad: 1, precio: 8000 }],
    },
  },
  {
    id: "msg-4-5",
    conversacionId: "conv-4",
    autor: "cliente",
    contenido: texto("Perfecto, muchas gracias"),
    timestamp: "2024-06-02T15:12:40.000Z",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// EVENTOS DE SISTEMA (anotaciones del hilo)
// ═══════════════════════════════════════════════════════════════════════════

const EVENTOS: EventoSistema[] = [
  // conv-2: el cliente solicitó un asesor → handoff_solicitado (queda en_espera)
  {
    id: "evt-2-1",
    conversacionId: "conv-2",
    tipo: "handoff_solicitado",
    texto: "El cliente pidió hablar con un asesor",
    timestamp: "2024-06-03T10:06:30.000Z",
  },

  // conv-3: el cliente solicitó atención y un operador tomó la conversación
  {
    id: "evt-3-1",
    conversacionId: "conv-3",
    tipo: "handoff_solicitado",
    texto: "El cliente pidió hablar con un asesor",
    timestamp: "2024-06-03T09:09:30.000Z",
  },
  {
    id: "evt-3-2",
    conversacionId: "conv-3",
    tipo: "tomada",
    texto: "Camila Ortiz tomó la conversación",
    timestamp: "2024-06-03T09:19:40.000Z",
    actorId: OPERADOR_ATENDIDA_ID,
  },

  // conv-4: el bot cerró la conversación al finalizar el pedido
  {
    id: "evt-4-1",
    conversacionId: "conv-4",
    tipo: "cerrada",
    texto: "La conversación se cerró tras completar el pedido",
    timestamp: "2024-06-02T15:12:40.000Z",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Seed agregado que consume el `conversacionesStore` en su hidratación
 * (tarea 3.2). El store agrupa `mensajes`/`eventos` por `conversacionId`.
 */
export const CONVERSACIONES_SEED: ConversacionesSeed = {
  conversaciones: CONVERSACIONES,
  mensajes: MENSAJES,
  eventos: EVENTOS,
};

// Exports individuales por conveniencia (p. ej. para tests o consumo directo).
export const CONVERSACIONES_SEED_CONVERSACIONES = CONVERSACIONES;
export const CONVERSACIONES_SEED_MENSAJES = MENSAJES;
export const CONVERSACIONES_SEED_EVENTOS = EVENTOS;

// ═══════════════════════════════════════════════════════════════════════════
// CONVERSACIONES — SEED INICIAL (datos de demo)
// ═══════════════════════════════════════════════════════════════════════════
//
// Datos de arranque del módulo Conversaciones (Requirement 9.4): cuando el
// `conversacionesStore` se inicializa SIN estado persistido válido en
// `localStorage`, carga este seed para que la demo arranque con contenido.
//
// ── CRITERIO DE DISEÑO (leer antes de tocar cualquier hilo) ─────────────────
//
// Este dataset NO es "una conversación por módulo". Es una BANDEJA DE ATENCIÓN:
// cada hilo se escribió alrededor de la INTENCIÓN DEL CLIENTE, y el asistente
// responde usando lo que Necto sabe hacer. El cliente no piensa en módulos;
// piensa en su necesidad. Por eso ningún hilo se diseña "para Pedidos" ni "para
// Inventario": se diseña para "quiero saber si hay", "quiero cambiar la
// dirección", "quiero que me atienda una persona".
//
// El arco que la bandeja debe demostrar de un vistazo es:
//     consulta → información → intención → acción → seguimiento → handoff
// y NO todo hilo termina en compra. La mayoría, de hecho, no lo hace: una
// bandeja real es sobre todo gente preguntando.
//
// ── SIMULACIÓN TEMPORAL ─────────────────────────────────────────────────────
//
// Todos los timestamps son RELATIVOS al momento de arranque (`haceMin`), no
// fechas fijas. Dos razones:
//   1. Una fecha fija ("2024-06-03") envejece: los previews de la bandeja
//      acabarían diciendo "836 days", que es exactamente lo que se quiere evitar.
//   2. Mantiene el invariante `ultimaActividad === timestamp del último ítem`
//      sin depender de la hora a la que se abra la demo.
// El reparto va de hace ~3 días (un hilo cerrado) a hace segundos (lo más
// reciente), de modo que la bandeja muestre "ahora / hace X min / hace X h /
// ayer / hace N días" y se lean tiempos realistas.
//
// ── INVARIANTES respetados por cada conversación ────────────────────────────
//
//   - estado = "atendida"  ⟹  atencion = "humano"  ∧  operadorAsignadoId ≠ null
//   - atencion = "bot"     ⟹  operadorAsignadoId = null
//   - estado = "en_espera" ⟹  atencion = "humano"  ∧  operadorAsignadoId = null
//     (el cliente pidió humano; nadie la ha tomado todavía)
//   - `ultimaActividad` = timestamp del ÚLTIMO ítem del hilo (mensaje o evento)
//
// ── SEPARACIÓN CONCEPTUAL DE EJES (no mezclarlos NUNCA) ─────────────────────
//
//   CONVERSACIÓN  abierta | en_espera | atendida | cerrada
//   ATENCIÓN      bot | humano              (+ operadorAsignadoId)
//   PEDIDO        nuevo | confirmado | en_preparacion | listo | en_camino |
//                 entregado | cancelado | programado
//   PAGO          pertenece al PEDIDO (`Pedido.pagado`), NO a la conversación
//
// El pago se muestra SOLO como propiedad del pedido relacionado. Un hilo cuyo
// pedido está sin pagar sigue siendo un hilo `abierta` + `bot`: "pendiente de
// pago" no es un estado de conversación y escribir eso aquí sería el defecto.
//
// Los pedidos del seed de `pedidos.store` son la fuente de verdad del pedido y
// del pago. Aquí solo se REFERENCIA el pedido por id (`payload.pedidoId`), nunca
// se copia su estado: copiarlo sería una segunda fuente de verdad (invariante D2).

import type {
  Conversacion,
  Mensaje,
  EventoSistema,
} from "@/stores/conversaciones.types";

// ── Operadores del seed de operadores (operadores.store.ts) ──────────────────
// Los hilos ya tomados por una persona se asignan a operadores REALES del seed,
// para que el panel de contexto muestre un responsable que existe.
const OPERADOR_ATENDIDA_ID = "d1"; // "Camila Ortiz" (supervisor_pedidos, activo)

// ── Utilidad temporal ───────────────────────────────────────────────────────

/**
 * ISO 8601 de un instante `min` minutos en el pasado, calculado UNA vez al
 * importar el módulo. Que sea un único `base` compartido por todo el archivo
 * garantiza que los hilos sean coherentes ENTRE SÍ (no solo dentro de cada uno):
 * si el hilo A es "hace 2 h" y el B "hace 3 h", el orden es real.
 */
const BASE_MS = Date.now();
const haceMin = (min: number): string => new Date(BASE_MS - min * 60_000).toISOString();

// ── Estructura agregada que consume el store ────────────────────────────────

/** Forma del seed que hidrata el `conversacionesStore` cuando no hay estado. */
export interface ConversacionesSeed {
  conversaciones: Conversacion[];
  mensajes: Mensaje[];
  eventos: EventoSistema[];
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVERSACIONES (cabeceras)
// ═══════════════════════════════════════════════════════════════════════════
//
// Ocho hilos, ocho intenciones distintas. Ninguno repite el guion de otro.
//
//   conv-1  Consulta de producto        → bot informa, NO hay pedido    (abierta/bot)
//   conv-2  Consulta de disponibilidad  → bot informa, NO hay pedido    (abierta/bot)
//   conv-3  Crear pedido                → resumen + confirmación        (atendida/humano)
//   conv-4  Consultar pedido existente  → sigue el pedido del store     (abierta/bot)
//   conv-5  Problema con pedido         → no se puede resolver, escala  (en_espera/humano)
//   conv-6  Pago pendiente              → explica el estado del pago    (abierta/bot)
//   conv-7  Handoff a humano            → ciclo completo y natural      (atendida/humano)
//   conv-8  Consulta general (horarios) → se resuelve y CIERRA          (cerrada/bot)
//
// Reparto deliberado de estados para que el Historial de Atención tenga las
// cuatro categorías pobladas: pendientes (1,2,4,6), en curso (3,7),
// resueltas (8) y una que requiere humano (5).

const CONVERSACIONES: Conversacion[] = [
  // ── 1. CONSULTA DE PRODUCTO — bot, sin pedido ─────────────────────────────
  //     Primer contacto puro: nadie quiere comprar todavía. El bot informa con
  //     el catálogo y NO abre ningún pedido. Es el hilo más reciente de todos
  //     (hace 6 min) para que encabece la bandeja como atención viva.
  {
    id: "conv-1",
    canal: "whatsapp",
    contacto: { telefono: "+57 300 555 1122", nombre: "Juan Carlos", origen: "whatsapp" },
    estado: "abierta",
    atencion: "bot",
    operadorAsignadoId: null,
    noLeidos: 1,
    ultimaActividad: haceMin(6),
  },

  // ── 2. CONSULTA DE DISPONIBILIDAD — bot, sin pedido ───────────────────────
  //     Pregunta de existencias. El bot responde con disponibilidad, no con un
  //     número exacto: dice lo que puede comprobar y ofrece alternativas, y no
  //     promete una reserva. Ese es el comportamiento honesto y el que se quiere
  //     demostrar.
  {
    id: "conv-2",
    canal: "whatsapp",
    contacto: { telefono: "+57 301 222 3344", nombre: "Carlos Mendoza", origen: "whatsapp" },
    estado: "abierta",
    atencion: "bot",
    operadorAsignadoId: null,
    noLeidos: 0,
    ultimaActividad: haceMin(52),
  },

  // ── 3. CREAR PEDIDO — pedido + confirmación explícita ─────────────────────
  //     El hilo SÍ llega a crear el pedido, pero el valor de la demo está en el
  //     camino: el bot pide lo que falta, resume, pide confirmación y solo
  //     entonces registra. El pedido `pd1` existe en el seed de pedidos con
  //     estado `nuevo` y `pagado:false` → alimenta a la vez "crear pedido" y
  //     "pago pendiente" sin duplicar nada.
  //     Está `atendida`/`humano` porque un operador la tomó DESPUÉS de que el
  //     pedido quedara registrado (seguimiento, no rescate).
  {
    id: "conv-3",
    canal: "whatsapp",
    contacto: { telefono: "+57 300 111 2233", nombre: "Ana Silva", origen: "whatsapp" },
    estado: "atendida",
    atencion: "humano",
    operadorAsignadoId: OPERADOR_ATENDIDA_ID,
    noLeidos: 0,
    ultimaActividad: haceMin(38),
  },

  // ── 4. CONSULTAR PEDIDO EXISTENTE — sigue el pedido, no lo recrea ─────────
  //     Sofía sigue el pedido `pd6` (categoría 4 y 7 a la vez: "¿dónde va mi
  //     pedido?"). El contexto del pedido aparece en el panel de contexto
  //     derivado por teléfono. Ninguna recreación del pedido.
  {
    id: "conv-4",
    canal: "whatsapp",
    contacto: { telefono: "+57 301 777 3344", nombre: "Sofía Díaz", origen: "whatsapp" },
    estado: "abierta",
    atencion: "bot",
    operadorAsignadoId: null,
    noLeidos: 2,
    ultimaActividad: haceMin(17),
  },

  // ── 5. PROBLEMA CON PEDIDO — escala correctamente ─────────────────────────
  //     Lucía quiere cambiar la dirección de `pd4`, que ya está `listo`. El bot
  //     no puede modificar un pedido en curso, así que ESCALA: lo correcto no es
  //     fingir que lo hizo. Queda `en_espera` (requiere humano, nadie la tomó)
  //     con su evento de sistema. Es el único hilo con evento por diseño.
  {
    id: "conv-5",
    canal: "whatsapp",
    contacto: { telefono: "+57 300 444 5566", nombre: "Lucía Torres", origen: "whatsapp" },
    estado: "en_espera",
    atencion: "humano",
    operadorAsignadoId: null,
    noLeidos: 2,
    ultimaActividad: haceMin(9),
  },

  // ── 6. PAGO PENDIENTE — el estado de pago vive en el PEDIDO ───────────────
  //     Andrés pregunta por su pedido `pd5` (va en camino, `pagado:false`). El
  //     bot explica el estado real del pedido. Nótese lo que NO se hace: la
  //     conversación no se marca como "pendiente de pago". Sigue `abierta`+`bot`;
  //     el pago se lee del pedido en el panel de contexto.
  {
    id: "conv-6",
    canal: "whatsapp",
    contacto: { telefono: "+57 300 555 6677", nombre: "Andrés Gil", origen: "whatsapp" },
    estado: "abierta",
    atencion: "bot",
    operadorAsignadoId: null,
    noLeidos: 1,
    ultimaActividad: haceMin(5),
  },

  // ── 7. HANDOFF A HUMANO — ciclo completo, sin bucles ──────────────────────
  //     El cliente pide una persona por un motivo legítimo (un reclamo que el
  //     bot no debe resolver solo), se registra el evento, un operador la toma Y
  //     RESPONDE. Termina `atendida`: no hay "tomada → devuelta al bot → tomada"
  //     porque eso es exactamente el bucle artificial que se quiere eliminar.
  {
    id: "conv-7",
    canal: "whatsapp",
    contacto: { telefono: "+57 301 888 9900", nombre: "Valentina Ríos", origen: "whatsapp" },
    estado: "atendida",
    atencion: "humano",
    operadorAsignadoId: OPERADOR_ATENDIDA_ID,
    noLeidos: 0,
    ultimaActividad: haceMin(96),
  },

  // ── 8. CONSULTA GENERAL — cierra sin pedido ───────────────────────────────
  //     Horarios y retiro. Pregunta de información pura, resuelta de forma
  //     natural y CERRADA. Es el hilo más antiguo (ayer) y alimenta la tarjeta
  //     "Resueltos" del historial. Demuestra que un hilo puede terminar sin
  //     que nadie compre nada.
  {
    id: "conv-8",
    canal: "whatsapp",
    contacto: { telefono: "+57 302 111 2233", nombre: "Diego Ramírez", origen: "whatsapp" },
    estado: "cerrada",
    atencion: "bot",
    operadorAsignadoId: null,
    noLeidos: 0,
    // Debe ser EXACTAMENTE el timestamp de `msg-8-5` (el último ítem del hilo):
    // `ultimaActividad` es la clave de orden de la bandeja, así que un valor
    // redondeado "hacia delante" adelantaría el hilo por delante de mensajes
    // que en realidad ocurrieron después. ~17 h → ayer.
    ultimaActividad: haceMin(1_027),
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// MENSAJES (todos los hilos)
// ═══════════════════════════════════════════════════════════════════════════
//
// Reglas de redacción aplicadas a TODOS los hilos:
//   - El cliente escribe como escribe la gente: saltos de línea, minúsculas,
//     alguna frase suelta. No usa la jerga del negocio.
//   - El bot responde en 1–3 frases. Nada de listas numeradas ni menús de
//     opciones salvo cuando la pregunta realmente es un menú.
//   - Emojis: casi ninguno. Un 💛 ocasional, no uno por mensaje.
//   - PROHIBIDO "pedido registrado" antes de que el cliente confirme.
//   - PROHIBIDO repetir la misma frase de apertura entre hilos distintos.
//   - El bot NO pregunta lo que el cliente ya dijo.

const texto = (t: string): Mensaje["contenido"] => ({ tipo: "texto", texto: t });

const MENSAJES: Mensaje[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // Hilo conv-1 — CONSULTA DE PRODUCTO. Bot informa. Sin pedido.
  // Intención: "¿qué es el combo y cuánto cuesta?" Nadie compra aquí.
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "msg-1-1",
    conversacionId: "conv-1",
    autor: "cliente",
    contenido: texto("hola, que trae el combo clásico?"),
    timestamp: haceMin(7),
  },
  {
    id: "msg-1-2",
    conversacionId: "conv-1",
    autor: "bot",
    contenido: texto(
      "¡Hola! El combo clásico trae plato principal, acompañamiento y bebida de 350 ml. Está en 25.000.",
    ),
    timestamp: haceMin(7),
    moduloContexto: "pedidos",
  },
  {
    id: "msg-1-3",
    conversacionId: "conv-1",
    autor: "cliente",
    contenido: texto("y hay opción sin carne?"),
    timestamp: haceMin(6),
  },
  {
    id: "msg-1-4",
    conversacionId: "conv-1",
    autor: "bot",
    contenido: texto(
      "Sí, se puede pedir sin carne. Lo dejo anotado como preferencia si más adelante quieres pedirlo.",
    ),
    timestamp: haceMin(6),
    moduloContexto: "pedidos",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Hilo conv-2 — CONSULTA DE DISPONIBILIDAD (INVENTARIO). Sin pedido.
  // Intención: "¿cuántos quedan?". El bot responde sobre disponibilidad y
  // precio SIN forzar una orden, y sin citar unidades exactas.
  //
  // Que no cite unidades es una decisión de ESTE guion, no una limitación del
  // módulo: desde el 21/09 el proveedor de Inventario sí tiene una herramienta
  // que devuelve el número (`getExistencias`). No se cita porque una cifra
  // escrita en un chat es una promesa sobre un stock que se mueve mientras el
  // cliente decide — y el módulo no puede sostenerla.
  //
  // El hilo tampoco promete una RESERVA. El módulo no aparta mercancía (no hay
  // reservas en su dominio): un mensaje que las ofreciera quedaría respaldado,
  // el día del encendido, por un módulo que no puede cumplirlo — el defecto que
  // este repo llama «un control que miente», en forma de copy.
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "msg-2-1",
    conversacionId: "conv-2",
    autor: "cliente",
    contenido: texto("buenas, les quedan postres del día?"),
    timestamp: haceMin(54),
  },
  {
    id: "msg-2-2",
    conversacionId: "conv-2",
    autor: "bot",
    contenido: texto(
      "¡Buenas tardes, Carlos! En este momento tenemos porciones de postre del día disponibles en nuestro menú. Tienen un valor de 8.000 c/u.",
    ),
    timestamp: haceMin(54),
    moduloContexto: "inventario",
  },
  {
    id: "msg-2-3",
    conversacionId: "conv-2",
    autor: "cliente",
    contenido: texto("excelente, ¿y se puede reservar una para recoger más tarde?"),
    timestamp: haceMin(53),
  },
  {
    id: "msg-2-4",
    conversacionId: "conv-2",
    autor: "bot",
    contenido: texto(
      "Hoy tenemos disponibilidad de postres del día. No apartamos mercancía, pero puedes pasar por el local a recogerlos antes del cierre.",
    ),
    timestamp: haceMin(53),
    moduloContexto: "inventario",
  },
  {
    id: "msg-2-5",
    conversacionId: "conv-2",
    autor: "cliente",
    contenido: texto("dale, ya te confirmo con mi compañera y te aviso"),
    timestamp: haceMin(52),
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Hilo conv-3 — CREAR PEDIDO. Resumen + CONFIRMACIÓN antes de registrar.
  // El pedido `pd1` (nuevo, sin pagar) es el que nace aquí.
  // El orden importa: el bot resume, espera el "sí", y solo entonces dice que
  // quedó registrado. Y al final el operador retoma para lo del pago.
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "msg-3-1",
    conversacionId: "conv-3",
    autor: "cliente",
    contenido: texto("hola! quiero hacer un pedido para domicilio"),
    timestamp: haceMin(45),
  },
  {
    id: "msg-3-2",
    conversacionId: "conv-3",
    autor: "bot",
    contenido: texto("¡Hola Ana! Claro. ¿Qué te gustaría pedir?"),
    timestamp: haceMin(45),
    moduloContexto: "pedidos",
  },
  {
    id: "msg-3-3",
    conversacionId: "conv-3",
    autor: "cliente",
    contenido: texto("2 combos clásicos y 2 bebidas de 350"),
    timestamp: haceMin(43),
  },
  {
    id: "msg-3-4",
    conversacionId: "conv-3",
    autor: "bot",
    contenido: texto("Perfecto. ¿Me confirmas la dirección de entrega?"),
    timestamp: haceMin(43),
    moduloContexto: "pedidos",
  },
  {
    id: "msg-3-5",
    conversacionId: "conv-3",
    autor: "cliente",
    contenido: texto("Cra 45 #12-30, apto 302"),
    timestamp: haceMin(41),
  },
  {
    id: "msg-3-6",
    conversacionId: "conv-3",
    autor: "bot",
    contenido: texto(
      "Te lo resumo:\n\n• 2× Combo clásico\n• 2× Bebida 350 ml\n• Domicilio: Cra 45 #12-30, apto 302\n• Total: 58.000\n\n¿Lo confirmo así?",
    ),
    timestamp: haceMin(41),
    moduloContexto: "pedidos",
    payload: {
      items: [
        { nombre: "Combo clásico", cantidad: 2, precio: 25000 },
        { nombre: "Bebida 350ml", cantidad: 2, precio: 4000 },
      ],
    },
  },
  {
    id: "msg-3-7",
    conversacionId: "conv-3",
    autor: "cliente",
    contenido: texto("sí, así está bien"),
    timestamp: haceMin(40),
  },
  {
    id: "msg-3-8",
    conversacionId: "conv-3",
    autor: "bot",
    contenido: texto(
      "Listo, tu pedido quedó registrado como P-001 y entra a preparación. Te aviso cuando salga.",
    ),
    timestamp: haceMin(39),
    moduloContexto: "pedidos",
    payload: { pedidoId: "pd1" },
  },
  {
    id: "msg-3-9",
    conversacionId: "conv-3",
    autor: "cliente",
    contenido: texto("gracias! una cosa, se puede pagar en efectivo?"),
    timestamp: haceMin(38),
  },
  {
    id: "msg-3-10",
    conversacionId: "conv-3",
    autor: "negocio",
    contenido: texto(
      "Hola Ana, soy Camila. Sí, se puede pagar en efectivo al recibir. Tu pedido sigue en preparación 🙂",
    ),
    timestamp: haceMin(38),
    moduloContexto: "pedidos",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Hilo conv-4 — CONSULTAR PEDIDO EXISTENTE. No lo recrea.
  // Sigue `pd6` (entregado). El bot da el estado; el panel de contexto lo
  // muestra derivado por teléfono.
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "msg-4-1",
    conversacionId: "conv-4",
    autor: "cliente",
    contenido: texto("hola, hice un pedido ayer y no sé si llegó a salir"),
    timestamp: haceMin(20),
  },
  {
    id: "msg-4-2",
    conversacionId: "conv-4",
    autor: "bot",
    contenido: texto(
      "¡Hola Sofía! Sí, tu pedido P-006 ya figura como entregado. ¿Te llegó bien?",
    ),
    timestamp: haceMin(20),
    moduloContexto: "pedidos",
    payload: { pedidoId: "pd6" },
  },
  {
    id: "msg-4-3",
    conversacionId: "conv-4",
    autor: "cliente",
    contenido: texto("sí llegó, gracias. y el comprobante?"),
    timestamp: haceMin(18),
  },
  {
    id: "msg-4-4",
    conversacionId: "conv-4",
    autor: "bot",
    contenido: texto(
      "El comprobante queda asociado al pago del pedido. Como P-006 figura pagado, no debería faltarte nada; si no lo encuentras te lo reenvían por aquí.",
    ),
    timestamp: haceMin(18),
    moduloContexto: "pedidos",
  },
  {
    id: "msg-4-5",
    conversacionId: "conv-4",
    autor: "cliente",
    contenido: texto("vale, déjame buscar"),
    timestamp: haceMin(17),
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Hilo conv-5 — PROBLEMA CON PEDIDO. El bot ESCALA, no finge.
  // `pd4` (Lucía) ya está `listo`; cambiar la dirección a esas alturas no lo
  // puede resolver el bot. Un único evento de sistema, al final, tras la
  // promesa explícita de pasar con una persona.
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "msg-5-1",
    conversacionId: "conv-5",
    autor: "cliente",
    contenido: texto("hola, necesito cambiar la dirección de mi pedido"),
    timestamp: haceMin(13),
  },
  {
    id: "msg-5-2",
    conversacionId: "conv-5",
    autor: "bot",
    contenido: texto(
      "¡Hola Lucía! Veo tu pedido P-004 y ya está listo para despacho, así que no puedo cambiarle la dirección desde aquí sin arriesgar la entrega.",
    ),
    timestamp: haceMin(13),
    moduloContexto: "pedidos",
    payload: { pedidoId: "pd4" },
  },
  {
    id: "msg-5-3",
    conversacionId: "conv-5",
    autor: "cliente",
    contenido: texto("ay no, es que me mudé hoy. es urgente"),
    timestamp: haceMin(11),
  },
  {
    id: "msg-5-4",
    conversacionId: "conv-5",
    autor: "bot",
    contenido: texto(
      "Entiendo, y es justo el tipo de cambio que conviene que revise una persona antes de que salga. Te paso con alguien del equipo ahora mismo.",
    ),
    timestamp: haceMin(10),
    moduloContexto: "pedidos",
  },
  {
    id: "msg-5-5",
    conversacionId: "conv-5",
    autor: "cliente",
    contenido: texto("gracias, quedo pendiente"),
    timestamp: haceMin(9),
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Hilo conv-6 — PAGO PENDIENTE. El pago es del PEDIDO, no del hilo.
  // `pd5` (Andrés) va `en_camino` y `pagado:false`. El bot explica el estado
  // real. La conversación sigue `abierta`+`bot`: aquí NO se escribe ningún
  // estado de pago como si fuera de la conversación.
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "msg-6-1",
    conversacionId: "conv-6",
    autor: "cliente",
    contenido: texto("buenas, ¿por qué todavía aparece pendiente el pago de mi pedido P-005?"),
    timestamp: haceMin(8),
  },
  {
    id: "msg-6-2",
    conversacionId: "conv-6",
    autor: "bot",
    contenido: texto(
      "¡Buenas Andrés! Tu pedido P-005 ya va en camino. El pago figura como pendiente porque la transferencia bancaria todavía no ha sido confirmada por tesorería.",
    ),
    timestamp: haceMin(8),
    moduloContexto: "pedidos",
    payload: { pedidoId: "pd5" },
  },
  {
    id: "msg-6-3",
    conversacionId: "conv-6",
    autor: "cliente",
    contenido: texto("ah pensé que ya había quedado pago"),
    timestamp: haceMin(6),
  },
  {
    id: "msg-6-4",
    conversacionId: "conv-6",
    autor: "bot",
    contenido: texto(
      "Puedes pagarlo en efectivo al repartidor al recibir o pasarnos el comprobante por acá para validarlo de inmediato.",
    ),
    timestamp: haceMin(5),
    moduloContexto: "pedidos",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Hilo conv-7 — HANDOFF A HUMANO, ciclo completo y sin bucles.
  // Motivo legítimo: cliente pide hablar directamente con una persona.
  // Evento de handoff → operador toma → operador RESPONDE. El hilo
  // se queda `atendida`: nunca vuelve al bot.
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "msg-7-1",
    conversacionId: "conv-7",
    autor: "cliente",
    contenido: texto("hola, prefiero hablar directamente con una persona"),
    timestamp: haceMin(105),
  },
  {
    id: "msg-7-2",
    conversacionId: "conv-7",
    autor: "bot",
    contenido: texto(
      "Claro Valentina, con mucho gusto. Voy a transferir esta conversación a un asesor humano de nuestro equipo.",
    ),
    timestamp: haceMin(105),
    moduloContexto: "general",
  },
  {
    id: "msg-7-3",
    conversacionId: "conv-7",
    autor: "cliente",
    contenido: texto("gracias, es por una duda con la facturación"),
    timestamp: haceMin(103),
  },
  {
    id: "msg-7-4",
    conversacionId: "conv-7",
    autor: "negocio",
    contenido: texto(
      "Hola Valentina, soy Camila. Ya tengo tu caso en pantalla; cuéntame qué duda tienes para revisarlo contigo.",
    ),
    timestamp: haceMin(96),
    moduloContexto: "general",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Hilo conv-8 — CONSULTA GENERAL. Se resuelve y CIERRA, sin pedido.
  // Horarios y retiro: información pura. Respuesta útil, cliente agradece, se
  // cierra. Sin "pedido registrado", sin crear nada.
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "msg-8-1",
    conversacionId: "conv-8",
    autor: "cliente",
    contenido: texto("buenas, hasta qué hora atienden hoy?"),
    timestamp: haceMin(1_030),
  },
  {
    id: "msg-8-2",
    conversacionId: "conv-8",
    autor: "bot",
    contenido: texto("¡Buenas Diego! Hoy atendemos hasta las 8 de la noche."),
    timestamp: haceMin(1_030),
    moduloContexto: "general",
  },
  {
    id: "msg-8-3",
    conversacionId: "conv-8",
    autor: "cliente",
    contenido: texto("y si pido para recoger, tengo que ir a la misma hora?"),
    timestamp: haceMin(1_028),
  },
  {
    id: "msg-8-4",
    conversacionId: "conv-8",
    autor: "bot",
    contenido: texto(
      "Sí, el retiro en tienda es dentro del mismo horario. El pedido se guarda y lo reclamas cuando llegues.",
    ),
    timestamp: haceMin(1_028),
    moduloContexto: "general",
  },
  {
    id: "msg-8-5",
    conversacionId: "conv-8",
    autor: "cliente",
    contenido: texto("perfecto, gracias"),
    timestamp: haceMin(1_027),
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// EVENTOS DE SISTEMA
// ═══════════════════════════════════════════════════════════════════════════
//
// DOS eventos en total, y cada uno es un hecho real del hilo. El requisito pide
// explícitamente NO repetir eventos ni generar bucles de "tomada / devuelta al
// bot". Aquí no hay ni un solo `devuelta`, y ningún hilo arrastra dos eventos
// del mismo tipo.
//
//   conv-5  handoff_solicitado  → el bot no pudo y escaló (nadie la ha tomado)
//   conv-7  handoff_solicitado  → el cliente pidió persona, y …
//   conv-7  tomada              → … Camila la tomó y respondió (fin del ciclo)
//
// NOTA sobre el texto de los eventos: se redactan como HECHOS, no como mensajes.
// Son los únicos textos de este archivo que el usuario ve como anotación de
// sistema, así que se cuidan especialmente: nada de "Conversación devuelta al
// bot", que no aporta nada a quien lee la bandeja.

const EVENTOS: EventoSistema[] = [
  // conv-5: el bot escaló al no poder modificar un pedido ya listo.
  {
    id: "evt-5-1",
    conversacionId: "conv-5",
    tipo: "handoff_solicitado",
    texto: "El bot pasó la conversación a un asesor para revisar el cambio de dirección",
    timestamp: haceMin(10),
  },

  // conv-7: handoff pedido por el cliente por un tema de cobro…
  {
    id: "evt-7-1",
    conversacionId: "conv-7",
    tipo: "handoff_solicitado",
    texto: "Se solicitó atención humana para revisar un cobro no reconocido",
    timestamp: haceMin(104),
  },
  // …y tomada por Camila, que además responde. El ciclo cierra aquí.
  {
    id: "evt-7-2",
    conversacionId: "conv-7",
    tipo: "tomada",
    texto: "Camila Ortiz tomó la conversación",
    timestamp: haceMin(97),
    actorId: OPERADOR_ATENDIDA_ID,
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

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
  // ── ETAPA 1: CONTACTO INICIAL (Multiplataforma estilo Lucid Bot) ──
  { id: "conv-1", canal: "whatsapp", contacto: { telefono: "+57 300 555 1122", nombre: "Tatiana G.", origen: "whatsapp" }, estado: "abierta", atencion: "bot", operadorAsignadoId: null, noLeidos: 0, ultimaActividad: haceMin(1) },
  { id: "conv-2", canal: "instagram", contacto: { telefono: "+57 301 222 3344", nombre: "Diana R.", origen: "instagram" }, estado: "abierta", atencion: "bot", operadorAsignadoId: null, noLeidos: 0, ultimaActividad: haceMin(3) },
  { id: "conv-26", canal: "messenger", contacto: { telefono: "+57 304 888 1100", nombre: "Alex Sánchez", origen: "messenger" }, estado: "abierta", atencion: "bot", operadorAsignadoId: null, noLeidos: 0, ultimaActividad: haceMin(12) },
  { id: "conv-27", canal: "whatsapp", contacto: { telefono: "+57 305 999 2211", nombre: "Camila Ruiz", origen: "whatsapp" }, estado: "abierta", atencion: "bot", operadorAsignadoId: null, noLeidos: 0, ultimaActividad: haceMin(24) },
  { id: "conv-9", canal: "tiktok", contacto: { telefono: "+573004567890", nombre: "Mateo L.", origen: "tiktok" }, estado: "abierta", atencion: "bot", operadorAsignadoId: null, noLeidos: 0, ultimaActividad: haceMin(46) },
  { id: "conv-17", canal: "whatsapp", contacto: { telefono: "+573105678901", nombre: "Esteban Morales", origen: "whatsapp" }, estado: "abierta", atencion: "bot", operadorAsignadoId: null, noLeidos: 0, ultimaActividad: haceMin(28) },
  { id: "conv-18", canal: "whatsapp", contacto: { telefono: "+573206789012", nombre: "Valeria Gómez", origen: "whatsapp" }, estado: "atendida", atencion: "humano", operadorAsignadoId: OPERADOR_ATENDIDA_ID, noLeidos: 0, ultimaActividad: haceMin(40) },
  { id: "conv-28", canal: "whatsapp", contacto: { telefono: "+57 306 777 4455", nombre: "Laura Aristizábal", origen: "whatsapp" }, estado: "atendida", atencion: "humano", operadorAsignadoId: OPERADOR_ATENDIDA_ID, noLeidos: 0, ultimaActividad: haceMin(32) },

  // ── ETAPA 3: SEGUIMIENTO (4 hilos en_espera de humano sin pedido cerrado aún) ──
  { id: "conv-29", canal: "whatsapp", contacto: { telefono: "+57 304 123 9876", nombre: "Sofía Morales", origen: "whatsapp" }, estado: "en_espera", atencion: "humano", operadorAsignadoId: null, noLeidos: 1, ultimaActividad: haceMin(11) },
  { id: "conv-30", canal: "whatsapp", contacto: { telefono: "+57 312 456 7890", nombre: "Roberto Mejía", origen: "whatsapp" }, estado: "en_espera", atencion: "humano", operadorAsignadoId: null, noLeidos: 2, ultimaActividad: haceMin(7) },
  { id: "conv-31", canal: "whatsapp", contacto: { telefono: "+57 314 555 6677", nombre: "Patricia Londoño", origen: "whatsapp" }, estado: "en_espera", atencion: "humano", operadorAsignadoId: null, noLeidos: 1, ultimaActividad: haceMin(16) },
  { id: "conv-32", canal: "telegram", contacto: { telefono: "+57 315 888 3322", nombre: "Tomás Giraldo", origen: "telegram" }, estado: "en_espera", atencion: "humano", operadorAsignadoId: null, noLeidos: 1, ultimaActividad: haceMin(21) },

  // ── ETAPA 4: EN CIERRE (4 hilos con pedido nuevo/confirmado en efectivo o contra entrega) ──
  { id: "conv-3", canal: "whatsapp", contacto: { telefono: "+57 300 111 2233", nombre: "Ana Silva", origen: "whatsapp" }, estado: "atendida", atencion: "humano", operadorAsignadoId: OPERADOR_ATENDIDA_ID, noLeidos: 0, ultimaActividad: haceMin(38) },
  { id: "conv-12", canal: "whatsapp", contacto: { telefono: "+573137890123", nombre: "Felipe Henao", origen: "whatsapp" }, estado: "atendida", atencion: "humano", operadorAsignadoId: OPERADOR_ATENDIDA_ID, noLeidos: 0, ultimaActividad: haceMin(22) },
  { id: "conv-20", canal: "whatsapp", contacto: { telefono: "+573154567890", nombre: "Santiago Arango", origen: "whatsapp" }, estado: "abierta", atencion: "bot", operadorAsignadoId: null, noLeidos: 0, ultimaActividad: haceMin(20) },
  { id: "conv-33", canal: "whatsapp", contacto: { telefono: "+573023334455", nombre: "Alejandro Vélez", origen: "whatsapp" }, estado: "abierta", atencion: "bot", operadorAsignadoId: null, noLeidos: 0, ultimaActividad: haceMin(5) },

  // ── ETAPA 5: VALIDACIÓN DE PAGO (4 hilos con pedido pendiente de validar transferencia/link) ──
  { id: "conv-10", canal: "whatsapp", contacto: { telefono: "+573012345678", nombre: "Mateo Cárdenas", origen: "whatsapp" }, estado: "en_espera", atencion: "humano", operadorAsignadoId: null, noLeidos: 2, ultimaActividad: haceMin(8) },
  { id: "conv-11", canal: "whatsapp", contacto: { telefono: "+573026789012", nombre: "Juliana Pineda", origen: "whatsapp" }, estado: "abierta", atencion: "bot", operadorAsignadoId: null, noLeidos: 1, ultimaActividad: haceMin(10) },
  { id: "conv-19", canal: "whatsapp", contacto: { telefono: "+573113456789", nombre: "Daniela Salazar", origen: "whatsapp" }, estado: "abierta", atencion: "bot", operadorAsignadoId: null, noLeidos: 1, ultimaActividad: haceMin(15) },
  { id: "conv-22", canal: "whatsapp", contacto: { telefono: "+573148901234", nombre: "Diana Bustamante", origen: "whatsapp" }, estado: "abierta", atencion: "bot", operadorAsignadoId: null, noLeidos: 1, ultimaActividad: haceMin(12) },

  // ── OPERACIÓN EN CURSO Y CERRADOS (Bandeja de Chats activa e historial) ──
  { id: "conv-4", canal: "whatsapp", contacto: { telefono: "+57 301 777 3344", nombre: "Sofía Díaz", origen: "whatsapp" }, estado: "cerrada", atencion: "bot", operadorAsignadoId: null, noLeidos: 0, ultimaActividad: haceMin(170) },
  { id: "conv-5", canal: "whatsapp", contacto: { telefono: "+57 300 444 5566", nombre: "Lucía Torres", origen: "whatsapp" }, estado: "en_espera", atencion: "humano", operadorAsignadoId: null, noLeidos: 2, ultimaActividad: haceMin(9) },
  { id: "conv-6", canal: "whatsapp", contacto: { telefono: "+57 300 555 6677", nombre: "Andrés Gil", origen: "whatsapp" }, estado: "abierta", atencion: "bot", operadorAsignadoId: null, noLeidos: 1, ultimaActividad: haceMin(5) },
  { id: "conv-7", canal: "whatsapp", contacto: { telefono: "+57 301 888 9900", nombre: "Valentina Ríos", origen: "whatsapp" }, estado: "cerrada", atencion: "humano", operadorAsignadoId: OPERADOR_ATENDIDA_ID, noLeidos: 0, ultimaActividad: haceMin(96) },
  { id: "conv-8", canal: "whatsapp", contacto: { telefono: "+57 302 111 2233", nombre: "Diego Ramírez", origen: "whatsapp" }, estado: "cerrada", atencion: "bot", operadorAsignadoId: null, noLeidos: 0, ultimaActividad: haceMin(1027) },
  { id: "conv-13", canal: "whatsapp", contacto: { telefono: "+573256789012", nombre: "Mariana Duque", origen: "whatsapp" }, estado: "abierta", atencion: "bot", operadorAsignadoId: null, noLeidos: 0, ultimaActividad: haceMin(8) },
  { id: "conv-14", canal: "whatsapp", contacto: { telefono: "+573267890123", nombre: "Cristian Rendón", origen: "whatsapp" }, estado: "abierta", atencion: "bot", operadorAsignadoId: null, noLeidos: 0, ultimaActividad: haceMin(11) },
  { id: "conv-15", canal: "telegram", contacto: { telefono: "+573169012345", nombre: "Alejandro Quintero", origen: "telegram" }, estado: "atendida", atencion: "humano", operadorAsignadoId: OPERADOR_ATENDIDA_ID, noLeidos: 0, ultimaActividad: haceMin(12) },
  { id: "conv-16", canal: "whatsapp", contacto: { telefono: "+573290123456", nombre: "Clara Tamayo", origen: "whatsapp" }, estado: "cerrada", atencion: "bot", operadorAsignadoId: null, noLeidos: 0, ultimaActividad: haceMin(60) },
  { id: "conv-21", canal: "whatsapp", contacto: { telefono: "+573185678901", nombre: "Carolina Méndez", origen: "whatsapp" }, estado: "atendida", atencion: "humano", operadorAsignadoId: OPERADOR_ATENDIDA_ID, noLeidos: 0, ultimaActividad: haceMin(7) },
  { id: "conv-23", canal: "whatsapp", contacto: { telefono: "+573170123456", nombre: "Natalia Villegas", origen: "whatsapp" }, estado: "abierta", atencion: "bot", operadorAsignadoId: null, noLeidos: 0, ultimaActividad: haceMin(16) },
  { id: "conv-24", canal: "whatsapp", contacto: { telefono: "+573223456789", nombre: "Sebastián Betancur", origen: "whatsapp" }, estado: "cerrada", atencion: "bot", operadorAsignadoId: null, noLeidos: 0, ultimaActividad: haceMin(180) },
  { id: "conv-25", canal: "whatsapp", contacto: { telefono: "+573278901234", nombre: "Paola Zuleta", origen: "whatsapp" }, estado: "abierta", atencion: "bot", operadorAsignadoId: null, noLeidos: 0, ultimaActividad: haceMin(24) },
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
    autor: "bot",
    contenido: texto("Listo, Tatiana 😊 te queda el *iPhone 15 256 GB Negro*"),
    timestamp: haceMin(6),
  },
  {
    id: "msg-1-2",
    conversacionId: "conv-1",
    autor: "bot",
    contenido: texto("¿Lo quieres llevar *de contado* o *a crédito*? 😊"),
    timestamp: haceMin(5),
  },
  {
    id: "msg-1-3",
    conversacionId: "conv-1",
    autor: "cliente",
    contenido: texto("Crédito"),
    timestamp: haceMin(4),
  },
  {
    id: "msg-1-4",
    conversacionId: "conv-1",
    autor: "bot",
    contenido: texto("Te hago un estudio de crédito rápido, aquí mismo por el chat"),
    timestamp: haceMin(3),
  },
  {
    id: "msg-1-5",
    conversacionId: "conv-1",
    autor: "bot",
    contenido: texto("Son cinco preguntas cortitas y trabajamos con tu cédula"),
    timestamp: haceMin(3),
  },
  {
    id: "msg-1-6",
    conversacionId: "conv-1",
    autor: "cliente",
    contenido: texto("Perfecto, dale"),
    timestamp: haceMin(2),
  },
  {
    id: "msg-1-7",
    conversacionId: "conv-1",
    autor: "bot",
    contenido: texto("¡Aprobado! 🎉 Cuota de *$189.900* al mes"),
    timestamp: haceMin(1),
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
      // ── Hilo 9: Camila Restrepo (Oferta Enviada / Programado P-011) ──────────
  { id: "msg-9-1", conversacionId: "conv-9", autor: "cliente", contenido: { tipo: "texto", texto: "Hola buenas tardes, ¿puedo dejar programado un almuerzo para las 3:00 PM?" }, timestamp: haceMin(35) },
  { id: "msg-9-2", conversacionId: "conv-9", autor: "bot", contenido: { tipo: "texto", texto: "¡Hola Camila! Claro que sí. Te enviamos la propuesta: 2 Bandejas Paisa Gourmet + 2 Jugos de Maracuyá + envío a El Poblado por $91.000." }, timestamp: haceMin(30) },
  { id: "msg-9-3", conversacionId: "conv-9", autor: "cliente", contenido: { tipo: "texto", texto: "Perfecto, ya realicé el pago para dejarlo agendado a las 3:00 PM." }, timestamp: haceMin(27) },
  { id: "msg-9-4", conversacionId: "conv-9", autor: "bot", contenido: { tipo: "texto", texto: "¡Agendado como pedido P-011! A las 2:30 PM entra a preparación para llegar puntual." }, timestamp: haceMin(25) },

  // ── Hilo 10: Mateo Cárdenas (Validación de pago - P-019) ────────────────
  { id: "msg-10-1", conversacionId: "conv-10", autor: "cliente", contenido: { tipo: "texto", texto: "Hola, hice el pedido P-019 de las 2 Hamburguesas Angus ($76.000 con domicilio)." }, timestamp: haceMin(15) },
  { id: "msg-10-2", conversacionId: "conv-10", autor: "bot", contenido: { tipo: "texto", texto: "¡Hola Mateo! Tu pedido está pendiente de validación del pago con tarjeta/link para pasar a cocina." }, timestamp: haceMin(12) },
  { id: "msg-10-3", conversacionId: "conv-10", autor: "cliente", contenido: { tipo: "texto", texto: "Ya me descontó del banco, les dejé captura del voucher. ¿Me ayudan a validarlo por favor?" }, timestamp: haceMin(8) },

  // ── Hilo 11: Juliana Pineda (Validación de pago - P-016) ────────────────
  { id: "msg-11-1", conversacionId: "conv-11", autor: "cliente", contenido: { tipo: "texto", texto: "Hola, acabo de hacer el pedido P-016 de los 2 Ramen Tonkotsu y Gyozas." }, timestamp: haceMin(18) },
  { id: "msg-11-2", conversacionId: "conv-11", autor: "bot", contenido: { tipo: "texto", texto: "¡Hola Juliana! Recibimos tu orden por $90.500. Quedamos atentos al comprobante de transferencia para validarlo en caja." }, timestamp: haceMin(15) },
  { id: "msg-11-3", conversacionId: "conv-11", autor: "cliente", contenido: { tipo: "texto", texto: "Listo, acabo de transferir desde Bancolombia. Quedo atenta a la validación 🙏" }, timestamp: haceMin(10) },

  // ── Hilo 12: Felipe Henao (En Cierre - P-015) ───────────────────────────
  { id: "msg-12-1", conversacionId: "conv-12", autor: "cliente", contenido: { tipo: "texto", texto: "Hola, quiero confirmar el pedido P-015 de 2 Burritos Tex-Mex y 2 Limonadas de Coco para recoger." }, timestamp: haceMin(30) },
  { id: "msg-12-2", conversacionId: "conv-12", autor: "negocio", contenido: { tipo: "texto", texto: "Hola Felipe, te atiende Camila. El total es $67.000 y veo que pagas en efectivo con $70.000 al retirar. ¿Confirmamos para pasar la orden a cocina?" }, timestamp: haceMin(25) },
  { id: "msg-12-3", conversacionId: "conv-12", autor: "cliente", contenido: { tipo: "texto", texto: "¡Confirmadísimo Camila! Paso en media hora por el local." }, timestamp: haceMin(22) },

  // ── Hilo 13: Mariana Duque (En camino - P-023) ──────────────────────────
  { id: "msg-13-1", conversacionId: "conv-13", autor: "bot", contenido: { tipo: "texto", texto: "🛵 ¡Buenas noticias Mariana! Tu pedido P-023 (Pizza Pepperoni) ya va en camino con el repartidor Diego R." }, timestamp: haceMin(15) },
  { id: "msg-13-2", conversacionId: "conv-13", autor: "cliente", contenido: { tipo: "texto", texto: "Súper, gracias por avisar. Por favor pídele que timbre al apto 402 cuando llegue." }, timestamp: haceMin(10) },
  { id: "msg-13-3", conversacionId: "conv-13", autor: "bot", contenido: { tipo: "texto", texto: "Anotado en la guía de despacho: timbrar al apto 402 al llegar." }, timestamp: haceMin(8) },

  // ── Hilo 14: Cristian Rendón (En camino - P-024) ────────────────────────
  { id: "msg-14-1", conversacionId: "conv-14", autor: "bot", contenido: { tipo: "texto", texto: "🛵 Tu orden P-024 de Tacos Birria fue despachada. Repartidor: Javier (Moto 05). Pago en efectivo al recibir." }, timestamp: haceMin(18) },
  { id: "msg-14-2", conversacionId: "conv-14", autor: "cliente", contenido: { tipo: "texto", texto: "Perfecto, acá lo estoy esperando en portería." }, timestamp: haceMin(11) },

  // ── Hilo 15: Alejandro Quintero (En preparación salón - P-020) ──────────
  { id: "msg-15-1", conversacionId: "conv-15", autor: "cliente", contenido: { tipo: "texto", texto: "Buenas tardes, estamos en la Mesa 8 del salón interior. ¿Nos pueden traer hielo extra y chimichurri?" }, timestamp: haceMin(16) },
  { id: "msg-15-2", conversacionId: "conv-15", autor: "negocio", contenido: { tipo: "texto", texto: "Con mucho gusto señor Alejandro, el mesero ya va en camino a su mesa." }, timestamp: haceMin(14) },
  { id: "msg-15-3", conversacionId: "conv-15", autor: "cliente", contenido: { tipo: "texto", texto: "Muchas gracias, excelente atención." }, timestamp: haceMin(12) },

  // ── Hilo 16: Clara Tamayo (Entregado / Cerrado - P-027) ──────────────────
  { id: "msg-16-1", conversacionId: "conv-16", autor: "bot", contenido: { tipo: "texto", texto: "Tu pedido P-027 ha sido entregado en Cra 76 # 33-10 Laureles. ¡Buen provecho!" }, timestamp: haceMin(75) },
  { id: "msg-16-2", conversacionId: "conv-16", autor: "cliente", contenido: { tipo: "texto", texto: "¡Muchas gracias! Ya llegó todo completo y caliente. 10/10." }, timestamp: haceMin(65) },
  { id: "msg-16-3", conversacionId: "conv-16", autor: "bot", contenido: { tipo: "texto", texto: "¡Qué alegría saberlo Clara! Feliz tarde y gracias por preferirnos." }, timestamp: haceMin(60) },

  // ── Hilo 17: Esteban Morales (Oferta Enviada / Programado - P-012) ──────
  { id: "msg-17-1", conversacionId: "conv-17", autor: "cliente", contenido: { tipo: "texto", texto: "Buenas, quisiera cotizar y dejar encargado 2 Ceviches Mixtos y tostones para retirar a las 5:00 PM." }, timestamp: haceMin(40) },
  { id: "msg-17-2", conversacionId: "conv-17", autor: "bot", contenido: { tipo: "texto", texto: "¡Hola Esteban! Te enviamos la cotización de tu orden programada P-012: 2× Ceviche Mixto ($84.000) + 1× Tostones ($12.000) = Total $96.000 para las 5:00 PM." }, timestamp: haceMin(35) },
  { id: "msg-17-3", conversacionId: "conv-17", autor: "cliente", contenido: { tipo: "texto", texto: "Excelente, me sirve la oferta. Pago en efectivo allá en caja con $100.000." }, timestamp: haceMin(28) },

  // ── Hilo 18: Valeria Gómez (Oferta Enviada / Programado - P-013) ────────
  { id: "msg-18-1", conversacionId: "conv-18", autor: "cliente", contenido: { tipo: "texto", texto: "Hola, ¿tienen paquete especial de pizzas grandes para una reunión hoy a las 6:30 PM?" }, timestamp: haceMin(55) },
  { id: "msg-18-2", conversacionId: "conv-18", autor: "negocio", contenido: { tipo: "texto", texto: "¡Hola Valeria! Te habla Camila. Te armé esta oferta especial: 3 Pizzas Cuatro Quesos Grandes en masa delgada por $120.000 (ahorras $24.000)." }, timestamp: haceMin(45) },
  { id: "msg-18-3", conversacionId: "conv-18", autor: "cliente", contenido: { tipo: "texto", texto: "¡Super bien! Agéndamelo entonces bajo esa oferta para Laureles (P-013)." }, timestamp: haceMin(40) },

  // ── Hilo 19: Daniela Salazar (Validación de pago - P-017) ───────────────
  { id: "msg-19-1", conversacionId: "conv-19", autor: "cliente", contenido: { tipo: "texto", texto: "Hola, hice el pedido P-017 del Bowl Teriyaki y Té Matcha por $36.000." }, timestamp: haceMin(25) },
  { id: "msg-19-2", conversacionId: "conv-19", autor: "bot", contenido: { tipo: "texto", texto: "¡Hola Daniela! Tu orden está esperando validación de transferencia en tesorería." }, timestamp: haceMin(20) },
  { id: "msg-19-3", conversacionId: "conv-19", autor: "cliente", contenido: { tipo: "texto", texto: "Ya transferí a la cuenta de Nequi terminada en 4410, les dejé el comprobante arriba. ¿Me confirman el pago?" }, timestamp: haceMin(15) },

  // ── Hilo 20: Santiago Arango (En Cierre - P-014) ────────────────────────
  { id: "msg-20-1", conversacionId: "conv-20", autor: "cliente", contenido: { tipo: "texto", texto: "Buenas tardes, quiero cerrar el pedido de Costillas BBQ San Luis y 2 Club Colombia para Envigado." }, timestamp: haceMin(30) },
  { id: "msg-20-2", conversacionId: "conv-20", autor: "bot", contenido: { tipo: "texto", texto: "¡Hola Santiago! Resumen de cierre (P-014): 1× Costillas BBQ + 2× Cerveza + Envío a Cra 43A # 19A-40 = $57.000 en efectivo." }, timestamp: haceMin(24) },
  { id: "msg-20-3", conversacionId: "conv-20", autor: "cliente", contenido: { tipo: "texto", texto: "Todo correcto, pago en efectivo con billete de $60.000 al recibir." }, timestamp: haceMin(20) },

  // ── Hilo 21: Carolina Méndez (En preparación salón - P-021) ─────────────
  { id: "msg-21-1", conversacionId: "conv-21", autor: "cliente", contenido: { tipo: "texto", texto: "Hola, estamos en la Mesa 4 de la terraza. ¿Nos recuerdas cuánto demoran los Nachos y Margaritas?" }, timestamp: haceMin(12) },
  { id: "msg-21-2", conversacionId: "conv-21", autor: "negocio", contenido: { tipo: "texto", texto: "¡Hola Carolina! Tu comanda P-021 ya está pagada y en preparación en barra; en 5 minutos sale a tu mesa." }, timestamp: haceMin(9) },
  { id: "msg-21-3", conversacionId: "conv-21", autor: "cliente", contenido: { tipo: "texto", texto: "Mil gracias, quedamos pendientes acá." }, timestamp: haceMin(7) },

  // ── Hilo 22: Diana Bustamante (Validación de pago - P-018) ──────────────
  { id: "msg-22-1", conversacionId: "conv-22", autor: "cliente", contenido: { tipo: "texto", texto: "Buenas tardes, envié el pago por PSE de $72.000 para el Sushi Combo Roll (pedido P-018 en Belén)." }, timestamp: haceMin(28) },
  { id: "msg-22-2", conversacionId: "conv-22", autor: "bot", contenido: { tipo: "texto", texto: "¡Hola Diana! Recibimos la notificación del pedido P-018. Nuestro equipo está verificando la acreditación bancaria." }, timestamp: haceMin(20) },
  { id: "msg-22-3", conversacionId: "conv-22", autor: "cliente", contenido: { tipo: "texto", texto: "Vale, el CUS de la transacción es 9948123 por si lo necesitan para validar el pago." }, timestamp: haceMin(12) },

  // ── Hilo 23: Natalia Villegas (En preparación - P-022) ───────────────────
  { id: "msg-23-1", conversacionId: "conv-23", autor: "cliente", contenido: { tipo: "texto", texto: "Hola, ¿ya entró al horno la Pizza Napolitana del pedido P-022?" }, timestamp: haceMin(22) },
  { id: "msg-23-2", conversacionId: "conv-23", autor: "bot", contenido: { tipo: "texto", texto: "¡Hola Natalia! Sí, tu pizza y los 2 tiramisús están en preparación en cocina. Tiempo estimado: 12 minutos." }, timestamp: haceMin(18) },
  { id: "msg-23-3", conversacionId: "conv-23", autor: "cliente", contenido: { tipo: "texto", texto: "Perfecto, muchas gracias por la rapidez." }, timestamp: haceMin(16) },

  // ── Hilo 24: Sebastián Betancur (Entregado / Cerrado - P-026) ────────────
  { id: "msg-24-1", conversacionId: "conv-24", autor: "bot", contenido: { tipo: "texto", texto: "¡Hola Sebastián! Tu pedido P-026 (Sandwiches de Pastrami) está empacado y listo en mostrador." }, timestamp: haceMin(210) },
  { id: "msg-24-2", conversacionId: "conv-24", autor: "cliente", contenido: { tipo: "texto", texto: "Ya lo recogí en caja, todo súper bien empacado." }, timestamp: haceMin(195) },
  { id: "msg-24-3", conversacionId: "conv-24", autor: "bot", contenido: { tipo: "texto", texto: "¡Entregado! Gracias por tu visita Sebastián, que disfrutes el almuerzo." }, timestamp: haceMin(180) },

  // ── Hilo 25: Paola Zuleta (En camino - P-025) ───────────────────────────
  { id: "msg-25-1", conversacionId: "conv-25", autor: "bot", contenido: { tipo: "texto", texto: "🛵 ¡Hola Paola! Tu orden P-025 (Lasagnas de Carne) va en camino hacia Las Palmas con el mensajero Esteban." }, timestamp: haceMin(35) },
  { id: "msg-25-2", conversacionId: "conv-25", autor: "cliente", contenido: { tipo: "texto", texto: "Hola, ¿más o menos cuánto tarda en subir por Las Palmas?" }, timestamp: haceMin(28) },
  { id: "msg-25-3", conversacionId: "conv-25", autor: "bot", contenido: { tipo: "texto", texto: "Calculamos unos 10 a 15 minutos según el tráfico actual." }, timestamp: haceMin(24) },

  // ── Hilo 26: Andrea Peña (Contacto Inicial - Sin pedido) ────────────────
  { id: "msg-26-1", conversacionId: "conv-26", autor: "cliente", contenido: { tipo: "texto", texto: "Hola buenas tardes, ¿me regalan la carta actualizada y precios de las pizzas artesanales?" }, timestamp: haceMin(8) },
  { id: "msg-26-2", conversacionId: "conv-26", autor: "bot", contenido: { tipo: "texto", texto: "¡Hola Andrea! 👋 Claro que sí. Nuestras pizzas artesanales van desde $38.000 hasta $48.000 (Napolitana, Cuatro Quesos y Pepperoni). ¿Buscas alguna en especial?" }, timestamp: haceMin(7) },
  { id: "msg-26-3", conversacionId: "conv-26", autor: "cliente", contenido: { tipo: "texto", texto: "¿Tienen cobertura de domicilio hasta Sabaneta?" }, timestamp: haceMin(6) },

  // ── Hilo 27: Mauricio Cano (Contacto Inicial - Sin pedido) ──────────────
  { id: "msg-27-1", conversacionId: "conv-27", autor: "cliente", contenido: { tipo: "texto", texto: "Hola, ¿ustedes manejan opciones sin gluten o keto en el menú de almuerzos?" }, timestamp: haceMin(23) },
  { id: "msg-27-2", conversacionId: "conv-27", autor: "bot", contenido: { tipo: "texto", texto: "¡Hola Mauricio! Sí, contamos con el Ojo de Bife Angus con ensalada fresca y el Bowl de Pollo con base de vegetales sin arroz." }, timestamp: haceMin(20) },
  { id: "msg-27-3", conversacionId: "conv-27", autor: "cliente", contenido: { tipo: "texto", texto: "Genial, voy a mirarlo con calma y ya les escribo." }, timestamp: haceMin(19) },

  // ── Hilo 28: Laura Aristizábal (Oferta Enviada - Cotización corporativa) ──
  { id: "msg-28-1", conversacionId: "conv-28", autor: "cliente", contenido: { tipo: "texto", texto: "Buenas tardes, necesito una cotización formal de 15 almuerzos ejecutivos para un evento de oficina mañana." }, timestamp: haceMin(42) },
  { id: "msg-28-2", conversacionId: "conv-28", autor: "negocio", contenido: { tipo: "texto", texto: "Hola Laura, soy Camila. Te acabo de enviar la propuesta comercial por 15 Bowls Teriyaki + bebida + postre en $495.000 (10% de descuento corporativo incluido)." }, timestamp: haceMin(35) },
  { id: "msg-28-3", conversacionId: "conv-28", autor: "cliente", contenido: { tipo: "texto", texto: "Recibida la oferta Camila, ya la pasé a compras para aprobación y te confirmo en un rato." }, timestamp: haceMin(32) },

  // ── Hilo 29: Sofía Morales (Seguimiento - Esperando asesor) ──────────────
  { id: "msg-29-1", conversacionId: "conv-29", autor: "cliente", contenido: { tipo: "texto", texto: "Hola, estuve revisando las opciones que me dio el bot ayer pero necesito armar un pedido combinado con factura electrónica." }, timestamp: haceMin(15) },
  { id: "msg-29-2", conversacionId: "conv-29", autor: "bot", contenido: { tipo: "texto", texto: "Entendido Sofía. Te derivo con un asesor comercial para hacer seguimiento a tu solicitud y tomar los datos de facturación." }, timestamp: haceMin(13) },
  { id: "msg-29-3", conversacionId: "conv-29", autor: "cliente", contenido: { tipo: "texto", texto: "Perfecto, quedo atenta para definir las cantidades con el asesor." }, timestamp: haceMin(11) },

  // ── Hilo 30: Roberto Mejía (Seguimiento - Esperando asesor) ──────────────
  { id: "msg-30-1", conversacionId: "conv-30", autor: "cliente", contenido: { tipo: "texto", texto: "Buenas, ayer pregunté por el menú de parrilladas para 8 personas y quedé de confirmar hoy." }, timestamp: haceMin(10) },
  { id: "msg-30-2", conversacionId: "conv-30", autor: "bot", contenido: { tipo: "texto", texto: "¡Hola de nuevo Roberto! Paso tu conversación a seguimiento con un asesor humano para ayudarte a cerrar los detalles de tu reserva/pedido." }, timestamp: haceMin(8) },
  { id: "msg-30-3", conversacionId: "conv-30", autor: "cliente", contenido: { tipo: "texto", texto: "Listo, además quiero saber si podemos cambiar una guarnición por papas trufadas." }, timestamp: haceMin(7) },

  // ── Hilo 31: Patricia Londoño (Seguimiento - Esperando asesor) ───────────
  { id: "msg-31-1", conversacionId: "conv-31", autor: "cliente", contenido: { tipo: "texto", texto: "Hola, tengo una duda sobre los ingredientes del Ramen porque mi hijo es alérgico al maní." }, timestamp: haceMin(20) },
  { id: "msg-31-2", conversacionId: "conv-31", autor: "bot", contenido: { tipo: "texto", texto: "Por seguridad alimentaria ante alergias, transfiero tu chat a un supervisor para confirmarte directamente con cocina antes de que realices el pedido." }, timestamp: haceMin(18) },
  { id: "msg-31-3", conversacionId: "conv-31", autor: "cliente", contenido: { tipo: "texto", texto: "Muchas gracias, espero la confirmación para pedir." }, timestamp: haceMin(16) },

  // ── Hilo 32: Tomás Giraldo (Seguimiento - Esperando asesor) ──────────────
  { id: "msg-32-1", conversacionId: "conv-32", autor: "cliente", contenido: { tipo: "texto", texto: "Hola, me interesa pedir para un cumpleaños esta noche pero quería saber si tienen algún descuento por pedir 6 combos." }, timestamp: haceMin(25) },
  { id: "msg-32-2", conversacionId: "conv-32", autor: "bot", contenido: { tipo: "texto", texto: "¡Hola Tomás! Te asigno con un asesor de ventas para que revise tu caso y te brinde seguimiento personalizado." }, timestamp: haceMin(23) },
  { id: "msg-32-3", conversacionId: "conv-32", autor: "cliente", contenido: { tipo: "texto", texto: "Dale, quedo en línea esperando." }, timestamp: haceMin(21) },

  // ── Hilo 33: Alejandro Vélez (En Cierre - P-010) ─────────────────────────
  { id: "msg-33-1", conversacionId: "conv-33", autor: "cliente", contenido: { tipo: "texto", texto: "Hola, acabo de confirmar las 2 Hamburguesas Clásicas y 2 Malteadas de Arequipe para Belén Rosales." }, timestamp: haceMin(9) },
  { id: "msg-33-2", conversacionId: "conv-33", autor: "bot", contenido: { tipo: "texto", texto: "¡Excelente Alejandro! Tu pedido P-010 por $76.500 (incluye domicilio) quedó confirmado con pago en efectivo ($100.000)." }, timestamp: haceMin(6) },
  { id: "msg-33-3", conversacionId: "conv-33", autor: "cliente", contenido: { tipo: "texto", texto: "Listo, muchas gracias, quedo atento a cuando pase a cocina." }, timestamp: haceMin(5) },
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

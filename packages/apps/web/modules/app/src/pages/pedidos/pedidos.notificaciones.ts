import { pedidosStore } from "@/stores/pedidos.store";
import type { Pedido, PedidoEstado } from "@/stores/pedidos.store";
import { conversacionesStore } from "@/stores/conversaciones.store";
import type { DesenlaceNovedad } from "./novedad.utils";

// ═══════════════════════════════════════════════════════════════════════════
// PUENTE DE NOTIFICACIÓN: cambio de estado de pedido → mensaje en el hilo
// ═══════════════════════════════════════════════════════════════════════════
//
// Cuando un pedido avanza en el pipeline, el negocio quiere que el cliente se
// entere por WhatsApp. Las plantillas ya existen y son editables desde
// Configuración (`pedidosStore.config.plantillas`)… pero hasta ahora NADIE las
// leía: se guardaban, se persistían y no se enviaban nunca. Este módulo cierra
// ese círculo.
//
// ── Por qué vive en la capa de UI y no en un store ──────────────────────────
// `conversaciones.store.ts` NO puede importar `pedidos.store` (invariante D2), y
// a la inversa tampoco: si `pedidos.store` importara el de conversaciones para
// publicar la plantilla, el store de pedidos pasaría a depender del canal, lo
// que le impediría funcionar en un entorno sin conversaciones (tests, /wa) y
// acoplaría dos dominios que hoy son independientes. El cruce es competencia de
// la capa de presentación, exactamente como el enlace por teléfono.
//
// ── Por qué envolver las mutaciones en vez de escuchar ──────────────────────
// MobX no tiene "suscripción a un cambio de estado de una entidad" sin observar
// el array entero y diferenciarlo a mano (frágil y caro). Envolver la mutación
// es explícito: quien llama sabe que está disparando también la notificación, y
// el punto de entrada es UNO. El coste es que una mutación llamada directamente
// sobre el store no notifica — por eso el resto de la app debe usar SIEMPRE
// estos envoltorios (el Tablero y el panel de contexto ya lo hacen).

/**
 * Plantilla que corresponde a cada estado del pipeline.
 *
 * `nuevo` y `programado` NO aparecen: son estados de ENTRADA, no transiciones
 * "hacia delante" que merezcan avisar al cliente (acaba de pedir; agradecerle
 * el pedido que él mismo hizo no aporta). El mapa es fail-closed: un estado que
 * no esté aquí no envía nada, en vez de enviar un texto por defecto inventado.
 */
const PLANTILLA_POR_ESTADO: Partial<Record<PedidoEstado, keyof typeof pedidosStore.config.plantillas>> = {
  confirmado: "confirmado",
  en_preparacion: "enPreparacion",
  listo: "listo",
  en_camino: "enCamino",
  entregado: "entregado",
  cancelado: "cancelado",
};

/** Resultado de intentar notificar un cambio de estado. */
export type ResultadoNotificacion =
  /** Se añadió la plantilla al hilo del cliente. */
  | "enviado"
  /** El estado destino no tiene plantilla asociada (entrada / sin mensaje). */
  | "sin_plantilla"
  /** El cliente no tiene conversación abierta: no se inventa una. */
  | "sin_conversacion"
  /** La plantilla está vacía o solo tiene espacios. */
  | "plantilla_vacia";

/**
 * Publica en el hilo del cliente la plantilla del estado al que acaba de llegar
 * un pedido. NO muta el pedido: solo lee su estado actual y escribe en el canal.
 *
 * Reglas:
 * - Se envía como mensaje de `autor: "bot"` con `moduloContexto:"pedidos"`, para
 *   que el filtro transversal `modulosDe` reconozca el hilo como tocado por
 *   Pedidos y el mensaje quede identificable en la línea de tiempo.
 * - Se incluye `payload.pedidoId` (solo el id, nunca la entidad: invariante D2).
 * - Si el cliente no tiene hilo, NO se crea: la ausencia se representa como
 *   ausencia (la conversación nace del dispositivo del cliente).
 * - Si la plantilla quedó vacía en Configuración, no se envía vacío.
 *
 * @returns por qué se envió o por qué no (útil para tests y para diagnostico).
 */
export function notificarCambioDeEstado(pedido: Pedido): ResultadoNotificacion {
  const clave = PLANTILLA_POR_ESTADO[pedido.estado];
  if (!clave) return "sin_plantilla";

  // Se lee la plantilla EN EL MOMENTO del envío, no al construir el mapa: si el
  // operador edita el texto en Configuración, el siguiente aviso ya sale nuevo.
  const texto = pedidosStore.config.plantillas[clave];
  if (!texto || texto.trim() === "") return "plantilla_vacia";

  const conv = conversacionesStore.porTelefono(pedido.telefono);
  if (!conv) return "sin_conversacion";

  conversacionesStore.agregarMensajeBot(conv.id, texto, { pedidoId: pedido.id }, "pedidos");
  return "enviado";
}

/**
 * Avanza un pedido al siguiente estado de su pipeline y, SI el avance ocurrió,
 * publica la plantilla del nuevo estado en el hilo del cliente.
 *
 * Es el envoltorio que deben usar las superficies interactivas (Tablero, panel
 * de contexto del chat). Devuelve el nuevo estado, o `null` si no se pudo
 * avanzar — misma firma que `pedidosStore.avanzar`, para que sustituirlo en un
 * call site sea un cambio de una línea.
 */
export function avanzarPedido(id: string): PedidoEstado | null {
  const nuevo = pedidosStore.avanzar(id);
  if (nuevo) {
    const pedido = pedidosStore.getPedido(id);
    if (pedido) notificarCambioDeEstado(pedido);
  }
  return nuevo;
}

/**
 * Mueve un pedido a un estado destino concreto y notifica si se aplicó.
 * Envoltorio de `pedidosStore.moverEstado` con la misma semántica de retorno.
 */
export function moverPedidoA(id: string, destino: PedidoEstado): boolean {
  const aplicado = pedidosStore.moverEstado(id, destino);
  if (aplicado) {
    const pedido = pedidosStore.getPedido(id);
    if (pedido) notificarCambioDeEstado(pedido);
  }
  return aplicado;
}

/**
 * Cancela un pedido y avisa al cliente con la plantilla de cancelación.
 * Envoltorio de `pedidosStore.cancelar`.
 */
export function cancelarPedido(id: string): boolean {
  const aplicado = pedidosStore.cancelar(id);
  if (aplicado) {
    const pedido = pedidosStore.getPedido(id);
    if (pedido) notificarCambioDeEstado(pedido);
  }
  return aplicado;
}

// ═══════════════════════════════════════════════════════════════════════════
// NOVEDAD DE ENTREGA — nota + desenlace + aviso, en una sola operación
// ═══════════════════════════════════════════════════════════════════════════
//
// Una entrega fallida toca TRES cosas a la vez: deja constancia en el pedido
// (nota), lo saca de la calle (estado) y avisa al cliente (hilo). Repartirlas
// entre la vista y el store fue justo lo que produjo el defecto que este módulo
// documenta más abajo: el Tablero anexaba la nota a mano y el widget de
// logística movía el estado saltándose el aviso.
//
// El puente es el único sitio donde las tres ocurren juntas, así que la
// operación vive aquí y no en el modal.

/** Resultado de reportar una novedad. */
export interface ResultadoNovedad {
  /** ¿Se anexó la nota al pedido? */
  nota: boolean;
  /** ¿Se movió el estado? `false` si la transición no aplicaba. */
  estado: boolean;
  /** Qué se hizo con el hilo del cliente (vocabulario de `notificarCambioDeEstado`). */
  aviso: ResultadoNotificacion;
}

/**
 * Reporta una novedad de entrega: anexa la nota, aplica el desenlace y —si el
 * desenlace fue una transición— publica la plantilla en el hilo del cliente.
 *
 * ── Por qué el desenlace es un parámetro y no un `"cancelado"` fijo ────────
 * Anular la venta no es el único final posible de una entrega fallida, y muchas
 * veces no es el correcto: si el cliente no estaba, el negocio reintenta. El
 * llamador decide; este módulo no asume.
 *
 * ── Por qué la nota se escribe ANTES de mover el estado ────────────────────
 * Porque `moverEstado` puede RECHAZAR la transición (un pedido ya terminal, por
 * ejemplo). Si el orden fuera el inverso, un rechazo dejaría el pedido intacto
 * pero con una nota afirmando que hubo una novedad que no se registró. La nota
 * se escribe primero y el resultado se reporta: quien llama ve las dos banderas
 * y puede decidir si el estado aplicado le basta.
 *
 * ── Guarda de origen ──────────────────────────────────────────────────────
 * El aviso solo se intenta si `origen === "whatsapp"`. No es una optimización:
 * un pedido creado por el operador en el mostrador no tiene (ni debe tener) un
 * hilo del que el cliente sea dueño, y `notificarCambioDeEstado` devolvería
 * `sin_conversacion` de todos modos. La guarda hace explícita la decisión en
 * lugar de depender de que el teléfono no cruce por casualidad.
 *
 * @param id       pedido al que se le reporta la novedad
 * @param bloque   texto ya formateado (`novedadTexto`) que se anexa a las notas
 * @param desenlace `cancelar` (terminal) o `reintentar` (vuelve a la ruta)
 */
export function reportarNovedadEntrega(
  id: string,
  bloque: string,
  desenlace: DesenlaceNovedad,
): ResultadoNovedad {
  const nota = pedidosStore.anexarNota(id, bloque);

  const estado =
    desenlace === "cancelar"
      ? pedidosStore.cancelar(id)
      : pedidosStore.reintentarEntrega(id);
  if (!estado) return { nota, estado, aviso: "sin_plantilla" };

  const pedido = pedidosStore.getPedido(id);
  if (!pedido) return { nota, estado, aviso: "sin_plantilla" };

  // Un reintento NO avisa al cliente: el pedido vuelve a `listo`, y comunicarle
  // «tu pedido está listo» dos veces por el mismo pedido sería ruido. El aviso
  // de la cancelación, en cambio, es exactamente lo que el cliente necesita.
  if (desenlace === "reintentar") return { nota, estado, aviso: "sin_plantilla" };
  if (pedido.origen !== "whatsapp") return { nota, estado, aviso: "sin_conversacion" };

  return { nota, estado, aviso: notificarCambioDeEstado(pedido) };
}

import { conversacionesStore } from "@/stores/conversaciones.store";
import { pedidosStore } from "@/stores/pedidos.store";

// ═══════════════════════════════════════════════════════════════════════════
// PUENTE DE ATENCIÓN AUTOMÁTICA: mensaje del cliente → aviso fuera de horario
// ═══════════════════════════════════════════════════════════════════════════
//
// El ajuste «Aviso fuera de horario» de la configuración del canal existe desde
// el 07/10, pero un ajuste que no cambia nada es un adorno. Este módulo es lo
// que lo hace real: cuando el cliente escribe con el negocio cerrado, recibe el
// texto configurado.
//
// ── Por qué vive en la capa de UI y no en un store ──────────────────────────
// La decisión cruza DOS dominios: el horario, que vive en `pedidos.store`, y el
// hilo, que vive en `conversaciones.store`. El invariante D2 prohíbe que
// `conversaciones.store` importe `pedidos.store` (y a la inversa), porque eso
// acoplaría el canal al módulo de pedidos y rompería los entornos donde solo
// existe uno de los dos. El cruce es competencia de la presentación, exactamente
// igual que en `pages/pedidos/pedidos.notificaciones.ts`.
//
// ── Por qué el aviso SUSTITUYE a la respuesta del bot ──────────────────────
// Si se enviaran las dos cosas, el cliente escribiría una vez y recibiría dos
// respuestas distintas: la del bot («¿en qué te puedo ayudar?») y el aviso
// («estamos cerrados»). Por eso el envío del cliente se hace con
// `responderConBot: false` y el aviso ocupa su lugar.
//
// ── Por qué no se repite el aviso en cada mensaje ─────────────────────────
// Un cliente que escribe tres líneas seguidas a las once de la noche no debe
// recibir tres veces el mismo párrafo. Se mira el último mensaje que NO escribió
// el cliente: si ya era este mismo aviso, no se repite. En cuanto el hilo avanza
// (el bot responde, o un asesor contesta), el aviso vuelve a estar disponible.

/** Qué se hizo con el mensaje del cliente. */
export type ResultadoMensajeCliente =
  /** Entró al hilo por el camino normal (lo atenderá el bot o un asesor). */
  | "enviado"
  /** Entró al hilo y el canal respondió con el aviso fuera de horario. */
  | "aviso_fuera_horario";

/**
 * Texto del último mensaje del hilo que NO escribió el cliente, o `null` si no
 * hay ninguno. Es lo que permite decidir si el aviso ya se dio.
 */
function ultimaRespuestaDelNegocio(convId: string): string | null {
  const items = conversacionesStore.lineaDeTiempo(convId);
  for (let i = items.length - 1; i >= 0; i -= 1) {
    const item = items[i];
    if (item.clase === "mensaje") {
      if (item.data.autor === "cliente") continue;
      return item.data.contenido.texto;
    }
    // Un evento de sistema no es una respuesta: se sigue mirando hacia atrás.
  }
  return null;
}

/**
 * El cliente escribe en el canal. Registra su mensaje y, si el negocio está
 * cerrado y el aviso está configurado, responde con él en lugar del bot.
 *
 * @returns por qué camino salió el mensaje (útil para tests y diagnóstico).
 */
export function clienteEscribe(convId: string, texto: string): ResultadoMensajeCliente {
  const conv = conversacionesStore.getConversacion(convId);
  const aviso = pedidosStore.config.avisoFueraHorario;

  // Se exige que el hilo lo lleve el bot: el aviso es el SUSTITUTO de la
  // respuesta automática. En un hilo que un asesor tiene tomado, contestar
  // «estamos cerrados» por encima de la persona que lo está trabajando sería
  // peor que no contestar.
  //
  // Y se exige que el canal tenga las respuestas automáticas ENCENDIDAS: el
  // aviso ES una respuesta automática. Si el interruptor de «Atención
  // automática» está apagado, el canal no contesta nada — ni el bot ni el
  // aviso. Dejar que el aviso se saltara ese interruptor sería un ajuste que
  // no se cumple del todo.
  const aplica =
    conv !== undefined &&
    conversacionesStore.respuestasAutomaticas &&
    aviso.activo &&
    aviso.mensaje.trim() !== "" &&
    conv.estado !== "cerrada" &&
    conv.atencion === "bot" &&
    !pedidosStore.estaAbierto();

  if (!aplica) {
    conversacionesStore.enviarComoCliente(convId, texto);
    return "enviado";
  }

  // Se mira ANTES de registrar el mensaje: después, el último del hilo sería el
  // que acaba de escribir el cliente y la comprobación no diría nada.
  const yaAvisado = ultimaRespuestaDelNegocio(convId) === aviso.mensaje;

  conversacionesStore.enviarComoCliente(convId, texto, { responderConBot: false });
  if (!yaAvisado) conversacionesStore.agregarMensajeBot(convId, aviso.mensaje);

  return "aviso_fuera_horario";
}

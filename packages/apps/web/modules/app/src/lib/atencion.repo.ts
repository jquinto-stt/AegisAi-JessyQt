// EL INSTRUMENTO QUE FALTABA: GOBIERNO DEL MODO DE ATENCIÓN
//
// ── Por qué existe este archivo ────────────────────────────────────────────
//
// `necto.conversacion.modo_atencion` tiene dos valores y **tres escritores**:
//
//   1. El bot (`BotPedidosDAO.pasarAHumano`) — cuando un cliente pide un asesor
//      o cuando no hay nada que contestar (un adjunto sin texto).
//   2. El bot (`BotPedidosDAO.volverAlBot`) — **y aquí está el problema**:
//      existe desde el principio y **nadie la llamaba**. El bot se apagaba a sí
//      mismo y no había forma de encenderlo.
//   3. El frontend (`conversacionesStore.tomar/devolver`) — que hasta ahora
//      escribía SOLO `localStorage`. Pulsar «Tomar chat» no tocaba Postgres: la
//      bandeja parecía que cambiaba de modo y el bot seguía igual. Un control
//      que mentía.
//
// Medido el 22/09: el cliente escribió «Buen día», el bot no lo reconoció, hizo
// handoff, y los cinco mensajes siguientes entraron a la bandeja sin respuesta.
// Con los arreglos del clasificador y del prompt ambiguo eso ya casi no pasa,
// pero «casi» no es una garantía: el handoff sigue existiendo y el cliente que
// pide una persona sigue necesitando que alguien pueda devolver el hilo.
//
// ── Qué hace y qué NO hace ────────────────────────────────────────────────
//
// Escribe `modo_atencion` en `necto` pasando por RLS (JWT del operador), no con
// `service_role`: quien cambia el modo es una persona con sesión, y la política
// decide si puede. Si no tiene `channels.respond`, la escritura falla y la UI
// lo dice — que es lo correcto.
//
// NO toca `estado_respuesta`: el borrador de pedido y las marcas de
// idempotencia son del bot, y reescribir ese `jsonb` desde aquí perdería el
// pedido a medias de un cliente.
import { getSupabase, explicarError, ESQUEMA } from "@/lib/supabase";

export type ModoAtencion = "bot" | "humano";

export type ResultadoModo =
  | { ok: true; modo: ModoAtencion }
  | { ok: false; motivo: "sin_configuracion" | "sin_sesion" | "error"; detalle: string };

/**
 * Cambia quién atiende la conversación, en la base.
 *
 * Se escribe **solo esa columna** (más `actualizada_en`, que el receptor usa
 * para ordenar). Un `update` con el objeto entero pisaría `estado_respuesta` y
 * se llevaría por delante el borrador del bot — el mismo defecto que ya costó
 * un ciclo de pedidos imposible de completar.
 */
export async function cambiarModoAtencion(
  conversacionId: string,
  modo: ModoAtencion,
): Promise<ResultadoModo> {
  const sb = getSupabase();
  if (!sb) {
    return {
      ok: false,
      motivo: "sin_configuracion",
      detalle: "Sin configuración de Supabase: el cambio no salió del navegador.",
    };
  }

  const { data, error } = await sb
    .schema(ESQUEMA)
    .from("conversacion")
    .update({ modo_atencion: modo, actualizada_en: new Date().toISOString() })
    .eq("id", conversacionId)
    .select("id, modo_atencion");

  if (error) {
    return { ok: false, motivo: "error", detalle: explicarError(error) };
  }

  // ── La comprobación que convierte un «parece que sí» en un dato ───────────
  //
  // Un `update` que RLS no alcanza puede volver **sin error y sin filas**. Dar
  // eso por bueno sería exactamente la superficie que miente que este proyecto
  // tiene prohibida: el botón cambiaría de color y el bot seguiría mudo. Si no
  // hay fila devuelta, el cambio NO ocurrió.
  if (!data || data.length === 0) {
    return {
      ok: false,
      motivo: "sin_sesion",
      detalle:
        "La base no cambió el modo. O no hay sesión con permiso `channels.respond`, " +
        "o la conversación no es visible para este operador.",
    };
  }

  return { ok: true, modo: data[0].modo_atencion as ModoAtencion };
}

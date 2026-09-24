// ═══════════════════════════════════════════════════════════════════════════
// ENVÍO DEL ASESOR HUMANO
// ═══════════════════════════════════════════════════════════════════════════
//
// El composer de `/conversaciones` llamaba a `enviarComoNegocio`, que escribía
// el mensaje en `localStorage` y lo pintaba en el hilo. Se veía enviado; el
// cliente no recibía nada. Este módulo es el que faltaba para que el texto
// salga de verdad hacia WhatsApp.
//
// ── Por qué por HTTP y no contra Supabase ──────────────────────────────────
//
// Enviar exige `ZERNIO_API_KEY`, que es una clave de servidor: en el navegador
// cualquiera la leería con las herramientas de desarrollo. Por eso la llamada
// va a `/api/conversaciones/:id/mensajes` (proxy de Vite → servicio en :8080),
// y es el servicio quien habla con Zernio.
//
// El token de sesión viaja en `Authorization`. NO es decorativo: el servicio lo
// usa para preguntar a `necto.tengo('channels.respond')` con la identidad del
// operador. Si se omitiera, el endpoint devolvería 401.
import { getSupabase } from "@/lib/supabase";

export type ResultadoEnvio =
  | { ok: true; messageId: string | null; mensajeId: string; enviadoEn: string }
  | { ok: false; motivo: string; detalle: string; reintentable: boolean };

/** Ruta relativa: el proxy de Vite la reenvía al servicio quitando `/api`. */
const RUTA = (conversacionId: string) =>
  `/api/conversaciones/${encodeURIComponent(conversacionId)}/mensajes`;

/**
 * Traduce el `motivo` del servicio a una frase que el operador pueda entender y
 * sobre la que pueda actuar. Sin esto, un fallo llega como `sin_canal` y no dice
 * qué hacer al respecto.
 */
function explicarMotivo(motivo: string, detalle: string): string {
  switch (motivo) {
    case "sin_sesion":
      return "Tu sesión no es válida. Vuelve a entrar para responder.";
    case "sin_permiso":
      return "Tu rol no permite responder conversaciones.";
    case "sin_acceso":
      return "No tienes acceso a esta conversación.";
    case "sin_canal":
      return detalle || "Esta conversación no tiene hilo de WhatsApp al que enviar.";
    case "canal_desconectado":
      return "El canal de WhatsApp está desconectado.";
    case "texto_vacio":
      return "El mensaje está vacío.";
    case "texto_largo":
      return detalle || "El mensaje es demasiado largo.";
    case "enviado_no_guardado":
      // El peor caso y el que no se puede callar: el cliente YA lo tiene.
      return `El mensaje SÍ salió a WhatsApp, pero no se pudo guardar en la bandeja. ${detalle}`;
    case "no_enviado":
      return `WhatsApp no aceptó el envío: ${detalle}`;
    default:
      return detalle || "No se pudo enviar el mensaje.";
  }
}

/**
 * Envía un mensaje de texto de un asesor a un cliente por WhatsApp.
 *
 * No lanza: devuelve un resultado discriminado. El llamador TIENE que poder
 * distinguir «no se envió» de «se envió y no se guardó» — son dos verdades
 * distintas y la pantalla debe decir cosas distintas.
 */
export async function enviarMensajeOperador(
  conversacionId: string,
  texto: string,
  replyTo?: string
): Promise<ResultadoEnvio> {
  const sb = getSupabase();
  if (!sb) {
    return {
      ok: false,
      motivo: "sin_configuracion",
      detalle: "Sin configuración de Supabase: no se puede autenticar el envío.",
      reintentable: false,
    };
  }

  // El token se pide en el momento, no se guarda en un módulo: Supabase lo
  // refresca solo y una copia cacheada acabaría mandando un token caducado.
  const { data: sesion } = await sb.auth.getSession();
  const token = sesion.session?.access_token;
  if (!token) {
    return {
      ok: false,
      motivo: "sin_sesion",
      detalle: "No hay sesión activa. Vuelve a entrar para responder.",
      reintentable: false,
    };
  }

  let respuesta: Response;
  try {
    respuesta = await fetch(RUTA(conversacionId), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ texto, ...(replyTo ? { replyTo } : {}) }),
    });
  } catch (e) {
    // Fallo de red: no sabemos si llegó. Se marca reintentable pero se avisa de
    // que un reintento puede duplicar si el primero sí salió.
    return {
      ok: false,
      motivo: "red",
      detalle: `No se pudo contactar con el servicio: ${(e as Error).message}`,
      reintentable: true,
    };
  }

  const crudo = await respuesta.text();
  let json: Record<string, unknown> | null = null;
  try {
    json = JSON.parse(crudo) as Record<string, unknown>;
  } catch {
    /* respuesta no-JSON: se conserva el texto para el diagnóstico */
  }

  if (respuesta.ok && json?.enviado === true) {
    return {
      ok: true,
      messageId: (json.messageId as string) ?? null,
      mensajeId: String(json.mensajeId ?? ""),
      enviadoEn: String(json.enviadoEn ?? new Date().toISOString()),
    };
  }

  const motivo = typeof json?.motivo === "string" ? json.motivo : `http_${respuesta.status}`;
  const detalle =
    typeof json?.error === "string" ? json.error : crudo.slice(0, 200) || "(sin detalle)";

  return {
    ok: false,
    motivo,
    detalle: explicarMotivo(motivo, detalle),
    // 4xx es culpa nuestra: reintentar no arregla nada y puede repetir el gasto.
    reintentable: respuesta.status >= 500 || respuesta.status === 429,
  };
}

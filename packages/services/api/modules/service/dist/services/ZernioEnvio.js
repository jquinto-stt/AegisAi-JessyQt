import { createHash } from 'node:crypto';
// ═══════════════════════════════════════════════════════════════════════════
// CLIENTE DE ENVÍO DE ZERNIO
// ═══════════════════════════════════════════════════════════════════════════
//
// El único sitio del servicio que ESCRIBE hacia Zernio. Todo lo demás es
// recepción. Separarlo del DAO es deliberado: el DAO habla con Postgres, este
// con HTTP, y un fallo de red no debe parecerse a un fallo de base.
//
// ── El contrato, leído de https://zernio.com/openapi.json ─────────────────
//
//   POST /v1/inbox/conversations/{conversationId}/messages
//     · `conversationId` va en la RUTA y es **obligatorio**. Es el id INTERNO
//       de Zernio (`message.conversationId` del payload entrante), no el uuid
//       de `necto.conversacion`. Sin él no hay a dónde responder.
//     · Cuerpo: `accountId` es el **único campo obligatorio**. `message` es el
//       texto (opcional en el esquema, obligatorio en la práctica para texto).
//     · Auth: `bearerAuth`.
//     · Respuesta 2xx: `{ success, data: { messageId, … } }`, donde
//       `messageId` es el **wamid crudo de Meta**.
//
// ── Por qué `sentVia` se declara como `api` ───────────────────────────────
//
// Zernio devuelve el mensaje saliente por webhook con `direction: 'outgoing'` y
// `sentVia: 'api'`. El receptor ya descarta `outgoing`, y además `BotPedidos`
// tiene `esMensajePropio`. Son tres capas a propósito: un bot que se responde a
// sí mismo no gasta un mensaje de prueba, gasta saldo real de WhatsApp y le
// escribe al cliente en bucle.
//
// ═══════════════════════════════════════════════════════════════════════════
const API = process.env.ZERNIO_API_URL ?? 'https://zernio.com/api/v1';
/**
 * Envía un mensaje de texto dentro de una conversación de Zernio.
 *
 * No lanza nunca. El llamador decide qué hacer con el fallo, y eso importa:
 * quien envía tiene que poder distinguir «no se envió» de «se envió y falló al
 * guardar», porque son dos estados distintos de la verdad.
 */
export async function enviarTexto(zernioConversationId, accountId, texto, opciones = {}) {
    const clave = process.env.ZERNIO_API_KEY;
    if (!clave) {
        return { ok: false, error: 'Falta ZERNIO_API_KEY en el proceso.', reintentable: false };
    }
    if (!zernioConversationId) {
        return { ok: false, error: 'Sin id de conversación de Zernio: no hay a dónde responder.', reintentable: false };
    }
    if (!accountId) {
        return { ok: false, error: 'Sin accountId: Zernio lo exige en el cuerpo.', reintentable: false };
    }
    if (!texto || texto.trim().length === 0) {
        return { ok: false, error: 'Texto vacío: no se envía un mensaje en blanco.', reintentable: false };
    }
    const cuerpo = { accountId, message: texto };
    if (opciones.replyTo)
        cuerpo.replyTo = opciones.replyTo;
    if (opciones.botones && Array.isArray(opciones.botones) && opciones.botones.length > 0) {
        cuerpo.buttons = opciones.botones.slice(0, 3).map((b, i) => ({ id: `btn_${i}`, title: String(b).slice(0, 20) }));
    }
    if (opciones.secciones && Array.isArray(opciones.secciones) && opciones.secciones.length > 0) {
        cuerpo.interactive = {
            type: "list",
            header: { type: "text", text: opciones.listHeader || "Menú de Opciones" },
            body: { text: texto },
            footer: { text: opciones.listFooter || "Selecciona una opción" },
            action: {
                button: opciones.listButtonText || "Ver Opciones",
                sections: opciones.secciones
            }
        };
    } else if (opciones.interactive) {
        cuerpo.interactive = opciones.interactive;
    }
    const url = `${API}/inbox/conversations/${encodeURIComponent(zernioConversationId)}/messages`;
    let respuesta;
    try {
        respuesta = await fetch(url, {
            method: 'POST',
            headers: { Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(cuerpo),
        });
    }
    catch (e) {
        // Fallo de red: no sabemos si llegó. ES reintentable — pero el llamador
        // tiene que saber que un reintento puede duplicar si el primero sí llegó.
        return { ok: false, error: `red: ${e.message}`, reintentable: true };
    }
    const crudo = await respuesta.text();
    let json = null;
    try {
        json = JSON.parse(crudo);
    }
    catch {
        /* respuesta no-JSON: se conserva el texto para el diagnóstico */
    }
    if (!respuesta.ok) {
        const detalle = extraerError(json) ?? crudo.slice(0, 300);
        return {
            ok: false,
            status: respuesta.status,
            error: `HTTP ${respuesta.status}: ${detalle}`,
            // 4xx es culpa nuestra (payload, credencial, id): reintentar no arregla
            // nada y puede repetir el gasto. 5xx y 429 sí se pueden reintentar.
            reintentable: respuesta.status >= 500 || respuesta.status === 429,
        };
    }
    const j = json;
    return { ok: true, status: respuesta.status, messageId: j?.data?.messageId };
}
function extraerError(json) {
    if (!json || typeof json !== 'object')
        return null;
    const o = json;
    for (const k of ['error', 'message', 'detail']) {
        const v = o[k];
        if (typeof v === 'string' && v)
            return v;
        if (v && typeof v === 'object' && typeof v.message === 'string') {
            return v.message;
        }
    }
    return null;
}
/** Huella de un id, para poder registrarlo sin volcar el valor completo. */
export function huella(valor) {
    return createHash('sha256').update(valor).digest('hex').slice(0, 12);
}
//# sourceMappingURL=ZernioEnvio.js.map
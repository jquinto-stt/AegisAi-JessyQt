import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
/**
 * Verifica la firma HMAC-SHA256 de Zernio.
 *
 * Comparación en **tiempo constante**: comparar con `===` filtra por longitud y
 * por prefijo, y permite reconstruir la firma byte a byte midiendo tiempos. Es
 * un ataque real contra comparaciones ingenuas.
 *
 * Este proyecto ya se equivocó una vez con la criptografía por ir de memoria
 * (`pg_policy.polcmd`), así que aquí no se inventa nada: HMAC-SHA256 sobre el
 * **cuerpo crudo**, en hex, según lo que declara el `secret` de Zernio.
 */
export function firmaValida(cuerpoCrudo, firmaRecibida, secreto) {
    if (!secreto)
        return { ok: false, motivo: 'sin_secreto' };
    if (!firmaRecibida)
        return { ok: false, motivo: 'sin_firma' };
    const esperada = createHmac('sha256', secreto).update(cuerpoCrudo, 'utf8').digest('hex');
    const a = Buffer.from(esperada, 'utf8');
    const b = Buffer.from(firmaRecibida, 'utf8');
    if (a.length !== b.length)
        return { ok: false, motivo: 'firma_invalida' };
    if (!timingSafeEqual(a, b))
        return { ok: false, motivo: 'firma_invalida' };
    return { ok: true };
}
/**
 * Normaliza un teléfono a como vive en `necto.contacto.telefono_norm`.
 *
 * Regla: **solo dígitos, sin `+`**. Esta función replica exactamente
 * `necto.normalizar_telefono`, que es la que alimenta la columna generada
 * `contacto.telefono_norm`. Las dos tienen que decir lo mismo o el emparejamiento
 * de contactos se rompe en silencio.
 *
 * ── Defecto encontrado y corregido el 21/09 ────────────────────────────────
 * La primera versión de esta función (y la original de la función SQL) metían
 * un `+` inicial cuando el original lo traía: `'+57 300…'` → `'+57300…'`. Pero
 * `normalizarTelefono` del mock (el frontend) **no** lo hace. Resultado: el
 * frontend buscaba `'573001112233'`, la columna guardaba `'+573001112233'`, y
 * **ningún contacto existente volvía a emparejar nunca** — cada mensaje habría
 * creado un contacto nuevo.
 *
 * Se arregló en la única fuente que importa (la función SQL, en
 * `outputs/_mig-zernio.sql`) y aquí se alinea. Verificado en la base:
 * `necto.normalizar_telefono('+57 300 111 2233') = '5730011122233'`.
 *
 * Se prefiere `sender.phoneNumber` (que el contrato declara E.164 **con** `+`)
 * sobre `sender.id` (que viene **sin** `+`): el `id` puede ser un BSUID durante
 * el despliegue de esa función de Meta, y `phoneNumber` es el teléfono de verdad.
 */
export function normalizarTelefono(bruto) {
    if (!bruto)
        return null;
    const digitos = bruto.replace(/\D/g, '');
    return digitos || null;
}
/**
 * Versión para buscar en la columna `telefono_norm`.
 *
 * Hoy es la misma operación que `normalizarTelefono` — porque la columna ya
 * guarda solo dígitos. Se mantiene separada a propósito: si mañana la columna
 * cambiara de forma (p. ej. a E.164 canónico con `+`), el sitio que hay que
 * tocar es este, y no los cinco lugares que buscan contactos.
 */
export function telefonoBuscable(normalizado) {
    if (!normalizado)
        return null;
    const digitos = normalizado.replace(/\D/g, '');
    return digitos || null;
}
/**
 * Traduce el `platform` de Zernio al vocabulario de `necto.conversacion.canal`.
 *
 * Hoy se aceptan los que un CRM de WhatsApp necesita. Un canal desconocido se
 * traduce **tal cual** en vez de inventar un valor: si aparece uno nuevo, es
 * mejor verlo crudo en la base que perder de dónde vino.
 */
const CANAL = {
    whatsapp: 'whatsapp',
    instagram: 'instagram',
    facebook: 'facebook',
    telegram: 'telegram',
};
export function canalDesdePlataforma(plataforma) {
    if (!plataforma)
        return null;
    return CANAL[plataforma] ?? plataforma;
}
/**
 * Interpreta el payload de Zernio y decide si el evento se acepta.
 *
 * **Todo lo que no sea `message.received` con dirección entrante se ignora con
 * 200**, no con error: los otros 15 eventos suscritos (`message.read`,
 * `message.delivered`, …) son notificaciones legítimas que este receptor todavía
 * no consume. Devolver 4xx haría que Zernio las marcara como fallidas y las
 * reintentara para siempre.
 */
export function interpretar(payload, eventIdCabecera) {
    if (!payload || typeof payload !== 'object') {
        return { ok: false, motivo: 'json_invalido', status: 400 };
    }
    const p = payload;
    const evento = typeof p.event === 'string' ? p.event : '';
    if (evento !== 'message.received') {
        return { ok: false, motivo: 'evento_ignorado', status: 200 };
    }
    const msg = (p.message ?? {});
    const sender = (msg.sender ?? {});
    const conv = (p.conversation ?? {});
    const acct = (p.account ?? {});
    // Solo entrantes. Un `message.received` con `direction: outgoing` sería un eco
    // del propio bot, e insertarlo duplicaría cada respuesta en la bandeja.
    //
    // ⚠️ El enum REAL es `"incoming" | "outgoing"`, NO `"inbound" | "outbound"`.
    //
    // La primera versión de esto comparaba contra `'inbound'`, tomado de memoria
    // del resumen de un vídeo. Medido con el tráfico real el 22/09: Zernio manda
    // `direction: "incoming"`, así que `'incoming' !== 'inbound'` era `true` y el
    // receptor **descartaba todos los mensajes entrantes de verdad** — respondía
    // `{"recibido":true,"ignorado":"no_entrante"}` con 200 y no escribía nada.
    //
    // El test de punta a punta no lo detectó porque su payload también lo escribí
    // yo, con `'inbound'`: código y test compartían el mismo error. Un test que
    // construye su propia entrada no prueba el contrato, solo la coherencia
    // consigo mismo.
    //
    // Fuente verificada: `WebhookPayloadMessage.message.direction` en
    // https://zernio.com/openapi.json → `enum: ["incoming", "outgoing"]`.
    // Se aceptan también `inbound`/`outbound` por tolerancia con emisores que los
    // usen, pero la comparación que decide es la del enum real.
    const ENTRANTES = new Set(['incoming', 'inbound']);
    const direccion = typeof msg.direction === 'string' ? msg.direction : '';
    if (direccion && !ENTRANTES.has(direccion)) {
        return { ok: false, motivo: 'no_entrante', status: 200 };
    }
    const zernioMessageId = typeof msg.id === 'string' ? msg.id : '';
    const accountId = typeof acct.accountId === 'string' ? acct.accountId : '';
    const zernioConversationId = typeof conv.id === 'string' ? conv.id : '';
    // Sin estas tres no hay forma de deduplicar ni de saber de quién es el mensaje.
    // Es 400 y no 500: el payload llegó, pero no sirve. Un 5xx haría reintentar
    // algo que nunca va a mejorar.
    if (!zernioMessageId || !accountId) {
        return { ok: false, motivo: 'sin_identidad', status: 400 };
    }
    const telefono = normalizarTelefono(sender.phoneNumber) ??
        normalizarTelefono(sender.id);
    const canal = canalDesdePlataforma(msg.platform);
    return {
        ok: true,
        mensaje: {
            // La cabecera manda sobre el cuerpo: el contrato dice que el `id` del
            // payload se envía también como `X-Zernio-Event-Id` y que **se comparte
            // entre reintentos y reenvíos**. Se usa la cabecera cuando está, para que
            // la clave de idempotencia no dependa de que el cuerpo venga completo.
            eventId: eventIdCabecera || (typeof p.id === 'string' ? p.id : randomUUID()),
            zernioMessageId,
            plataformaMessageId: typeof msg.platformMessageId === 'string' ? msg.platformMessageId : '',
            zernioConversationId,
            accountId,
            canal: canal ?? 'whatsapp',
            telefonoNorm: telefono,
            nombre: (typeof sender.name === 'string' && sender.name) ||
                (typeof sender.username === 'string' && sender.username) ||
                null,
            // ── El texto va en `msg.message`, NO en `msg.text` ───────────────
            //
            // Defecto medido el 22/09 con un entrante real: aquí decía
            // `msg.text`, y Zernio manda el texto en `msg.message`. El campo
            // `text` no existe en su payload, así que SIEMPRE llegaba `null` y
            // el mensaje del cliente entraba sin cuerpo.
            //
            // El daño no era un error visible, era peor: `decidir()` recibe
            // texto vacío, devuelve `accion:'handoff'` con motivo `'sin_texto'`
            // y **transfiere el hilo a humano**. El bot se apagaba solo en el
            // primer mensaje de cada cliente, `modo_atencion` pasaba a `humano`
            // y todos los mensajes siguientes entraban sin respuesta. El
            // cliente escribe «Hola» y no le contesta nadie — que es exactamente
            // el síntoma que se reportó.
            //
            // Se aceptan los dos nombres, y en este orden: `message` es el del
            // contrato (`WebhookPayloadMessage.message` en la OpenAPI),
            // `text` queda por tolerancia con emisores que lo usen.
            texto: typeof msg.message === 'string' && msg.message.trim().length > 0 ? msg.message
                : typeof msg.text === 'string' && msg.text.trim().length > 0 ? msg.text
                : typeof msg.buttonPayload === 'string' ? msg.buttonPayload
                : typeof msg.buttonText === 'string' ? msg.buttonText
                : typeof msg.interactive?.button_reply?.title === 'string' ? msg.interactive.button_reply.title
                : typeof msg.interactive?.list_reply?.title === 'string' ? msg.interactive.list_reply.title
                : typeof msg.button_reply?.title === 'string' ? msg.button_reply.title
                : typeof msg.list_reply?.title === 'string' ? msg.list_reply.title
                : typeof msg.interactive?.button_reply?.id === 'string' ? msg.interactive.button_reply.id
                : typeof msg.interactive?.list_reply?.id === 'string' ? msg.interactive.list_reply.id
                : msg.location && typeof msg.location === 'object' ? `Ubicación GPS: ${msg.location.address || msg.location.name || 'Coordenadas'} (Lat: ${msg.location.latitude}, Lng: ${msg.location.longitude})`
                : msg.type === 'location' ? 'Ubicación GPS compartida por el cliente'
                : null,
            enviadoEn: typeof msg.sentAt === 'string' ? msg.sentAt : new Date().toISOString(),
            adjuntos: Array.isArray(msg.attachments) ? msg.attachments : [],
            // Medido en el tráfico real: el payload de Zernio NO siempre trae
            // `attemptNumber`. Se lee del mensaje y del sobre, en ese orden, y se deja
            // `null` si no está — el bot no depende de este campo para decidir.
            intento: numeroDeIntento(msg.attemptNumber) ?? numeroDeIntento(p.attemptNumber),
        },
    };
}
/** Lee un número de intento, entero y >= 1. `null` si no es utilizable. */
function numeroDeIntento(v) {
    const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
    return Number.isInteger(n) && n >= 1 ? n : null;
}
/** Código HTTP y motivo legible para cada rechazo. */
export function respuestaDeRechazo(r) {
    switch (r.motivo) {
        case 'sin_secreto':
            // 500 legítimo: es un fallo de NUESTRA configuración, y queremos que se
            // vea. Zernio reintentará, y está bien que lo haga: en cuanto se ponga el
            // secreto, el mensaje entra.
            return { status: 500, cuerpo: { error: 'webhook sin secreto configurado' } };
        case 'sin_firma':
        case 'firma_invalida':
            // 401: no es de Zernio. Reintentar no arregla nada.
            return { status: 401, cuerpo: { error: 'firma inválida' } };
        case 'evento_ignorado':
        case 'no_entrante':
            // 200 deliberado: se acusa recibo para que Zernio no reintente.
            return { status: 200, cuerpo: { recibido: true, ignorado: r.motivo } };
        case 'json_invalido':
        case 'sin_identidad':
        default:
            return { status: 400, cuerpo: { error: r.motivo } };
    }
}
//# sourceMappingURL=ZernioWebhook.js.map
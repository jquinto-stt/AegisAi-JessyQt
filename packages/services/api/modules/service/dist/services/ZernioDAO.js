import { createClient } from '@supabase/supabase-js';
import { telefonoBuscable } from './ZernioWebhook.js';
// ═══════════════════════════════════════════════════════════════════════════
// ESCRITURA DEL MENSAJE ENTRANTE EN EL ESQUEMA `necto`
// ═══════════════════════════════════════════════════════════════════════════
//
// Este es el único archivo que conoce a la vez el payload de Zernio y las tablas
// de `necto`. La traducción vive aquí, igual que `db.adapters.ts` hace en el
// frontend: el controlador solo transporta.
//
// ── Por qué se usa la service_role ────────────────────────────────────────
//
// Un webhook entrante no tiene sesión: no hay `auth.uid()`, así que las 55
// políticas RLS no pueden resolver a nadie y todas las escrituras fallarían.
// Es el mismo problema que resolvimos en la cadena de identidad, por el otro
// lado. La service_role salta RLS y por eso **vive SOLO aquí**, en el servicio
// de servidor, leída de `process.env` — nunca en el bundle de Vite.
//
// Consecuencia que hay que asumir con los ojos abiertos: **la autorización de
// este camino la hace el código, no la base.** Por eso el endpoint verifica la
// firma HMAC antes de llamar a nada de este archivo.
//
// ── Idempotencia ──────────────────────────────────────────────────────────
//
// Zernio reintenta (`attemptNumber` incrementa en su `WebhookLog`). Sin
// deduplicar, cada reintento reinserta el mensaje y la bandeja se llena de
// copias. La clave es `X-Zernio-Event-Id`, que el contrato declara estable entre
// reintentos y reenvíos.
//
// ═══════════════════════════════════════════════════════════════════════════
const ESQUEMA = 'necto';
let cliente = null;
/**
 * Cliente de servidor. Devuelve `null` si falta configuración, en vez de
 * lanzar: un webhook sin base de datos configurada debe responder con un error
 * claro, no tumbar el proceso.
 *
 * ── Por qué el esquema va POR CONSULTA y no en `createClient` ──────────────
 *
 * Pasar `db: { schema: 'necto' }` produce `TS2322`: el genérico del esquema está
 * atado a los tipos generados, y este proyecto no los genera (el modelo vive en
 * `Docs/07-ddl-necto.sql`). Es el mismo defecto que ya apareció en el cliente
 * del frontend. La solución es la misma y por la misma razón: el esquema se fija
 * en cada consulta con `.schema(ESQUEMA)`, que es donde el nombre viaja de
 * verdad. Aquí se usa el helper `t()` para que no se pueda olvidar.
 */
export function getClienteServidor() {
    if (cliente)
        return cliente;
    const url = process.env.SUPABASE_URL;
    const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !clave)
        return null;
    // ── Clave publicable frente a credencial ─────────────────────────────────
    //
    // `supabase-js` manda el segundo argumento de `createClient` en DOS
    // cabeceras: `apikey` y `Authorization`. Para la service_role da igual
    // (el valor vale para las dos), pero para un **JWT de usuario no**: PostgREST
    // exige una `apikey` de proyecto válida y responde
    // `401 {"message":"Invalid API key"}` si le llega un JWT en esa cabecera.
    //
    // Por eso se separan: `SUPABASE_ANON_KEY` (o la publishable) va como
    // `apikey`, y la credencial real —service_role o el JWT— como
    // `Authorization`. Cuando no se define la publicable se mantiene el
    // comportamiento anterior, que es el de producción con service_role.
    const publicable = process.env.SUPABASE_ANON_KEY;
    const opciones = {
        auth: { persistSession: false, autoRefreshToken: false },
    };
    if (publicable && publicable !== clave) {
        opciones.global = { headers: { Authorization: `Bearer ${clave}` } };
        cliente = createClient(url, publicable, opciones);
        return cliente;
    }
    cliente = createClient(url, clave, opciones);
    return cliente;
}
/** Acceso a una tabla del esquema `necto`. Ver el docblock de arriba. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function t(sb, tabla) {
    return sb.schema(ESQUEMA).from(tabla);
}
/** Olvida el cliente cacheado (tests). */
export function reiniciarClienteServidor() {
    cliente = null;
}
/**
 * Resuelve de qué organización es el mensaje.
 *
 * El payload identifica la cuenta (el número de WhatsApp) pero **no la
 * organización**: eso es una relación de negocio, no un dato del mensaje. Si no
 * hay una fila en `integracion_canal`, el mensaje no se puede atribuir a nadie,
 * y adivinar sería peor que rechazarlo: un mensaje atribuido a la organización
 * equivocada lo ve el negocio que no debe.
 */
async function resolverOrganizacion(sb, accountId) {
    // Solo las columnas que EXISTEN. La primera versión de esto pedía
    // `conversacion_zernio_id`, una columna que nunca estuvo en la migración:
    // PostgREST devolvía error y el DAO lo interpretaba como «cuenta no
    // enlazada», así que el mensaje se rechazaba por una columna inventada. Es
    // exactamente el tipo de fallo que un `select *` habría escondido.
    const { data, error } = await t(sb, 'integracion_canal')
        .select('organizacion_id')
        .eq('proveedor', 'zernio')
        .eq('external_account_id', accountId)
        .maybeSingle();
    if (error || !data)
        return null;
    const fila = data;
    return {
        organizacionId: fila.organizacion_id,
        conversacionZernioId: null,
        // Defaults del esquema, no inventados: se leen de la tabla para no repetir
        // literales que ya están declarados como `default` en el DDL.
        moduloDestino: null,
        modoAtencion: null,
        estadoConversacion: null,
    };
}
/**
 * Persiste el mensaje entrante: contacto → conversación → mensaje.
 *
 * El orden es obligatorio por las claves foráneas: `conversacion.contacto_id`
 * apunta a `contacto`, y `mensaje.conversacion_id` apunta a `conversacion`.
 */
export async function persistirEntrante(m) {
    const sb = getClienteServidor();
    if (!sb) {
        return {
            ok: false,
            duplicado: false,
            error: 'Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el proceso.',
        };
    }
    // ── 0. Idempotencia ──────────────────────────────────────────────────────
    //
    // Se consulta antes de escribir. No es una carrera perfecta (dos reintentos
    // simultáneos podrían pasar los dos), pero sí cubre el caso real: Zernio
    // reintenta **después** de un fallo, en serie. La barrera dura sería un
    // índice único sobre `zernio_event_id`; queda como deuda explícita hasta que
    // se migre el esquema (ver Doc 06 §12.7).
    const { data: yaEsta, error: errDup } = await t(sb, 'mensaje')
        .select('id')
        .eq('zernio_event_id', m.eventId)
        .maybeSingle();
    // Si la columna no existe todavía, esto falla con 42703. Se distingue de
    // «no hay duplicado» en vez de tragárselo, porque silenciarlo convertiría un
    // esquema desactualizado en duplicados invisibles.
    if (errDup && errDup.code !== 'PGRST116') {
        return {
            ok: false,
            duplicado: false,
            error: `No se pudo comprobar idempotencia (¿falta la migración?): ${errDup.message}`,
        };
    }
    if (yaEsta) {
        return { ok: true, duplicado: true, mensajeId: yaEsta.id };
    }
    // ── 1. Organización ──────────────────────────────────────────────────────
    const org = await resolverOrganizacion(sb, m.accountId);
    if (!org) {
        return {
            ok: false,
            duplicado: false,
            error: `La cuenta ${m.accountId} no está enlazada a ninguna organización. ` +
                `Se enlaza en \`necto.integracion_canal\` (proveedor='zernio', ` +
                `external_account_id='${m.accountId}', organizacion_id=...).`,
        };
    }
    // ── 2. Contacto (find-or-create por teléfono) ────────────────────────────
    const buscable = telefonoBuscable(m.telefonoNorm);
    let contactoId = null;
    if (buscable) {
        const { data: existente } = await t(sb, 'contacto')
            .select('id')
            .eq('organizacion_id', org.organizacionId)
            .eq('telefono_norm', buscable)
            .maybeSingle();
        contactoId = existente?.id ?? null;
    }
    if (!contactoId) {
        const { data: creado, error: errC } = await t(sb, 'contacto')
            .insert({
            organizacion_id: org.organizacionId,
            // `telefono` es NOT NULL: si el payload no trajo número (p. ej. un
            // usuario de WhatsApp que solo expone BSUID), se usa el id de Zernio
            // como identificador visible en vez de inventar un número.
            telefono: m.telefonoNorm ?? `zernio:${m.zernioMessageId}`,
            // `telefono_norm` NO se escribe: es `GENERATED ALWAYS AS
            // necto.normalizar_telefono(telefono) STORED`. Postgres la calcula y
            // rechaza el insert con «cannot insert a non-DEFAULT value into column
            // telefono_norm». Se lee para buscar (arriba), se escribe para que la
            // base la derive. Es la única forma de que el índice único
            // `(organizacion_id, telefono_norm)` y el frontend coincidan siempre.
            nombre: m.nombre,
            origen: m.canal,
        })
            .select('id')
            .single();
        if (errC) {
            return { ok: false, duplicado: false, error: `contacto: ${errC.message}` };
        }
        contactoId = creado.id;
    }
    // ── 3. Conversación (find-or-create) ─────────────────────────────────────
    //
    // ── Por qué primero por `zernio_conversation_id` ─────────────────────────
    //
    // Este es el arreglo de un defecto real. Antes se buscaba «la conversación
    // abierta del contacto en ese canal», y eso tiene dos consecuencias medidas:
    //
    //   1. **Un reintento de Zernio abre un hilo duplicado.** Zernio reintenta
    //      con el mismo `conversation.id` (ese reintento salvó un mensaje real el
    //      22/09). Buscar por contacto crea OTRA fila para el mismo cliente, y la
    //      bandeja muestra dos hilos: el segundo sin los mensajes del primero.
    //   2. **Sin el id de Zernio no se puede RESPONDER.** El endpoint de envío lo
    //      exige en la ruta (`/v1/inbox/conversations/{conversationId}/messages`)
    //      y es el id interno de Zernio, no el uuid de `necto`. Guardarlo aquí es
    //      lo que le da destinatario a la respuesta del bot.
    //
    // El id es la identidad del hilo, no el teléfono: el mismo número puede
    // escribir por WhatsApp y por Instagram y son dos conversaciones distintas.
    let conversacionId = null;
    if (m.zernioConversationId) {
        const { data: porZernio } = await t(sb, 'conversacion')
            .select('id')
            .eq('zernio_conversation_id', m.zernioConversationId)
            .maybeSingle();
        conversacionId = porZernio?.id ?? null;
    }
    // Reserva para payloads sin `conversation.id` (hoy ninguno de WhatsApp, pero
    // el contrato lo declara opcional). Se mantiene el criterio antiguo, con la
    // salvedad de que ahora la fila nueva ya guarda su id de Zernio si lo trae.
    if (!conversacionId) {
        const { data: convExistente } = await t(sb, 'conversacion')
            .select('id, estado')
            .eq('organizacion_id', org.organizacionId)
            .eq('contacto_id', contactoId)
            .eq('canal', m.canal)
            .in('estado', ['abierta', 'pendiente'])
            .is('zernio_conversation_id', null)
            .order('actualizada_en', { ascending: false })
            .limit(1)
            .maybeSingle();
        conversacionId = convExistente?.id ?? null;
    }
    if (!conversacionId) {
        // Los valores por defecto se leen del DDL, no se inventan: `necto` declara
        // `canal`, `estado`, `modo_atencion` y `modulo_destino` como NOT NULL.
        //
        // `modo_atencion` NO se escribe: su default en el DDL es `'bot'`. La versión
        // anterior lo forzaba a `'humano'`, y eso hacía que el bot nunca respondiera
        // aunque estuviera implementado — nacía desactivado y nadie lo notaba.
        const { data: conv, error: errConv } = await t(sb, 'conversacion')
            .insert({
            organizacion_id: org.organizacionId,
            contacto_id: contactoId,
            canal: m.canal,
            estado: 'abierta',
            modulo_destino: 'pedidos',
            no_leidos: 0,
            zernio_conversation_id: m.zernioConversationId || null,
        })
            .select('id')
            .single();
        if (errConv) {
            // 23505 sobre `conversacion_zernio_uniq`: dos entregas del mismo evento
            // a la vez, la otra ya creó la fila. Se relee en vez de propagar.
            if (errConv.code === '23505' && m.zernioConversationId) {
                const { data: ya } = await t(sb, 'conversacion')
                    .select('id')
                    .eq('zernio_conversation_id', m.zernioConversationId)
                    .maybeSingle();
                conversacionId = ya?.id ?? null;
            }
            if (!conversacionId) {
                return { ok: false, duplicado: false, error: `conversacion: ${errConv.message}` };
            }
        }
        else {
            conversacionId = conv.id;
        }
    }
    // ── 4. Mensaje ───────────────────────────────────────────────────────────
    //
    // `contenido` es **jsonb** en `necto`, no texto (a diferencia del esquema del
    // video). Se guarda un objeto con el texto y los adjuntos para no perder
    // nada, y para que un mensaje solo-adjunto siga siendo legible.
    const { data: msg, error: errM } = await t(sb, 'mensaje')
        .insert({
        conversacion_id: conversacionId,
        autor: 'cliente',
        // `autor_id` es FK a `operador`: un cliente NO es un operador, así que va
        // a NULL. Es la diferencia que el esquema del video no tenía.
        autor_id: null,
        contenido: {
            texto: m.texto,
            adjuntos: m.adjuntos,
            plataforma: m.canal,
            plataforma_message_id: m.plataformaMessageId,
            zernio_message_id: m.zernioMessageId,
        },
        zernio_event_id: m.eventId,
        enviado_en: m.enviadoEn,
    })
        .select('id')
        .single();
    if (errM)
        return { ok: false, duplicado: false, error: `mensaje: ${errM.message}` };
    // ── 5. No leídos + marca de tiempo de la conversación ────────────────────
    //
    // Best-effort: si falla, el mensaje YA está guardado y devolver error haría
    // que Zernio reintentara y... bueno, ya está deduplicado, pero es innecesario.
    await t(sb, 'conversacion')
        .update({ actualizada_en: new Date().toISOString() })
        .eq('id', conversacionId);
    return {
        ok: true,
        duplicado: false,
        contactoId,
        conversacionId,
        mensajeId: msg.id,
    };
}
//# sourceMappingURL=ZernioDAO.js.map
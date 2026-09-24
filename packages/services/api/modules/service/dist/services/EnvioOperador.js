// ═══════════════════════════════════════════════════════════════════════════
// ENVÍO DEL OPERADOR (asesor humano escribe al cliente)
// ═══════════════════════════════════════════════════════════════════════════
//
// Hasta ahora el único que escribía hacia Zernio era el BOT. El operador tenía
// un composer que guardaba el texto en `localStorage` y no salía del navegador:
// la pantalla decía «enviado» y el cliente no recibía nada. Eso es exactamente
// la superficie que no se debe entregar —un control que miente—, así que este
// servicio existe para que el mensaje del asesor llegue de verdad.
//
// ── Por qué esto NO puede vivir en el frontend ─────────────────────────────
//
// La llamada a Zernio exige `ZERNIO_API_KEY`. El navegador no puede tenerla: es
// una clave de servidor y cualquiera que abra las herramientas de desarrollo la
// leería. Por eso el envío pasa por aquí, que es donde vive la clave.
//
// ── Por qué la autorización NO se delega al navegador ──────────────────────
//
// El gateway de este servicio NO valida JWT automáticamente (medido: `GET
// /queues` sin token devuelve 500 de DynamoDB, no 401). Así que este endpoint
// verifica por su cuenta, y en este orden:
//
//   1. Que haya un JWT y que Supabase lo acepte  → `/auth/v1/user`.
//   2. Que ESE usuario pueda responder           → RPC `tengo('channels.respond')`
//      ejecutado **con su propio token**, no con `service_role`.
//   3. Que la conversación sea de la misma organización → la fila se lee con su
//      token y RLS decide. Si RLS no deja verla, no existe para él.
//
// El paso 2 es el importante: se le pregunta a la MISMA función que usan las
// políticas RLS (`necto.tengo`), con la identidad del operador. Duplicar la
// lógica de permisos aquí sería una segunda fuente de verdad que se
// desincronizaría del `rol_capacidad` real.
//
// La escritura final del mensaje usa `service_role` a propósito: el operador no
// tiene INSERT sobre `mensaje` (el bot escribe con la clave de servidor), y lo
// que autoriza aquí no es la RLS de esa tabla sino el paso 2, ya verificado.
import { createClient } from '@supabase/supabase-js';
import { enviarTexto } from './ZernioEnvio.js';
/** Cliente con `service_role`. Solo para leer/ escribir lo que ya se autorizó. */
function getClienteServidor() {
    const url = process.env.SUPABASE_URL;
    const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !clave)
        return null;
    return createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });
}
/**
 * Cliente que habla en nombre del OPERADOR (su JWT).
 *
 * Es el que se usa para comprobar permisos y para leer la conversación: así la
 * decisión la toma RLS con la identidad real, no una comprobación paralela.
 */
function getClienteUsuario(jwt) {
    const url = process.env.SUPABASE_URL;
    const clave = process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !clave)
        return null;
    return createClient(url, clave, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
}
/** Quita el prefijo `Bearer ` de la cabecera, si viene. */
export function extraerToken(cabecera) {
    if (typeof cabecera !== 'string')
        return null;
    const t = cabecera.replace(/^Bearer\s+/i, '').trim();
    return t.length > 0 ? t : null;
}
/**
 * ¿Es este token un usuario válido de Supabase, y puede responder?
 *
 * Devuelve el uid y, si algo falla, el motivo en lenguaje llano para que el
 * operador sepa qué pasa en vez de ver un 500 mudo.
 */
async function autorizarOperador(jwt) {
    const url = process.env.SUPABASE_URL;
    const anon = process.env.SUPABASE_ANON_KEY;
    if (!url || !anon) {
        return { ok: false, status: 500, error: 'Falta SUPABASE_URL o SUPABASE_ANON_KEY en el proceso.' };
    }
    // 1 · ¿El token es de verdad un usuario? Se pregunta al propio Supabase.
    //
    // ── Por qué 401 y 403 se tratan IGUAL aquí ───────────────────────────────
    //
    // `/auth/v1/user` responde **403** cuando el token es inválido o caducado, no
    // 401. Medido con un token basura: `403 Sesión no válida`. La primera versión
    // de esto solo contemplaba 401, así que un token inválido se clasificaba como
    // `sin_permiso` y el operador leía «tu rol no permite responder» — un
    // diagnóstico FALSO que lo mandaría a revisar permisos que no son el
    // problema. Lo que pasa es que su sesión no vale, y eso se dice.
    let usuario;
    try {
        const r = await fetch(`${url}/auth/v1/user`, {
            headers: { apikey: anon, Authorization: `Bearer ${jwt}` },
        });
        if (r.status === 401 || r.status === 403) {
            return { ok: false, status: 401, error: 'Tu sesión no es válida o ya caducó. Vuelve a entrar.' };
        }
        if (!r.ok) {
            return { ok: false, status: 502, error: `No se pudo verificar la sesión (HTTP ${r.status}).` };
        }
        usuario = (await r.json());
    }
    catch (e) {
        return { ok: false, status: 502, error: `no se pudo verificar la sesión: ${e.message}` };
    }
    if (!usuario?.id) {
        return { ok: false, status: 401, error: 'La sesión no tiene usuario asociado.' };
    }
    // 2 · ¿Puede responder en el canal? Se le pregunta a `necto.tengo`, la misma
    // función que consultan las políticas RLS, con SU identidad.
    const sb = getClienteUsuario(jwt);
    if (!sb) {
        return { ok: false, status: 500, error: 'No se pudo crear el cliente de usuario.' };
    }
    const { data: puede, error: errPuede } = await sb.schema('necto').rpc('tengo', { p_capacidad: 'channels.respond' });
    if (errPuede) {
        return { ok: false, status: 500, error: `no se pudo verificar el permiso: ${errPuede.message}` };
    }
    if (puede !== true) {
        return { ok: false, status: 403, error: 'Tu rol no permite responder conversaciones (channels.respond).' };
    }
    return { ok: true, usuarioId: usuario.id, sbUsuario: sb };
}
/**
 * Traduce el uuid de `auth.users` al id de `necto.operador`.
 *
 * La cadena es de DOS saltos y por eso está escrita explícita, en vez de un
 * `.eq()` suelto que parece obvio y no lo es:
 *
 *   auth.users.id ──▶ usuario.auth_user_id ──▶ usuario.id ──▶ operador.usuario_id
 *
 * Devuelve `null` si algún eslabón falta (usuario sin fila en `necto.usuario`,
 * o usuario sin operador). El llamador decide qué hacer con eso; aquí no se
 * lanza, porque quedarse sin atribución no debe tumbar un envío que ya ocurrió.
 */
async function resolverOperador(sbServidor, authUserId) {
    if (!authUserId)
        return null;
    // Salto 1 · auth.users -> necto.usuario (por `auth_user_id`).
    const { data: usuario, error: errUsuario } = await sbServidor
        .schema('necto')
        .from('usuario')
        .select('id')
        .eq('auth_user_id', authUserId)
        .maybeSingle();
    if (errUsuario) {
        console.warn(`[envio-operador] no se pudo leer necto.usuario: ${errUsuario.message}`);
        return null;
    }
    if (!usuario) {
        console.warn(`[envio-operador] auth.users ${authUserId} no tiene fila en necto.usuario.`);
        return null;
    }
    // Salto 2 · necto.usuario -> necto.operador (por `usuario_id`).
    const { data: operador, error: errOperador } = await sbServidor
        .schema('necto')
        .from('operador')
        .select('id, organizacion_id')
        .eq('usuario_id', usuario.id)
        .maybeSingle();
    if (errOperador) {
        console.warn(`[envio-operador] no se pudo leer necto.operador: ${errOperador.message}`);
        return null;
    }
    if (!operador) {
        console.warn(`[envio-operador] necto.usuario ${usuario.id} no tiene operador asociado.`);
        return null;
    }
    return operador;
}
/**
 * Envía un mensaje de texto de un operador a un cliente por WhatsApp.
 *
 * No lanza: devuelve un resultado discriminado, porque el llamador TIENE que
 * poder distinguir «no se envió» de «se envió pero no se guardó» — son dos
 * estados distintos de la verdad y la UI debe decir cosas distintas.
 */
export async function enviarComoOperador(entrada) {
    const { conversacionId, texto, jwt, replyTo } = entrada;
    if (!conversacionId) {
        return { ok: false, estado: 'sin_conversacion', error: 'Falta el id de la conversación.' };
    }
    if (!texto || texto.trim().length === 0) {
        return { ok: false, estado: 'texto_vacio', error: 'El mensaje está vacío.' };
    }
    if (texto.length > 4096) {
        return { ok: false, estado: 'texto_largo', error: `El mensaje supera los 4096 caracteres (${texto.length}).` };
    }
    if (!jwt) {
        return { ok: false, estado: 'sin_sesion', error: 'No hay sesión. Vuelve a entrar para responder.' };
    }
    // ── Autorización ─────────────────────────────────────────────────────────
    const auth = await autorizarOperador(jwt);
    if (!auth.ok) {
        return { ok: false, estado: 'sin_permiso', error: auth.error, status: auth.status };
    }
    const sbServidor = getClienteServidor();
    if (!sbServidor) {
        return { ok: false, estado: 'sin_configuracion', error: 'Falta SUPABASE_SERVICE_ROLE_KEY en el proceso.' };
    }
    // ── La conversación se lee con el token del operador ─────────────────────
    //
    // Si RLS no le deja verla, `data` viene vacía: eso es «no existe para él»,
    // no «no existe». Se distinguen porque la respuesta al operador es distinta
    // («no tienes acceso a esa conversación» frente a «esa conversación no
    // existe»), y decir la verdad importa más que unificar el error.
    const { data: conv, error: errConv } = await auth.sbUsuario
        .schema('necto')
        .from('conversacion')
        .select('id, organizacion_id, zernio_conversation_id, modo_atencion, estado')
        .eq('id', conversacionId)
        .maybeSingle();
    if (errConv) {
        return { ok: false, estado: 'error', error: `no se pudo leer la conversación: ${errConv.message}` };
    }
    if (!conv) {
        return { ok: false, estado: 'sin_acceso', error: 'Esa conversación no existe o no tienes acceso a ella.' };
    }
    if (!conv.zernio_conversation_id) {
        return {
            ok: false,
            estado: 'sin_canal',
            error: 'Esta conversación no tiene hilo en WhatsApp: no hay a dónde enviar. ' +
                'Aparece cuando el contacto existe pero nunca escribió por el canal.',
        };
    }
    // ── El `accountId` que exige Zernio ──────────────────────────────────────
    //
    // Es obligatorio en el cuerpo y NO está en `conversacion`: vive en la fila
    // del canal de la organización (`integracion_canal.external_account_id`).
    // Se resuelve por organización y proveedor, no por el id del hilo.
    const { data: canal, error: errCanal } = await sbServidor
        .schema('necto')
        .from('integracion_canal')
        .select('external_account_id, conectado, numero')
        .eq('organizacion_id', conv.organizacion_id)
        .eq('proveedor', 'zernio')
        .maybeSingle();
    if (errCanal) {
        return { ok: false, estado: 'error', error: `no se pudo leer el canal: ${errCanal.message}` };
    }
    if (!canal?.external_account_id) {
        return {
            ok: false,
            estado: 'sin_canal',
            error: 'La organización no tiene un canal de WhatsApp enlazado (integracion_canal).',
        };
    }
    if (canal.conectado === false) {
        return { ok: false, estado: 'canal_desconectado', error: 'El canal de WhatsApp está desconectado.' };
    }
    // ── Envío ────────────────────────────────────────────────────────────────
    const envio = await enviarTexto(conv.zernio_conversation_id, canal.external_account_id, texto, replyTo ? { replyTo } : {});
    if (!envio.ok) {
        return { ok: false, estado: 'no_enviado', error: envio.error, reintentable: envio.reintentable };
    }
    // ── Persistencia ─────────────────────────────────────────────────────────
    //
    // Se guarda DESPUÉS de enviar y con `service_role`: el operador no tiene
    // INSERT sobre `mensaje`. Si esto falla, el cliente YA recibió el mensaje, y
    // se devuelve como fallo parcial — decir `ok` aquí escondería que la bandeja
    // y el teléfono del cliente ven cosas distintas.
    //
    // `autor` es `'negocio'` y no `'asistente'`: el check del esquema admite
    // `cliente|negocio|sistema|asistente`, y `'asistente'` es lo que escribe el
    // BOT. Marcarlo como asistente atribuiría al bot un mensaje de una persona.
    //
    // El `autor_id` se resuelve ANTES del insert, no después: la columna apunta
    // a `necto.operador`, y el JWT da el uuid de `auth.users`, que **no** es
    // ninguno de los dos ids que hacen falta.
    //
    // ── La cadena son DOS saltos, no uno (medido el 22/09) ───────────────────
    //
    //   auth.users.id ──▶ necto.usuario.auth_user_id
    //   necto.usuario.id ──▶ necto.operador.usuario_id
    //
    // Es decir: `operador.usuario_id` NO apunta a `auth.users`. Apunta a
    // `necto.usuario`. Dos versiones anteriores de esto estuvieron mal y
    // **ninguna falló de forma visible**:
    //
    //   · v1: `.eq('auth_user_id', …)` sobre `operador` → columna inexistente.
    //   · v2: `.eq('usuario_id', <auth.users.id>)` → 0 filas, porque compara el
    //     uuid equivocado.
    //
    // Las dos terminaban en `operador === null` y escribían `autor_id: null` con
    // un `INSERT` perfectamente válido: la columna admite null, el FK no se
    // queja y el mensaje se guarda. El síntoma no es un error, es un mensaje sin
    // autor — y por eso hay que comprobarlo, no suponerlo.
    //
    // Si la cadena se rompe, se registra pero NO se cancela el envío: el cliente
    // ya recibió el mensaje y perder la atribución es menos grave que perder el
    // mensaje. Lo que no se hace es callarlo.
    const operador = await resolverOperador(sbServidor, auth.usuarioId);
    if (!operador) {
        console.warn('[envio-operador] no se pudo resolver el operador para el usuario ' +
            `${auth.usuarioId}: el mensaje se guardará con autor_id null.`);
    }
    const { data: guardado, error: errGuardar } = await sbServidor
        .schema('necto')
        .from('mensaje')
        .insert({
        conversacion_id: conv.id,
        autor: 'negocio',
        autor_id: operador?.id ?? null,
        contenido: { tipo: 'texto', texto },
        zernio_event_id: envio.messageId ?? null,
    })
        .select('id, enviado_en')
        .maybeSingle();
    if (errGuardar || !guardado) {
        return {
            ok: false,
            estado: 'enviado_no_guardado',
            messageId: envio.messageId ?? null,
            error: `se envió, pero no se pudo guardar en la bandeja: ${errGuardar?.message ?? 'sin fila devuelta'}`,
        };
    }
    // La conversación sube en la bandeja y deja de estar «no leída».
    await sbServidor
        .schema('necto')
        .from('conversacion')
        .update({ actualizada_en: new Date().toISOString(), no_leidos: 0 })
        .eq('id', conv.id);
    return {
        ok: true,
        messageId: envio.messageId ?? null,
        mensajeId: guardado.id,
        enviadoEn: guardado.enviado_en,
        operadorId: operador?.id ?? null,
    };
}

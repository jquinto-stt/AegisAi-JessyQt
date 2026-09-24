import { createClient } from '@supabase/supabase-js';
import { telefonoBuscable, } from './ZernioWebhook.js';
import { decidir, esMensajePropio, borradorNuevo, agregarLinea, paso } from './BotPedidos.js';
import { generarRespuestaIA } from './GeneradorIA.js';
// ═══════════════════════════════════════════════════════════════════════════
// ACCESO A LA BASE PARA EL BOT DE PEDIDOS
// ═══════════════════════════════════════════════════════════════════════════
//
// Este archivo NO decide: lee lo que el bot necesita, y escribe lo que el bot
// produce. La decisión vive en `BotPedidos.ts` y el transporte en
// `ZernioEnvio.ts`. Separados así, la decisión se puede probar sin base ni red.
//
// ── Por qué service_role y no un JWT de operador ──────────────────────────
//
// Medido: la política `pedido_lectura` exige `necto.modulo_activo('pedidos')`,
// que necesita una fila en `modulo_organizacion`. Un JWT de operador
// simplemente no ve los pedidos mientras el módulo no esté instalado — y ese
// es un fallo SILENCIOSO: devuelve `[]`, indistinguible de «este cliente no
// tiene pedidos». El bot diría «no puedo verificar tu pedido» y parecería
// correcto.
//
// Con service_role el bot ve lo que hay y puede distinguir «no hay pedidos» de
// «la política me los esconde». La contrapartida se asume con los ojos
// abiertos: **la autorización de este camino la hace el código**, porque el
// bot solo puede escribir en la conversación de la que viene el mensaje.
//
// ── Por qué se resuelve por `zernio_conversation_id` y NO por teléfono ─────
//
// Es el defecto que este archivo corrige. La versión anterior buscaba «la
// conversación abierta del contacto», y eso produce DOS fallos medidos:
//
//   1. **El reintento de Zernio abre un hilo duplicado.** Zernio reintenta con
//      el mismo `conversation.id` (lo salvó un mensaje real el 22/09). Buscar
//      por contacto crea otra fila, y la bandeja muestra el mismo cliente dos
//      veces — la segunda sin los mensajes de la primera.
//   2. **La respuesta no se puede enrutar sin el id de Zernio.** El endpoint de
//      envío exige `conversationId` en la ruta y es el id INTERNO de Zernio.
//      Sin guardarlo, la respuesta no tiene destinatario.
//
// ═══════════════════════════════════════════════════════════════════════════
const ESQUEMA = 'necto';
let cliente = null;
/**
 * Cliente de servidor. Devuelve `null` si falta configuración en vez de lanzar:
 * un webhook sin base configurada debe responder con un error claro, no tumbar
 * el proceso. Mismo patrón y misma razón que en `ZernioDAO.ts`.
 */
export function getCliente() {
    if (cliente)
        return cliente;
    const url = process.env.SUPABASE_URL;
    const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !clave)
        return null;
    cliente = createClient(url, clave, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    return cliente;
}
/** Olvida el cliente cacheado (scripts y pruebas). */
export function reiniciarCliente() {
    cliente = null;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function t(sb, tabla) {
    return sb.schema(ESQUEMA).from(tabla);
}
/**
 * Resuelve de qué organización es la cuenta de Zernio.
 *
 * ── El defecto que se corrige aquí ────────────────────────────────────────
 *
 * La versión anterior hacía `.eq('proveedor','zernio').eq('external_account_id',
 * accountId).maybeSingle()`. Sin filtrar por canal, el día que la organización
 * tenga WhatsApp **e** Instagram, la consulta devuelve DOS filas y `maybeSingle`
 * responde con error — que el código interpretaba como «cuenta no enlazada» y
 * rechazaba el mensaje con 400. Un mensaje legítimo perdido por una cuenta
 * nueva. Es el mismo patrón que ya costó una vez con `conversacion_zernio_id`.
 *
 * ── Por qué NO se filtra por el nombre del enlace ─────────────────────────
 *
 * El primer intento de esta función filtraba con `ilike 'whatsapp%'` sobre
 * `integracion_canal.nombre`, dando por hecho que el nombre empezaba por el
 * canal. Medido en la base, el enlace se llama **«Necto WhatsApp»**: el filtro
 * no casaba, la cuenta «no existía» y el mensaje se habría rechazado con 400 —
 * rompiendo un camino que funcionaba. Se descubrió con el arnés, no en
 * producción.
 *
 * Corolario que queda escrito: **`nombre` es una etiqueta que escribe una
 * persona.** No se deduce estructura de un campo de texto libre.
 *
 * Filtro real: `proveedor` + `external_account_id` + `conectado`. La
 * desambiguación entre canales no la hace el nombre — la hará el día que el
 * modelo declare una columna de canal, y este es el único sitio a tocar.
 */
export async function resolverOrganizacion(sb, accountId, canal) {
    const { data, error } = await t(sb, 'integracion_canal')
        .select('organizacion_id, nombre, numero')
        .eq('proveedor', 'zernio')
        .eq('external_account_id', accountId)
        // Un enlace desconectado no debe recibir tráfico: si el dueño desconectó el
        // número, el bot no contesta en su nombre.
        .eq('conectado', true);
    if (error) {
        return { ok: false, error: `no se pudo resolver la organización: ${error.message}` };
    }
    const filas = (data ?? []);
    if (filas.length === 0) {
        return {
            ok: false,
            error: `la cuenta ${accountId} no tiene enlace ACTIVO en necto.integracion_canal ` +
                `(proveedor='zernio', conectado=true). Si existe pero está conectado=false, ` +
                `ese es el motivo.`,
        };
    }
    if (filas.length > 1) {
        // Atribuir un mensaje a la organización equivocada significa que lo lee
        // quien no debe. Se falla ruidosamente en vez de elegir una.
        return {
            ok: false,
            error: `la cuenta ${accountId} tiene ${filas.length} enlaces activos candidatos. ` +
                `No se adivina cuál: arréglense los datos.`,
        };
    }
    return { ok: true, org: { organizacionId: filas[0].organizacion_id, canal } };
}
/**
 * Devuelve el uuid de `necto.conversacion` para la conversación de Zernio,
 * creándola si no existe.
 *
 * El orden es obligatorio por las claves foráneas: contacto → conversación.
 * Si el `zernioConversationId` ya está guardado, se reutiliza **esa** fila
 * aunque otra conversación del mismo contacto siga abierta: el hilo que manda
 * es el de Zernio, que es el que tiene los mensajes de verdad.
 */
export async function asegurarConversacion(sb, m, organizacionId) {
    // ── 1. ¿Ya conocemos esta conversación de Zernio? ────────────────────────
    if (m.zernioConversationId) {
        const { data, error } = await t(sb, 'conversacion')
            .select('id, contacto_id')
            .eq('zernio_conversation_id', m.zernioConversationId)
            .maybeSingle();
        if (error)
            return { ok: false, error: `conversacion: ${error.message}` };
        if (data) {
            const fila = data;
            return { ok: true, conversacionId: fila.id, contactoId: fila.contacto_id };
        }
    }
    // ── 2. Contacto (find-or-create por teléfono) ────────────────────────────
    const buscable = telefonoBuscable(m.telefonoNorm);
    let contactoId = null;
    if (buscable) {
        const { data } = await t(sb, 'contacto')
            .select('id')
            .eq('organizacion_id', organizacionId)
            .eq('telefono_norm', buscable)
            .maybeSingle();
        contactoId = data?.id ?? null;
    }
    if (!contactoId) {
        const { data, error } = await t(sb, 'contacto')
            .insert({
            organizacion_id: organizacionId,
            // `telefono` es NOT NULL. Si el payload no trajo número (un usuario de
            // WhatsApp que solo expone BSUID), se usa el id de Zernio en vez de
            // inventar un número: una fila con un número falso miente.
            telefono: m.telefonoNorm ?? `zernio:${m.zernioMessageId}`,
            // `telefono_norm` NO se escribe: es GENERATED ALWAYS. Postgres la
            // calcula, y escribirla da «cannot insert a non-DEFAULT value».
            nombre: m.nombre,
            origen: m.canal,
        })
            .select('id')
            .single();
        if (error)
            return { ok: false, error: `contacto: ${error.message}` };
        contactoId = data.id;
    }
    // ── 3. Conversación, atada al id de Zernio ───────────────────────────────
    const { data, error } = await t(sb, 'conversacion')
        .insert({
        organizacion_id: organizacionId,
        contacto_id: contactoId,
        canal: m.canal,
        estado: 'abierta',
        // `modo_atencion` se deja en su default del DDL (`'bot'`). Escribirlo a
        // mano fue el defecto anterior: nacían en 'humano' y el bot nunca
        // respondía. Se lee su default, no se inventa.
        modulo_destino: 'pedidos',
        no_leidos: 0,
        zernio_conversation_id: m.zernioConversationId || null,
    })
        .select('id')
        .single();
    if (error) {
        // 23505 = unique_violation sobre `conversacion_zernio_uniq`. Ocurre con dos
        // entregas del mismo evento a la vez: la otra ya creó la fila. Se relee en
        // vez de propagar el error.
        if (error.code === '23505' && m.zernioConversationId) {
            const { data: ya } = await t(sb, 'conversacion')
                .select('id, contacto_id')
                .eq('zernio_conversation_id', m.zernioConversationId)
                .maybeSingle();
            if (ya) {
                const fila = ya;
                return { ok: true, conversacionId: fila.id, contactoId: fila.contacto_id };
            }
        }
        return { ok: false, error: `conversacion: ${error.message}` };
    }
    return { ok: true, conversacionId: data.id, contactoId };
}
/**
 * Los pedidos que el bot puede mirar para este cliente.
 *
 * Se buscan por `telefono_norm` —el índice único del contacto es
 * `(organizacion_id, telefono_norm)`— y no por nombre: el nombre lo escribe
 * cada cliente como quiere en WhatsApp.
 *
 * `telefono_norm` es una columna generada; se filtra por el valor normalizado
 * que ya trae el webhook, que replica la misma función SQL.
 */
export async function pedidosDelCliente(sb, organizacionId, telefonoNorm) {
    const buscable = telefonoBuscable(telefonoNorm);
    if (!buscable)
        return [];
    const { data, error } = await t(sb, 'pedido')
        .select('id, numero, cliente, estado, modalidad, estado_desde, programado_para, direccion_entrega')
        .eq('organizacion_id', organizacionId)
        .eq('telefono_norm', buscable)
        .order('creado_en', { ascending: false })
        .limit(10);
    if (error || !data)
        return [];
    return data.map((p) => ({
        id: String(p.id),
        numero: String(p.numero ?? ''),
        cliente: String(p.cliente ?? ''),
        estado: String(p.estado ?? ''),
        modalidad: String(p.modalidad ?? ''),
        estadoDesde: String(p.estado_desde ?? ''),
        programadoPara: p.programado_para ? String(p.programado_para) : null,
        direccionEntrega: p.direccion_entrega?.texto ?? null,
        // `pedido` no tiene columna de minutos estimados: el DDL no la declara. El
        // tipo la admite como opcional y aquí se dice `null` en vez de inventar un
        // número — prometer un tiempo que nadie configuró sería mentir.
        minutosEstimados: null,
    }));
}
/**
 * La configuración de mensajes del dueño: sus plantillas, sus frases de
 * conversación y su perfil.
 *
 * Todo vive en el mismo `jsonb` (`config_pedidos.plantillas_whatsapp`) porque
 * es el que el dueño ya edita en la UI de configuración. Las claves de estado
 * (`enCamino`, `listo`, …) y las de conversación (`presentacion`, `noEntendido`,
 * …) conviven sin colisionar: `frasesDe` solo mira las suyas y
 * `plantillaDeEstado` solo mira las suyas.
 *
 * El perfil importa tanto como las plantillas: dice de qué catálogo salen los
 * textos por defecto (`PLANTILLAS_POR_PERFIL`). Sin él, un restaurante recibe
 * el texto genérico y el bot habla distinto que su propia UI.
 */
export async function configDe(sb, organizacionId) {
    const [{ data: cfg }, { data: org }] = await Promise.all([
        t(sb, 'config_pedidos')
            .select('plantillas_whatsapp, perfil_comercial, catalogo, horarios')
            .eq('organizacion_id', organizacionId)
            .maybeSingle(),
        t(sb, 'organizacion')
            .select('nombre, pais')
            .eq('id', organizacionId)
            .maybeSingle(),
    ]);
    if (!cfg)
        return { nombreOrganizacion: org?.nombre ?? 'Necto', plantillas: null, frases: null, perfil: null, catalogo: [], horarios: null };
    const f = cfg;
    const p = f.plantillas_whatsapp;
    const json = p && typeof p === 'object' ? p : null;
    return {
        nombreOrganizacion: org?.nombre ?? 'Necto',
        plantillas: json,
        frases: json,
        perfil: f.perfil_comercial ?? null,
        catalogo: normalizarCatalogo(f.catalogo),
        horarios: f.horarios ?? null,
    };
}
/**
 * Convierte el `jsonb` en items utilizables, descartando lo que no lo sea.
 *
 * ── Por qué se filtra en vez de confiar ───────────────────────────────────
 *
 * `catalogo` es un `jsonb` editado por una persona desde una UI. El día que
 * alguien guarde un item con `precio: "25000"` (texto) o sin `id`, el bot no
 * puede quedarse con un item fantasma: `precio * cantidad` daría `NaN`, el
 * total del resumen sería `$NaN` y **el pedido se escribiría con precio cero o
 * nulo** — un pedido real, cobrado mal.
 *
 * Se descarta el item inválido entero, no se parchea el campo: un producto sin
 * precio no es un producto que el bot deba ofrecer. Y si el resultado queda
 * vacío, `decidir` simplemente no abre el ciclo de compra — vuelve al camino
 * de siempre. Fallar hacia «no puedo tomar pedidos» es correcto; inventar un
 * precio, no.
 */
function normalizarCatalogo(bruto) {
    if (!Array.isArray(bruto))
        return [];
    const out = [];
    for (const crudo of bruto) {
        if (!crudo || typeof crudo !== 'object')
            continue;
        const o = crudo;
        if (o.disponible === false)
            continue;
        if (typeof o.stock === 'number' && o.stock <= 0)
            continue;
        const id = typeof o.id === 'string' ? o.id.trim() : '';
        const nombre = typeof o.nombre === 'string' ? o.nombre.trim() : '';
        const precio = typeof o.precio === 'number' ? o.precio : Number(o.precio);
        if (!id || !nombre)
            continue;
        if (!Number.isFinite(precio) || precio <= 0)
            continue;
        const variantes = Array.isArray(o.variantesDisponibles)
            ? o.variantesDisponibles.filter((v) => typeof v === 'string')
            : undefined;
        out.push({ id, nombre, precio, stock: o.stock, disponible: o.disponible !== false, variantesDisponibles: variantes });
    }
    return out;
}
/**
 * Lee el borrador de pedido guardado en `estado_respuesta.enCurso`.
 *
 * Valida la forma antes de devolverla: esto viene de un `jsonb` que puede
 * haber escrito una versión anterior del bot. Un borrador con un `paso` que
 * este código no conoce se descarta (`null`) y la conversación se comporta como
 * si no hubiera nada a medias — el lado seguro, porque lo peor que puede pasar
 * es volver a empezar.
 */
function borradorDe(bruto) {
    if (!bruto || typeof bruto !== 'object')
        return null;
    const o = bruto;
    const PASOS = ['eligiendo_items', 'eligiendo_cantidad', 'eligiendo_modalidad', 'eligiendo_direccion', 'confirmando'];
    if (typeof o.paso !== 'string' || !PASOS.includes(o.paso))
        return null;
    const lineas = Array.isArray(o.lineas)
        ? o.lineas
            .filter((l) => !!l && typeof l === 'object')
            .map((l) => ({
            itemId: typeof l.itemId === 'string' ? l.itemId : '',
            nombre: typeof l.nombre === 'string' ? l.nombre : '',
            precioUnitario: typeof l.precioUnitario === 'number' ? l.precioUnitario : 0,
            cantidad: typeof l.cantidad === 'number' ? l.cantidad : 0,
        }))
            .filter((l) => l.itemId && l.cantidad > 0)
        : [];
    return {
        paso: o.paso,
        lineas,
        itemPendienteId: typeof o.itemPendienteId === 'string' ? o.itemPendienteId : null,
        modalidad: typeof o.modalidad === 'string' ? o.modalidad : null,
        direccion: typeof o.direccion === 'string' ? o.direccion : null,
        direccionSugerida: typeof o.direccionSugerida === 'string' ? o.direccionSugerida : null,
        intento: typeof o.intento === 'string' ? o.intento : 'tomar_pedido',
    };
}
/** Lee modo, estado y el registro de respuesta de la conversación. */
export async function leerConversacion(sb, conversacionId) {
    const { data, error } = await t(sb, 'conversacion')
        .select('modo_atencion, estado, estado_respuesta')
        .eq('id', conversacionId)
        .maybeSingle();
    if (error || !data)
        return null;
    const f = data;
    const r = f.estado_respuesta;
    const obj = r && typeof r === 'object' ? r : null;
    const borrador = borradorDe(obj?.enCurso);
    let estadoFlujo = obj?.estado_flujo;
    if (!estadoFlujo) {
        if (borrador && borrador.lineas?.length > 0) {
            estadoFlujo = borrador.paso === 'confirmando' ? 'CONFIRMANDO_PEDIDO'
                : (borrador.paso === 'eligiendo_direccion' || borrador.modalidad) ? 'SOLICITANDO_ENTREGA'
                : 'CARRITO_EN_CONSTRUCCION';
        } else if (obj?.catalogo_mostrado) {
            estadoFlujo = 'CATALOGO_ACTIVO';
        } else {
            estadoFlujo = 'IDLE';
        }
    }
    return {
        modo: f.modo_atencion ?? null,
        estado: f.estado ?? null,
        respuesta: obj,
        enCurso: borrador,
        estadoFlujo,
        catalogoMostrado: Boolean(obj?.catalogo_mostrado),
        intencionPendiente: obj?.intencion_pendiente ?? null,
        ultimoPedidoId: obj?.ultimo_pedido_id ?? null,
        ultimoIntent: obj?.ultimo_intent ?? null,
    };
}
/**
 * Guarda el estado conversacional completo en estado_respuesta de la conversación.
 */
export async function guardarEstadoConversacion(sb, conversacionId, cambios) {
    const { data, error: errLectura } = await t(sb, 'conversacion')
        .select('estado_respuesta')
        .eq('id', conversacionId)
        .maybeSingle();
    if (errLectura)
        return { ok: false, error: errLectura.message };
    const previo = data && typeof data.estado_respuesta === 'object'
        ? (data.estado_respuesta ?? {})
        : {};
    const siguiente = { ...previo, ...cambios };
    if (cambios.enCurso === null) {
        delete siguiente.enCurso;
    }
    const { error } = await t(sb, 'conversacion')
        .update({ estado_respuesta: siguiente, actualizada_en: new Date().toISOString() })
        .eq('id', conversacionId);
    if (error)
        return { ok: false, error: error.message };
    return { ok: true };
}
/**
 * Guarda el borrador de pedido en la conversación.
 */
export async function guardarEnCurso(sb, conversacionId, borrador) {
    return guardarEstadoConversacion(sb, conversacionId, {
        enCurso: borrador,
        estado_flujo: borrador && borrador.lineas?.length > 0
            ? (borrador.paso === 'confirmando' ? 'CONFIRMANDO_PEDIDO'
               : (borrador.paso === 'eligiendo_direccion' || borrador.modalidad) ? 'SOLICITANDO_ENTREGA'
               : 'CARRITO_EN_CONSTRUCCION')
            : 'IDLE'
    });
}
/** Lee `modo_atencion` de la conversación. `null` si no se pudo saber. */
export async function modoAtencionDe(sb, conversacionId) {
    const c = await leerConversacion(sb, conversacionId);
    return c?.modo ?? null;
}
/**
 * Anota que el bot ya contestó el evento `eventoId` en esta conversación.
 *
 * ── Dos defectos medidos, en el mismo sitio, y solo uno era el visible ────
 *
 * **1. El `estado_respuesta` entero se reemplazaba (22/09).** Esta función
 * escribía el objeto como uno NUEVO, y `estado_respuesta.enCurso` —el borrador
 * que acababa de guardar `guardarEnCurso` en el paso anterior— se perdía con
 * él. Los nombres de las claves no colisionaban, y eso lo hacía invisible: el
 * borrador no se sobrescribía, se **borraba** porque el `UPDATE` reemplaza el
 * objeto, no lo fusiona. Consecuencia: un cliente abría el catálogo, escribía
 * «1» y el bot le contestaba «no te entendí». El ciclo de tomar pedidos era
 * imposible de completar por WhatsApp.
 *
 * **2. Las claves se escribían FUERA del jsonb (22/09, el fallo de raíz).**
 * La corrección del punto 1 fue un `...previo` con las marcas al mismo nivel
 * que `estado_respuesta`:
 *
 *     .update({ ...previo, eventoId, evento_id, respondidoEn, respondido_en, accion, ... })
 *
 * Eso le dice a PostgREST que `eventoId` y `accion` son **columnas** de
 * `necto.conversacion`. No lo son —la tabla tiene `id`, `canal`, `contacto_id`,
 * `modulo_destino`, `modo_atencion`, `estado`, `estado_respuesta`,
 * `zernio_conversation_id`, `agente_id`, `no_leidos`, `creada_en`,
 * `actualizada_en`, y nada más— así que la petición se rechaza **COMPLETA**:
 *
 *     Could not find the 'accion' column of 'conversacion' in the schema cache
 *
 * Y como `procesarEntrante` descartaba el resultado (paso 7, `await` sin
 * comprobar), el fallo era mudo. Medido: `estado_respuesta` quedaba en `null`
 * tras un envío correcto, y **el mismo evento entregado dos veces producía DOS
 * envíos** — la idempotencia del paso 2 nunca actuó, porque nunca hubo marca
 * que leer. El guardia existía y la marca no. Es exactamente el patrón que este
 * proyecto ya se prohibió: una superficie que promete algo que el sistema no
 * puede cumplir.
 *
 * ── La regla que queda escrita ───────────────────────────────────────────
 *
 * **Todo el estado del bot vive DENTRO de `estado_respuesta`.** Esta función
 * escribe `estado_respuesta` y `actualizada_en`, y esas dos son las únicas
 * columnas que el `update` toca. Añadir una marca nueva es añadir una clave al
 * objeto, nunca una columna a la tabla. Si alguna vez hace falta una columna de
 * verdad —para consultarla o indexarla— se migra primero y el `update` la
 * menciona después; al revés se rompe en silencio, que es lo que pasó aquí.
 *
 * Se escribe `eventoId` en las DOS claves —`eventoId` y `evento_id`— porque el
 * comentario de la columna declara `evento_id` y el código leía `eventoId`. El
 * valor es el mismo; lo que cambia es el nombre. Cubrir los dos es barato;
 * elegir mal cuesta un mensaje duplicado al cliente por cada reintento.
 */
export async function marcarRespondido(sb, conversacionId, eventoId, accion) {
    const { data, error: errLectura } = await t(sb, 'conversacion')
        .select('estado_respuesta')
        .eq('id', conversacionId)
        .maybeSingle();
    if (errLectura)
        return { ok: false, error: errLectura.message };
    // `typeof null === 'object'`: sin la comprobación explícita, una fila sin
    // estado previo entraba como `null` y el spread reventaba.
    const previo = data && data.estado_respuesta !== null &&
        typeof data.estado_respuesta === 'object'
        ? data.estado_respuesta
        : {};
    const ahora = new Date().toISOString();
    const { error } = await t(sb, 'conversacion')
        .update({
        // Una sola columna de estado, con TODAS las marcas dentro. Lo que ya
        // hubiera (`enCurso`, y lo que añada el futuro) se conserva.
        estado_respuesta: {
            ...previo,
            eventoId,
            evento_id: eventoId,
            respondidoEn: ahora,
            respondido_en: ahora,
            accion,
        },
        actualizada_en: ahora,
    })
        .eq('id', conversacionId);
    if (error)
        return { ok: false, error: error.message };
    return { ok: true };
}
/** Pasa la conversación a manos de una persona. */
export async function pasarAHumano(sb, conversacionId) {
    const { error } = await t(sb, 'conversacion')
        .update({ modo_atencion: 'humano', actualizada_en: new Date().toISOString() })
        .eq('id', conversacionId);
    if (error)
        return { ok: false, error: error.message };
    return { ok: true };
}
/**
 * Devuelve la conversación al bot.
 *
 * ── El defecto que esto corrige ───────────────────────────────────────────
 *
 * `pasarAHumano` apagaba el bot y **nada lo volvía a encender**. Medido con
 * tráfico real: el bot recibió «Hola» a las 05:20:08, hizo handoff, puso
 * `modo_atencion='humano'`, y desde ese momento el hilo quedó mudo para
 * siempre. El cliente escribió otra vez a las 05:21:40 y el bot ya no
 * contestaba. **Un cliente que escribe dos veces se queda sin atención.**
 *
 * El bot se apagaba a sí mismo y dependía de que una persona lo rescatara a
 * mano desde una bandeja que todavía no existe. Eso es un control que miente.
 *
 * ── Por qué NO se reanuda solo por tiempo ─────────────────────────────────
 *
 * Se evaluó un barrido por `actualizada_en` y **se descartó**: no hay forma de
 * saber desde aquí si un operador contestó, y devolver a `bot` un hilo que una
 * persona está escribiendo haría que los dos hablaran encima del cliente.
 * Reanudar exige `estado_respuesta` (que dice si el bot ya habló) **y** una
 * decisión de producto sobre cuándo una atención humana se considera cerrada.
 * Mientras esa decisión no exista, esto es una función explícita, no un cron:
 * se llama cuando alguien —un operador, o la bandeja— lo pide.
 */
export async function volverAlBot(sb, conversacionId) {
    const { error } = await t(sb, 'conversacion')
        .update({ modo_atencion: 'bot', actualizada_en: new Date().toISOString() })
        .eq('id', conversacionId);
    if (error)
        return { ok: false, error: error.message };
    return { ok: true };
}
/**
 * Escribe el pedido que el cliente confirmó.
 *
 * ── El estado con el que nace, y por qué NO es `confirmado` ───────────────
 *
 * Nace `nuevo`. Lo que el bot puede garantizar es que el pedido llegó completo
 * y con el precio congelado; lo que NO puede comprobar es que el plato se pueda
 * preparar hoy, que el domicilio esté en la zona de reparto o que el precio
 * siga vigente en el local. Un pedido que naciera `confirmado` estaría
 * confirmado por un bot que no comprobó nada de eso — la persona que lo ve en
 * el tablero creería que alguien lo revisó. Es exactamente un control que miente.
 *
 * ── El número de pedido ───────────────────────────────────────────────────
 *
 * Se calcula contando los pedidos de la organización y sumando uno. **Tiene una
 * carrera** y queda dicho: dos pedidos confirmados en el mismo instante pueden
 * recibir el mismo número. No se resuelve aquí porque la solución correcta es
 * una secuencia en la base (`DEFAULT nextval(...)`), y cambiar eso afecta al
 * frontend que también crea pedidos. Se elige el fallo menos malo: un número
 * duplicado se ve a simple vista y se corrige; un pedido perdido no se ve.
 *
 * ── `pago_con` no se escribe ──────────────────────────────────────────────
 *
 * Es `numeric` y en el bot significa «con cuánto abona para el vuelto», un dato
 * que el cliente no dio. Escribir `0` diría «paga con cero», que es falso.
 * `metodo_pago` sí se escribe —de la modalidad— porque el frontend lo usa como
 * etiqueta y siempre tiene un valor.
 */
export async function crearPedido(sb, args) {
    const { organizacionId, telefono, cliente, borrador } = args;
    if (borrador.lineas.length === 0) {
        // No debería llegar aquí: `decidir` exige al menos una línea antes de
        // confirmar. Se comprueba igual porque escribir un pedido vacío ensucia el
        // tablero de alguien y no hay forma de deshacerlo desde el bot.
        return { ok: false, error: 'el pedido no tiene líneas' };
    }
    // ── Número correlativo ──────────────────────────────────────────────────
    const { count } = await t(sb, 'pedido')
        .select('id', { count: 'exact', head: true })
        .eq('organizacion_id', organizacionId);
    const numero = `WEB-${String((count ?? 0) + 1).padStart(4, '0')}`;
    const direccion = borrador.modalidad === 'domicilio' && borrador.direccion
        ? { texto: borrador.direccion }
        : null;
    const { data, error } = await t(sb, 'pedido')
        .insert({
        organizacion_id: organizacionId,
        numero,
        cliente: cliente || 'Cliente WhatsApp',
        telefono: telefono ?? '',
        // `telefono_norm` NO se escribe: es GENERATED ALWAYS, igual que en
        // `contacto`. Escribirla da «cannot insert a non-DEFAULT value».
        modalidad: borrador.modalidad ?? 'retiro',
        origen: 'whatsapp',
        estado: 'nuevo',
        // `metodo_pago` NO se deduce de la modalidad.
        //
        // El primer intento escribía `'contra_entrega'` para domicilio y
        // `'en_local'` para retiro. Los dos valores son inventados y la base los
        // rechazó —medido: `violates check constraint pedido_metodo_pago_check`—
        // porque el vocabulario real es
        // `('efectivo','transferencia','tarjeta','otro')` y no habla de dónde se
        // paga sino cómo.
        //
        // Y de todas formas el bot NO SABE cómo va a pagar el cliente: no se lo
        // preguntó. Escribir `'efectivo'` sería afirmar un método de pago que
        // nadie eligió, y quien vea el pedido en el tablero lo daría por hecho.
        // `'otro'` es literalmente la opción del esquema para «no consta», así
        // que es lo que se escribe: no es una suposición, es la ausencia
        // declarada. Preguntar el método de pago es una extensión obvia del
        // ciclo; se deja dicho en vez de adivinarlo.
        metodo_pago: 'otro',
        direccion_entrega: direccion,
    })
        .select('id, numero')
        .single();
    if (error)
        return { ok: false, error: `pedido: ${error.message}` };
    const fila = data;
    // ── Items ───────────────────────────────────────────────────────────────
    //
    // `precio_unitario` es el precio CONGELADO en el borrador, no el del catálogo
    // actual: si el dueño cambió un precio mientras el cliente elegía, lo que el
    // cliente leyó en el resumen es lo que se guarda. Mismo criterio que el
    // frontend, donde los items son snapshots y no punteros.
    const items = borrador.lineas.map((l, idx) => ({
        pedido_id: fila.id,
        // `product_id` apunta al catálogo de venta (`CatalogoItem.id`), que es un
        // id de negocio, no una FK: no hay tabla de catálogo todavía. Se deja dicho.
        product_id: l.itemId,
        nombre: l.nombre,
        cantidad: l.cantidad,
        precio_unitario: l.precioUnitario,
        orden: idx,
    }));
    const { error: errItems } = await t(sb, 'pedido_item').insert(items);
    if (errItems) {
        // El pedido quedó sin líneas. Se borra en vez de dejarlo: un pedido en el
        // tablero con items vacíos es peor que no tenerlo — parece un pedido de
        // nada y alguien tendría que investigarlo. Se avisa del fallo real.
        await t(sb, 'pedido').delete().eq('id', fila.id);
        return { ok: false, error: `pedido_item: ${errItems.message} (pedido revertido)` };
    }
    // ── Actualización de Stock en Tiempo Real ──────────────────────────────
    try {
        const { data: cfgData } = await t(sb, 'config_pedidos')
            .select('catalogo')
            .eq('organizacion_id', organizacionId)
            .maybeSingle();

        if (cfgData && Array.isArray(cfgData.catalogo)) {
            let modificado = false;
            const catalogoActualizado = cfgData.catalogo.map((catItem) => {
                const itemComprado = borrador.lineas.find((l) => l.itemId === catItem.id || l.nombre.toLowerCase() === (catItem.nombre || '').toLowerCase());
                if (itemComprado) {
                    modificado = true;
                    const stockPrevio = typeof catItem.stock === 'number' ? catItem.stock : 100;
                    const nuevoStock = Math.max(0, stockPrevio - itemComprado.cantidad);
                    return {
                        ...catItem,
                        stock: nuevoStock,
                        disponible: nuevoStock > 0,
                    };
                }
                return catItem;
            });

            if (modificado) {
                await t(sb, 'config_pedidos')
                    .update({ catalogo: catalogoActualizado })
                    .eq('organizacion_id', organizacionId);
            }
        }
    } catch (errStock) {
        console.warn('[BotPedidosDAO] Error al sincronizar stock en tiempo real:', errStock);
    }
    return { ok: true, pedidoId: fila.id, numero: fila.numero };
}
/**
 * Guarda un mensaje del bot en la conversación.
 *
 * `autor` = **`asistente`**, no `bot`. La restricción del esquema es
 * `mensaje_autor_check in ('cliente','negocio','sistema','asistente')` y **no
 * admite `bot`**: escribir `'bot'` da 23514. El frontend usa `"bot"` en su tipo
 * `AutorMensaje`, así que hay una deriva código↔base que hay que alinear en
 * algún sitio; mientras tanto se escribe lo que la base acepta y se deja dicho
 * aquí, en vez de reventar en producción.
 *
 * `zernio_event_id` va a NULL a propósito: es la clave de idempotencia de los
 * eventos ENTRANTES. Un mensaje saliente no tiene evento de Zernio, y meterle
 * un uuid inventado rompería el índice `mensaje_zernio_evento_uniq`.
 */
export async function guardarRespuesta(sb, conversacionId, texto, wamid) {
    const { data, error } = await t(sb, 'mensaje')
        .insert({
        conversacion_id: conversacionId,
        autor: 'asistente',
        autor_id: null,
        contenido: {
            texto,
            adjuntos: [],
            plataforma: 'whatsapp',
            canal: 'api',
            plataforma_message_id: wamid,
        },
        enviado_en: new Date().toISOString(),
    })
        .select('id')
        .single();
    if (error)
        return { ok: false, error: error.message };
    return { ok: true, mensajeId: data.id };
}
/**
 * El cerebro del camino entrante: decide, envía y guarda.
 *
 * ── El orden importa, y es deliberado ─────────────────────────────────────
 *
 *   1. **¿Es un mensaje de nadie más que del cliente?** `esMensajePropio` corta
 *      los ecos del propio bot. Es la última red: el receptor ya descarta
 *      `outgoing` y el webhook solo llega con `message.received`.
 *   2. **¿Es un reintento ya contestado?** Si `estado_respuesta.evento_id` es
 *      este mismo evento, ya se respondió: silencio. Ver la nota de
 *      idempotencia abajo.
 *   3. **¿La conversación está en modo bot?** Si está en `humano`, el bot NO
 *      opina. Antes no se miraba, y el bot habría respondido encima de un
 *      operador que ya estaba atendiendo.
 *   4. **Decidir** con `BotPedidos.decidir` (lógica pura, ya probada aparte).
 *   5. **Enviar.** Si el envío falla, **no se guarda nada**: una bandeja que
 *      muestra un mensaje que el cliente nunca recibió miente, y el operador
 *      cerraría el caso creyendo que se contestó.
 *   6. **Guardar** con el wamid que devolvió Zernio.
 *   7. **Marcar respondido** y, si tocaba, pasar a humano.
 *
 * Los pasos 2 y 3 van antes del 4 a propósito: si el hilo no es del bot, se
 * gasta cero cómputo y cero caracteres.
 *
 * ── La idempotencia del envío (paso 2) ────────────────────────────────────
 *
 * El `duplicado` de `persistirEntrante` protege la BASE, no el envío: un
 * reintento de Zernio inserta una fila nueva (otro `X-Zernio-Event-Id` para el
 * mismo contenido) y el bot volvería a escribirle al cliente por cada intento.
 * Por eso se marca aquí, en la conversación, y no en el mensaje: lo que no
 * puede repetirse es el mensaje SALIENTE, y no tiene `zernio_event_id` propio
 * (es la clave de los entrantes).
 */
export async function procesarEntrante(m, deps = {}) {
    const sb = getCliente();
    if (!sb)
        return { ok: false, error: 'Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.' };
    // 1. Ecos
    if (esMensajePropio('incoming', null) === false) {
        // (el receptor ya filtra `outgoing`; esto documenta la intención)
    }
    const org = await resolverOrganizacion(sb, m.accountId, m.canal);
    if (!org.ok)
        return { ok: false, error: org.error };
    const conv = await asegurarConversacion(sb, m, org.org.organizacionId);
    if (!conv.ok)
        return { ok: false, error: conv.error };
    const lectura = await leerConversacion(sb, conv.conversacionId);
    // ── 2. ¿Ya contestamos este evento? (reintento de Zernio) ────────────────
    //
    // Se compara contra el campo tal como lo **guarda** `marcarRespondido`
    // (`eventoId`, camelCase) y además contra `evento_id` por si la fila la
    // escribió una versión anterior. Leer un campo con el nombre equivocado no
    // da error: da `undefined`, la comparación es `false` y **el bot vuelve a
    // contestar el reintento** — un mensaje real duplicado al cliente. Es
    // barato cubrir los dos nombres y caro equivocarse.
    const eventoPrevio = lectura?.respuesta?.eventoId ?? lectura?.respuesta?.evento_id;
    if (eventoPrevio && m.eventId && eventoPrevio === m.eventId) {
        return {
            ok: true,
            accion: 'silencio',
            motivo: 'ya_respondido',
            mensajeId: undefined,
        };
    }
    // 3. ¿Le toca al bot?
    if (lectura?.modo !== 'bot') {
        return {
            ok: true,
            accion: 'silencio',
            motivo: `modo_atencion=${lectura?.modo ?? 'desconocido'}`,
            mensajeId: undefined,
        };
    }
    // 4. Decidir
    const [pedidos, config] = await Promise.all([
        pedidosDelCliente(sb, org.org.organizacionId, m.telefonoNorm),
        configDe(sb, org.org.organizacionId),
    ]);
    const direccionPrevia = lectura?.respuesta?.ultima_direccion || pedidos.find((p) => p.direccionEntrega)?.direccionEntrega || null;
    const decision = decidir({
        texto: m.texto,
        pedidos,
        plantillas: config.plantillas,
        perfil: config.perfil,
        frases: config.frases,
        catalogo: config.catalogo,
        enCurso: lectura?.enCurso ?? null,
        estadoFlujo: lectura?.estadoFlujo ?? 'IDLE',
        catalogoMostrado: lectura?.catalogoMostrado ?? false,
        direccionPrevia,
    });

    // ── 4a. Inteligencia Artificial (Azure OpenAI GPT-4o) ────────────────────
    let historial = [];
    try {
        const { data: ultimosMsgs } = await t(sb, 'mensaje')
            .select('autor, contenido, enviado_en')
            .eq('conversacion_id', conv.conversacionId)
            .order('enviado_en', { ascending: false })
            .limit(8);
        if (ultimosMsgs && ultimosMsgs.length > 0) {
            historial = ultimosMsgs.reverse().map((msg) => ({
                esCliente: msg.autor === 'cliente',
                texto: msg.contenido?.texto || ''
            })).filter((msg) => Boolean(msg.texto));
        }
    } catch (eH) {
        console.warn('[BotPedidosDAO] Excepción leyendo historial de mensajes:', eH);
    }

    try {
        const resIA = await generarRespuestaIA({
            mensajeTexto: m.texto,
            nombreCliente: m.nombre,
            nombreOrganizacion: config.nombreOrganizacion,
            catalogo: config.catalogo,
            horarios: config.horarios,
            pedidosActivos: pedidos,
            borradorEnCurso: decision.borrador ?? lectura?.enCurso ?? null,
            historial
        });
        if (resIA.ok && resIA.texto) {
            decision.texto = resIA.texto;
            if (Array.isArray(resIA.botones)) decision.botones = resIA.botones;
            if (resIA.listButtonText) decision.listButtonText = resIA.listButtonText;
            if (resIA.secciones) decision.secciones = resIA.secciones;

            if (resIA.solicitaHumano) {
                decision.accion = 'handoff';
                decision.motivo = 'pide_asesor';
            }

            // Sincronización bidireccional: Si la IA detectó entidades y el determinista no tenía borrador
            if (resIA.entidadesDetectadas) {
                const ent = resIA.entidadesDetectadas;
                let b = decision.borrador ?? lectura?.enCurso ?? null;
                if (!b && Array.isArray(ent.items) && ent.items.length > 0) {
                    b = borradorNuevo();
                }
                if (b && Array.isArray(ent.items) && ent.items.length > 0) {
                    for (const it of ent.items) {
                        const numIdx = Number(it.id_o_idx || it.idx || it.id);
                        const catItem = (!isNaN(numIdx) && numIdx >= 1 && numIdx <= config.catalogo.length)
                            ? config.catalogo[numIdx - 1]
                            : config.catalogo.find(c => c.id === it.id_o_idx || c.nombre.toLowerCase().includes(String(it.nombre || it.id_o_idx).toLowerCase()));
                        if (catItem) {
                            const cant = Number(it.cantidad) || 1;
                            b.lineas = agregarLinea(b.lineas, catItem, cant);
                        }
                    }
                    if (b.lineas.length > 0 && b.paso === 'eligiendo_items') {
                        b.paso = 'eligiendo_modalidad';
                    }
                }
                if (b && ent.direccion && typeof ent.direccion === 'string' && ent.direccion.trim().length >= 4) {
                    b.direccion = ent.direccion.trim();
                    b.modalidad = 'domicilio';
                    b.paso = 'confirmando';
                }
                if (b && ent.modalidad) {
                    b.modalidad = ent.modalidad;
                }
                if (b && b.lineas.length > 0) {
                    decision.borrador = b;
                }
            }
        }
    } catch (e) {
        console.error('[BotPedidosDAO] Excepción invocando Azure OpenAI:', e);
    }
    // ── 4b. Resolución de Estado Conversacional y Creación de Pedido ─────────
    let borradorFinal = decision.borrador !== undefined ? decision.borrador : (lectura?.enCurso ?? null);
    let estadoFlujoFinal = decision.estadoFlujo;
    if (!estadoFlujoFinal) {
        if (borradorFinal && borradorFinal.lineas?.length > 0) {
            estadoFlujoFinal = borradorFinal.paso === 'confirmando' ? 'CONFIRMANDO_PEDIDO'
                : (borradorFinal.paso === 'eligiendo_modalidad' || borradorFinal.paso === 'eligiendo_direccion') ? 'SOLICITANDO_ENTREGA'
                : 'CARRITO_EN_CONSTRUCCION';
        } else if (decision.catalogoMostrado || lectura?.catalogoMostrado) {
            estadoFlujoFinal = 'CATALOGO_ACTIVO';
        } else {
            estadoFlujoFinal = 'IDLE';
        }
    }
    let ultimoPedidoIdFinal = lectura?.ultimoPedidoId ?? null;

    let textoFinal = decision.texto;
    if (decision.accion === 'crearPedido' && borradorFinal && borradorFinal.lineas.length > 0) {
        const creado = await crearPedido(sb, {
            organizacionId: org.org.organizacionId,
            telefono: m.telefonoNorm,
            cliente: m.nombre ?? 'Cliente WhatsApp',
            borrador: borradorFinal,
        });
        if (!creado.ok) {
            const disculpa = 'No pude registrar tu pedido automáticamente. Te paso con una persona del equipo ' +
                'para que lo tome — tu pedido no se perdió.';
            const envio = await (deps.enviar ?? (await import('./ZernioEnvio.js')).enviarTexto)(m.zernioConversationId, m.accountId, disculpa, { replyTo: m.plataformaMessageId || m.wamidCitables || undefined });
            if (envio.ok) {
                await guardarRespuesta(sb, conv.conversacionId, disculpa, envio.messageId ?? null);
                await marcarRespondido(sb, conv.conversacionId, m.eventId, 'handoff');
                await pasarAHumano(sb, conv.conversacionId);
            }
            return {
                ok: false,
                accion: 'crearPedido',
                error: `no se pudo crear el pedido: ${creado.error}`,
            };
        }
        textoFinal = decision.texto.replace('{numero}', creado.numero ?? '');
        const refLink = (creado.numero ?? 'WEB-0001').toLowerCase().replace(/[^a-z0-9]/g, '');
        textoFinal += `\n\n💳 *Link de Pago Seguro (Simulado):*\nhttps://necto.io/pagos/pay_${refLink}\n\n*(Acepta Nequi, Daviplata, Tarjetas y PSE. Una vez registrado el pago procedemos a despachar tu pedido)*`;
        borradorFinal = null;
        estadoFlujoFinal = 'PEDIDO_CREADO';
        ultimoPedidoIdFinal = creado.numero ?? creado.id;
    } else if (decision.accion === 'handoff' && (decision.motivo === 'ciclo_cancelado' || decision.motivo === 'pide_asesor' || decision.intent === 'cancelar_borrador')) {
        borradorFinal = null;
        estadoFlujoFinal = 'IDLE';
    }

    // Persistir el estado conversacional completo en Supabase estado_respuesta
    const ultimaDireccion = decision.borrador?.direccion || borradorFinal?.direccion || lectura?.respuesta?.ultima_direccion || direccionPrevia || null;
    await guardarEstadoConversacion(sb, conv.conversacionId, {
        enCurso: borradorFinal,
        estado_flujo: estadoFlujoFinal,
        catalogo_mostrado: Boolean(decision.catalogoMostrado || lectura?.catalogoMostrado),
        ultimo_intent: decision.intent ?? decision.motivo ?? 'desconocido',
        ultimo_pedido_id: ultimoPedidoIdFinal,
        intencion_pendiente: decision.intencionPendiente ?? null,
        ultima_direccion: ultimaDireccion,
    });
    // 5. Enviar
    const enviar = deps.enviar ?? (await import('./ZernioEnvio.js')).enviarTexto;
    const envio = await enviar(m.zernioConversationId, m.accountId, textoFinal, {
        replyTo: m.plataformaMessageId || m.wamidCitables || undefined,
        botones: decision.botones,
        secciones: decision.secciones,
        listButtonText: decision.listButtonText,
        interactive: decision.interactive,
    });
    if (!envio.ok) {
        // El handoff SÍ se aplica aunque el envío falle: si el bot no pudo hablar,
        // lo que corresponde es que atienda una persona, no reintentar en bucle.
        if (decision.accion === 'handoff') {
            await pasarAHumano(sb, conv.conversacionId);
        }
        return {
            ok: false,
            accion: decision.accion,
            error: `no se pudo enviar: ${envio.error}`,
        };
    }
    // 6. Guardar
    const guardado = await guardarRespuesta(sb, conv.conversacionId, textoFinal, envio.messageId ?? null);
    if (!guardado.ok) {
        // El cliente SÍ recibió la respuesta pero no quedó en la bandeja. Es un
        // fallo real y se devuelve como tal: decir `ok` aquí escondería que la
        // bandeja y el cliente ven cosas distintas.
        return {
            ok: false,
            accion: decision.accion,
            error: `enviado pero no guardado: ${guardado.error}`,
        };
    }
    // 7. Marcar respondido. `marcarRespondido` lee antes de escribir y conserva
    // `enCurso`, que es lo que permite que el borrador sobreviva a este paso —
    // sin eso, cada respuesta del bot borraba el pedido a medias (defecto medido
    // el 22/09: el ciclo no se podía completar).
    //
    // ── Por qué esto SÍ se comprueba, al revés que antes ─────────────────────
    //
    // Hasta el 22/09 esta línea era `await marcarRespondido(...)` y el resultado
    // se tiraba. Cuando la escritura empezó a fallar —por una clave que PostgREST
    // tomaba por columna— nadie se enteró: el bot seguía contestando, `ok: true`,
    // y la marca no existía. El único síntoma era que un reintento de Zernio
    // producía un mensaje duplicado al cliente, y eso no se ve en un log.
    //
    // Un fallo aquí NO invalida la respuesta ya enviada —el cliente la tiene—,
    // pero se devuelve para que quede escrito en vez de tragado. El `log` del
    // webhook lo imprime; la bandeja no miente.
    const marca = await marcarRespondido(sb, conv.conversacionId, m.eventId, decision.accion);
    const avisoMarca = marca.ok ? undefined : `respuesta enviada pero NO marcada para idempotencia: ${marca.error}`;
    if (avisoMarca)
        console.error(`[bot] ${avisoMarca}`);
    // El handoff se aplica DESPUÉS de enviar: la frase «te comunico con un
    // asesor» tiene que ser cierta, y solo lo es si el mensaje salió.
    if (decision.accion === 'handoff') {
        await pasarAHumano(sb, conv.conversacionId);
    }
    return {
        ok: true,
        accion: decision.accion,
        motivo: 'motivo' in decision ? decision.motivo : undefined,
        mensajeId: guardado.mensajeId,
        aviso: avisoMarca,
    };
}

/**
 * Notifica proactivamente al cliente por WhatsApp cuando su pedido cambia de estado en el panel web.
 */
export async function notificarCambioEstadoPedido(sb, { pedidoNumero, estadoNuevo, zernioConversationId, accountId }) {
    if (!zernioConversationId || !accountId) return { ok: false, error: 'Sin canal de WhatsApp' };
    const EMOJI_ESTADO = {
        en_preparacion: '👩‍🍳 ¡Tu pedido *{numero}* ha entrado a cocina y se está preparando!',
        listo: '📦 ¡Tu pedido *{numero}* está listo!',
        en_camino: '🛵 ¡Tu pedido *{numero}* va en camino con el repartidor!',
        entregado: '🎉 ¡Tu pedido *{numero}* fue entregado con éxito! ¡Gracias por tu compra!',
        cancelado: '❌ Tu pedido *{numero}* ha sido cancelado.',
    };
    const plantilla = EMOJI_ESTADO[estadoNuevo];
    if (!plantilla) return { ok: false, error: 'Estado sin plantilla' };
    const texto = plantilla.replace('{numero}', pedidoNumero);
    const { enviarTexto } = await import('./ZernioEnvio.js');
    return await enviarTexto(zernioConversationId, accountId, texto, {
        botones: ['Ver Estado', 'Hablar con Asesor']
    });
}
//# sourceMappingURL=BotPedidosDAO.js.map
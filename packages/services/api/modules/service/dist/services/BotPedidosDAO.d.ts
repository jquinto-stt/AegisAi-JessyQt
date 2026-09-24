import { type SupabaseClient } from '@supabase/supabase-js';
import { type MensajeEntrante } from './ZernioWebhook.js';
import { type CatalogoItemBot, type FrasesConversacion, type PedidoEnCurso, type PedidoParaBot, type PlantillasPedido } from './BotPedidos.js';
/**
 * Cliente de servidor. Devuelve `null` si falta configuración en vez de lanzar:
 * un webhook sin base configurada debe responder con un error claro, no tumbar
 * el proceso. Mismo patrón y misma razón que en `ZernioDAO.ts`.
 */
export declare function getCliente(): SupabaseClient | null;
/** Olvida el cliente cacheado (scripts y pruebas). */
export declare function reiniciarCliente(): void;
export interface OrganizacionDeCuenta {
    organizacionId: string;
    /** Canal del enlace (`whatsapp`, `instagram`, …). Se guarda para el filtro. */
    canal: string | null;
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
export declare function resolverOrganizacion(sb: SupabaseClient, accountId: string, canal: string | null): Promise<{
    ok: true;
    org: OrganizacionDeCuenta;
} | {
    ok: false;
    error: string;
}>;
/**
 * Devuelve el uuid de `necto.conversacion` para la conversación de Zernio,
 * creándola si no existe.
 *
 * El orden es obligatorio por las claves foráneas: contacto → conversación.
 * Si el `zernioConversationId` ya está guardado, se reutiliza **esa** fila
 * aunque otra conversación del mismo contacto siga abierta: el hilo que manda
 * es el de Zernio, que es el que tiene los mensajes de verdad.
 */
export declare function asegurarConversacion(sb: SupabaseClient, m: MensajeEntrante, organizacionId: string): Promise<{
    ok: true;
    conversacionId: string;
    contactoId: string;
} | {
    ok: false;
    error: string;
}>;
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
export declare function pedidosDelCliente(sb: SupabaseClient, organizacionId: string, telefonoNorm: string | null): Promise<PedidoParaBot[]>;
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
export declare function configDe(sb: SupabaseClient, organizacionId: string): Promise<{
    plantillas: Partial<PlantillasPedido> | null;
    frases: Partial<FrasesConversacion> | null;
    perfil: string | null;
    catalogo: CatalogoItemBot[];
}>;
export interface LecturaConversacion {
    modo: string | null;
    estado: string | null;
    /** Lo que el bot ya contestó. `null` si nunca contestó. */
    respuesta: {
        eventoId?: string;
        respondidoEn?: string;
        accion?: string;
    } | null;
    /**
     * El pedido a medias, si lo hay.
     *
     * ── Por qué comparte columna con `respuesta` y no tiene una propia ───────
     *
     * `estado_respuesta` es «lo que el bot sabe de esta conversación»: qué evento
     * contestó y, ahora, qué está haciendo. Son la misma pregunta —el estado del
     * bot en el hilo— y separarlas en dos columnas obligaría a dos escrituras y
     * dejaría la puerta abierta a que una se actualice y la otra no: un borrador
     * huérfano sin marca de idempotencia, o al revés.
     *
     * La forma es un objeto con claves distintas (`eventoId`, `enCurso`), así que
     * no hay colisión: `marcarRespondido` escribe la suya, `guardarEnCurso` la
     * suya, y ninguna pisa a la otra.
     */
    enCurso: PedidoEnCurso | null;
}
/** Lee modo, estado y el registro de respuesta de la conversación. */
export declare function leerConversacion(sb: SupabaseClient, conversacionId: string): Promise<LecturaConversacion | null>;
/**
 * Guarda el borrador de pedido en la conversación.
 *
 * ── Se lee antes de escribir, y a propósito ───────────────────────────────
 *
 * Un `update` con el objeto entero pisaría `eventoId` —la marca de
 * idempotencia— y el bot volvería a contestar un reintento de Zernio: un
 * mensaje duplicado al cliente. Por eso se lee lo que hay y se escribe el
 * objeto completo, conservando las claves de `marcarRespondido`.
 *
 * Si la lectura falla, NO se escribe un objeto vacío: se devuelve error. Un
 * borrador que se pierde silenciosamente deja al cliente a mitad de un
 * formulario que el bot ya no recuerda, contestando «no entendí» a cada
 * mensaje siguiente.
 */
export declare function guardarEnCurso(sb: SupabaseClient, conversacionId: string, borrador: PedidoEnCurso | null): Promise<{
    ok: boolean;
    error?: string;
}>;
/** Lee `modo_atencion` de la conversación. `null` si no se pudo saber. */
export declare function modoAtencionDe(sb: SupabaseClient, conversacionId: string): Promise<string | null>;
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
export declare function marcarRespondido(sb: SupabaseClient, conversacionId: string, eventoId: string, accion: string): Promise<{
    ok: boolean;
    error?: string;
}>;
/** Pasa la conversación a manos de una persona. */
export declare function pasarAHumano(sb: SupabaseClient, conversacionId: string): Promise<{
    ok: boolean;
    error?: string;
}>;
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
export declare function volverAlBot(sb: SupabaseClient, conversacionId: string): Promise<{
    ok: boolean;
    error?: string;
}>;
export interface ResultadoRespuesta {
    ok: boolean;
    /** Qué decidió el bot, para el log. */
    accion?: string;
    motivo?: string;
    mensajeId?: string;
    error?: string;
    /**
     * Algo salió bien a medias: la respuesta se envió pero un paso posterior
     * falló. Hoy solo lo usa la marca de idempotencia. `ok` sigue siendo `true`
     * —el cliente tiene su mensaje— y esto es el matiz que antes se tragaba.
     */
    aviso?: string;
}
export interface ResultadoPedido {
    ok: boolean;
    pedidoId?: string;
    numero?: string;
    error?: string;
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
export declare function crearPedido(sb: SupabaseClient, args: {
    organizacionId: string;
    /** Teléfono como lo trae el webhook. `pedido.telefono_norm` es GENERATED. */
    telefono: string | null;
    cliente: string;
    borrador: PedidoEnCurso;
}): Promise<ResultadoPedido>;
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
export declare function guardarRespuesta(sb: SupabaseClient, conversacionId: string, texto: string, wamid: string | null): Promise<{
    ok: boolean;
    mensajeId?: string;
    error?: string;
}>;
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
export declare function procesarEntrante(m: MensajeEntrante, deps?: {
    /** Inyectable para probar sin red. */
    enviar?: typeof import('./ZernioEnvio.js').enviarTexto;
    /**
     * `true` cuando `persistirEntrante` ya conocía el evento. No cambia la
     * decisión —el paso 2 la resuelve por `estado_respuesta`— pero sí el log.
     */
    mensajeYaGuardado?: boolean;
}): Promise<ResultadoRespuesta>;
//# sourceMappingURL=BotPedidosDAO.d.ts.map
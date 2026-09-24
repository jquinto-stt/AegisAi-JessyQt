/** Resultado de aceptar un evento, antes de tocar la base. */
export interface MensajeEntrante {
    /** Clave de idempotencia. Ver `firmaValida`. */
    eventId: string;
    /** Id del mensaje en Zernio (su `message.id`). */
    zernioMessageId: string;
    /** Id del mensaje en la plataforma (Meta). */
    plataformaMessageId: string;
    /** Id interno de la conversación en Zernio. Se guarda para poder responder. */
    zernioConversationId: string;
    /** Id de la cuenta de Zernio (el número de WhatsApp). Identifica la organización. */
    accountId: string;
    /** Canal en el vocabulario de `necto.conversacion.canal`. */
    canal: string;
    /** Teléfono normalizado, solo dígitos con prefijo. `null` si el payload no lo trae. */
    telefonoNorm: string | null;
    /** Nombre visible del remitente, si lo trae. */
    nombre: string | null;
    /** Texto del mensaje. `null` si es solo adjunto. */
    texto: string | null;
    /** Cuándo lo envió la plataforma. */
    enviadoEn: string;
    /** Adjuntos crudos, tal cual vienen. Van dentro del `jsonb` de `contenido`. */
    adjuntos: unknown[];
    /**
     * Número de intento, si el payload lo declara.
     *
     * `message.attemptNumber` es lo que distingue **la primera entrega de un
     * reintento**. Se necesita para no depender de él: el bot decide con
     * `eventoBot` y esto solo alimenta el log.
     */
    intento: number | null;
    /**
     * Id del último mensaje SALIENTE del bot en esta conversación, leído de
     * Zernio, para poder citar (`replyTo`) cuando el webhook no trae
     * `platformMessageId`.
     *
     * Medido el 22/09 contra la API real: el webhook manda `platformMessageId`,
     * pero el listado `GET /v1/inbox/conversations/{id}/messages` lo devuelve
     * **`null`** y pone el wamid en `id`. El contrato y la API no dicen lo mismo.
     * Se rellena en el paso de enrutado, no aquí: `interpretar` es puro y no
     * puede salir a la red.
     */
    wamidCitables?: string | null;
}
export type MotivoRechazo = 'sin_firma' | 'firma_invalida' | 'sin_secreto' | 'json_invalido' | 'evento_ignorado' | 'no_entrante' | 'sin_identidad';
export interface Rechazo {
    ok: false;
    motivo: MotivoRechazo;
    /** HTTP que corresponde. **Nunca 5xx**: un 5xx hace que Zernio reintente. */
    status: number;
}
export interface Aceptado {
    ok: true;
    mensaje: MensajeEntrante;
}
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
export declare function firmaValida(cuerpoCrudo: string, firmaRecibida: string | undefined, secreto: string | undefined): {
    ok: true;
} | {
    ok: false;
    motivo: MotivoRechazo;
};
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
export declare function normalizarTelefono(bruto: string | null | undefined): string | null;
/**
 * Versión para buscar en la columna `telefono_norm`.
 *
 * Hoy es la misma operación que `normalizarTelefono` — porque la columna ya
 * guarda solo dígitos. Se mantiene separada a propósito: si mañana la columna
 * cambiara de forma (p. ej. a E.164 canónico con `+`), el sitio que hay que
 * tocar es este, y no los cinco lugares que buscan contactos.
 */
export declare function telefonoBuscable(normalizado: string | null): string | null;
export declare function canalDesdePlataforma(plataforma: string | undefined): string | null;
/**
 * Interpreta el payload de Zernio y decide si el evento se acepta.
 *
 * **Todo lo que no sea `message.received` con dirección entrante se ignora con
 * 200**, no con error: los otros 15 eventos suscritos (`message.read`,
 * `message.delivered`, …) son notificaciones legítimas que este receptor todavía
 * no consume. Devolver 4xx haría que Zernio las marcara como fallidas y las
 * reintentara para siempre.
 */
export declare function interpretar(payload: unknown, eventIdCabecera: string | undefined): Aceptado | Rechazo;
/** Código HTTP y motivo legible para cada rechazo. */
export declare function respuestaDeRechazo(r: Rechazo): {
    status: number;
    cuerpo: unknown;
};
//# sourceMappingURL=ZernioWebhook.d.ts.map
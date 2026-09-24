/** Resultado de un envío. Nunca lanza: los fallos se devuelven, no se propagan. */
export interface ResultadoEnvio {
    ok: boolean;
    /** wamid de Meta, si Zernio lo devolvió. Es el id para `replyTo` y `replyToMessageId`. */
    messageId?: string;
    /** HTTP, para poder distinguir un 401 de configuración de un 4xx del payload. */
    status?: number;
    error?: string;
    /** ¿Vale la pena reintentar? Un 401 o un 400 no; un 5xx o un timeout, sí. */
    reintentable?: boolean;
}
/**
 * Envía un mensaje de texto dentro de una conversación de Zernio.
 *
 * No lanza nunca. El llamador decide qué hacer con el fallo, y eso importa:
 * quien envía tiene que poder distinguir «no se envió» de «se envió y falló al
 * guardar», porque son dos estados distintos de la verdad.
 */
export declare function enviarTexto(zernioConversationId: string, accountId: string, texto: string, opciones?: {
    replyTo?: string;
}): Promise<ResultadoEnvio>;
/** Huella de un id, para poder registrarlo sin volcar el valor completo. */
export declare function huella(valor: string): string;
//# sourceMappingURL=ZernioEnvio.d.ts.map
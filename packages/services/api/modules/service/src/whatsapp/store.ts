import type { ChannelLink, InboundMessage } from "./types.js";

/**
 * Puerto de persistencia del canal.
 *
 * ⚠️ Hoy **no hay adaptador**: `services/index.ts` todavía no monta ningún cliente
 * de base de datos. El puerto se declara igual porque fija el contrato que tendrá
 * que cumplir el adaptador — y porque sin él el webhook no podría decir con
 * honestidad que no está guardando nada.
 *
 * Las claves de los registros las decide `keys.ts`, no el adaptador: la convención
 * de `pk`/`sk` es del dominio, y un adaptador que la reinvente deja registros que
 * nadie vuelve a encontrar.
 */
export interface WhatsAppStore {
  /** La tienda dueña de un número, o `undefined` si nadie lo ha vinculado. */
  findChannelLink(phoneNumberId: string): Promise<ChannelLink | undefined>;

  /**
   * Guarda el mensaje. Devuelve `false` si ya estaba.
   *
   * ⚠️ Un `false` **no es un error**: Meta reintenta las entregas, así que volver a
   * ver el mismo `messageId` es lo esperado. El adaptador tiene que escribir con
   * condición de "no existe" (`attribute_not_exists` sobre `seenMessagePk`) y
   * traducir el conflicto a `false`.
   */
  saveInboundMessage(message: InboundMessage): Promise<boolean>;
}

let current: WhatsAppStore | undefined;

/** Conecta el adaptador. Se llama desde `services/index.ts` cuando exista. */
export function wireWhatsAppStore(store: WhatsAppStore): void {
  current = store;
}

/** El adaptador conectado, o `undefined` mientras no haya ninguno. */
export function whatsAppStore(): WhatsAppStore | undefined {
  return current;
}

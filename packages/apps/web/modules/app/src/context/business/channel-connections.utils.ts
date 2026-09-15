import type {
  BusinessInstance,
  ChannelConnection,
  ChannelConnectionStatus,
  ChannelType,
} from "./types";

/* ── Conexiones de canal ───────────────────────────────────────────────
 * Lectura y escritura de `BusinessInstance.channelConnections`.
 *
 * Existe para que ninguna superficie tenga que decidir por su cuenta qué
 * significa "WhatsApp conectado": antes lo respondían tres sitios distintos
 * (una clave de `localStorage`, `setupProgress.whatsappConnected` y el estado
 * local del formulario) y los tres podían discrepar. Aquí hay una sola
 * respuesta, derivada del registro de la tienda.
 * ──────────────────────────────────────────────────────────────────── */

/** La conexión de un canal concreto, o `undefined` si nunca se conectó. */
export function findChannelConnection(
  business: Pick<BusinessInstance, "channelConnections"> | null | undefined,
  type: ChannelType
): ChannelConnection | undefined {
  return business?.channelConnections?.find(c => c.type === type);
}

/**
 * Estado de un canal. **Sin conexión registrada el estado es `not_connected`**:
 * la ausencia de dato no es un "sí".
 */
export function channelStatus(
  business: Pick<BusinessInstance, "channelConnections"> | null | undefined,
  type: ChannelType
): ChannelConnectionStatus {
  return findChannelConnection(business, type)?.status ?? "not_connected";
}

/** ¿El canal está operativo? Sólo `connected` lo está. */
export function isChannelConnected(
  business: Pick<BusinessInstance, "channelConnections"> | null | undefined,
  type: ChannelType
): boolean {
  return channelStatus(business, type) === "connected";
}

/** ¿La conexión es una demostración y no una autorización real de Meta? */
export function isDemoConnection(
  business: Pick<BusinessInstance, "channelConnections"> | null | undefined,
  type: ChannelType
): boolean {
  return findChannelConnection(business, type)?.metadata?.demo === true;
}

/** ¿Hay una conexión **real** (no de demostración)? Es la que cuenta para operar. */
export function isLiveConnection(
  business: Pick<BusinessInstance, "channelConnections"> | null | undefined,
  type: ChannelType
): boolean {
  return isChannelConnected(business, type) && !isDemoConnection(business, type);
}

/**
 * Devuelve el catálogo de conexiones con una entrada sustituida o añadida.
 *
 * Inmutable y por `type`: una tienda tiene como mucho **una** conexión por canal,
 * así que conectar dos veces reemplaza en lugar de acumular duplicados (dos
 * entradas del mismo tipo dejarían el estado del canal indefinido).
 */
export function upsertChannelConnection(
  connections: ChannelConnection[] | undefined,
  next: ChannelConnection
): ChannelConnection[] {
  const current = connections ?? [];
  const withoutType = current.filter(c => c.type !== next.type);
  return [...withoutType, next];
}

/** Conexiones por defecto de una tienda nueva: **ninguna**. */
export function emptyChannelConnections(): ChannelConnection[] {
  return [];
}

/** Conexión de WhatsApp de una tienda, ya normalizada. */
export function whatsappConnection(
  business: Pick<BusinessInstance, "channelConnections"> | null | undefined
): ChannelConnection | undefined {
  return findChannelConnection(business, "whatsapp");
}

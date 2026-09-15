/**
 * Configuración del canal, leída del entorno.
 *
 * ⚠️ Los dos valores son **secretos de servidor**:
 * - `WHATSAPP_APP_SECRET` calcula y verifica la firma de cada entrega.
 * - `WHATSAPP_VERIFY_TOKEN` es la contraseña del handshake de alta del webhook.
 *
 * Ninguno puede llegar al navegador. El frontend guarda sólo referencias no
 * secretas (`wabaId`, `phoneNumberId`, `displayPhoneNumber`), que es justo lo que
 * declara `ChannelConnection` en la app.
 *
 * ⚠️ No hay valores por defecto **a propósito**. Un secreto con `fallback` es un
 * secreto conocido: si falta, el canal no se puede verificar y hay que fallar, no
 * seguir con una cadena adivinable.
 */
export interface WhatsAppSecrets {
  appSecret?: string;
  verifyToken?: string;
}

export function whatsAppSecrets(): WhatsAppSecrets {
  return {
    appSecret: process.env.WHATSAPP_APP_SECRET,
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
  };
}

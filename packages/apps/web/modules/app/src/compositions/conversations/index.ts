/**
 * Canal conversacional — Superficie pública del canal
 * ==================================================
 *
 * ⚠️ Lo que sale por aquí es **contrato entre el canal y el resto de Necto**. Hoy
 * sólo lo consume el shell (`NectoApp`), que monta el provider y pinta la
 * pantalla. Lo que **no** se exporta —vistas, semilla, utilidades de formato— es
 * interior: nadie fuera del canal debe depender de ello, y así se puede
 * reestructurar por dentro sin romper a nadie.
 *
 * ⚠️ El **contrato de dominio** no vive aquí, vive en
 * `@/contracts/conversation.contract`. Es deliberado: un módulo futuro que quiera
 * leer el canal (Pedidos, por ejemplo) debe poder importar el tipo sin arrastrar
 * la implementación. Este barrel exporta la **superficie**, no el contrato — pero
 * lo reexporta por comodidad para quien ya está dentro de la app.
 */

export { ConversationsModule } from "./ConversationsModule";
export type { ConversationsModuleProps } from "./ConversationsModule";
export {
  CONVERSATION_SECTIONS,
  oneOfConversationSections,
} from "./conversation-sections.constants";
export type { ConversationSectionKey } from "./conversation-sections.constants";
export { ConversationsProvider, useConversations } from "./context/ConversationsContext";

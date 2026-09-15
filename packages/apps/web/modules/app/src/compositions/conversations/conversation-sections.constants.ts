import { Settings2, MessagesSquare } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ── Secciones del canal conversacional ──────────────────────────────────────
 *
 *     CANAL CONVERSACIONAL
 *     └── WhatsApp
 *         ├── Conversaciones   ← la experiencia del chat
 *         └── Configuración    ← el estado de la conexión
 *
 * ⚠️ **No** hay una sección por canal (Messenger, Instagram, Telegram). El §5 es
 * explícito: no se inventan canales que no existen. Cuando aterrice otro canal
 * conversacional, esta lista tendrá una entrada por canal —o el vocabulario se
 * anidará— pero inventarlo hoy llenaría la pantalla de puertas cerradas.
 *
 * ⚠️ Igual que `ORDERS_SECTIONS`, es un array `as const` para que el tipo se
 * **derive** del vocabulario: el que valida lo que llega por enlace y el que
 * pinta la barra no pueden divergir.
 */

export const CONVERSATION_SECTIONS = ["conversaciones", "configuracion"] as const;

export type ConversationSectionKey = (typeof CONVERSATION_SECTIONS)[number];

/** El valor si pertenece al vocabulario, o `null`. */
export function oneOfConversationSections(value: string | null): ConversationSectionKey | null {
  return value !== null && (CONVERSATION_SECTIONS as readonly string[]).includes(value)
    ? (value as ConversationSectionKey)
    : null;
}

interface SectionDef {
  key: ConversationSectionKey;
  label: string;
  icon: LucideIcon;
}

export const CONVERSATION_SECTION_DEFS: SectionDef[] = [
  { key: "conversaciones", label: "Conversaciones", icon: MessagesSquare },
  { key: "configuracion", label: "Configuración", icon: Settings2 },
];

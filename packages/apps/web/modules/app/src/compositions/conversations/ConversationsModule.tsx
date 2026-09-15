/**
 * Canal conversacional — Shell del canal (§5, §12)
 * ================================================
 *
 * Es el armazón del canal: la navegación entre sus dos secciones y la composición
 * de la experiencia de chat.
 *
 * ── Estructura ─────────────────────────────────────────────────────────────
 *
 *     CANAL CONVERSACIONAL / WhatsApp
 *     ├── Conversaciones   ← lista (izq.) + hilo (centro)
 *     └── Configuración    ← estado de la conexión
 *
 * ⚠️ **No monta `ConversationsProvider`.** Igual que Pedidos (§25), el provider
 * vive en el shell (`NectoApp`), por encima de la superficie: así el canal podría
 * alimentar mañana un widget del Dashboard —o ser consumido por un módulo— sin
 * que este archivo sepa quién más lo usa. Montarlo aquí dentro ataría el estado a
 * esta pantalla y lo haría inalcanzable para cualquier otro consumidor.
 *
 * ── Qué NO hay aquí ────────────────────────────────────────────────────────
 *
 *   · **Ningún panel derecho.** El §7 lo condiciona a que el análisis demuestre
 *     que aporta valor. En `wacrm-main` ese panel era el **contacto de CRM**
 *     —etiquetas, empresa, agente asignado, notas—, y todo eso está fuera de
 *     alcance (§10). Sin ese dominio, un panel lateral sólo repetiría el nombre y
 *     el teléfono que ya están en el encabezado: información redundante para llenar
 *     espacio, que es justo lo que el §7 prohíbe.
 *   · **Ninguna lógica de Pedidos.** El canal no sabe que Pedidos existe (§9). No
 *     hay carrito, ni productos, ni checkout, ni conversión de hilo en orden.
 *   · **Ninguna llamada a Meta.** El envío escribe en el almacén local del canal
 *     (§8); la conexión real se administra en Ajustes de Sede.
 */

import { useEffect, useMemo, useState } from "react";
import { Radio } from "lucide-react";

import { useBusiness } from "@/context/BusinessContext";
import { channelStatus, findChannelConnection } from "@/context/BusinessContext";
import { Card } from "@/elements";
import type {
  ConversationMessageContent,
  ConversationThread,
} from "@/contracts/conversation.contract";
import { useConversations } from "./context/ConversationsContext";
import {
  CONVERSATION_SECTION_DEFS,
  type ConversationSectionKey,
} from "./conversation-sections.constants";
import { ConversationList } from "./views/ConversationList";
import { ConversationSettingsView } from "./views/ConversationSettingsView";
import { ConversationView } from "./views/ConversationView";

/* ── Props ─────────────────────────────────────────────────────────────────── */

export interface ConversationsModuleProps {
  /** Sección inicial, resuelta desde la URL por `NectoApp`. */
  initialSection?: ConversationSectionKey;
  /**
   * Avisa de que el usuario cambió de sección **dentro** del canal.
   *
   * ⚠️ El canal no escribe la URL por su cuenta (no conoce la ruta del shell): la
   * sección es suya, publicarla es del shell. Es el mismo reparto que Pedidos usa
   * con `onSectionChange`.
   */
  onSectionChange?: (section: ConversationSectionKey) => void;
  /** Abre Ajustes de Sede en la pestaña de canales (puente, igual que en Pedidos). */
  onOpenStoreChannels?: () => void;
}

/* ── Shell ─────────────────────────────────────────────────────────────────── */

export function ConversationsModule({
  initialSection = "conversaciones",
  onSectionChange,
  onOpenStoreChannels,
}: ConversationsModuleProps) {
  const { activeBusiness } = useBusiness();
  const { 
    conversations, 
    messages, 
    isLoading, 
    openThread, 
    sendMessage,
    updateAttentionStatus,
    assignOperator,
    updateNotes
  } = useConversations();

  const [section, setSection] = useState<ConversationSectionKey>(initialSection);
  const [openConversationId, setOpenConversationId] = useState<string | null>(null);

  // ⚠️ La sección se sigue desde fuera: si el shell publica otra (por un enlace),
  // el canal tiene que moverse. Sin esto el prop sólo se leería al montar.
  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  // ⚠️ Al cambiar de sede se cierra el hilo abierto. Las conversaciones son de la
  // sede (§6): dejar abierto el hilo de la tienda anterior mostraría, bajo el
  // nombre de la nueva, una conversación que no es suya.
  useEffect(() => {
    setOpenConversationId(null);
  }, [activeBusiness?.id]);

  const goToSection = (next: ConversationSectionKey) => {
    setSection(next);
    onSectionChange?.(next);
  };

  /* ── Sin sede no hay canal ─────────────────────────────────────────────── */
  if (!activeBusiness) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-200 py-20 dark:border-gray-800">
        <p className="text-theme-sm font-medium text-gray-500 dark:text-gray-400">
          El canal conversacional necesita una tienda
        </p>
        <p className="max-w-md text-center text-theme-xs text-gray-400 dark:text-gray-500">
          Las conversaciones pertenecen a una sede. Crea o selecciona una tienda para atender su
          WhatsApp.
        </p>
      </div>
    );
  }

  const handleSelect = (conversationId: string) => {
    setOpenConversationId(conversationId);
    // Abrir el hilo lo marca como leído; el hilo que se pinta se deriva del store.
    openThread(conversationId);
  };

  /**
   * ⚠️ Enviar y releer el hilo **no pueden ser dos llamadas seguidas**.
   *
   * `sendMessage` y `openThread` escriben y leen con el mismo render como base, así
   * que llamarlos en secuencia dejaba el hilo pintado en el estado **anterior** al
   * envío: el mensaje se guardaba (y sobrevivía a la recarga) pero no aparecía
   * hasta volver a entrar en la conversación. Ése era el fallo real.
   *
   * La solución no es copiar el hilo de forma optimista —eso daría dos versiones
   * del mismo dato—, sino **derivar el hilo del estado del store**: el mensaje se
   * envía, y lo que se pinta se recalcula a partir de la colección vigente. Una
   * sola fuente, y la pantalla no puede divergir de lo guardado.
   */
  const activeThread = useMemo<ConversationThread | null>(() => {
    if (!openConversationId) return null;
    const conversation = conversations.find(c => c.id === openConversationId);
    if (!conversation) return null;

    return {
      conversation,
      messages: messages
        .filter(m => m.conversationId === openConversationId)
        .sort((a, b) => (a.sentAt < b.sentAt ? -1 : 1)),
    };
  }, [openConversationId, conversations, messages]);

  const handleSend = (content: ConversationMessageContent) => {
    if (!openConversationId) return;
    sendMessage(openConversationId, content);
  };

  const connection = findChannelConnection(activeBusiness, "whatsapp");

  return (
    <div data-conversations-module className="flex flex-col gap-5">
      {/* ── Encabezado del canal + secciones ───────────────────────────────── */}
      <div className="flex flex-col gap-3 border-b border-gray-200 pb-3 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-[#190088]/10 text-[#190088] dark:bg-white/10 dark:text-[#97D6DF]">
            <Radio className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-theme-xl font-bold text-[#190088] dark:text-white">
              WhatsApp
            </h1>
            <p className="truncate text-theme-xs text-gray-500 dark:text-gray-400">
              Bandeja de atención de conversaciones de {activeBusiness.name}
            </p>
          </div>
        </div>

        <nav
          aria-label="Secciones del canal conversacional"
          className="flex flex-wrap items-center gap-1.5"
        >
          {CONVERSATION_SECTION_DEFS.map(def => {
            const Icon = def.icon;
            const isActive = section === def.key;
            return (
              <button
                key={def.key}
                type="button"
                onClick={() => goToSection(def.key)}
                aria-current={isActive ? "page" : undefined}
                data-conversation-section={def.key}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-3.5 py-1.5 text-theme-sm font-semibold transition-all ${
                  isActive
                    ? "bg-[#190088] text-white shadow-xs dark:bg-white dark:text-[#190088]"
                    : "text-gray-600 hover:bg-[#EFE6D3]/40 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4 flex-none" aria-hidden />
                {def.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Sección activa ─────────────────────────────────────────────────── */}
      {section === "configuracion" ? (
        <ConversationSettingsView
          onOpenStoreChannels={onOpenStoreChannels ?? (() => {})}
          connectionStatus={channelStatus(activeBusiness, "whatsapp")}
          displayPhoneNumber={connection?.displayPhoneNumber}
        />
      ) : (
        /**
         * ⚠️ La lista y el hilo conviven en una fila desde `lg`; por debajo, el
         * hilo ocupa la pantalla y la lista se oculta. Es la misma decisión
         * responsive de la referencia, y aquí además es lo que hace usable el
         * canal en un móvil: dos columnas de 150 px no se pueden leer.
         *
         * ⚠️ La superficie es un `Card` del catálogo. Se conservan el radio de 2xl,
         * el alto fijo y el `overflow-hidden` por `className`, y el
         * `dark:bg-gray-900` propio: el `dark:bg-white/[0.03]` del catálogo dejaría
         * la superficie casi transparente bajo el hilo.
         */
        <Card className="flex h-[clamp(520px,calc(100vh-220px),820px)] min-h-0 overflow-hidden rounded-2xl border border-gray-200 bg-white p-0 sm:p-0 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className={openConversationId ? "hidden lg:flex" : "flex w-full"}>
            <ConversationList
              conversations={conversations}
              activeConversationId={openConversationId}
              onSelect={handleSelect}
              isLoading={isLoading}
            />
          </div>

          <div className={openConversationId ? "flex min-w-0 flex-1" : "hidden lg:flex lg:min-w-0 lg:flex-1"}>
            <ConversationView
              conversation={activeThread?.conversation ?? null}
              counterpart={activeThread?.conversation.counterpart ?? null}
              messages={activeThread?.messages ?? []}
              conversationId={activeThread?.conversation.id ?? null}
              onSend={handleSend}
              onBack={() => setOpenConversationId(null)}
              onUpdateStatus={updateAttentionStatus}
              onAssignOperator={assignOperator}
              onUpdateNotes={updateNotes}
            />
          </div>
        </Card>
      )}
    </div>
  );
}

export default ConversationsModule;

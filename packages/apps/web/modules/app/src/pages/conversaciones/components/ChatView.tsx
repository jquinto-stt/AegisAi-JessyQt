import { useState } from "react";
import { observer } from "mobx-react-lite";
import { Avatar } from "@/elements/ui/avatar";
import { Dropdown, DropdownItem } from "@/elements/ui/dropdown";
import { MoreDotIcon } from "@/icons";
import { conversacionesStore } from "@/stores/conversaciones.store";
import { integracionesStore } from "@/stores/integraciones.store";
import type { ModuloIntegrable } from "@/stores/integraciones.store";
import { puede } from "@/stores/acceso.utils";
import { BotonHandoff } from "./BotonHandoff";
import { ContextoModulo } from "./ContextoModulo";
import {
  AVATAR_MAP,
  inicialesDe,
  statusDe,
  horaDe,
} from "../conversaciones.utils";

interface ChatViewProps {
  convId: string;
  onTogglePanel?: () => void;
  panelExpandido?: boolean;
  onToggleBandeja?: () => void;
  bandejaExpandida?: boolean;
  /**
   * Oculta la cabecera propia del chat.
   *
   * Es una opción de PRESENTACIÓN, no un cambio de contrato: la consola completa
   * la necesita (es la única cabecera de la superficie), pero dentro del
   * `ChatDrawer` ya existe una cabecera con la identidad del cliente y el nº de
   * pedido. Sin esta prop el drawer mostraría DOS avatares y DOS nombres para el
   * mismo contacto — una identidad duplicada, que es justo el defecto de
   * arquitectura de información que hay que evitar.
   */
  sinCabecera?: boolean;
}

/**
 * Vista activa del panel del chat.
 *
 * `"conversacion"` es el hilo de mensajes —la vista por defecto y la única que
 * existe siempre— y cualquier otro valor es el id de un módulo conectado al
 * asistente. Se declara como unión sobre `ModuloIntegrable` y no como `string`
 * para que añadir un módulo al catálogo siga siendo un cambio tipado.
 */
type VistaChat = "conversacion" | ModuloIntegrable;

export const ChatView = observer(({
  convId,
  onTogglePanel,
  panelExpandido,
  onToggleBandeja,
  bandejaExpandida = true,
  sinCabecera = false,
}: ChatViewProps) => {
  const [menuOpen, setMenuOpen] = useState(false);

  // Vista activa del panel del chat: la conversación, o el contexto de uno de
  // los módulos conectados al asistente.
  const [vista, setVista] = useState<VistaChat>("conversacion");

  const conv = conversacionesStore.getConversacion(convId);
  const items = conversacionesStore.lineaDeTiempo(convId);

  // ── Pestañas de contexto ─────────────────────────────────────────────────
  //
  // Cada módulo CONECTADO al asistente (IA → Módulos integrados) aporta una
  // pestaña que muestra lo que ese módulo sabe de ESTE contacto. Son dos
  // condiciones distintas y hacen falta las dos:
  //
  //   1. El asistente está conectado al módulo. Lo decide el administrador en
  //      `/asistente/config`; aquí solo se LEE. El chat no configura nada.
  //   2. El rol puede leer ese módulo. Sin esto, la pestaña enseñaría el
  //      contexto de un módulo que el operador no alcanza — una fuga de alcance.
  //
  // El filtro sale de `modulosConContexto`, que ya resuelve el catálogo y la
  // disponibilidad. Aquí no se pregunta «¿es Pedidos?» en ningún sitio.
  const modulosContexto = integracionesStore.modulosConContexto.filter((m) =>
    puede(m.capacidad),
  );

  // Si la pestaña activa deja de existir —el administrador desconectó el módulo
  // mientras el operador tenía el chat abierto— se vuelve a la conversación. Se
  // DERIVA en el render en vez de corregirse con un efecto: un efecto daría un
  // render de más y, durante ese frame, una pestaña fantasma ya inexistente.
  const vistaActiva: VistaChat = modulosContexto.some((m) => m.id === vista)
    ? vista
    : "conversacion";

  // Entrada del catálogo del módulo activo, para poder rotular su panel. Es la
  // misma lista que pinta las pestañas, así que la etiqueta no puede divergir.
  const moduloActivo = modulosContexto.find((m) => m.id === vistaActiva) ?? null;

  if (!conv) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-gray-400">
        <p className="text-sm">Selecciona una conversación para comenzar</p>
      </div>
    );
  }

  const avatarSrc = AVATAR_MAP[conv.id] || "";

  return (
    <div className="animate-aparecer flex flex-1 flex-col overflow-hidden">
      {/* ── Cabecera del Chat (Estilo Webi.AI Elements / TailAdmin) ──
          Se omite cuando el chat se embebe en el drawer, que ya aporta su propia
          cabecera con la identidad del cliente y el nº de pedido. */}
      {!sinCabecera && (
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-3 dark:border-gray-800 dark:bg-transparent xl:px-6">
        <div className="flex items-center gap-3">
          {onToggleBandeja && (
            <button
              type="button"
              onClick={onToggleBandeja}
              title={bandejaExpandida ? "Colapsar chats" : "Mostrar lista de chats"}
              aria-label={bandejaExpandida ? "Colapsar chats" : "Mostrar lista de chats"}
              className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-all ${
                !bandejaExpandida
                  ? "border-brand-500/30 bg-brand-50 text-brand-600 shadow-2xs dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-400"
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
              }`}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 3v18" />
                {bandejaExpandida ? (
                  <path d="M14 9l-3 3 3 3" />
                ) : (
                  <path d="M12 9l3 3-3 3" />
                )}
              </svg>
            </button>
          )}

          <Avatar
            src={avatarSrc}
            alt={conv.contacto.nombre}
            initials={inicialesDe(conv.contacto.nombre)}
            size="large"
            status={statusDe(conv.estado)}
          />
          <div>
            <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
              {conv.contacto.nombre}
            </h4>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {conv.contacto.telefono}
            </span>
          </div>
        </div>

        {/* Acciones superiores: Handoff, Alternar información y Menú */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Botón Tomar / Devolver en estilo índigo / sutil (no rojo) */}
          <BotonHandoff convId={conv.id} />

          {/* Alternar panel de información del usuario */}
          {onTogglePanel && (
            <button
              type="button"
              onClick={onTogglePanel}
              title={panelExpandido ? "Ocultar información del contacto" : "Ver información del contacto"}
              aria-label={panelExpandido ? "Ocultar información del contacto" : "Ver información del contacto"}
              className={`flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-all ${
                panelExpandido
                  ? "border-brand-500/30 bg-brand-50 text-brand-600 shadow-2xs dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-400"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
              }`}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M15 3v18" />
                {panelExpandido ? (
                  <path d="M10 9l-3 3 3 3" />
                ) : (
                  <path d="M8 9l3 3-3 3" />
                )}
              </svg>
              <span className="hidden sm:inline">Info</span>
            </button>
          )}

          {/* Menú de opciones */}
          <div className="relative inline-block">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/5 dark:hover:text-white"
              aria-label="Más opciones"
            >
              <MoreDotIcon className="h-5 w-5" />
            </button>
            <Dropdown
              isOpen={menuOpen}
              onClose={() => setMenuOpen(false)}
              className="w-48 p-1.5"
            >
              {conv.estado !== "cerrada" ? (
                <DropdownItem
                  onItemClick={() => {
                    conversacionesStore.cerrar(conv.id);
                    setMenuOpen(false);
                  }}
                  className="text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                >
                  Cerrar conversación
                </DropdownItem>
              ) : (
                <div className="px-3 py-1.5 text-xs text-gray-400">
                  Conversación cerrada
                </div>
              )}
            </Dropdown>
          </div>
        </div>
      </div>
      )}

      {/* ── Pestañas de contexto ──────────────────────────────────────────
          La barra SIEMPRE está: con «Conversación» sola cuando no hay ningún
          módulo conectado. Esconderla en ese caso dejaría al operador sin saber
          si el chat no tiene módulos o si la función no existe.

          Estas pestañas NO son módulos dentro de WhatsApp ni un sitio para
          configurar nada: son vistas del contexto que los módulos conectados al
          asistente aportan a esta conversación. La conexión se decide en
          IA → Módulos integrados; aquí solo se refleja. */}
      <div
        role="tablist"
        aria-label="Vistas de la conversación"
        className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-gray-200 px-3 py-2 sm:px-5 dark:border-gray-800"
      >
        <TabContexto
          activo={vistaActiva === "conversacion"}
          onClick={() => setVista("conversacion")}
        >
          Conversación
        </TabContexto>

        {modulosContexto.map((m) => (
          <TabContexto
            key={m.id}
            activo={vistaActiva === m.id}
            onClick={() => setVista(m.id)}
          >
            {m.label}
          </TabContexto>
        ))}
      </div>

      {vistaActiva === "conversacion" ? (
      /* ── Interior del Chat (Diálogo de 2 vías: Cliente a la izquierda, Respuestas a la derecha) ── */
      <div
        role="tabpanel"
        aria-label="Conversación"
        className="flex-1 space-y-6 overflow-y-auto p-5 custom-scrollbar xl:space-y-7 xl:p-6"
      >
        {items.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="rounded-full bg-gray-100 px-4 py-2 text-center text-xs text-gray-400 dark:bg-white/5 dark:text-gray-500">
              Esta conversación aún no tiene mensajes.
            </p>
          </div>
        ) : (
          items.map((item) => {
            // Cada ítem entra con `animate-entrada-lista` (fundido + 6 px de subida).
            // Sin escalonado a propósito: en un chat los mensajes no llegan juntos, y
            // retrasarlos por índice haría que el último en llegar esperase medio segundo
            // solo por tener un índice alto. El escalonado es para listas que se pintan
            // de golpe (tablas, grids), no para un hilo cronológico.
            // Eventos del sistema: sutiles y centrados
            if (item.clase === "evento") {
              return (
                <div
                  key={item.data.id}
                  className="animate-entrada-lista my-3 flex justify-center"
                >
                  <span className="rounded-full bg-gray-100/90 px-3.5 py-1 text-center text-[11px] text-gray-500 dark:bg-white/[0.05] dark:text-gray-400">
                    • {item.data.texto}
                  </span>
                </div>
              );
            }

            const m = item.data;
            const esCliente = m.autor === "cliente";
            const esBot = m.autor === "bot";

            // ── 1. CLIENTE: SIEMPRE a la IZQUIERDA con Avatar y burbuja gris suave ──
            if (esCliente) {
              return (
                <div key={m.id} className="animate-entrada-lista flex items-start gap-3 sm:gap-4">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
                    <Avatar
                      src={avatarSrc}
                      initials={inicialesDe(conv.contacto.nombre)}
                      size="large"
                    />
                  </div>
                  <div className="max-w-[80%] sm:max-w-md">
                    <div className="rounded-2xl rounded-tl-sm bg-[#f4f5f7] px-4 py-3 text-sm text-gray-800 shadow-2xs dark:bg-white/[0.07] dark:text-white/90">
                      <p className="whitespace-pre-line leading-relaxed">{m.contenido.texto}</p>
                    </div>
                    <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                      {conv.contacto.nombre}, {horaDe(m.timestamp)}
                    </p>
                  </div>
                </div>
              );
            }

            // ── 2. BOT DE NUESTRA TIENDA: A la DERECHA con distintivo Bot / IA ──
            if (esBot) {
              return (
                <div key={m.id} className="animate-entrada-lista flex justify-end">
                  <div className="max-w-[80%] sm:max-w-md text-right">
                    <div className="rounded-2xl rounded-tr-sm bg-[#3a44c7] px-4 py-3 text-left text-sm text-white shadow-xs dark:bg-[#343cae]">
                      {/* Distintivo claro de Bot para diferenciarlo del asesor */}
                      <div className="mb-1 flex items-center justify-end gap-1.5 text-[11px] font-semibold text-indigo-200">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-300" />
                        <span>Bot Necto (IA)</span>
                      </div>
                      <p className="whitespace-pre-line leading-relaxed">{m.contenido.texto}</p>
                    </div>
                    <p className="mt-1.5 text-right text-xs text-gray-400 dark:text-gray-500">
                      Bot Necto, {horaDe(m.timestamp)}
                    </p>
                  </div>
                </div>
              );
            }

            // ── 3. ASESOR HUMANO (Equipo): A la DERECHA con Índigo vibrante #465fff ──
            return (
              <div key={m.id} className="animate-entrada-lista flex justify-end">
                <div className="max-w-[80%] sm:max-w-md text-right">
                  <div className="rounded-2xl rounded-tr-sm bg-[#465fff] px-4 py-3 text-left text-sm text-white shadow-xs">
                    {/* Distintivo claro de Asesor Humano */}
                    <div className="mb-1 flex items-center justify-end gap-1.5 text-[11px] font-semibold text-white/90">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-300" />
                      <span>Asesor Humano</span>
                    </div>
                    <p className="whitespace-pre-line leading-relaxed">{m.contenido.texto}</p>
                  </div>
                  <p className="mt-1.5 text-right text-xs text-gray-400 dark:text-gray-500">
                    {horaDe(m.timestamp)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
      ) : (
        /* Cuerpo de la pestaña de un módulo. El módulo LEE su propio dominio:
           este componente no consulta ningún store de negocio, solo monta la
           vista que el módulo declara para sí mismo. */
        <div
          role="tabpanel"
          aria-label={moduloActivo?.label ?? "Contexto del módulo"}
          className="min-h-0 flex-1 overflow-hidden"
        >
          <ContextoModulo convId={convId} modulo={vistaActiva} />
        </div>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTES LOCALES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * TabContexto — pestaña de la barra de vistas del chat.
 *
 * Se compone a mano con el estilo de píldora ya usado en el proyecto en vez de
 * usar `ButtonsGroup`: ese elemento fija `min-w-[393px]`/`min-w-[309px]` y
 * rompería el ancho del panel del chat (hallazgo ya documentado en la
 * configuración del asistente y del canal).
 *
 * `role="tab"` + `aria-selected` para que la vista activa sea anunciable: la
 * pestaña cambia el contenido del panel, así que no es un simple botón.
 */
function TabContexto({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={activo}
      onClick={onClick}
      className={
        "shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors " +
        (activo
          ? "bg-gray-100 text-gray-900 dark:bg-white/[0.08] dark:text-white"
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.04] dark:hover:text-gray-200")
      }
    >
      {children}
    </button>
  );
}

export default ChatView;

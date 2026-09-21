import { useState } from "react";
import { observer } from "mobx-react-lite";
import { Avatar } from "@/elements/ui/avatar";
import { Dropdown, DropdownItem } from "@/elements/ui/dropdown";
import { MoreDotIcon, EyeIcon, ArrowRightIcon } from "@/icons";
import { conversacionesStore } from "@/stores/conversaciones.store";
import {
  claseSegmentoActivo,
  claseSegmentoInactivo,
} from "@/pages/config-layout";
import type { Mensaje } from "@/stores/conversaciones.types";
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
                  ? "border-brand-500/30 bg-brand-50 text-brand-600 shadow-theme-xs dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-400"
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
            <h4 className="text-sm font-semibold text-ink-title dark:text-white/90">
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
                  ? "border-brand-500/30 bg-brand-50 text-brand-600 shadow-theme-xs dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-400"
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
                  className="text-xs text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10"
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
                <div key={m.id} className="animate-entrada-lista flex items-start gap-3 sm:gap-3.5">
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full sm:h-10 sm:w-10">
                    <Avatar
                      src={avatarSrc}
                      initials={inicialesDe(conv.contacto.nombre)}
                      size="large"
                    />
                  </div>
                  <div className="max-w-[85%] sm:max-w-md">
                    <div className="rounded-2xl rounded-tl-sm bg-gray-100 px-4 py-3 text-sm text-gray-800 shadow-theme-xs dark:bg-white/[0.07] dark:text-white/90">
                      <p className="mb-1 text-xs font-semibold text-gray-900 dark:text-white">
                        {conv.contacto.nombre}
                      </p>
                      <p className="whitespace-pre-line leading-relaxed">{m.contenido.texto}</p>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 pl-1 text-[11px] text-gray-400 dark:text-gray-500">
                      <EyeIcon className="h-3 w-3" />
                      <span>{horaDe(m.timestamp)}</span>
                    </div>
                  </div>
                </div>
              );
            }

            // ── 2. BOT CON TRAZABILIDAD VISUAL IA: Avatar Robot + Caja Punteada de Intención + Conector + Burbuja Lavanda ──
            if (esBot) {
              const traza = getBotTrazabilidad(m, conv.estado);
              const puedeIrModulo =
                traza.modulo && modulosContexto.some((mod) => mod.id === traza.modulo);

              return (
                <div key={m.id} className="animate-entrada-lista flex items-start gap-3 sm:gap-3.5">
                  <BotAvatar />

                  <div className="max-w-[85%] flex-1 sm:max-w-lg">
                    {/* Tarjeta de Trazabilidad / Intención IA */}
                    <div className="rounded-xl border border-dashed border-secondary-300/80 bg-secondary-50/40 p-3 shadow-theme-xs dark:border-secondary-700/60 dark:bg-secondary-950/20">
                      {/* Cabecera de la traza: Nombre del bot + Ojo con hora */}
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-secondary-900 dark:text-secondary-200">
                            {traza.nombreBot}
                          </span>
                          <span className="inline-flex items-center rounded-full bg-secondary-100 px-1.5 py-0.5 text-[10px] font-medium text-secondary-700 dark:bg-secondary-900/50 dark:text-secondary-300">
                            IA
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
                          <EyeIcon className="h-3 w-3" />
                          <span>{horaDe(m.timestamp)}</span>
                        </div>
                      </div>

                      {/* Línea de intención / flujo de ejecución */}
                      <p className="text-xs font-medium leading-snug text-gray-700 dark:text-gray-300">
                        {traza.flujo}
                      </p>

                      {/* Pill de categoría / módulo */}
                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${traza.tagClass}`}
                        >
                          {traza.tag}
                        </span>
                      </div>
                    </div>

                    {/* Conector punteado tipo codo hacia la burbuja */}
                    <div className="flex items-center py-0.5 pl-4 text-secondary-400 dark:text-secondary-600">
                      <svg
                        className="h-3.5 w-3.5 overflow-visible"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          d="M4 0v8a4 4 0 0 0 4 4h8"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeDasharray="2 2"
                        />
                      </svg>
                    </div>

                    {/* Burbuja de respuesta del bot: lavanda suave */}
                    <div className="rounded-2xl rounded-tl-sm border border-secondary-200/70 bg-secondary-25 px-4 py-3 text-sm text-gray-800 shadow-theme-xs dark:border-secondary-800/40 dark:bg-secondary-950/30 dark:text-secondary-100">
                      <p className="whitespace-pre-line leading-relaxed">{m.contenido.texto}</p>

                      {/* Acción interactiva si hay módulo conectado o pedido */}
                      {traza.accion ? (
                        <div className="mt-3 flex items-center justify-between border-t border-secondary-200/60 pt-2.5 dark:border-secondary-800/40">
                          {puedeIrModulo ? (
                            <button
                              type="button"
                              onClick={() => setVista(traza.modulo!)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-secondary-200 bg-white px-2.5 py-1 text-xs font-semibold text-secondary-700 shadow-theme-xs transition-colors hover:bg-secondary-50 dark:border-secondary-700 dark:bg-secondary-900/60 dark:text-secondary-200 dark:hover:bg-secondary-800/60"
                            >
                              <span>{traza.accion}</span>
                              <ArrowRightIcon className="h-3 w-3" />
                            </button>
                          ) : (
                            <span className="text-xs font-medium text-secondary-600 dark:text-secondary-300">
                              {traza.accion}
                            </span>
                          )}
                          <span className="text-[11px] text-secondary-400 dark:text-secondary-400/80">
                            {horaDe(m.timestamp)}
                          </span>
                        </div>
                      ) : (
                        <p className="mt-1 text-right text-[11px] text-secondary-400 dark:text-secondary-400/80">
                          {horaDe(m.timestamp)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            // ── 3. ASESOR HUMANO (Equipo): A la DERECHA con Índigo de marca #15008B ──
            return (
              <div key={m.id} className="animate-entrada-lista flex justify-end">
                <div className="max-w-[80%] sm:max-w-md text-right">
                  <div className="rounded-2xl rounded-tr-sm bg-secondary-600 px-4 py-3 text-left text-sm text-white shadow-theme-xs">
                    {/* Distintivo claro de Asesor Humano */}
                    <div className="mb-1 flex items-center justify-end gap-1.5 text-[11px] font-semibold text-white/90">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-success-300" />
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
      // ── La pestana ACTIVA va en el naranja de marca ──────────────────
      //
      // Estaba en `bg-gray-100 text-gray-900`: sobre la barra, la activa se
      // leia como «la fila resaltada», no como «la que estas viendo». Y era
      // incoherente con el resto del producto, que ya marca la seleccion en
      // naranja (`elements/SegmentedControl` con su `tone="accent"` por
      // defecto, las pildoras de filtro de `HistorialAtencionPage`, y ahora
      // el conmutador de vistas de este mismo modulo).
      //
      // Se reutiliza `claseSegmentoActivo` de `@/pages/config-layout` en vez
      // de escribir el par de clases otra vez: una pestaña-pildora y un
      // segmento son la misma forma, y el color se declara una sola vez.
      className={
        "shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors " +
        (activo ? claseSegmentoActivo : claseSegmentoInactivo)
      }
    >
      {children}
    </button>
  );
}

interface BotTrazabilidad {
  nombreBot: string;
  flujo: string;
  tag: string;
  tagClass: string;
  modulo?: ModuloIntegrable;
  accion?: string;
}

function getBotTrazabilidad(m: Mensaje, estadoConv?: string): BotTrazabilidad {
  // 1. Pedidos
  if (m.moduloContexto === "pedidos" || m.payload?.pedidoId) {
    return {
      nombreBot: "Chatbot Necto",
      flujo: "Verificación de menú + [Catálogo de pedidos] + Validación operativa",
      tag: "+Pedidos",
      tagClass:
        "bg-success-50 text-success-700 border-success-200/80 dark:bg-success-950/40 dark:text-success-300 dark:border-success-800/40",
      modulo: "pedidos",
      accion: m.payload?.pedidoId ? `Ver pedido #${m.payload.pedidoId}` : "Ver catálogo de pedidos",
    };
  }

  // 2. Inventario
  if (m.moduloContexto === "inventario") {
    return {
      nombreBot: "Chatbot Necto",
      flujo: "Consulta de existencias + [Stock en tiempo real] + Validación de almacén",
      tag: "+Inventario",
      tagClass:
        "bg-accent-50 text-accent-700 border-accent-200/80 dark:bg-accent-950/40 dark:text-accent-300 dark:border-accent-800/40",
      modulo: "inventario",
      accion: "Consultar en Inventario",
    };
  }

  // 3. Handoff / derivación
  if (
    estadoConv === "handoff_solicitado" ||
    m.contenido.texto.toLowerCase().includes("asesor") ||
    m.contenido.texto.toLowerCase().includes("humano")
  ) {
    return {
      nombreBot: "Chatbot Necto",
      flujo: "Derivación asistida + [Mesa de ayuda] + Solicitud de handoff",
      tag: "+Handoff",
      tagClass:
        "bg-warning-50 text-warning-700 border-warning-200/80 dark:bg-warning-950/40 dark:text-warning-300 dark:border-warning-800/40",
    };
  }

  // 4. Base de conocimiento / Asistente general
  return {
    nombreBot: "Chatbot Necto",
    flujo: "Atención inteligente + [Base de conocimiento] + Respuesta conversacional",
    tag: "+FAQ",
    tagClass:
      "bg-secondary-50 text-secondary-700 border-secondary-200/80 dark:bg-secondary-950/40 dark:text-secondary-300 dark:border-secondary-800/40",
  };
}

/**
 * BotAvatar — Avatar distintivo de robot con indicador IA en la esquina inferior.
 */
function BotAvatar() {
  return (
    <div className="relative h-9 w-9 shrink-0 sm:h-10 sm:w-10">
      <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-b from-secondary-100 to-secondary-100 text-secondary-700 shadow-theme-xs ring-1 ring-secondary-200 dark:from-secondary-950/60 dark:to-secondary-950/60 dark:text-secondary-300 dark:ring-secondary-800/50">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="11" width="18" height="10" rx="3" />
          <circle cx="12" cy="5" r="2" />
          <path d="M12 7v4" />
          <line x1="8" y1="16" x2="8.01" y2="16" strokeWidth="2.5" />
          <line x1="16" y1="16" x2="16.01" y2="16" strokeWidth="2.5" />
        </svg>
      </div>
      <div
        className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-secondary-600 text-white shadow-theme-xs ring-2 ring-white dark:ring-gray-900"
        title="Agente IA de atención"
      >
        <svg
          className="h-2.5 w-2.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>
    </div>
  );
}

export default ChatView;

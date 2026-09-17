import { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { useNavigate } from "react-router";

import { Badge } from "@/elements/ui/badge";
import { Button } from "@/elements/ui/button";
import {
  conversacionesStore,
  ESTADO_CONVERSACION_BADGE,
  ESTADO_CONVERSACION_LABEL,
} from "@/stores/conversaciones.store";
import type { Pedido } from "@/stores/pedidos.store";

import { ChatView } from "@/pages/conversaciones/components/ChatView";
import { Composer } from "@/pages/conversaciones/components/Composer";
import { AVATAR_MAP, inicialesDe, statusDe } from "@/pages/conversaciones/conversaciones.utils";
import { Avatar } from "@/elements/ui/avatar";

/** Ancho del panel en escritorio; en móvil ocupa el ancho completo. */
const ANCHO_PANEL = "w-full sm:w-[26rem] lg:w-[28rem]";

/** Motivo mostrado cuando el hilo está cerrado (el composer se deshabilita). */
const MOTIVO_CERRADA =
  "Esta conversación está cerrada. Reactívala desde la consola completa para responder.";

interface ChatDrawerProps {
  /**
   * Pedido del que se abre el hilo. Opcional: una superficie que YA tiene un
   * hilo (la tarjeta "Clientes" de Inicio) no tiene por qué inventarse un
   * pedido, y no todo contacto que escribe tiene uno. Pasa `convId` en su lugar.
   */
  pedido?: Pedido | null;
  /**
   * Conversación que se abre directamente, cuando la superficie que invoca YA
   * tiene un hilo (p. ej. la tarjeta "Clientes" de Inicio, que lista
   * conversaciones, no pedidos). Tiene prioridad sobre `pedido`.
   *
   * Existe porque no todo cliente tiene pedido: un contacto que escribe por
   * WhatsApp sin haber pedido es un caso normal, y forzar el paso por `pedido`
   * obligaría a inventar uno. La ausencia de pedido se representa como ausencia.
   */
  convId?: string | null;
  /** Cierra el drawer. */
  onClose: () => void;
}

/**
 * ChatDrawer — slide-over de chat rápido, compartido por el Tablero Kanban y la
 * vista de Inicio.
 *
 * DISEÑO (por qué NO se usa el `Modal` del catálogo):
 * El `Modal` de `elements/ui/modal` está centrado, no tiene animación, no admite
 * prop de tamaño y — decisivo — bloquea el scroll del `body` y monta un
 * contenedor `fixed inset-0 z-99999` que captura el puntero. Eso impediría
 * arrastrar tarjetas en el Kanban mientras el chat está abierto, que es
 * justamente el requisito del flujo de trabajo. Tampoco existe en el catálogo
 * ningún primitivo de slide-over/drawer/backdrop (verificado con `ui_refine` y
 * `ui_lookup`, que devolvieron `Popover`/`Modal`/`Dropdown`/`Card`/`Ribbon` para
 * esa intención). Por eso el contenedor se compone aquí a mano, mientras que
 * TODO el contenido reutiliza componentes/composiciones del catálogo y de la
 * consola existente (`Avatar`, `Badge`, `Button`, `ChatView`, `Composer`).
 *
 * REQUISITO DE FLUJO (crítico): el fondo del drawer NO captura eventos de
 * puntero. El panel NO bloquea el scroll del `body` ni usa un overlay a pantalla
 * completa opaco; el resto de la página (el Kanban) sigue siendo interactivo.
 * Cerrar se hace con la X, con la tecla Escape, o por el propio consumidor.
 *
 * FUENTE DE VERDAD: el hilo se resuelve SIEMPRE con
 * `conversacionesStore.porTelefono(pedido.telefono)`, el resolutor canónico que
 * normaliza el teléfono. El componente no recorre `conversaciones` por su cuenta
 * ni inventa un hilo cuando no existe: la ausencia se representa como ausencia.
 */
export const ChatDrawer = observer(({ pedido = null, convId = null, onClose }: ChatDrawerProps) => {
  const navigate = useNavigate();
  // Abierto si CUALQUIERA de las dos vías trae destino: `convId` (la fila ya es
  // un hilo) o `pedido` (hay que resolver el hilo por su teléfono).
  const abierto = pedido !== null || convId !== null;

  // Cierre con Escape mientras el drawer está abierto.
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierto, onClose]);

  // El hilo se deriva con el resolutor canónico. `convId` tiene prioridad: la
  // superficie que lo pasa ya sabe qué hilo quiere abrir (no hace falta —ni
  // sería correcto— volver a buscarlo por teléfono). Sin `convId`, se resuelve
  // por el teléfono del pedido. El componente nunca barre `conversaciones` a mano.
  const conv = convId
    ? conversacionesStore.getConversacion(convId)
    : pedido
      ? conversacionesStore.porTelefono(pedido.telefono)
      : undefined;

  // La renderización de la animación de entrada se hace montando tras el primer
  // frame: sin esto el panel aparece ya colocado y no se ve el deslizamiento.
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!abierto) {
      setVisible(false);
      return;
    }
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [abierto]);

  if (!abierto) return null;

  // Identidad del cliente: preferimos el hilo (nombre del contacto) y caemos al
  // pedido cuando no hay hilo. Con `convId` siempre hay hilo, así que estas
  // variables no dependen de que exista un pedido.
  const nombre = conv?.contacto.nombre ?? pedido?.cliente ?? "";
  const telefono = conv?.contacto.telefono ?? pedido?.telefono ?? "";
  const cerrada = conv?.estado === "cerrada";

  const abrirConsolaCompleta = () => {
    // Deja la conversación activa en la consola: si existe, se selecciona; si no,
    // la consola arranca con su propia selección por defecto (nunca inventamos).
    if (conv) conversacionesStore.seleccionar(conv.id);
    navigate("/conversaciones");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-99999 flex justify-end"
      // El contenedor solo es un punto de anclaje geométrico: NO intercepta
      // eventos de puntero, así que las tarjetas del Kanban siguen siendo
      // arrastrables con el drawer abierto.
      style={{ pointerEvents: "none" }}
      role="dialog"
      aria-modal="false"
      aria-label={`Chat rápido con ${nombre}`}
    >
      {/* Scrim visual: decorativo y no interactivo (no cierra al clic), para no
          robar gestos al fondo. Se atenúa, no se opaca. */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 bg-gray-900/20 transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Panel lateral: aquí SÍ se reactivan los eventos de puntero, porque el
          panel es la superficie con la que el operador interactúa. */}
      <aside
        className={`relative flex h-full flex-col border-l border-gray-200 bg-white shadow-2xl transition-transform duration-300 ease-out dark:border-gray-800 dark:bg-gray-900 ${ANCHO_PANEL} ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ pointerEvents: "auto" }}
      >
        {/* ── Cabecera: identidad + nº de pedido + acciones ── */}
        <header className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar
              src={conv ? AVATAR_MAP[conv.id] || "" : ""}
              alt={nombre}
              initials={inicialesDe(nombre)}
              size="large"
              status={conv ? statusDe(conv.estado) : "offline"}
            />
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">
                {nombre}
              </h2>
              <p className="truncate text-xs text-gray-400 dark:text-gray-500">{telefono}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {/* Nº de pedido: identifica el contexto comercial del hilo. Solo se
                muestra si el drawer se abrió POR un pedido: si se abrió por
                `convId` (tarjeta "Clientes") puede no haber ninguno, y un
                contacto sin pedido no debe inventarse un número. */}
            {pedido && (
              <Badge size="sm" color="light" className="tabular-nums">
                #{pedido.numero}
              </Badge>
            )}
            {/* Estado del hilo: SIEMPRE desde el catálogo del store, nunca un
                literal. Si se añadiera un estado nuevo, el `Record` obliga a
                cubrirlo aquí y el tipo lo verifica en compilación. */}
            {conv && (
              <Badge size="sm" color={ESTADO_CONVERSACION_BADGE[conv.estado]}>
                {ESTADO_CONVERSACION_LABEL[conv.estado]}
              </Badge>
            )}

            <button
              type="button"
              onClick={abrirConsolaCompleta}
              title="Abrir en consola completa"
              aria-label="Abrir en consola completa"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/5 dark:hover:text-white"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 3h6v6" />
                <path d="M10 14 21 3" />
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              </svg>
            </button>

            <button
              type="button"
              onClick={onClose}
              title="Cerrar"
              aria-label="Cerrar"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/5 dark:hover:text-white"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </header>

        {/* ── Cuerpo: hilo existente o estado vacío explícito ── */}
        {conv ? (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
              {/* `sinCabecera`: la identidad del cliente y el nº de pedido ya
                  viven en la cabecera del drawer; sin esto se duplicarían. */}
              <ChatView convId={conv.id} sinCabecera />
            </div>
            <div className="shrink-0">
              {cerrada ? (
                <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-800">
                  <p className="text-xs text-gray-400 dark:text-gray-500">{MOTIVO_CERRADA}</p>
                </div>
              ) : (
                <Composer convId={conv.id} />
              )}
            </div>
          </>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-400"
              >
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
              Sin conversación
            </h3>
            <p className="max-w-xs text-xs text-gray-400 dark:text-gray-500">
              {nombre} todavía no tiene un hilo de WhatsApp. La conversación se inicia desde el
              dispositivo del cliente.
            </p>
            <Button variant="outline" size="sm" onClick={abrirConsolaCompleta}>
              Abrir la consola de chat
            </Button>
          </div>
        )}
      </aside>
    </div>
  );
});

export default ChatDrawer;

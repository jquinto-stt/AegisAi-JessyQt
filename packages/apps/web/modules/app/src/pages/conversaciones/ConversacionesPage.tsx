import { useState } from "react";
import { observer } from "mobx-react-lite";

import { PageMeta } from "@/shell/meta";
import { conversacionesStore } from "@/stores/conversaciones.store";
import { BandejaLista } from "@/pages/conversaciones/components/BandejaLista";
import { ChatView } from "@/pages/conversaciones/components/ChatView";
import { Composer } from "@/pages/conversaciones/components/Composer";
import { BotonHandoff } from "@/pages/conversaciones/components/BotonHandoff";
import { PanelContexto } from "@/pages/conversaciones/components/PanelContexto";

// ═══════════════════════════════════════════════════════════════════════════
// CONSOLA DEL OPERADOR — /conversaciones
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ConversacionesPage — consola del operador (dentro del `AppShell`).
 *
 * Esta tarea (6.1) implementa ÚNICAMENTE el **layout** y el **estado de
 * colapsado** del panel de contexto. Los componentes reales de cada zona se
 * implementan en tareas posteriores y aquí quedan como huecos claramente
 * identificados:
 *   - `BandejaLista`   → tarea 6.2 (columna izquierda).
 *   - `ChatView`       → tarea 6.3 (columna central, línea de tiempo).
 *   - `Composer`       → tarea 6.4 (columna central, envío gated).
 *   - botón Tomar/Devolver → tarea 6.5 (columna central).
 *   - `PanelContexto`  → tarea 6.6 (panel derecho colapsable).
 *
 * Disposición: **2 columnas + panel de contexto colapsable** a la derecha
 * (bandeja | chat | panel). El panel de contexto es responsabilidad de la Page
 * en cuanto a layout, por lo que el estado expandido/colapsado y su control de
 * alternado viven aquí (`useState`). Inicialmente **colapsado** (Req 7.1); el
 * control de expandir/colapsar alterna el estado (Req 7.2).
 *
 * Se envuelve en `observer` (mobx-react-lite) y se cablea con
 * `conversacionesStore` (p. ej. `seleccionadaId`) para que la estructura sea
 * reactiva. El detalle de bandeja/chat/panel NO se implementa aquí.
 *
 * Requisitos: 7.1 (panel colapsable, inicialmente colapsado), 7.2 (alternar).
 */
export const ConversacionesPage = observer(() => {
  // Estado de colapsado del panel de contexto: layout es responsabilidad de la
  // Page. Inicialmente COLAPSADO (Req 7.1); el botón lo alterna (Req 7.2).
  const [panelExpandido, setPanelExpandido] = useState(false);

  // Lectura reactiva del store: la selección determina qué chat/panel se
  // muestran (el detalle lo resuelven 6.3/6.6). Aquí solo se usa para hacer la
  // estructura reactiva y decidir el estado vacío del área central.
  const seleccionadaId = conversacionesStore.seleccionadaId;
  const conversacion =
    seleccionadaId !== null
      ? conversacionesStore.getConversacion(seleccionadaId)
      : undefined;

  return (
    <>
      <PageMeta
        title="Conversaciones"
        description="Consola del operador — bandeja, chat y contexto del contacto"
      />

      {/* Altura estable tipo consola: el AppShell no propaga altura fija, así
          que basamos la altura mínima en el viewport descontando header/footer
          y paddings del shell (~14rem), igual que la página del asistente. */}
      <div className="flex min-h-[calc(100vh-14rem)] gap-4 sm:gap-5 items-stretch">
        {/* ── Columna izquierda: BANDEJA (hueco para 6.2) ── */}
        <aside className="hidden w-72 shrink-0 flex-col overflow-y-auto rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs md:flex xl:w-80 dark:border-gray-800 dark:bg-gray-900">
          {/* Bandeja (tarea 6.2): filtros, buscador, badges de estado/responsable,
              contador de no leídos e indicador de bandeja vacía. Consume
              conversacionesStore.bandeja y llama seleccionar/setFiltro/setBusqueda. */}
          <BandejaLista />
        </aside>

        {/* ── Columna central: CHAT (huecos para 6.3 / 6.4 / 6.5) ── */}
        <section className="flex min-w-0 flex-1 flex-col rounded-2xl border border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
          {/* Cabecera del chat + control del panel de contexto */}
          <header className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <div className="flex min-w-0 items-center gap-3">
              <h1 className="truncate text-lg font-bold text-gray-800 dark:text-white/90">
                {conversacion?.contacto.nombre ?? "Conversaciones"}
              </h1>
              {/* Botón principal Tomar/Devolver (6.5): alterna según
                  estado/atencion y está gated por channels.respond. Solo con
                  conversación seleccionada. */}
              {seleccionadaId !== null && (
                <BotonHandoff convId={seleccionadaId} />
              )}
            </div>

            {/* Control de expandir/colapsar el panel de contexto (Req 7.2).
                El layout del panel es responsabilidad de la Page, por eso el
                estado y su toggle viven aquí. */}
            <button
              type="button"
              onClick={() => setPanelExpandido((v) => !v)}
              aria-pressed={panelExpandido}
              aria-label={
                panelExpandido
                  ? "Colapsar panel de contexto"
                  : "Expandir panel de contexto"
              }
              className={`flex shrink-0 items-center justify-center rounded-lg border px-2.5 py-1.5 text-sm font-medium transition-colors ${
                panelExpandido
                  ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-500/10 dark:text-brand-300"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
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
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="15" y1="3" x2="15" y2="21" />
              </svg>
            </button>
          </header>

          {/* Área de la línea de tiempo (6.3) */}
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {/* ChatView (6.3): línea de tiempo unificada — burbujas cliente
                (dcha) / negocio·bot (izq) + eventos de sistema; indicador de
                conversación vacía. Cuando no hay selección se conserva el estado
                "Selecciona una conversación". */}
            {seleccionadaId === null ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-400 dark:text-gray-500">
                Selecciona una conversación
              </div>
            ) : (
              <ChatView convId={seleccionadaId} />
            )}
          </div>

          {/* Zona inferior: composer (tarea 6.4) — enviarComoNegocio, gated por
              channels.respond, límite 4096, aviso de exceso de límite. Coherente
              con el ChatView: sin selección se conserva el estado
              "Selecciona una conversación" y no se muestra el composer. */}
          {seleccionadaId !== null && (
            <div className="border-t border-gray-100 p-4 dark:border-gray-800">
              <Composer convId={seleccionadaId} />
            </div>
          )}
        </section>

        {/* ── Panel derecho: CONTEXTO colapsable (hueco para 6.6) ──
            Inicialmente colapsado (Req 7.1). Cuando está expandido ocupa
            ~360px; colapsado no se renderiza el contenido del panel. */}
        {panelExpandido && (
          <aside className="hidden w-[360px] shrink-0 flex-col overflow-y-auto rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs lg:flex dark:border-gray-800 dark:bg-gray-900">
            {/* Encabezado del panel + control de colapsar (Req 7.2). El toggle
                de expandido/colapsado vive en la Page (layout); el CONTENIDO con
                pestañas Pedidos/Turnos lo aporta <PanelContexto /> (tarea 6.6). */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                Contexto
              </h2>
              <button
                type="button"
                onClick={() => setPanelExpandido(false)}
                aria-label="Colapsar panel de contexto"
                className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Colapsar
              </button>
            </div>

            {/* Contenido del panel (TabPedidos vía pedidosStore.porTelefono +
                [Crear pedido]; TabTurnos placeholder). Sin selección muestra un
                aviso "Selecciona una conversación". */}
            <div className="mt-3 min-h-0 flex-1">
              <PanelContexto convId={seleccionadaId} />
            </div>
          </aside>
        )}
      </div>
    </>
  );
});

export default ConversacionesPage;

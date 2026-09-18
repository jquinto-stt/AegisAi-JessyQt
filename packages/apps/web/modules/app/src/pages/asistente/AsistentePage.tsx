import { useState } from "react";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { assistantStore } from "@/stores";
import { retardoEscalonado } from "@/utils";
import { ChatThread } from "./views/ChatThread";
import { Composer } from "./views/Composer";
import { FactsPanel } from "./views/FactsPanel";
import { ConversationsSidebar } from "./views/ConversationsSidebar";
import { ArtifactCanvas } from "./views/canvas";
import { SUGERENCIAS } from "./sugerencias";

// ═══════════════════════════════════════════════════════════════════════════
// ASISTENTE PAGE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * AsistentePage — pantalla del asistente "Necto Intelligence" con el concepto
 * de chat tipo "AI Assistant".
 *
 * Compone las vistas del módulo (`ChatThread`, `Composer`, `FactsPanel`)
 * observando el `assistantStore` (MobX). Se renderiza dentro del `Outlet` del
 * `AppShell` (que ya provee sidebar + header), ocupando la altura disponible.
 *
 * Disposición:
 *   - Encabezado: título grande "Asistente IA" a la izquierda y, a la derecha,
 *     un pill ESTÁTICO decorativo con el texto "Necto" junto al botón
 *     "Limpiar" (discreto).
 *   - Estado VACÍO (sin mensajes): mucho espacio en blanco arriba y, anclado
 *     hacia la parte inferior-central, tres tarjetas de sugerencia (responsive)
 *     seguidas del `Composer`.
 *   - Con conversación: el `ChatThread` scrollable ocupa el área central, un
 *     aviso de error discreto si lo hay, el `Composer` abajo y —solo en
 *     pantallas grandes— un aside con el `FactsPanel` de la última evidencia.
 *
 * Requisitos: 1.6 (hilo de conversación) y 3.8 (evidencia visible).
 */
export const AsistentePage = observer(() => {
  const hayMensajes = assistantStore.mensajes.length > 0;
  const pensando = assistantStore.pensando;

  // Estado local de la barra de conversaciones desplegable (a la derecha).
  const [barraAbierta, setBarraAbierta] = useState(false);

  // Evidencia del último mensaje del asistente que tenga `evidence` definido.
  const ultimaEvidencia = [...assistantStore.mensajes]
    .reverse()
    .find((m) => m.role === "assistant" && m.evidence)?.evidence;

  const activeArtifact = assistantStore.activeArtifact;

  return (
    <>
      <PageMeta title="NECTO AI" description="Necto Intelligence — pregunta sobre tus pedidos" />

      {/* Altura grande y estable tipo chat: el shell no propaga altura fija,
          así que basamos la altura mínima en el viewport descontando
          header+footer+paddings del AppShell (~16rem). */}
      {/* Contenedor principal con fondo sutil que resalta la separación de ambas tarjetas */}
      <div className="flex flex-col gap-4">
        {/* Encabezado general de la pantalla */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">Asistente IA</h1>
            <span className="rounded-full border border-gray-200 px-3 py-0.5 text-xs font-medium text-gray-600 dark:border-gray-700 dark:text-gray-300">
              Necto
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* Toggle de la barra de conversaciones */}
            <button
              type="button"
              onClick={() => setBarraAbierta((v) => !v)}
              aria-label="Conversaciones"
              aria-pressed={barraAbierta}
              className={`flex items-center justify-center rounded-lg border px-2.5 py-1.5 text-sm font-medium transition-colors ${
                barraAbierta
                  ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-500/10 dark:text-brand-300"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="15" y1="3" x2="15" y2="21" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => assistantStore.limpiar()}
              disabled={!hayMensajes}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* ── Contenedor Split-Screen: dos tarjetas flotantes con separación (gap) limpia ── */}
        {/*
          `overflow-x-clip` no es decorativo: el paneo de entrada de la tarjeta
          derecha la desplaza 32px hacia la derecha desde su posición de reposo,
          que ya está pegada al borde. Medido en el navegador, eso desborda el
          documento en 4px durante ~3 fotogramas y hace parpadear la barra de
          scroll horizontal de la página — el artefacto exacto que el paneo
          debía evitar.

          Se usa `clip` y NO `hidden` a propósito: `hidden` crea un contenedor de
          scroll (y con `overflow-y: visible` el navegador lo fuerza a `auto`),
          lo que alteraría el layout del shell. `clip` recorta sin crear
          contenedor de scroll y sin afectar al eje vertical, así que el hilo
          del chat y el canvas siguen desplazándose con normalidad.
        */}
        <div className="flex min-h-[calc(100vh-14rem)] gap-5 sm:gap-6 items-stretch overflow-x-clip">
          {/* ── Tarjeta Izquierda (Chat con contorno redondeado) ── */}
          <div
            className={`flex min-w-0 flex-col rounded-2xl border border-gray-200/80 bg-white p-5 sm:p-6 shadow-xs transition-all duration-300 dark:border-gray-800 dark:bg-gray-900 ${
              activeArtifact
                ? "w-full lg:w-1/2 xl:w-[48%]"
                : "flex-1"
            }`}
          >
            {hayMensajes || pensando ? (
              /* ── Con conversación: hilo scrollable arriba, composer fijo abajo ── */
              <div className="flex min-h-0 flex-1 flex-col">
                {/* Hilo de conversación scrollable */}
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <ChatThread mensajes={assistantStore.mensajes} pensando={pensando} />
                </div>

                {/* Zona inferior fija: aviso de error + composer */}
                <div
                  className={`w-full pt-3 ${
                    activeArtifact ? "max-w-none" : "mx-auto max-w-2xl"
                  }`}
                >
                  {assistantStore.error !== null && (
                    <div className="mb-2 rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
                      {assistantStore.error}
                    </div>
                  )}

                  <Composer
                    onEnviar={(t) => assistantStore.enviar(t)}
                    pensando={pensando}
                  />
                </div>
              </div>
            ) : (
              /* ── Estado vacío: contenido centrado verticalmente ── */
              <div className="flex flex-1 flex-col items-center justify-center gap-6">
                <div
                  className={`w-full ${
                    activeArtifact ? "max-w-none" : "mx-auto max-w-2xl"
                  }`}
                >
                  {/* Saludo grande centrado */}
                  <p className="mb-6 text-center text-xl font-semibold text-gray-700 md:text-2xl dark:text-gray-200">
                    ¿En qué puedo ayudarte hoy?
                  </p>

                  {/* Tarjetas de sugerencia */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {SUGERENCIAS.map((s, i) => (
                      <SuggestionCard
                        key={s.titulo}
                        toolId={s.toolId}
                        titulo={s.titulo}
                        descripcion={s.descripcion}
                        retardo={retardoEscalonado(i)}
                        onClick={() => assistantStore.enviar(s.pregunta)}
                      />
                    ))}
                  </div>

                  {/* Composer tipo tarjeta */}
                  <div className="mt-4">
                    <Composer
                      onEnviar={(t) => assistantStore.enviar(t)}
                      pensando={pensando}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Tarjeta Derecha (ArtifactCanvas) o Barra Lateral ── */}
          {activeArtifact ? (
            /*
             * `key={activeArtifact.id}` NO es cosmético: es lo que hace que el
             * paneo se reproduzca cada vez. Cada artefacto nace con un id nuevo
             * (`nuevoId()` en el store), así que al pedir una segunda hoja de
             * cálculo React DESMONTA la tarjeta anterior y monta una nueva. Sin
             * la key reutilizaría el mismo nodo, la clase `paneo-entrada` no
             * cambiaría y la animación no se volvería a disparar: la segunda
             * tarjeta entraría de golpe, que es justo el defecto que se corrige.
             */
            <aside
              key={activeArtifact.id}
              className="paneo-entrada flex min-w-0 w-full lg:w-1/2 xl:w-[52%] flex-col rounded-2xl border border-gray-200/80 bg-white shadow-xs overflow-hidden dark:border-gray-800 dark:bg-gray-900"
            >
              <ArtifactCanvas
                artifact={activeArtifact}
                onClose={() => assistantStore.closeArtifact()}
                isLoading={pensando}
              />
            </aside>
          ) : barraAbierta ? (
            <ConversationsSidebar onClose={() => setBarraAbierta(false)} />
          ) : (
            hayMensajes &&
            ultimaEvidencia && (
              <aside className="hidden w-80 lg:w-96 shrink-0 flex-col overflow-y-auto rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs lg:flex dark:border-gray-800 dark:bg-gray-900">
                <FactsPanel evidence={ultimaEvidencia} />
              </aside>
            )
          )}
        </div>
      </div>
    </>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * SuggestionCard — tarjeta de sugerencia del estado vacío.
 *
 * Muestra un `titulo` en negrita y una `descripcion` en gris; al hacer clic
 * dispara `onClick` (que envía una pregunta de ejemplo al asistente).
 */
/**
 * SuggestionCard — tarjeta del estado vacío.
 *
 * `toolId` no se pinta: es la promesa de la tarjeta ("pulsarme te lleva a esta
 * herramienta") y queda como `data-sugerencia` para que un arnés pueda
 * comprobarla contra la respuesta real en vez de contra el texto del botón.
 */
const SuggestionCard = ({
  toolId,
  titulo,
  descripcion,
  retardo,
  onClick,
}: {
  toolId: string;
  titulo: string;
  descripcion: string;
  /** `animationDelay` ya formateado. Ver `retardoEscalonado` en `@/utils`. */
  retardo?: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    data-sugerencia={toolId}
    onClick={onClick}
    style={{ animationDelay: retardo }}
    className="animate-entrada-lista cursor-pointer rounded-xl border border-gray-200 bg-white p-4 text-left transition-colors hover:border-brand-300 hover:shadow-2xs dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-500"
  >
    <p className="text-sm font-bold text-gray-800 dark:text-white/90">{titulo}</p>
    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{descripcion}</p>
  </button>
);

export default AsistentePage;

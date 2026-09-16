import { useState } from "react";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { assistantStore } from "@/stores";
import { ChatThread } from "./views/ChatThread";
import { Composer } from "./views/Composer";
import { FactsPanel } from "./views/FactsPanel";
import { ConversationsSidebar } from "./views/ConversationsSidebar";

// ═══════════════════════════════════════════════════════════════════════════
// ASISTENTE PAGE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * SUGERENCIAS — tarjetas del estado vacío.
 *
 * Cada tarjeta enlaza a una pregunta REAL que el `LocalRuleEngine` sabe
 * responder por keywords (hoy / canal líder / diagnóstico de desempeño). Al
 * hacer clic se envía la `pregunta` al store como si el usuario la escribiera.
 */
const SUGERENCIAS: { titulo: string; descripcion: string; pregunta: string }[] = [
  {
    titulo: "Resumen de hoy",
    descripcion: "¿Cuántos pedidos tuve hoy y cómo va el día?",
    pregunta: "¿Cuántos pedidos tuve hoy?",
  },
  {
    titulo: "Canal líder",
    descripcion: "¿Cuál fue el canal con más pedidos?",
    pregunta: "¿Cuál fue el canal líder?",
  },
  {
    titulo: "Diagnóstico",
    descripcion: "¿Cómo estuvo el desempeño y qué observaciones hay?",
    pregunta: "Dame un diagnóstico de desempeño",
  },
];

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

  return (
    <>
      <PageMeta title="NECTO AI" description="Necto Intelligence — pregunta sobre tus pedidos" />

      {/* Altura grande y estable tipo chat: el shell no propaga altura fija,
          así que basamos la altura mínima en el viewport descontando
          header+footer+paddings del AppShell (~16rem). */}
      <div className="flex min-h-[calc(100vh-16rem)] gap-4">
        {/* ── Columna principal ── */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Encabezado: título + pill estático "Necto" + botón Limpiar */}
          <div className="mb-4 flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">NECTO AI</h1>
            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
                Necto
              </span>
              {/* Toggle de la barra de conversaciones (a la izquierda de "Limpiar") */}
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

          {hayMensajes || pensando ? (
            /* ── Con conversación: hilo scrollable arriba, composer fijo abajo ── */
            <div className="flex min-h-0 flex-1 flex-col">
              {/* Hilo de conversación scrollable que crece */}
              <div className="min-h-0 flex-1 overflow-hidden">
                <ChatThread mensajes={assistantStore.mensajes} pensando={pensando} />
              </div>

              {/* Zona inferior fija: aviso de error + composer */}
              <div className="mx-auto w-full max-w-3xl py-3">
                {/* Aviso de error discreto (requisito 14.x) */}
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
              <div className="mx-auto w-full max-w-3xl">
                {/* Saludo grande centrado */}
                <p className="mb-6 text-center text-xl font-semibold text-gray-700 md:text-2xl dark:text-gray-200">
                  ¿En qué puedo ayudarte hoy?
                </p>

                {/* Tarjetas de sugerencia (responsive: apiladas en móvil) */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {SUGERENCIAS.map((s) => (
                    <SuggestionCard
                      key={s.titulo}
                      titulo={s.titulo}
                      descripcion={s.descripcion}
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

        {/* ── Aside derecho ──
            Coordinación: cuando la barra de conversaciones está abierta se
            prioriza mostrarla (opción más limpia); el FactsPanel de evidencia
            solo aparece cuando la barra está CERRADA. Así nunca compiten dos
            asides por el espacio de la derecha. */}
        {barraAbierta ? (
          <ConversationsSidebar onClose={() => setBarraAbierta(false)} />
        ) : (
          hayMensajes &&
          ultimaEvidencia && (
            <aside className="hidden w-80 shrink-0 flex-col overflow-y-auto rounded-2xl border border-gray-200 bg-white xl:flex dark:border-gray-800 dark:bg-gray-900">
              <FactsPanel evidence={ultimaEvidencia} />
            </aside>
          )
        )}
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
const SuggestionCard = ({
  titulo,
  descripcion,
  onClick,
}: {
  titulo: string;
  descripcion: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 text-left transition-colors hover:border-brand-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-500"
  >
    <p className="text-sm font-bold text-gray-800 dark:text-white/90">{titulo}</p>
    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{descripcion}</p>
  </button>
);

export default AsistentePage;

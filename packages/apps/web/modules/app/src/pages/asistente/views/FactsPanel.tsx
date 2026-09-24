import { Link } from "react-router";
import { Badge, type BadgeColor } from "@/elements/ui/badge";
import type { ToolResult, Fact, Inference, ToolSource } from "@/assistant";

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS & ROUTE MAPPINGS
// ═══════════════════════════════════════════════════════════════════════════

/** Color del badge de confianza: baja=neutro, media=ámbar, alta=verde. */
const COLOR_CONFIANZA: Record<Inference["confidence"], BadgeColor> = {
  baja: "light",
  media: "warning",
  alta: "success",
};

/** Etiqueta legible para el tipo de inferencia (nunca causal). */
const LABEL_KIND: Record<Inference["kind"], string> = {
  correlation: "correlación",
  pattern: "patrón",
  hypothesis: "hipótesis",
};

/** Enlaza hechos específicos a las rutas operativas correspondientes */
function getLinkForFact(fact: Fact): { label: string; to: string } {
  const lbl = fact.label.toLowerCase();
  if (lbl.includes("urgente") || lbl.includes("pendiente")) {
    return { label: "Ver en Tablero", to: "/pedidos" };
  }
  if (
    lbl.includes("volumen") ||
    lbl.includes("periodo") ||
    lbl.includes("venta") ||
    lbl.includes("cancelado") ||
    lbl.includes("historial")
  ) {
    return { label: "Ver en Historial", to: "/pedidos/historial" };
  }
  if (
    lbl.includes("ciclo") ||
    lbl.includes("tiempo") ||
    lbl.includes("desempeño") ||
    lbl.includes("diagnostico")
  ) {
    return { label: "Ver Métricas", to: "/pedidos/inicio" };
  }
  if (
    lbl.includes("top") ||
    lbl.includes("producto") ||
    lbl.includes("canal") ||
    lbl.includes("resumen")
  ) {
    return { label: "Ver Resumen", to: "/pedidos/inicio" };
  }
  return { label: "Ver en Pedidos", to: "/pedidos" };
}

/** Enlaza herramientas del sistema a sus pantallas origen */
function getLinkForSource(source: ToolSource): { label: string; to: string } {
  const tid = source.toolId.toLowerCase();
  if (tid.includes("historial") || tid.includes("ventas") || tid.includes("cancelados")) {
    return { label: "Ir al Historial de Pedidos", to: "/pedidos/historial" };
  }
  if (tid.includes("pendientes") || tid.includes("tablero") || tid.includes("urgente")) {
    return { label: "Ir al Tablero de Pedidos", to: "/pedidos" };
  }
  if (tid.includes("config") || tid.includes("umbral")) {
    return { label: "Ir a Configuración", to: "/pedidos/config" };
  }
  if (tid.includes("equipo") || tid.includes("operador")) {
    // El equipo ya no es una pantalla propia: es una pestaña de la configuración
    // de la organización. El enlace apunta a la pestaña, no a la ruta que
    // redirige a ella, para no encadenar dos saltos desde dentro de la app.
    return { label: "Ir a Equipo", to: "/equipo" };
  }
  if (tid.includes("diagnostico") || tid.includes("resumen") || tid.includes("top") || tid.includes("pico")) {
    return { label: "Ir a Métricas de Inicio", to: "/pedidos/inicio" };
  }
  return { label: "Ir al Módulo de Pedidos", to: "/pedidos" };
}

// ═══════════════════════════════════════════════════════════════════════════
// FACTS PANEL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * FactsPanel — muestra las fuentes consultadas por el asistente separando
 * visualmente los HECHOS de las INFERENCIAS (requisito 3.8), ofreciendo
 * enlaces interactivos a los módulos del sistema de donde provienen.
 */
export const FactsPanel = ({ evidence }: { evidence?: ToolResult }) => {
  const facts = evidence?.facts ?? [];
  const inferences = evidence?.inferences ?? [];

  if (facts.length === 0 && inferences.length === 0) return null;

  return (
    <div className="flex flex-col gap-5">
      {/* ── Encabezado ── */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            <FactIcon />
          </span>
          <div>
            <h2 className="text-sm font-bold text-ink-title dark:text-white/90">
              Fuentes consultadas
            </h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Trazabilidad y enlaces a datos en vivo
            </p>
          </div>
        </div>
      </div>

      {/* ── Hechos (con botones de navegación directa) ── */}
      {facts.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Hechos comprobados
            </h3>
            <span className="text-[11px] text-gray-400">{facts.length} datos</span>
          </div>
          <ul className="flex flex-col gap-2">
            {facts.map((f, i) => (
              <FactCard key={i} fact={f} />
            ))}
          </ul>
        </section>
      )}

      {/* ── Inferencias (separadas visualmente con aviso y links de acción) ── */}
      {inferences.length > 0 && (
        <section className="flex flex-col gap-2.5 rounded-2xl border border-dashed border-warning-300/80 bg-warning-50/40 p-3.5 dark:border-warning-500/30 dark:bg-warning-500/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <InferenceIcon />
              <h3 className="text-xs font-semibold text-warning-900 dark:text-warning-300">
                Observaciones (inferencias)
              </h3>
            </div>
            <span className="text-[10px] italic text-warning-700/80 dark:text-warning-400/70">
              No causal
            </span>
          </div>
          <p className="text-[11px] text-warning-800/80 dark:text-warning-300/80">
            Hipótesis y patrones detectados, no causas directas.
          </p>
          <ul className="flex flex-col gap-2">
            {inferences.map((inf, i) => (
              <InferenceCard key={i} inference={inf} />
            ))}
          </ul>
        </section>
      )}

      {/* ── Pie: fuentes del sistema con botones directos ── */}
      {evidence?.sources && evidence.sources.length > 0 && (
        <footer className="flex flex-col gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Fuentes de herramientas
          </p>
          <div className="flex flex-col gap-2">
            {evidence.sources.map((s, i) => {
              const link = getLinkForSource(s);
              return (
                <div
                  key={i}
                  className="flex flex-col gap-2.5 rounded-xl border border-gray-200/80 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-gray-800/30"
                >
                  <div>
                    <span className="font-mono text-xs font-semibold text-gray-800 dark:text-white">
                      {s.toolId}
                    </span>
                    <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                      {s.detail}
                    </p>
                  </div>
                  <Link
                    to={link.to}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-black dark:bg-white dark:text-gray-950 dark:hover:bg-gray-100"
                  >
                    <span>{link.label}</span>
                    <ExternalIcon />
                  </Link>
                </div>
              );
            })}
          </div>
        </footer>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTES
// ═══════════════════════════════════════════════════════════════════════════

/** Tarjeta de un Hecho con botón interactivo de acceso directo */
const FactCard = ({ fact }: { fact: Fact }) => {
  const link = getLinkForFact(fact);
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-gray-200/70 bg-gray-50/70 p-3 transition-colors hover:border-gray-300 dark:border-gray-800 dark:bg-gray-800/40 dark:hover:border-gray-700">
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-xs font-medium text-gray-600 dark:text-gray-300">
          {fact.label}
        </span>
        <div className="mt-0.5 flex items-baseline gap-1">
          <span className="text-base font-bold text-gray-900 dark:text-white">
            {fact.value}
          </span>
          {fact.unit ? (
            <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
              {fact.unit}
            </span>
          ) : null}
          {fact.period ? (
            <span className="ml-1 text-[11px] text-gray-400 dark:text-gray-500">
              ({fact.period})
            </span>
          ) : null}
        </div>
      </div>
      <Link
        to={link.to}
        title={link.label}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-theme-xs transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-brand-500"
      >
        <span>{link.label}</span>
        <ExternalIcon />
      </Link>
    </li>
  );
};

/** Fila de una Inferencia con badges y enlace de resolución */
const InferenceCard = ({ inference }: { inference: Inference }) => {
  const hasUrgentes = inference.basedOn.some(
    (b) => b.toLowerCase().includes("urgente") || b.toLowerCase().includes("pendiente"),
  );
  const hasCiclo = inference.basedOn.some(
    (b) => b.toLowerCase().includes("ciclo") || b.toLowerCase().includes("tiempo"),
  );

  return (
    <li className="flex flex-col gap-2 rounded-xl bg-white p-3 shadow-theme-xs dark:bg-gray-900/70">
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <Badge size="xs" color={COLOR_CONFIANZA[inference.confidence]}>
          confianza: {inference.confidence}
        </Badge>
        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
          {LABEL_KIND[inference.kind]}
        </span>
      </div>

      <p className="text-xs leading-relaxed text-gray-700 dark:text-gray-200">
        {inference.statement}
      </p>

      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-2 dark:border-gray-800">
        <span className="text-[10px] text-gray-400">
          Basado en: {inference.basedOn.join(", ")}
        </span>
        {hasUrgentes ? (
          <Link
            to="/pedidos"
            className="inline-flex items-center gap-1 rounded-md bg-warning-100/70 px-2 py-1 text-[11px] font-medium text-warning-900 transition-colors hover:bg-warning-200/70 dark:bg-warning-500/20 dark:text-warning-200"
          >
            <span>Ver en Tablero</span>
            <ExternalIcon />
          </Link>
        ) : hasCiclo ? (
          <Link
            to="/pedidos/inicio"
            className="inline-flex items-center gap-1 rounded-md bg-warning-100/70 px-2 py-1 text-[11px] font-medium text-warning-900 transition-colors hover:bg-warning-200/70 dark:bg-warning-500/20 dark:text-warning-200"
          >
            <span>Ver Métricas</span>
            <ExternalIcon />
          </Link>
        ) : null}
      </div>
    </li>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════════════

const FactIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const InferenceIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 text-warning-600 dark:text-warning-400">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
  </svg>
);

const ExternalIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

export default FactsPanel;

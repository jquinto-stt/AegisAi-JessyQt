import { Badge, type BadgeColor } from "@/elements/ui/badge";
import type { ToolResult, Fact, Inference } from "@/assistant";

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
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

// ═══════════════════════════════════════════════════════════════════════════
// FACTS PANEL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * FactsPanel — muestra las fuentes consultadas por el asistente separando
 * visualmente los HECHOS de las INFERENCIAS (requisito 3.8).
 *
 * Los Hechos son datos objetivos leídos de los stores; las Inferencias son
 * interpretaciones heurísticas que NUNCA afirman causalidad. Por eso cada
 * inferencia se presenta en un área distinta, con una etiqueta de `confidence`
 * ({baja, media, alta}) y su `kind` (correlación/patrón/hipótesis), y con un
 * aviso explícito de que son observaciones, no causas.
 *
 * Si no hay evidencia (o no trae hechos ni inferencias), no renderiza nada.
 */
export const FactsPanel = ({ evidence }: { evidence?: ToolResult }) => {
  const facts = evidence?.facts ?? [];
  const inferences = evidence?.inferences ?? [];

  if (facts.length === 0 && inferences.length === 0) return null;

  return (
    <aside className="flex flex-col gap-4 border-t border-gray-200 bg-gray-50 px-4 py-4 dark:border-gray-800 dark:bg-gray-900/40">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        Fuentes consultadas
      </p>

      {/* ── Hechos ── */}
      {facts.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-white/80">
            <FactIcon />
            Hechos
          </h3>
          <ul className="flex flex-wrap gap-2">
            {facts.map((f, i) => (
              <FactChip key={i} fact={f} />
            ))}
          </ul>
        </section>
      )}

      {/* ── Inferencias (separadas visualmente de los hechos) ── */}
      {inferences.length > 0 && (
        <section className="flex flex-col gap-2 rounded-xl border border-dashed border-gray-300 bg-white/60 p-3 dark:border-gray-700 dark:bg-gray-800/40">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-white/80">
            <InferenceIcon />
            Observaciones (inferencias)
          </h3>
          <p className="text-xs italic text-gray-400">
            Hipótesis y patrones, no causas.
          </p>
          <ul className="flex flex-col gap-2">
            {inferences.map((inf, i) => (
              <InferenceRow key={i} inference={inf} />
            ))}
          </ul>
        </section>
      )}

      {/* ── Pie: fuentes (toolId / detail) ── */}
      {evidence?.sources && evidence.sources.length > 0 && (
        <footer className="flex flex-col gap-0.5 border-t border-gray-200 pt-2 dark:border-gray-800">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Fuentes
          </p>
          {evidence.sources.map((s, i) => (
            <p key={i} className="text-[11px] text-gray-500 dark:text-gray-400">
              <span className="font-mono text-gray-400">{s.toolId}</span>
              {" · "}
              {s.detail}
            </p>
          ))}
        </footer>
      )}
    </aside>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTES
// ═══════════════════════════════════════════════════════════════════════════

/** Chip de un Hecho: label y value, con unit y period cuando existan. */
const FactChip = ({ fact }: { fact: Fact }) => (
  <li className="flex items-baseline gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1.5 dark:bg-white/5">
    <span className="text-xs text-gray-500 dark:text-gray-400">{fact.label}:</span>
    <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
      {fact.value}
      {fact.unit ? <span className="ml-0.5 text-xs font-normal text-gray-500">{fact.unit}</span> : null}
    </span>
    {fact.period ? (
      <span className="text-[10px] text-gray-400">({fact.period})</span>
    ) : null}
  </li>
);

/** Fila de una Inferencia: statement + badges de confianza y tipo. */
const InferenceRow = ({ inference }: { inference: Inference }) => (
  <li className="flex flex-col gap-1.5 rounded-lg bg-gray-50 px-3 py-2 dark:bg-white/[0.03]">
    <p className="text-sm text-gray-700 dark:text-white/80">{inference.statement}</p>
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge size="xs" color={COLOR_CONFIANZA[inference.confidence]}>
        confianza: {inference.confidence}
      </Badge>
      <Badge size="xs" variant="light" color="info">
        {LABEL_KIND[inference.kind]}
      </Badge>
    </div>
  </li>
);

// ═══════════════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════════════

const FactIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 text-gray-400">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const InferenceIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 text-gray-400">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
  </svg>
);

export default FactsPanel;
